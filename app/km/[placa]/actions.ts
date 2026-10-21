'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ensureSchema, sql } from '@/lib/db';
import { salvarFotoHodometro } from '@/lib/blob';

function normalizarPlaca(placa: string) {
  return placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export async function registrarKmMotorista(placaParam: string, formData: FormData) {
  await ensureSchema();

  const placaNorm = normalizarPlaca(placaParam);
  const kmRaw = String(formData.get('km') || '').trim();
  const km = kmRaw ? parseInt(kmRaw, 10) : NaN;
  const foto = formData.get('foto');

  const { rows } = await sql`
    SELECT id FROM veiculos WHERE UPPER(REGEXP_REPLACE(placa, '[^A-Za-z0-9]', '', 'g')) = ${placaNorm}
  `;
  const veiculo = rows[0];

  if (!veiculo) {
    redirect(`/km/${placaParam}?erro=veiculo`);
  }

  if (!kmRaw || Number.isNaN(km) || km <= 0) {
    redirect(`/km/${placaParam}?erro=km`);
  }

  const ultimaRes = await sql`
    SELECT km FROM leituras_km WHERE veiculo_id = ${veiculo.id}
    ORDER BY data DESC, created_at DESC LIMIT 1
  `;
  const ultima = ultimaRes.rows[0];
  if (ultima && km < Number(ultima.km)) {
    redirect(`/km/${placaParam}?erro=menor&ultima=${ultima.km}`);
  }

  if (!(foto instanceof File) || foto.size === 0) {
    redirect(`/km/${placaParam}?erro=foto`);
  }

  let fotoUrl: string;
  try {
    fotoUrl = await salvarFotoHodometro(foto as File, placaNorm);
  } catch {
    redirect(`/km/${placaParam}?erro=upload`);
  }

  await sql`
    INSERT INTO leituras_km (veiculo_id, data, km, foto_url, origem)
    VALUES (${veiculo.id}, CURRENT_DATE, ${km}, ${fotoUrl}, 'motorista')
  `;

  revalidatePath(`/km/${placaParam}`);
  revalidatePath('/admin/quilometragem');
  redirect(`/km/${placaParam}?ok=1`);
}
