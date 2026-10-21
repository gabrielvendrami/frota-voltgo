'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ensureSchema, sql } from '@/lib/db';
import { calcularExcedente, calcularKmDoMes } from '@/lib/billing';

export async function gerarCobranca(vinculoId: number, formData: FormData) {
  await ensureSchema();
  const valorSemanalRaw = String(formData.get('valor_semanal') || '').trim().replace(',', '.');
  const valorSemanal = Number(valorSemanalRaw);
  if (!valorSemanal || Number.isNaN(valorSemanal) || valorSemanal <= 0) return;

  const { rows } = await sql`
    SELECT vi.id AS vinculo_id, v.id AS veiculo_id, m.id AS motorista_id
    FROM vinculos vi
    JOIN veiculos v ON v.id = vi.veiculo_id
    JOIN motoristas m ON m.id = vi.motorista_id
    WHERE vi.id = ${vinculoId} AND vi.data_fim IS NULL
  `;
  const vinculo = rows[0];
  if (!vinculo) return;

  const referenciaMes = new Date().toISOString().slice(0, 7);
  const { kmMes } = await calcularKmDoMes(vinculo.veiculo_id, referenciaMes);
  const { kmExcedente, valorExcedente } = calcularExcedente(kmMes);
  const valorTotal = Math.round((valorSemanal + valorExcedente) * 100) / 100;

  const insert = await sql`
    INSERT INTO cobrancas
      (veiculo_id, motorista_id, vinculo_id, referencia_mes, valor_semanal, km_mes, km_excedente, valor_excedente, valor_total)
    VALUES
      (${vinculo.veiculo_id}, ${vinculo.motorista_id}, ${vinculo.vinculo_id}, ${referenciaMes}, ${valorSemanal}, ${kmMes}, ${kmExcedente}, ${valorExcedente}, ${valorTotal})
    RETURNING id
  `;

  revalidatePath('/admin/cobrancas');
  redirect(`/admin/cobrancas/${insert.rows[0].id}`);
}

export async function marcarComoPaga(id: number, _formData: FormData) {
  await ensureSchema();
  await sql`UPDATE cobrancas SET status = 'paga' WHERE id = ${id}`;
  revalidatePath('/admin/cobrancas');
  revalidatePath(`/admin/cobrancas/${id}`);
}
