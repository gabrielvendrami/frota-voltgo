// Gerador de código Pix "copia e cola" (BR Code / EMV QRCPS-MPM) estático,
// com valor fixo. Implementação pura (sem dependências externas) seguindo o
// manual de padrões para iniciação do Pix do Banco Central.
//
// Referência de campos usados:
//  00 Payload Format Indicator        "01"
//  01 Point of Initiation Method      "12" (uso único, valor fixo)
//  26 Merchant Account Information    GUI + chave + (opcional) descrição
//  52 Merchant Category Code         "0000"
//  53 Transaction Currency           "986" (BRL)
//  54 Transaction Amount             valor com 2 casas decimais
//  58 Country Code                   "BR"
//  59 Merchant Name                  até 25 caracteres
//  60 Merchant City                  até 15 caracteres
//  62 Additional Data Field Template  05 = txid (referência)
//  63 CRC16                          calculado por último

function sanitize(value: string, maxLen: number) {
  const noAccents = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const cleaned = noAccents
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, maxLen) || 'NA';
}

function sanitizeTxid(value: string, maxLen = 25) {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (cleaned.slice(0, maxLen) || '***') as string;
}

function sanitizeKey(value: string) {
  const trimmed = value.trim();
  // CPF/CNPJ costumam vir com pontuação (., -, /) — normaliza para só dígitos.
  if (/^[\d.\-/]+$/.test(trimmed)) {
    return trimmed.replace(/\D/g, '');
  }
  return trimmed;
}

function tlv(id: string, value: string) {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface PixPayloadInput {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  description?: string;
  txid?: string;
}

export function gerarPixCopiaECola({
  pixKey,
  merchantName,
  merchantCity,
  amount,
  description,
  txid,
}: PixPayloadInput): string {
  const key = sanitizeKey(pixKey);
  const name = sanitize(merchantName, 25);
  const city = sanitize(merchantCity, 15);
  const amountStr = amount.toFixed(2);

  const merchantAccountParts = [tlv('00', 'br.gov.bcb.pix'), tlv('01', key)];
  if (description) {
    merchantAccountParts.push(tlv('02', sanitize(description, 35)));
  }
  const merchantAccountInfo = merchantAccountParts.join('');

  const additionalData = tlv('05', sanitizeTxid(txid || '***'));

  const fieldsWithoutCrc =
    tlv('00', '01') +
    tlv('01', '12') +
    tlv('26', merchantAccountInfo) +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('54', amountStr) +
    tlv('58', 'BR') +
    tlv('59', name) +
    tlv('60', city) +
    tlv('62', additionalData);

  // O CRC é calculado incluindo o próprio prefixo "6304" do campo do CRC.
  const toCrc = `${fieldsWithoutCrc}6304`;
  const crc = crc16(toCrc);

  return `${fieldsWithoutCrc}63${'04'}${crc}`;
}
