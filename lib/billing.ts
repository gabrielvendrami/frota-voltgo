import { sql } from './db';
import { KM_FRANQUIA_MENSAL, VALOR_KM_EXCEDENTE } from './constants';

/**
 * Calcula o KM rodado por um veículo dentro de um mês de referência
 * ("YYYY-MM"), usando as leituras de hodômetro registradas.
 *
 * Lógica: KM do mês = (última leitura dentro do mês) - (última leitura
 * anterior ao mês). Se não existir leitura anterior (primeiro mês do
 * veículo), usa a primeira leitura do próprio mês como base — nesse caso
 * o KM do primeiro mês tende a ficar subestimado até haver histórico.
 */
export async function calcularKmDoMes(veiculoId: number, referenciaMes: string) {
  const inicioMes = `${referenciaMes}-01`;

  const ultimaDoMes = await sql`
    SELECT km FROM leituras_km
    WHERE veiculo_id = ${veiculoId}
      AND data >= ${inicioMes}::date
      AND data < (${inicioMes}::date + interval '1 month')
    ORDER BY data DESC, created_at DESC
    LIMIT 1
  `;

  if (ultimaDoMes.rows.length === 0) {
    return { kmMes: 0, temLeituras: false as const };
  }

  const baselineAnterior = await sql`
    SELECT km FROM leituras_km
    WHERE veiculo_id = ${veiculoId} AND data < ${inicioMes}::date
    ORDER BY data DESC, created_at DESC
    LIMIT 1
  `;

  let baseline: number;
  if (baselineAnterior.rows.length > 0) {
    baseline = baselineAnterior.rows[0].km;
  } else {
    const primeiraDoMes = await sql`
      SELECT km FROM leituras_km
      WHERE veiculo_id = ${veiculoId}
        AND data >= ${inicioMes}::date
        AND data < (${inicioMes}::date + interval '1 month')
      ORDER BY data ASC, created_at ASC
      LIMIT 1
    `;
    baseline = primeiraDoMes.rows[0].km;
  }

  const kmFim = ultimaDoMes.rows[0].km;
  const kmMes = Math.max(0, kmFim - baseline);
  return { kmMes, temLeituras: true as const };
}

export function calcularExcedente(kmMes: number) {
  const kmExcedente = Math.max(0, kmMes - KM_FRANQUIA_MENSAL);
  const valorExcedente = Math.round(kmExcedente * VALOR_KM_EXCEDENTE * 100) / 100;
  return { kmExcedente, valorExcedente };
}
