import { ensureSchema, sql } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { StatusSelect } from '@/components/StatusSelect';
import { formatBRL } from '@/lib/constants';
import { createVeiculo, deleteVeiculo, updateVeiculoStatus } from './actions';

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

export default async function VeiculosPage() {
  await ensureSchema();
  const { rows } = await sql`
    SELECT v.*, m.nome AS motorista_nome
    FROM veiculos v
    LEFT JOIN motoristas m ON m.id = v.motorista_id
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

            <div className="flex items-center justify-between gap-3 mt-4">
              <StatusSelect value={v.status} options={STATUS_OPTIONS} action={updateVeiculoStatus.bind(null, v.id)} />
              <form action={deleteVeiculo.bind(null, v.id)}>
                <button className="text-red-600 text-sm font-medium">Excluir</button>
              </form>
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
