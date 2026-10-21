import fs from 'node:fs';
import path from 'node:path';

function extensaoDoArquivo(file: File): string {
  const porNome = (file.name || '').split('.').pop() || '';
  const limpa = porNome.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (limpa) return limpa;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

/**
 * Salva a foto do hodômetro enviada pelo motorista e devolve a URL pública
 * dela. Em produção (Vercel), usa o Vercel Blob — é só conectar o Blob ao
 * projeto (aba Storage → Create Database → Blob) que a variável
 * BLOB_READ_WRITE_TOKEN é injetada automaticamente.
 *
 * Sem essa variável, caímos num fallback que grava em `public/uploads/`
 * localmente — só serve para rodar/testar em ambiente local, já que o
 * sistema de arquivos da Vercel não é gravável/persistente em produção.
 */
export async function salvarFotoHodometro(file: File, placa: string): Promise<string> {
  const ext = extensaoDoArquivo(file);
  const placaLimpa = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const nomeArquivo = `odometro/${placaLimpa}-${Date.now()}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    const blob = await put(nomeArquivo, file, { access: 'public' });
    return blob.url;
  }

  if (process.env.NODE_ENV === 'production') {
    // Em produção (Vercel ou `next build && next start` local) o fallback de
    // gravar em public/ não funciona de forma confiável — ou o filesystem é
    // somente leitura (Vercel), ou o servidor já fixou a lista de arquivos de
    // public/ na subida e não enxerga os novos. Nesses casos, exige o Blob.
    throw new Error(
      'Envio de foto não configurado neste ambiente: conecte o Vercel Blob ao projeto ' +
        '(aba Storage → Create Database → Blob) e faça o redeploy.'
    );
  }

  // Fallback local (`npm run dev`) — grava em public/uploads/odometro.
  const dir = path.join(process.cwd(), 'public', 'uploads', 'odometro');
  fs.mkdirSync(dir, { recursive: true });
  const nomeLocal = `${placaLimpa}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(dir, nomeLocal), buffer);
  return `/uploads/odometro/${nomeLocal}`;
}
