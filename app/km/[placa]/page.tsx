import { ensureSchema, sql } from '@/lib/db';
import { formatKm, inicioCicloAtual, proximaRevisao } from '@/lib/constants';
import { registrarKmMotorista } from './actions';
import { KmForm } from './KmForm';

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
    SELECT id, placa, modelo, cor, dia_fechamento, ultima_revisao_marco
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
  const inicioCiclo = inicioCicloAtual(veiculo.dia_fechamento ?? 1);
  const jaEnviouEssaSemana = !!ultima && new Date(ultima.data).toISOString().slice(0, 10) >= inicioCiclo;

  if (searchParams.ok === '1') {
    const revisao = ultima ? proximaRevisao(Number(ultima.km), Number(veiculo.ultima_revisao_marco || 0)) : null;
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

        {revisao?.proxima && (
          <div
            className={`card p-5 mt-5 text-sm ${
              revisao.atrasada ? 'bg-red-50 border-red-300 text-red-800' : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            <p className="font-bold text-base mb-1">
              {revisao.atrasada ? '🚨 Revisão atrasada!' : '🔧 Atenção: revisão chegando!'}
            </p>
            <p>
              {revisao.atrasada
                ? `O carro já passou dos ${formatKm(revisao.proximoMarco)} (marco da revisão de fábrica) em ${formatKm(
                    Math.abs(revisao.faltam)
                  )}.`
                : `Faltam apenas ${formatKm(revisao.faltam)} para a revisão de fábrica dos ${formatKm(
                    revisao.proximoMarco
                  )}.`}{' '}
              Avise a locadora agora para agendar — a revisão não pode passar do limite, senão pode perder a garantia.
            </p>
          </div>
        )}
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

      <KmForm action={registrarKmMotorista.bind(null, params.placa)} />

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
