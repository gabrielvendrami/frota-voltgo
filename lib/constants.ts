export const BRAND = {
  name: 'VoltGo Frota',
};

export const KM_FRANQUIA_MENSAL = Number(process.env.KM_FRANQUIA_MENSAL || 8000);
// O contrato que você mandou usa R$ 0,70/km (a mensagem original tinha dito
// R$ 0,75) — segui o valor do contrato como padrão. Ajuste a env var se
// R$ 0,75 for o valor certo; tanto a cobrança quanto o texto do contrato
// usam essa mesma variável, então não precisa editar o .docx para corrigir.
export const VALOR_KM_EXCEDENTE = Number(process.env.VALOR_KM_EXCEDENTE || 0.7);
// Franquia do seguro em caso de sinistro (Cláusula 3.2 do contrato).
export const FRANQUIA_SINISTRO_VALOR = Number(process.env.FRANQUIA_SINISTRO_VALOR || 8845);

// Dados do Pix. Valem os da variável de ambiente (Vercel → Settings →
// Environment Variables); se ela não estiver definida (ou estiver em branco),
// cai nestes padrões — assim nunca sai um código "copia e cola" com chave vazia.
export const PIX_KEY = (process.env.PIX_KEY || '').trim() || '06914540000167';
export const PIX_MERCHANT_NAME = (process.env.PIX_MERCHANT_NAME || '').trim() || 'EDINALDO ALVES RIBEIRO';
export const PIX_MERCHANT_CITY = (process.env.PIX_MERCHANT_CITY || '').trim() || 'BAURU SP';

export function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatKm(value: number) {
  return `${value.toLocaleString('pt-BR')} km`;
}

export function formatNumeroBR(value: number) {
  return value.toLocaleString('pt-BR');
}

export function formatMesExtenso(referenciaMes: string) {
  const [ano, mes] = referenciaMes.split('-').map(Number);
  const date = new Date(Date.UTC(ano, (mes || 1) - 1, 1));
  const texto = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function nomeDiaSemana(dia: number): string {
  return DIAS_SEMANA[dia] ?? DIAS_SEMANA[1];
}

/**
 * Data (YYYY-MM-DD) do início do ciclo semanal atual de um veículo, em UTC.
 * Cada veículo tem seu próprio "dia de fechamento" (0=domingo ... 6=sábado,
 * configurável em Veículos) — é nesse dia que o motorista deve mandar a
 * leitura de KM pra fechar a semana anterior. O início do ciclo é a
 * ocorrência mais recente desse dia da semana, igual ou anterior a
 * `referencia` (hoje, por padrão).
 */
export function inicioCicloAtual(diaFechamento: number, referencia: Date = new Date()): string {
  const d = new Date(Date.UTC(referencia.getUTCFullYear(), referencia.getUTCMonth(), referencia.getUTCDate()));
  const diaAtual = d.getUTCDay();
  const diff = (diaAtual - diaFechamento + 7) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

export const REVISAO_PASSO_KM = 20000;
// Avisar quando faltar isto (ou menos) pra revisão. O contrato (cláusula 4.3)
// exige aviso com pelo menos 1.000 km de antecedência.
export const REVISAO_AVISO_KM = 1000;

/**
 * Situação da revisão de fábrica (a cada 20.000 km, cláusula 4.2 do contrato).
 * `marcoFeito` é o último marco já revisado (0 = nenhuma revisão feita ainda);
 * a próxima é sempre o marco seguinte. `faltam` fica negativo quando o carro
 * já passou do marco sem a revisão ter sido marcada como feita (atrasada).
 */
export function proximaRevisao(ultimoKm: number, marcoFeito: number = 0) {
  const proximoMarco = marcoFeito + REVISAO_PASSO_KM;
  const faltam = proximoMarco - ultimoKm;
  return {
    proximoMarco,
    faltam,
    atrasada: faltam < 0,
    proxima: faltam <= REVISAO_AVISO_KM, // dentro da janela de aviso (inclui atrasada)
  };
}

/** Dias entre hoje (UTC) e uma data YYYY-MM-DD/Date. Negativo = já passou. */
export function diasAte(data: string | Date): number {
  const alvo = new Date(data);
  const alvoUtc = Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth(), alvo.getUTCDate());
  const hoje = new Date();
  const hojeUtc = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
  return Math.round((alvoUtc - hojeUtc) / 86400000);
}

export function whatsappLinkTo(telefone: string, message: string) {
  const digits = telefone.replace(/\D/g, '');
  if (!digits) return '#';
  // Garante código do país (Brasil) quando o telefone foi digitado sem DDI.
  const withCountry = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}
