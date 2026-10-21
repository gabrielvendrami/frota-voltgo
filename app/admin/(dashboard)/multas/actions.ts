'use server';

import { revalidatePath } from 'next/cache';
import { ensureSchema, sql } from '@/lib/db';

export async function createMulta(formData: FormData) {
  await ensureSchema();
  const veiculoId = parseInt(String(formData.get('veiculo_id') || ''), 10);
  const dataInfracao = String(formData.get('data_infracao') || '').trim();
  const valorRaw = String(formData.get('valor') || '').trim().replace(',', '.');
  const valor = valorRaw ? Number(valorRaw) : 0;
  const prazo = String(formData.get('prazo_indicacao') || '').trim();
  const descricao = String(formData.get('descricao') || '').trim();
  const motoristaRaw = String(formData.get('motorista_id') || '').trim();

  if (!veiculoId || !dataInfracao || Number.isNaN(valor)) return;

  // Sem motorista escolhido: usa quem estava com o carro na data da infração
  // (vínculo que cobria aquele dia).
  let motoristaId: number | null = motoristaRaw ? parseInt(motoristaRaw, 10) : null;
  if (!motoristaId) {
    const { rows } = await sql`
      SELECT motorista_id FROM vinculos
      WHERE veiculo_id = ${veiculoId}
        AND data_inicio <= ${dataInfracao}::date
        AND (data_fim IS NULL OR data_fim >= ${dataInfracao}::date)
      ORDER BY data_inicio DESC
      LIMIT 1
    `;
    motoristaId = rows[0]?.motorista_id ?? null;
  }

  await sql`
    INSERT INTO multas (veiculo_id, motorista_id, data_infracao, descricao, valor, prazo_indicacao)
    VALUES (${veiculoId}, ${motoristaId}, ${dataInfracao}, ${descricao}, ${valor}, ${prazo || null})
  `;
  revalidatePath('/admin/multas');
  revalidatePath('/admin');
}

export async function updateMultaStatus(id: number, formData: FormData) {
  await ensureSchema();
  const status = String(formData.get('status') || 'a_indicar');
  await sql`UPDATE multas SET status = ${status} WHERE id = ${id}`;
  revalidatePath('/admin/multas');
  revalidatePath('/admin');
}

export async function deleteMulta(id: number, _formData: FormData) {
  await ensureSchema();
  await sql`DELETE FROM multas WHERE id = ${id}`;
  revalidatePath('/admin/multas');
  revalidatePath('/admin');
}
