import { Pool, type QueryResult, type QueryResultRow } from 'pg';

// Aceita o nome de variável que a integração Postgres/Neon da Vercel injetar
// (o nome mudou ao longo do tempo, então checamos as variações mais comuns).
const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  '';

let pool: Pool | null = null;

function getPool() {
  if (!connectionString) {
    throw new Error(
      'Nenhuma variável de conexão com o Postgres foi encontrada (POSTGRES_URL / DATABASE_URL). ' +
        'Conecte um banco Postgres ao projeto na Vercel (aba Storage) ou rode `vercel env pull .env.local` localmente.'
    );
  }
  if (!pool) {
    const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
    pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

// Pequeno helper que imita a API de template-tag do @vercel/postgres, mas
// usando `pg` por baixo — assim todo o resto do código fica mais legível
// (`sql\`SELECT ...\`` retornando `{ rows }`).
export async function sql<T extends QueryResultRow = any>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<QueryResult<T>> {
  const text = strings.reduce(
    (acc, chunk, i) => acc + chunk + (i < values.length ? `$${i + 1}` : ''),
    ''
  );
  return getPool().query<T>(text, values as any[]);
}

// Cria as tabelas na primeira vez que alguma página/action tocar o banco.
// `IF NOT EXISTS` torna isso seguro de rodar em toda instância "fria".
let schemaReady: Promise<void> | null = null;

async function createSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS motoristas (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT,
      cpf TEXT,
      cnh TEXT,
      endereco TEXT,
      data_nascimento DATE,
      telefone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ativo',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS veiculos (
      id SERIAL PRIMARY KEY,
      placa TEXT NOT NULL,
      modelo TEXT NOT NULL DEFAULT 'BYD Dolphin Mini',
      cor TEXT,
      ano INTEGER,
      chassi TEXT,
      renavam TEXT,
      valor_locacao_semanal NUMERIC(10,2),
      valor_seguro_semanal NUMERIC(10,2),
      status TEXT NOT NULL DEFAULT 'disponivel',
      motorista_id INTEGER REFERENCES motoristas(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  // Colunas adicionadas depois do primeiro deploy (motorista: CNH/endereço;
  // veículo: cor e o valor semanal dividido em locação + seguro) — usar
  // ADD COLUMN IF NOT EXISTS para não quebrar bancos já existentes.
  await sql`ALTER TABLE motoristas ADD COLUMN IF NOT EXISTS cnh TEXT`;
  await sql`ALTER TABLE motoristas ADD COLUMN IF NOT EXISTS endereco TEXT`;
  await sql`ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS cor TEXT`;
  await sql`ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS valor_locacao_semanal NUMERIC(10,2)`;
  await sql`ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS valor_seguro_semanal NUMERIC(10,2)`;

  await sql`
    CREATE TABLE IF NOT EXISTS vinculos (
      id SERIAL PRIMARY KEY,
      veiculo_id INTEGER NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
      motorista_id INTEGER NOT NULL REFERENCES motoristas(id) ON DELETE CASCADE,
      data_inicio DATE NOT NULL,
      data_fim DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS leituras_km (
      id SERIAL PRIMARY KEY,
      veiculo_id INTEGER NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
      data DATE NOT NULL,
      km INTEGER NOT NULL,
      observacao TEXT,
      foto_url TEXT,
      origem TEXT NOT NULL DEFAULT 'admin',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  // Colunas do envio semanal feito pelo próprio motorista (link público
  // /km/<placa>, sem login): foto do hodômetro e a origem do registro
  // ('admin' ou 'motorista'), para diferenciar no histórico.
  await sql`ALTER TABLE leituras_km ADD COLUMN IF NOT EXISTS foto_url TEXT`;
  await sql`ALTER TABLE leituras_km ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'admin'`;

  await sql`
    CREATE TABLE IF NOT EXISTS cobrancas (
      id SERIAL PRIMARY KEY,
      veiculo_id INTEGER NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
      motorista_id INTEGER NOT NULL REFERENCES motoristas(id) ON DELETE CASCADE,
      vinculo_id INTEGER REFERENCES vinculos(id) ON DELETE SET NULL,
      referencia_mes TEXT NOT NULL,
      valor_semanal NUMERIC(10,2) NOT NULL,
      km_mes INTEGER NOT NULL DEFAULT 0,
      km_excedente INTEGER NOT NULL DEFAULT 0,
      valor_excedente NUMERIC(10,2) NOT NULL DEFAULT 0,
      valor_total NUMERIC(10,2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'gerada',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS contratos_gerados (
      id SERIAL PRIMARY KEY,
      motorista_id INTEGER NOT NULL REFERENCES motoristas(id) ON DELETE CASCADE,
      veiculo_id INTEGER NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
      vinculo_id INTEGER REFERENCES vinculos(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
}

export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = createSchema().catch((err) => {
      // se falhar, permite tentar de novo na próxima chamada
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}
