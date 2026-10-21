'use client';

import { useEffect, useState } from 'react';

// Abre a foto numa janela (modal) na própria tela, sem sair da página.
export function FotoViewer({ src, label = 'ver foto' }: { src: string; label?: string }) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [aberto]);

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="text-blue-600 underline">
        {label}
      </button>
      {aberto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4"
          onClick={() => setAberto(false)}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Foto do hodômetro"
            className="max-h-[80vh] max-w-full rounded-xl object-contain bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          />
          <button type="button" onClick={() => setAberto(false)} className="btn-primary mt-4">
            Fechar
          </button>
        </div>
      )}
    </>
  );
}
