import { ensureSchema, sql } from '@/lib/db';
import { formatKm, inicioSemanaAtual } from '@/lib/constants';
import { registrarKmMotorista } from './actions';

export const dynamic = 'force-dynamic';

function normalizarPlaca(placa: string) {
  return placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export default async function EnvioKmPage({
  params,
  searchParams,
}: {
  params: { placa: string };
  searchParams: { ok?: string; erro?: string; ultima?: string };
}) {
  await ensureSchema();

  const placaNorm = normalizarPlaca(params.placa);

  const { rows } = await sql`
    SELECT id, placa, modelo, cor
    FROM veiculos
    WHERE UPPER(REGEXP_REPLACE(placa, '[^A-Za-z0-9]', '', 'g')) = ${placaNorm}
  `;
  const veiculo = rows[0];

  if (!veiculo) {
    return (
      <Shell>
        <div className="card p-6 text-center">
          <p className="text-4xl mb-3">🚫</p>
          <p className="font-bold text-slate-900 mb-1">Veículo não encontrado</p>
          <p className="text-sm text-slate-500">
            Confira o link com a locadora — cada veículo tem seu próprio link de envio.
          </p>
        </div>
      </Shell>
    );
  }

  const ultimaRes = await sql`
    SELECT data, km, origem FROM leituras_km
    WHERE veiculo_id = ${veiculo.id}
    ORDER BY data DESC, created_at DESC
    LIMIT 1
  `;
  const ultima = ultimaRes.rows[0];
  const inicioSemana = inicioSemanaAtual();
  const jaEnviouEssaSemana = !!ultima && new Date(ultima.data).toISOString().slice(0, 10) >= inicioSemana;

  if (searchParams.ok === '1') {
    return (
      <Shell>
        <div className="card p-6 text-center">
          <p className="text-5xl mb-3">✅</p>
          <p className="text-xl font-bold text-slate-900 mb-1">Recebido!</p>
          <p className="text-slate-500">
            Obrigado por enviar a quilometragem do <span className="font-semibold">{veiculo.placa}</span> essa
            semana.
          </p>
        </div>
      </Shell>
    );
  }

  const erro = searchParams.erro;

  return (
    <Shell>
      <div className="card p-5 mb-5 text-center">
        <p className="text-sm text-slate-500">Veículo</p>
        <p className="text-2xl font-bold text-slate-900">{veiculo.placa}</p>
        <p className="text-slate-500">
          {veiculo.modelo} {veiculo.cor ? `· ${veiculo.cor}` : ''}
        </p>
      </div>

      {jaEnviouEssaSemana && (
        <div className="card p-4 mb-5 bg-emerald-50 border-emerald-200 text-sm text-emerald-800">
          ✅ Você já enviou a leitura desta semana ({formatKm(Number(ultima.km))} em{' '}
          {new Date(ultima.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}). Pode enviar de novo abaixo se
          precisar corrigir.
        </div>
      )}

      {erro === 'veiculo' && <ErroMsg>Veículo não encontrado. Tente novamente.</ErroMsg>}
      {erro === 'km' && <ErroMsg>Digite a quilometragem atual do carro (só números).</ErroMsg>}
      {erro === 'foto' && <ErroMsg>Não esqueça de tirar a foto do hodômetro antes de enviar.</ErroMsg>}
      {erro === 'upload' && <ErroMsg>Não deu pra enviar a foto agora. Tente de novo em instantes.</ErroMsg>}
      {erro === 'menor' && (
        <ErroMsg>
          A quilometragem informada é menor que a última registrada
          {searchParams.ultima ? ` (${formatKm(Number(searchParams.ultima))})` : ''}. Confira o hodômetro e envie de
          novo.
        </ErroMsg>
      )}

      <form action={registrarKmMotorista.bind(null, params.placa)} className="card p-5 space-y-5">
        <div>
          <label className="label-lg block mb-2 text-base">Qual a quilometragem atual do carro?</label>
          <input
            name="km"
            type="number"
            inputMode="numeric"
            min={0}
            required
            placeholder="ex: 18540"
            className="field-lg text-xl text-center"
          />
        </div>

        <div>
          <label className="label-lg block mb-2 text-base">Tire uma foto do painel (hodômetro)</label>
          <input
            name="foto"
            type="file"
            accept="image/*"
            capture="environment"
            required
            className="field-lg !py-3"
          />
        </div>

        <button type="submit" className="btn-primary w-full text-lg">
          Enviar
        </button>
      </form>

      <p className="text-center text-xs text-slate-400 mt-5">⚡ VoltGo Frota</p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

function ErroMsg({ children }: { children: React.ReactNode }) {
  return <div className="card p-4 mb-5 bg-red-50 border-red-200 text-sm text-red-700">⚠️ {children}</div>;
}
