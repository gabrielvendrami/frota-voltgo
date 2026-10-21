// Sessão de admin simples via cookie assinado (HMAC-SHA256), sem dependências
// externas e sem `Buffer` — assim funciona tanto no runtime Node (Server
// Actions) quanto no runtime Edge (middleware).

export const SESSION_COOKIE = 'frota_admin_session';
const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_MAX_AGE = SEVEN_DAYS_SECONDS;

const encoder = new TextEncoder();

function getSecret() {
  return process.env.SESSION_SECRET || 'frota-dev-secret-troque-em-producao';
}

function toBase64Url(str: string) {
  const utf8 = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  const b64 = btoa(utf8);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const percentEncoded = Array.prototype.map
    .call(binary, (c: string) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
  return decodeURIComponent(percentEncoded);
}

function bufToHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacHex(data: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return bufToHex(sig);
}

export async function createSessionToken(username: string) {
  const payload = JSON.stringify({ u: username, exp: Date.now() + SEVEN_DAYS_SECONDS * 1000 });
  const encoded = toBase64Url(payload);
  const sig = await hmacHex(encoded);
  return `${encoded}.${sig}`;
}

export async function verifySessionToken(token: string | undefined | null) {
  if (!token) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;

  const expected = await hmacHex(encoded);
  if (expected !== sig) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as { u: string; exp: number };
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
