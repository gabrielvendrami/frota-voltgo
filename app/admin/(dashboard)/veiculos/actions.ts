'use server';

import { revalidatePath } from 'next/cache';
import { ensureSchema, sql } from '@/lib/db';

export async function createVeiculo(formData: FormData) {
  await ensureSchema();
  const placa = String(formData.get('placa') || '').trim().toUpperCase();
  const modelo = String(formData.get('modelo') || '').trim() || 'BYD Dolphin Mini';
  const cor = String(formData.get('cor') || '').trim();
  const anoRaw = String(formData.get('ano') || '').trim();
  const ano = anoRaw ? parseInt(anoRaw, 10) : null;
  const chassi = String(formData.get('chassi') || '').trim().toUpperCase();
  const renavam = String(formData.get('renavam') || '').trim();
  const valorLocacaoRaw = String(formData.get('valor_locacao_semanal') || '').trim();
  const valorLocacao = valorLocacaoRaw ? Number(valorLocacaoRaw.replace(',', '.')) : null;
  const valorSeguroRaw = String(formData.get('valor_seguro_semanal') || '').trim();
  const valorSeguro = valorSeguroRaw ? Number(valorSeguroRaw.replace(',', '.')) : null;

  if (!placa) return;

  await sql`
    INSERT INTO veiculos (placa, modelo, cor, ano, chassi, renavam, valor_locacao_semanal, valor_seguro_semanal)
    VALUES (${placa}, ${modelo}, ${cor}, ${ano}, ${chassi}, ${renavam}, ${valorLocacao}, ${valorSeguro})
  `;
  revalidatePath('/admin/veiculos');
  revalidatePath('/admin');
}

export async function updateVeiculoStatus(id: number, formData: FormData) {
  await ensureSchema();
  const status = String(formData.get('status') || 'disponivel');
  await sql`UPDATE veiculos SET status = ${status} WHERE id = ${id}`;
  revalidatePath('/admin/veiculos');
}

export async function deleteVeiculo(id: number, _formData: FormData) {
  await ensureSchema();
  await sql`DELETE FROM veiculos WHERE id = ${id}`;
  revalidatePath('/admin/veiculos');
  revalidatePath('/admin');
}
