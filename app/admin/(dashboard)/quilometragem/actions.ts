'use server';

import { revalidatePath } from 'next/cache';
import { ensureSchema, sql } from '@/lib/db';

export async function createLeituraKm(formData: FormData) {
  await ensureSchema();
  const veiculoId = parseInt(String(formData.get('veiculo_id') || ''), 10);
  const data = String(formData.get('data') || '');
  const kmRaw = String(formData.get('km') || '').trim();
  const km = kmRaw ? parseInt(kmRaw, 10) : NaN;
  const observacao = String(formData.get('observacao') || '').trim();

  if (!veiculoId || !data || Number.isNaN(km)) return;

  await sql`
    INSERT INTO leituras_km (veiculo_id, data, km, observacao)
    VALUES (${veiculoId}, ${data}, ${km}, ${observacao})
  `;
  revalidatePath('/admin/quilometragem');
}

export async function deleteLeituraKm(id: number, _formData: FormData) {
  await ensureSchema();
  await sql`DELETE FROM leituras_km WHERE id = ${id}`;
  revalidatePath('/admin/quilometragem');
}
