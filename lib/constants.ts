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

/**
 * Próximo marco de revisão de fábrica (a cada 20.000 km, cláusula 4.2 do
 * contrato) a partir da última quilometragem conhecida, e quantos km faltam
 * pra chegar lá. Usado pra avisar com antecedência (cláusula 4.3 pede pelo
 * menos 1.000 km de aviso prévio).
 */
export function proximaRevisao(ultimoKm: number) {
  const PASSO = 20000;
  const proximoMarco = Math.ceil((ultimoKm + 1) / PASSO) * PASSO;
  const faltam = proximoMarco - ultimoKm;
  return { proximoMarco, faltam };
}

export function whatsappLinkTo(telefone: string, message: string) {
  const digits = telefone.replace(/\D/g, '');
  if (!digits) return '#';
  // Garante código do país (Brasil) quando o telefone foi digitado sem DDI.
  const withCountry = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}
