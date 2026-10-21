import { headers } from 'next/headers';
import { ensureSchema, sql } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { CopyButton } from '@/components/CopyButton';
import { formatKm, inicioSemanaAtual } from '@/lib/constants';
import { createLeituraKm, deleteLeituraKm } from './actions';

export default async function QuilometragemPage() {
  await ensureSchema();

  const [veiculosRes, statusRes, leiturasRes] = await Promise.all([
    sql`SELECT id, placa, modelo FROM veiculos ORDER BY placa`,
    sql`
      SELECT
        v.id, v.placa, v.modelo,
        lk.data AS ultima_data, lk.km AS ultima_km, lk.origem AS ultima_origem
      FROM veiculos v
      LEFT JOIN LATERAL (
        SELECT data, km, origem FROM leituras_km
        WHERE veiculo_id = v.id
        ORDER BY data DESC, created_at DESC
        LIMIT 1
      ) lk ON true
      ORDER BY v.placa
    `,
    sql`
      SELECT l.*, v.placa
      FROM leituras_km l
      JOIN veiculos v ON v.id = l.veiculo_id
      ORDER BY l.data DESC, l.created_at DESC
      LIMIT 100
    `,
  ]);

  const veiculos = veiculosRes.rows;
  const statusVeiculos = statusRes.rows;
  const leituras = leiturasRes.rows;

  const host = headers().get('host') || 'localhost:3000';
  const proto = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;
  const inicioSemana = inicioSemanaAtual();

  return (
    <div>
      <PageHeader
        title="Quilometragem"
        subtitle="Cada motorista pode enviar a leitura semanal direto pelo celular, sem precisar logar no painel."
      />

      <p className="text-lg font-semibold text-slate-900 mb-3">Envio semanal pelo motorista</p>
      <div className="space-y-3 mb-8">
        {statusVeiculos.map((v: any) => {
          const enviouEssaSemana = v.ultima_data && new Date(v.ultima_data).toISOString().slice(0, 10) >= inicioSemana;
          const link = `${baseUrl}/km/${v.placa}`;
          return (
            <div key={v.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-bold text-slate-900">{v.placa}</p>
                  <p className="text-sm text-slate-500">{v.modelo}</p>
                </div>
                <span
                  className={`pill ${enviouEssaSemana ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
                >
                  {enviouEssaSemana ? '✅ Enviou essa semana' : '⏳ Pendente essa semana'}
                </span>
              </div>
              {v.ultima_data && (
                <p className="text-xs text-slate-500 mb-3">
                  Última leitura: {formatKm(Number(v.ultima_km))} em{' '}
                  {new Date(v.ultima_data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                  {v.ultima_origem === 'motorista' ? ' · enviada pelo motorista' : ' · lançada pelo admin'}
                </p>
              )}
              <CopyButton text={link} label="Copiar link para mandar no WhatsApp" />
            </div>
          );
        })}
        {statusVeiculos.length === 0 && (
          <p className="card p-6 text-center text-slate-400">Cadastre um veículo para gerar o link de envio.</p>
        )}
      </div>

      <p className="text-lg font-semibold text-slate-900 mb-3">Lançar leitura manualmente</p>
      {veiculos.length === 0 ? (
        <p className="card p-5 text-sm text-slate-500">Cadastre um veículo antes de registrar quilometragem.</p>
      ) : (
        <form
          key={`leitura-form-${leituras.length}`}
          action={createLeituraKm}
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
            <label className="label-lg">Data</label>
            <input
              name="data"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="field-lg mt-1"
            />
          </div>
          <div className="md:col-span-2">
            <label className="label-lg">Quilometragem atual (hodômetro)</label>
            <input name="km" type="number" min={0} required className="field-lg mt-1" placeholder="ex: 12450" />
          </div>
          <div className="md:col-span-2">
            <label className="label-lg">Observação (opcional)</label>
            <input name="observacao" className="field-lg mt-1" />
          </div>
          <button type="submit" className="btn-primary md:col-span-2">
            Registrar leitura
          </button>
        </form>
      )}

      <p className="text-lg font-semibold text-slate-900 mb-3">Histórico</p>
      <div className="space-y-2">
        {leituras.map((l: any) => (
          <div key={l.id} className="card p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">
                {l.placa} · {formatKm(l.km)}
              </p>
              <p className="text-xs text-slate-500">
                {new Date(l.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}{' '}
                {l.observacao ? `· ${l.observacao}` : ''}
                {' · '}
                <span className={l.origem === 'motorista' ? 'text-blue-600' : 'text-slate-400'}>
                  {l.origem === 'motorista' ? 'enviado pelo motorista' : 'lançado pelo admin'}
                </span>
                {l.foto_url && (
                  <>
                    {' · '}
                    <a href={l.foto_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                      ver foto
                    </a>
                  </>
                )}
              </p>
            </div>
            <form action={deleteLeituraKm.bind(null, l.id)}>
              <button className="text-red-600 text-sm font-medium">Excluir</button>
            </form>
          </div>
        ))}
        {leituras.length === 0 && (
          <p className="card p-6 text-center text-slate-400">Nenhuma leitura registrada ainda.</p>
        )}
      </div>
    </div>
  );
}
