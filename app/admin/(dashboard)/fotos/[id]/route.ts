import { NextRequest, NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';

// Serve a foto do hodômetro de uma leitura específica. Fica atrás do login
// (a rota cai em /admin/:path*, já protegido pelo middleware) porque o Blob
// é privado — buscamos o conteúdo aqui no servidor usando
// BLOB_READ_WRITE_TOKEN e devolvemos pro navegador, sem nunca expor a URL
// real do blob (que exigiria o token pra ser acessada diretamente).
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchema();

  const id = parseInt(params.id, 10);
  if (!id) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const { rows } = await sql`SELECT foto_url FROM leituras_km WHERE id = ${id}`;
  const fotoUrl: string | undefined = rows[0]?.foto_url;

  if (!fotoUrl) {
    return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 });
  }

  // Fallback local (dev sem Blob configurado) salva um caminho /uploads/...
  // servido direto pelo Next — nada pra buscar aqui.
  if (fotoUrl.startsWith('/')) {
    return NextResponse.redirect(new URL(fotoUrl, _request.url));
  }

  try {
    const { get } = await import('@vercel/blob');
    const blob = await get(fotoUrl, { access: 'private' });

    if (!blob || !blob.stream) {
      return NextResponse.json({ error: 'Foto não encontrada no armazenamento' }, { status: 404 });
    }

    return new NextResponse(blob.stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': blob.blob.contentType || 'image/jpeg',
        'Cache-Control': 'private, max-age=0, no-store',
      },
    });
  } catch (err) {
    console.error('Erro ao buscar foto no Vercel Blob:', err);
    return NextResponse.json({ error: 'Não foi possível carregar a foto agora.' }, { status: 502 });
  }
}
