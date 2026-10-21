'use server';

import { revalidatePath } from 'next/cache';
import { ensureSchema, sql } from '@/lib/db';

export async function createMotorista(formData: FormData) {
  await ensureSchema();
  const nome = String(formData.get('nome') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const cpf = String(formData.get('cpf') || '').trim();
  const cnh = String(formData.get('cnh') || '').trim();
  const endereco = String(formData.get('endereco') || '').trim();
  const nascimento = String(formData.get('data_nascimento') || '').trim();
  const telefone = String(formData.get('telefone') || '').trim();

  if (!nome || !telefone) return;

  await sql`
    INSERT INTO motoristas (nome, email, cpf, cnh, endereco, data_nascimento, telefone)
    VALUES (${nome}, ${email}, ${cpf}, ${cnh}, ${endereco}, ${nascimento || null}, ${telefone})
  `;
  revalidatePath('/admin/motoristas');
  revalidatePath('/admin');
}

export async function updateMotoristaStatus(id: number, formData: FormData) {
  await ensureSchema();
  const status = String(formData.get('status') || 'ativo');
  await sql`UPDATE motoristas SET status = ${status} WHERE id = ${id}`;
  revalidatePath('/admin/motoristas');
  revalidatePath('/admin');
}

export async function deleteMotorista(id: number, _formData: FormData) {
  await ensureSchema();
  await sql`DELETE FROM motoristas WHERE id = ${id}`;
  revalidatePath('/admin/motoristas');
  revalidatePath('/admin');
}
