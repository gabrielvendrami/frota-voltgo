// Conversão de valores monetários para texto por extenso em português,
// usada no contrato (ex.: "R$ 1.500,00 (um mil e quinhentos reais)").
// Cobre o intervalo realista de valores de locação/franquia (até 999.999).

const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const DEZ_A_DEZENOVE = [
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze',
  'dezesseis', 'dezessete', 'dezoito', 'dezenove',
];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = [
  '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
  'seiscentos', 'setecentos', 'oitocentos', 'novecentos',
];

/** Converte um número de 0 a 999 em palavras (sem a palavra "mil"). */
function centenaPorExtenso(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';

  const centena = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];

  if (centena > 0) partes.push(CENTENAS[centena]);

  if (resto > 0) {
    if (resto < 10) {
      partes.push(UNIDADES[resto]);
    } else if (resto < 20) {
      partes.push(DEZ_A_DEZENOVE[resto - 10]);
    } else {
      const dezena = Math.floor(resto / 10);
      const unidade = resto % 10;
      partes.push(unidade > 0 ? `${DEZENAS[dezena]} e ${UNIDADES[unidade]}` : DEZENAS[dezena]);
    }
  }

  return partes.join(' e ');
}

/** Converte um inteiro de 0 a 999.999 em palavras (sem unidade monetária). */
function numeroPorExtenso(n: number): string {
  if (n === 0) return 'zero';

  const milhar = Math.floor(n / 1000);
  const resto = n % 1000;
  const partes: string[] = [];

  if (milhar > 0) {
    partes.push(milhar === 1 ? 'um mil' : `${centenaPorExtenso(milhar)} mil`);
  }

  if (resto > 0) {
    const restoPalavras = centenaPorExtenso(resto);
    // "mil e quinhentos" / "mil e cinquenta", mas "mil cento e vinte"
    // (sem "e" logo após "mil" quando o resto já tem centena com dezena/unidade).
    const precisaE = milhar > 0 && (resto < 100 || resto % 100 === 0);
    partes.push(precisaE ? `e ${restoPalavras}` : restoPalavras);
  }

  return partes.join(' ');
}

/** "R$ 1.500,00" -> "um mil e quinhentos reais". */
export function valorPorExtenso(valor: number): string {
  const reais = Math.floor(Math.round(valor * 100) / 100);
  const centavos = Math.round((valor - reais) * 100);

  let texto = `${numeroPorExtenso(reais)} ${reais === 1 ? 'real' : 'reais'}`;
  if (centavos > 0) {
    texto += ` e ${centenaPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`;
  }
  return texto;
}

/** Para valores menores que R$ 1 (ex.: tarifa por km): "(setenta centavos)". */
export function centavosPorExtenso(valor: number): string {
  const centavos = Math.round(valor * 100);
  return `${centenaPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`;
}

export function dataPorExtenso(date: Date): string {
  const texto = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  // "21 de outubro de 2026" — toLocaleDateString já retorna nesse formato em pt-BR.
  return texto;
}
