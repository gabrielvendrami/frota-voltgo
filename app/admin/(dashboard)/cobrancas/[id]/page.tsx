import { ensureSchema, sql } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { CopyButton } from '@/components/CopyButton';
import {
  formatBRL,
  formatKm,
  formatMesExtenso,
  whatsappLinkTo,
  KM_FRANQUIA_MENSAL,
  VALOR_KM_EXCEDENTE,
  PIX_KEY,
  PIX_MERCHANT_NAME,
  PIX_MERCHANT_CITY,
} from '@/lib/constants';
import { gerarPixCopiaECola } from '@/lib/pix';
import { marcarComoPaga } from '../actions';

export default async function CobrancaDetalhePage({ params }: { params: { id: string } }) {
  await ensureSchema();

  const { rows } = await sql`
    SELECT c.*, v.placa, m.nome AS motorista_nome, m.telefone
    FROM cobrancas c
    JOIN veiculos v ON v.id = c.veiculo_id
    JOIN motoristas m ON m.id = c.motorista_id
    WHERE c.id = ${params.id}
  `;
  const c = rows[0];

  if (!c) {
    return (
      <div>
        <PageHeader title="Cobrança não encontrada" />
      </div>
    );
  }

  const pixCode = gerarPixCopiaECola({
    pixKey: PIX_KEY,
    merchantName: PIX_MERCHANT_NAME,
    merchantCity: PIX_MERCHANT_CITY,
    amount: Number(c.valor_total),
    description: `Locacao ${c.placa}`,
    txid: `COB${c.id}`,
  });

  const linhas = [
    `Olá ${c.motorista_nome}! 👋`,
    '',
    `Segue a cobrança da locação do veículo *${c.placa}* referente a ${formatMesExtenso(c.referencia_mes)}:`,
    '',
    `💰 Valor semanal: ${formatBRL(Number(c.valor_semanal))}`,
  ];

  if (Number(c.km_excedente) > 0) {
    linhas.push(
      `🚗 KM rodado no mês: ${formatKm(Number(c.km_mes))} (franquia: ${formatKm(KM_FRANQUIA_MENSAL)})`,
      `⚠️ KM excedente: ${formatKm(Number(c.km_excedente))} × ${formatBRL(VALOR_KM_EXCEDENTE)} = ${formatBRL(Number(c.valor_excedente))}`
    );
  }

  linhas.push(
    '',
    `*Total a pagar: ${formatBRL(Number(c.valor_total))}*`,
    '',
    'Pix copia e cola (copie e cole no app do seu banco):',
    pixCode,
    '',
    'Qualquer dúvida, estou à disposição!'
  );

  const mensagem = linhas.join('\n');
  const waLink = whatsappLinkTo(c.telefone, mensagem);

  return (
    <div>
      <PageHeader
        title="Cobrança gerada"
        subtitle={`${c.placa} · ${c.motorista_nome}`}
        backHref="/admin/cobrancas"
        backLabel="Cobranças"
      />

      <div className="card p-5 mb-5">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Referência</dt>
            <dd className="font-medium">{formatMesExtenso(c.referencia_mes)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Valor semanal</dt>
            <dd className="font-medium">{formatBRL(Number(c.valor_semanal))}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">KM rodado no mês</dt>
            <dd className="font-medium">{formatKm(Number(c.km_mes))}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">KM excedente</dt>
            <dd className="font-medium">{formatKm(Number(c.km_excedente))}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Valor excedente</dt>
            <dd className="font-medium">{formatBRL(Number(c.valor_excedente))}</dd>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-100 text-base">
            <dt className="font-semibold text-slate-900">Total</dt>
            <dd className="font-bold text-slate-900">{formatBRL(Number(c.valor_total))}</dd>
          </div>
        </dl>
      </div>

      <div className="space-y-3">
        <a href={waLink} target="_blank" rel="noreferrer" className="btn-primary w-full">
          Enviar no WhatsApp ↗
        </a>
        <CopyButton text={mensagem} label="Copiar mensagem" />
        <CopyButton text={pixCode} label="Copiar código Pix" />

        {c.status !== 'paga' ? (
          <form action={marcarComoPaga.bind(null, c.id)}>
            <button type="submit" className="btn-secondary w-full">
              ✓ Marcar como paga
            </button>
          </form>
        ) : (
          <p className="pill bg-emerald-50 text-emerald-700 w-full justify-center py-3">Paga</p>
        )}
      </div>

      <details className="card p-4 mt-5">
        <summary className="text-sm font-medium text-slate-600 cursor-pointer">Ver mensagem completa</summary>
        <pre className="whitespace-pre-wrap text-xs text-slate-600 mt-3 font-sans">{mensagem}</pre>
      </details>
    </div>
  );
}
