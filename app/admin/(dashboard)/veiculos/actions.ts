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
  const diaFechamentoRaw = String(formData.get('dia_fechamento') || '').trim();
  const diaFechamento = diaFechamentoRaw ? parseInt(diaFechamentoRaw, 10) : 1;

  if (!placa) return;

  await sql`
    INSERT INTO veiculos (placa, modelo, cor, ano, chassi, renavam, valor_locacao_semanal, valor_seguro_semanal, dia_fechamento)
    VALUES (${placa}, ${modelo}, ${cor}, ${ano}, ${chassi}, ${renavam}, ${valorLocacao}, ${valorSeguro}, ${diaFechamento})
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

export async function updateDiaFechamento(id: number, formData: FormData) {
  await ensureSchema();
  const diaFechamento = parseInt(String(formData.get('dia_fechamento') || '1'), 10);
  await sql`UPDATE veiculos SET dia_fechamento = ${diaFechamento} WHERE id = ${id}`;
  revalidatePath('/admin/veiculos');
  revalidatePath('/admin/quilometragem');
  revalidatePath('/admin');
}

export async function deleteVeiculo(id: number, _formData: FormData) {
  await ensureSchema();
  await sql`DELETE FROM veiculos WHERE id = ${id}`;
  revalidatePath('/admin/veiculos');
  revalidatePath('/admin');
}
