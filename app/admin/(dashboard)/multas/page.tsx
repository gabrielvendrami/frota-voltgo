import { ensureSchema, sql } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { StatusSelect } from '@/components/StatusSelect';
import { diasAte, formatBRL, whatsappLinkTo } from '@/lib/constants';
import { createMulta, deleteMulta, updateMultaStatus } from './actions';

const STATUS_OPTIONS = [
  { value: 'a_indicar', label: 'A indicar condutor' },
  { value: 'indicada', label: 'Condutor indicado' },
  { value: 'paga', label: 'Paga / resolvida' },
];

function formatData(d: string | Date) {
  return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export default async function MultasPage() {
  await ensureSchema();

  const [veiculosRes, motoristasRes, multasRes] = await Promise.all([
    sql`SELECT id, placa, modelo FROM veiculos ORDER BY placa`,
    sql`SELECT id, nome FROM motoristas ORDER BY nome`,
    sql`
      SELECT mu.*, v.placa, m.nome AS motorista_nome, m.telefone AS motorista_telefone
      FROM multas mu
      JOIN veiculos v ON v.id = mu.veiculo_id
      LEFT JOIN motoristas m ON m.id = mu.motorista_id
      ORDER BY
        (mu.status = 'paga') ASC,
        (mu.status = 'indicada') ASC,
        mu.prazo_indicacao ASC NULLS LAST,
        mu.data_infracao DESC
    `,
  ]);

  const veiculos = veiculosRes.rows;
  const motoristas = motoristasRes.rows;
  const multas = multasRes.rows;

  const abertas = multas.filter((m: any) => m.status !== 'paga');
  const totalAberto = abertas.reduce((acc: number, m: any) => acc + Number(m.valor), 0);

  return (
    <div>
      <PageHeader
        title="Multas"
        subtitle="Como os veículos estão no CNPJ, é preciso indicar o condutor dentro do prazo — senão vira Multa NIC (valor multiplicado)."
      />

      <p className="card p-4 text-sm text-slate-600 mb-6">
        Consulte as multas no Senatram e lance aqui: data da infração, valor e o <b>prazo para indicar o
        condutor</b>. O sistema descobre sozinho qual motorista estava com o carro naquele dia e avisa na tela
        inicial quando o prazo estiver chegando.
      </p>

      <form
        key={`multa-form-${multas.length}`}
        action={createMulta}
        className="card p-5 grid gap-4 md:grid-cols-2 mb-6"
      >
        <div>
          <label className="label-lg">Veículo</label>
          <select name="veiculo_id" required className="field-lg mt-1">
            <option value="">Selecione</option>
            {veiculos.map((v: any) => (
              <option key={v.id} value={v.id}>
                {v.placa} · {v.modelo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-lg">Motorista</label>
          <select name="motorista_id" className="field-lg mt-1" defaultValue="">
            <option value="">Automático (quem estava com o carro na data)</option>
            {motoristas.map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-lg">Data da infração</label>
          <input name="data_infracao" type="date" required className="field-lg mt-1" />
        </div>
        <div>
          <label className="label-lg">Valor da multa (R$)</label>
          <input name="valor" type="number" step="0.01" min={0} required className="field-lg mt-1" placeholder="130.16" />
        </div>
        <div>
          <label className="label-lg">Prazo para indicar o condutor</label>
          <input name="prazo_indicacao" type="date" className="field-lg mt-1" />
        </div>
        <div>
          <label className="label-lg">Descrição (opcional)</label>
          <input name="descricao" className="field-lg mt-1" placeholder="ex: excesso de velocidade" />
        </div>
        <button type="submit" className="btn-primary md:col-span-2">
          + Lançar multa
        </button>
      </form>

      {abertas.length > 0 && (
        <p className="text-sm text-slate-500 mb-3">
          {abertas.length} multa(s) em aberto · total {formatBRL(totalAberto)}
        </p>
      )}

      <div className="space-y-3">
        {multas.map((m: any) => {
          const dias = m.prazo_indicacao ? diasAte(m.prazo_indicacao) : null;
          const urgente = m.status === 'a_indicar' && dias !== null;
          const vencida = urgente && dias! < 0;
          const perto = urgente && dias! >= 0 && dias! <= 5;

          const msg =
            `Olá ${m.motorista_nome || ''}! Chegou uma multa do veículo ${m.placa}:\n` +
            `📅 Infração em ${formatData(m.data_infracao)}${m.descricao ? ` (${m.descricao})` : ''}\n` +
            `💰 Valor: ${formatBRL(Number(m.valor))}\n` +
            (m.prazo_indicacao
              ? `⏰ Prazo para indicar você como condutor: ${formatData(m.prazo_indicacao)}\n`
              : '') +
            `\nComo o veículo está no CNPJ da locadora, preciso que você assine o termo de indicação de condutor dentro do prazo — se passar, a multa é multiplicada (Multa NIC) e fica por sua conta. Pode me ajudar com isso?`;

          return (
            <div
              key={m.id}
              className={`card p-5 ${vencida ? 'border-red-300 bg-red-50' : perto ? 'border-amber-300 bg-amber-50' : ''}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {m.placa} · {formatBRL(Number(m.valor))}
                  </p>
                  <p className="text-sm text-slate-500">
                    {m.motorista_nome || 'Motorista não identificado'} · infração em {formatData(m.data_infracao)}
                    {m.descricao ? ` · ${m.descricao}` : ''}
                  </p>
                </div>
                {m.status === 'a_indicar' && m.prazo_indicacao && (
                  <span
                    className={`pill ${
                      vencida
                        ? 'bg-red-100 text-red-700'
                        : perto
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {vencida
                      ? `🚨 Prazo vencido há ${Math.abs(dias!)} dia(s)`
                      : dias === 0
                      ? '⏰ Prazo é HOJE'
                      : `⏰ Faltam ${dias} dia(s)`}
                  </span>
                )}
              </div>

              {m.prazo_indicacao && (
                <p className="text-xs text-slate-500 mt-2">
                  Prazo para indicar o condutor: {formatData(m.prazo_indicacao)}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                <StatusSelect value={m.status} options={STATUS_OPTIONS} action={updateMultaStatus.bind(null, m.id)} />
                <div className="flex items-center gap-4">
                  {m.motorista_telefone && m.status === 'a_indicar' && (
                    <a
                      href={whatsappLinkTo(m.motorista_telefone, msg)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary !min-h-[44px] !py-2 !px-4 text-sm"
                    >
                      Avisar no WhatsApp ↗
                    </a>
                  )}
                  <form action={deleteMulta.bind(null, m.id)}>
                    <button className="text-red-600 text-sm font-medium">Excluir</button>
                  </form>
                </div>
              </div>
            </div>
          );
        })}
        {multas.length === 0 && (
          <p className="card p-6 text-center text-slate-400">Nenhuma multa lançada ainda.</p>
        )}
      </div>
    </div>
  );
}
