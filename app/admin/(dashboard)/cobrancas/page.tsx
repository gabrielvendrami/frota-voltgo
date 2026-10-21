import Link from 'next/link';
import { ensureSchema, sql } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { formatBRL, formatMesExtenso } from '@/lib/constants';
import { gerarCobranca } from './actions';

function diasDesde(data: string | Date) {
  return Math.max(0, Math.floor((Date.now() - new Date(data).getTime()) / 86400000));
}

export default async function CobrancasPage() {
  await ensureSchema();

  const [ativosRes, historicoRes] = await Promise.all([
    sql`
      SELECT
        vi.id AS vinculo_id, v.placa,
        (COALESCE(v.valor_locacao_semanal, 0) + COALESCE(v.valor_seguro_semanal, 0)) AS valor_semanal_padrao,
        m.nome AS motorista_nome
      FROM vinculos vi
      JOIN veiculos v ON v.id = vi.veiculo_id
      JOIN motoristas m ON m.id = vi.motorista_id
      WHERE vi.data_fim IS NULL
      ORDER BY v.placa
    `,
    sql`
      SELECT c.*, v.placa, m.nome AS motorista_nome
      FROM cobrancas c
      JOIN veiculos v ON v.id = c.veiculo_id
      JOIN motoristas m ON m.id = c.motorista_id
      ORDER BY c.created_at DESC
      LIMIT 30
    `,
  ]);

  const ativos = ativosRes.rows;
  const historico = historicoRes.rows;

  return (
    <div>
      <PageHeader title="Cobrança" subtitle="Gere a cobrança semanal com Pix copia e cola e mensagem pronta para o WhatsApp." />

      <p className="text-lg font-semibold text-slate-900 mb-3">Gerar cobrança</p>
      <div className="space-y-3 mb-8">
        {ativos.map((v: any) => (
          <form
            key={v.vinculo_id}
            action={gerarCobranca.bind(null, v.vinculo_id)}
            className="card p-5 flex flex-wrap items-end gap-4"
          >
            <div className="flex-1 min-w-[160px]">
              <p className="font-bold text-slate-900">{v.placa}</p>
              <p className="text-sm text-slate-500">{v.motorista_nome}</p>
            </div>
            <div className="w-36">
              <label className="label-lg">Valor semanal</label>
              <input
                name="valor_semanal"
                type="number"
                step="0.01"
                required
                defaultValue={v.valor_semanal_padrao || ''}
                className="field-lg mt-1"
              />
            </div>
            <button type="submit" className="btn-primary">
              Gerar cobrança
            </button>
          </form>
        ))}
        {ativos.length === 0 && (
          <p className="card p-6 text-center text-slate-400">
            Nenhum vínculo ativo — vá em <span className="font-medium">Vínculos</span> para ligar um motorista a um veículo.
          </p>
        )}
      </div>

      <p className="text-lg font-semibold text-slate-900 mb-3">Histórico</p>
      <div className="space-y-2">
        {historico.map((c: any) => (
          <Link
            key={c.id}
            href={`/admin/cobrancas/${c.id}`}
            className="card p-4 flex items-center justify-between gap-3 hover:border-blue-300"
          >
            <div>
              <p className="font-semibold text-slate-900">
                {c.placa} · {c.motorista_nome}
              </p>
              <p className="text-xs text-slate-500">
                {formatMesExtenso(c.referencia_mes)} · {formatBRL(Number(c.valor_total))}
                {c.status !== 'paga' && (
                  <span className="text-amber-700"> · gerada há {diasDesde(c.created_at)} dia(s)</span>
                )}
              </p>
            </div>
            <span
              className={`pill ${c.status === 'paga' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
            >
              {c.status}
            </span>
          </Link>
        ))}
        {historico.length === 0 && (
          <p className="card p-6 text-center text-slate-400">Nenhuma cobrança gerada ainda.</p>
        )}
      </div>
    </div>
  );
}
