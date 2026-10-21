'use client';

import { useState } from 'react';

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard pode falhar em contexto não-seguro/sem permissão — ignora.
    }
  }

  return (
    <button type="button" onClick={handleCopy} className="btn-secondary w-full">
      {copied ? '✓ Copiado!' : label}
    </button>
  );
}
