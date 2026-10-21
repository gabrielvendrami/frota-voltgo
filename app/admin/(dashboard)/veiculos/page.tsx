import { ensureSchema, sql } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { StatusSelect } from '@/components/StatusSelect';
import { formatBRL, formatKm, DIAS_SEMANA, proximaRevisao, whatsappLinkTo } from '@/lib/constants';
import { createVeiculo, deleteVeiculo, updateVeiculoStatus, updateDiaFechamento, marcarRevisaoFeita } from './actions';

const STATUS_OPTIONS = [
  { value: 'disponivel', label: 'Disponível' },
  { value: 'em uso', label: 'Em uso' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'inativo', label: 'Inativo' },
];

const STATUS_COLORS: Record<string, string> = {
  disponivel: 'bg-emerald-50 text-emerald-700',
  'em uso': 'bg-blue-50 text-blue-700',
  manutencao: 'bg-amber-50 text-amber-700',
  inativo: 'bg-slate-100 text-slate-500',
};

const DIA_OPTIONS = DIAS_SEMANA.map((label, value) => ({ value: String(value), label }));

export default async function VeiculosPage() {
  await ensureSchema();
  const { rows } = await sql`
    SELECT
      v.*, m.nome AS motorista_nome, m.telefone AS motorista_telefone,
      lk.km AS ultima_km
    FROM veiculos v
    LEFT JOIN motoristas m ON m.id = v.motorista_id
    LEFT JOIN LATERAL (
      SELECT km FROM leituras_km WHERE veiculo_id = v.id ORDER BY data DESC, created_at DESC LIMIT 1
    ) lk ON true
    ORDER BY v.placa
  `;

  return (
    <div>
      <PageHeader title="Veículos" subtitle="Cadastro da frota de veículos elétricos." />

      {/* key muda a cada cadastro novo: força o React a remontar o form e
          limpar os campos (inputs não controlados ficariam com o valor
          anterior se o form continuasse montado). */}
      <form
        key={`veiculo-form-${rows.length}`}
        action={createVeiculo}
        className="card p-5 grid gap-4 md:grid-cols-2 mb-6"
      >
        <div>
          <label className="label-lg">Placa</label>
          <input name="placa" required className="field-lg mt-1" placeholder="ABC1D23" />
        </div>
        <div>
          <label className="label-lg">Modelo</label>
          <input name="modelo" defaultValue="BYD Dolphin Mini" className="field-lg mt-1" />
        </div>
        <div>
          <label className="label-lg">Cor</label>
          <input name="cor" className="field-lg mt-1" placeholder="Branco" />
        </div>
        <div>
          <label className="label-lg">Ano</label>
          <input name="ano" type="number" className="field-lg mt-1" />
        </div>
        <div>
          <label className="label-lg">Valor semanal — locação</label>
          <input name="valor_locacao_semanal" type="number" step="0.01" placeholder="1400.00" className="field-lg mt-1" />
        </div>
        <div>
          <label className="label-lg">Valor semanal — seguro</label>
          <input name="valor_seguro_semanal" type="number" step="0.01" placeholder="100.00" className="field-lg mt-1" />
        </div>
        <div>
          <label className="label-lg">Chassi</label>
          <input name="chassi" className="field-lg mt-1" />
        </div>
        <div>
          <label className="label-lg">Renavam</label>
          <input name="renavam" className="field-lg mt-1" />
        </div>
        <div>
          <label className="label-lg">Dia de fechamento da semana</label>
          <select name="dia_fechamento" defaultValue="1" className="field-lg mt-1">
            {DIA_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label-lg">Última revisão de fábrica já feita aos (km)</label>
          <input
            name="ultima_revisao_marco"
            type="number"
            min={0}
            step={20000}
            defaultValue={0}
            className="field-lg mt-1"
            placeholder="0 = nenhuma ainda; 20000 = já fez a de 20.000 km"
          />
        </div>
        <button type="submit" className="btn-primary md:col-span-2">
          + Adicionar veículo
        </button>
      </form>

      <div className="space-y-3">
        {rows.map((v: any) => (
          <div key={v.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-slate-900">{v.placa}</p>
                <p className="text-sm text-slate-500">
                  {v.modelo} {v.ano ? `· ${v.ano}` : ''}
                </p>
              </div>
              <span className={`pill ${STATUS_COLORS[v.status] || 'bg-slate-100 text-slate-500'}`}>
                {v.status}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600 mt-4">
              <div>
                <dt className="text-xs text-slate-400">Cor</dt>
                <dd>{v.cor || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Chassi</dt>
                <dd>{v.chassi || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Renavam</dt>
                <dd>{v.renavam || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Motorista vinculado</dt>
                <dd>{v.motorista_nome || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Locação / semana</dt>
                <dd>{v.valor_locacao_semanal ? formatBRL(Number(v.valor_locacao_semanal)) : '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Seguro / semana</dt>
                <dd>{v.valor_seguro_semanal ? formatBRL(Number(v.valor_seguro_semanal)) : '-'}</dd>
              </div>
              {v.valor_locacao_semanal && v.valor_seguro_semanal && (
                <div className="col-span-2 pt-1 border-t border-slate-100">
                  <dt className="text-xs text-slate-400">Total / semana</dt>
                  <dd className="font-semibold text-slate-900">
                    {formatBRL(Number(v.valor_locacao_semanal) + Number(v.valor_seguro_semanal))}
                  </dd>
                </div>
              )}
            </dl>

            {(() => {
              const marcoFeito = Number(v.ultima_revisao_marco || 0);
              const rev = proximaRevisao(Number(v.ultima_km ?? 0), marcoFeito);
              const temKm = v.ultima_km != null;
              const msg = rev.atrasada
                ? `Olá ${v.motorista_nome || ''}! O carro ${v.placa} já passou do marco da revisão de ${formatKm(rev.proximoMarco)}. Precisamos agendar a revisão o quanto antes, pode ser?`
                : `Olá ${v.motorista_nome || ''}! O carro ${v.placa} está chegando na revisão de ${formatKm(rev.proximoMarco)} (faltam ${formatKm(rev.faltam)}). Vamos agendar?`;
              return (
                <div className="mt-3 space-y-2">
                  <p className={`text-xs ${temKm && rev.proxima ? (rev.atrasada ? 'text-red-700 font-semibold' : 'text-amber-700 font-medium') : 'text-slate-400'}`}>
                    {temKm && rev.proxima ? (rev.atrasada ? '🚨 ' : '⚠️ ') : '🔧 '}
                    {temKm
                      ? rev.atrasada
                        ? `Revisão dos ${formatKm(rev.proximoMarco)} ATRASADA em ${formatKm(Math.abs(rev.faltam))}`
                        : `Próxima revisão aos ${formatKm(rev.proximoMarco)} — faltam ${formatKm(rev.faltam)}`
                      : `Próxima revisão aos ${formatKm(rev.proximoMarco)} (sem leitura de KM ainda)`}
                  </p>
                  {temKm && rev.proxima && (
                    <div className="flex flex-wrap gap-2">
                      {v.motorista_telefone && (
                        <a
                          href={whatsappLinkTo(v.motorista_telefone, msg)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary !min-h-[44px] !py-2 !px-4 text-sm"
                        >
                          Avisar motorista no WhatsApp ↗
                        </a>
                      )}
                      <form action={marcarRevisaoFeita.bind(null, v.id, rev.proximoMarco)}>
                        <button className="btn-secondary !min-h-[44px] !py-2 !px-4 text-sm">
                          ✓ Revisão de {formatKm(rev.proximoMarco)} feita
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex items-center justify-between gap-3 mt-4">
              <StatusSelect value={v.status} options={STATUS_OPTIONS} action={updateVeiculoStatus.bind(null, v.id)} />
              <form action={deleteVeiculo.bind(null, v.id)}>
                <button className="text-red-600 text-sm font-medium">Excluir</button>
              </form>
            </div>

            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">Fecha a semana toda:</span>
              <StatusSelect
                name="dia_fechamento"
                value={String(v.dia_fechamento ?? 1)}
                options={DIA_OPTIONS}
                action={updateDiaFechamento.bind(null, v.id)}
              />
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="card p-6 text-center text-slate-400">Nenhum veículo cadastrado ainda.</p>
        )}
      </div>
    </div>
  );
}
