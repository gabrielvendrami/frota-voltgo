import { ensureSchema, sql } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { formatBRL } from '@/lib/constants';

export default async function ContratosPage() {
  await ensureSchema();

  const [ativosRes, historicoRes] = await Promise.all([
    sql`
      SELECT
        vi.id AS vinculo_id, v.placa, v.modelo,
        v.valor_locacao_semanal, v.valor_seguro_semanal,
        m.nome AS motorista_nome
      FROM vinculos vi
      JOIN veiculos v ON v.id = vi.veiculo_id
      JOIN motoristas m ON m.id = vi.motorista_id
      WHERE vi.data_fim IS NULL
      ORDER BY v.placa
    `,
    sql`
      SELECT cg.created_at, v.placa, m.nome AS motorista_nome
      FROM contratos_gerados cg
      JOIN veiculos v ON v.id = cg.veiculo_id
      JOIN motoristas m ON m.id = cg.motorista_id
      ORDER BY cg.created_at DESC
      LIMIT 20
    `,
  ]);

  const ativos = ativosRes.rows;
  const historico = historicoRes.rows;

  return (
    <div>
      <PageHeader
        title="Contrato"
        subtitle="Gere o contrato de locação em .docx já preenchido com os dados do motorista e do veículo."
      />

      <p className="card p-4 text-sm text-slate-600 mb-6">
        O contrato é gerado a partir do modelo oficial em <code>templates/contrato-modelo.docx</code>.
        Os valores de locação e seguro usados vêm diretamente do cadastro do veículo — confira em{' '}
        <span className="font-medium">Veículos</span> antes de gerar, caso precise ajustar.
      </p>

      <div className="space-y-3 mb-8">
        {ativos.map((v: any) => {
          const valorLocacao = Number(v.valor_locacao_semanal || 0);
          const valorSeguro = Number(v.valor_seguro_semanal || 0);
          const valorTotal = valorLocacao + valorSeguro;
          return (
            <form
              key={v.vinculo_id}
              action="/api/contratos"
              method="POST"
              className="card p-5 flex flex-wrap items-center justify-between gap-4"
            >
              <input type="hidden" name="vinculo_id" value={v.vinculo_id} />
              <div className="flex-1 min-w-[160px]">
                <p className="font-bold text-slate-900">
                  {v.placa} <span className="font-normal text-slate-400">· {v.modelo}</span>
                </p>
                <p className="text-sm text-slate-500">{v.motorista_nome}</p>
              </div>
              <div className="text-sm text-slate-600 text-right">
                <p>Locação: {valorLocacao ? formatBRL(valorLocacao) : '-'}</p>
                <p>Seguro: {valorSeguro ? formatBRL(valorSeguro) : '-'}</p>
                <p className="font-semibold text-slate-900">Total/semana: {formatBRL(valorTotal)}</p>
              </div>
              <button type="submit" className="btn-primary">
                📄 Gerar contrato
              </button>
            </form>
          );
        })}
        {ativos.length === 0 && (
          <p className="card p-6 text-center text-slate-400">
            Nenhum vínculo ativo — vá em <span className="font-medium">Vínculos</span> para ligar um motorista a um veículo.
          </p>
        )}
      </div>

      {historico.length > 0 && (
        <>
          <p className="text-lg font-semibold text-slate-900 mb-3">Contratos já gerados</p>
          <div className="space-y-2">
            {historico.map((h: any, i: number) => (
              <div key={i} className="card p-4 text-sm text-slate-600">
                {h.placa} · {h.motorista_nome} ·{' '}
                {new Date(h.created_at).toLocaleDateString('pt-BR')}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
