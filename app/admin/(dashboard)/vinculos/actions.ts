'use server';

import { revalidatePath } from 'next/cache';
import { ensureSchema, sql } from '@/lib/db';

export async function criarVinculo(formData: FormData) {
  await ensureSchema();
  const veiculoId = parseInt(String(formData.get('veiculo_id') || ''), 10);
  const motoristaId = parseInt(String(formData.get('motorista_id') || ''), 10);
  const dataInicio = String(formData.get('data_inicio') || '').trim();

  if (!veiculoId || !motoristaId || !dataInicio) return;

  // Evita dois vínculos ativos para o mesmo veículo ou motorista ao mesmo tempo.
  const existente = await sql`
    SELECT id FROM vinculos
    WHERE data_fim IS NULL AND (veiculo_id = ${veiculoId} OR motorista_id = ${motoristaId})
  `;
  if (existente.rows.length > 0) return;

  await sql`
    INSERT INTO vinculos (veiculo_id, motorista_id, data_inicio)
    VALUES (${veiculoId}, ${motoristaId}, ${dataInicio})
  `;
  await sql`UPDATE veiculos SET motorista_id = ${motoristaId}, status = 'em uso' WHERE id = ${veiculoId}`;

  revalidatePath('/admin/vinculos');
  revalidatePath('/admin/veiculos');
  revalidatePath('/admin/motoristas');
  revalidatePath('/admin');
}

export async function encerrarVinculo(id: number, _formData: FormData) {
  await ensureSchema();
  const { rows } = await sql`SELECT * FROM vinculos WHERE id = ${id}`;
  const vinculo = rows[0];
  if (!vinculo) return;

  await sql`UPDATE vinculos SET data_fim = CURRENT_DATE WHERE id = ${id}`;
  await sql`UPDATE veiculos SET motorista_id = NULL, status = 'disponivel' WHERE id = ${vinculo.veiculo_id}`;

  revalidatePath('/admin/vinculos');
  revalidatePath('/admin/veiculos');
  revalidatePath('/admin/motoristas');
  revalidatePath('/admin');
}
