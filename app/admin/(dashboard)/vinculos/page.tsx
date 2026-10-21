import { ensureSchema, sql } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { criarVinculo, encerrarVinculo } from './actions';

export default async function VinculosPage() {
  await ensureSchema();

  const [veiculosLivres, motoristasLivres, ativos, encerrados] = await Promise.all([
    sql`SELECT id, placa, modelo FROM veiculos WHERE motorista_id IS NULL ORDER BY placa`,
    sql`
      SELECT m.id, m.nome FROM motoristas m
      WHERE m.status = 'ativo'
        AND NOT EXISTS (SELECT 1 FROM vinculos vi WHERE vi.motorista_id = m.id AND vi.data_fim IS NULL)
      ORDER BY m.nome
    `,
    sql`
      SELECT vi.*, v.placa, v.modelo, m.nome AS motorista_nome
      FROM vinculos vi
      JOIN veiculos v ON v.id = vi.veiculo_id
      JOIN motoristas m ON m.id = vi.motorista_id
      WHERE vi.data_fim IS NULL
      ORDER BY vi.data_inicio DESC
    `,
    sql`
      SELECT vi.*, v.placa, m.nome AS motorista_nome
      FROM vinculos vi
      JOIN veiculos v ON v.id = vi.veiculo_id
      JOIN motoristas m ON m.id = vi.motorista_id
      WHERE vi.data_fim IS NOT NULL
      ORDER BY vi.data_fim DESC
      LIMIT 20
    `,
  ]);

  return (
    <div>
      <PageHeader title="Vínculos" subtitle="Ligue um motorista a um veículo disponível." />

      {veiculosLivres.rows.length === 0 || motoristasLivres.rows.length === 0 ? (
        <p className="card p-5 text-sm text-slate-500 mb-6">
          {veiculosLivres.rows.length === 0
            ? 'Não há veículos disponíveis para vincular agora.'
            : 'Não há motoristas ativos sem vínculo disponíveis agora.'}
        </p>
      ) : (
        <form action={criarVinculo} className="card p-5 grid gap-4 md:grid-cols-2 mb-6">
          <div>
            <label className="label-lg">Veículo disponível</label>
            <select name="veiculo_id" required className="field-lg mt-1">
              <option value="">Selecione</option>
              {veiculosLivres.rows.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.placa} · {v.modelo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-lg">Motorista</label>
            <select name="motorista_id" required className="field-lg mt-1">
              <option value="">Selecione</option>
              {motoristasLivres.rows.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-lg">Data de início</label>
            <input
              name="data_inicio"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="field-lg mt-1"
            />
          </div>
          <button type="submit" className="btn-primary md:col-span-2 self-end">
            🔗 Vincular
          </button>
        </form>
      )}

      <p className="text-lg font-semibold text-slate-900 mb-3">Vínculos ativos</p>
      <div className="space-y-3 mb-8">
        {ativos.rows.map((v: any) => (
          <div key={v.id} className="card p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-bold text-slate-900">
                {v.placa} <span className="text-slate-400 font-normal">↔</span> {v.motorista_nome}
              </p>
              <p className="text-sm text-slate-500">
                Desde {new Date(v.data_inicio).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <form action={encerrarVinculo.bind(null, v.id)}>
              <button className="btn-danger !min-h-[44px] !py-2 !px-4 text-sm">Encerrar vínculo</button>
            </form>
          </div>
        ))}
        {ativos.rows.length === 0 && (
          <p className="card p-6 text-center text-slate-400">Nenhum vínculo ativo no momento.</p>
        )}
      </div>

      {encerrados.rows.length > 0 && (
        <>
          <p className="text-sm font-semibold text-slate-500 mb-3">Histórico recente</p>
          <div className="space-y-2">
            {encerrados.rows.map((v: any) => (
              <div key={v.id} className="text-sm text-slate-500 px-1">
                {v.placa} ↔ {v.motorista_nome} · {new Date(v.data_inicio).toLocaleDateString('pt-BR')} a{' '}
                {new Date(v.data_fim).toLocaleDateString('pt-BR')}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
