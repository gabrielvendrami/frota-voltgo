'use client';

import { useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

const LADO_MAX = 1600; // px — suficiente pra ler o hodômetro e deixa a foto leve
const QUALIDADE = 0.75;

// Reduz a foto (fotos de celular passam de 5–10 MB) antes de enviar: evita
// estourar o limite de upload e deixa o envio rápido até no 4G fraco.
async function reduzirFoto(file: File): Promise<File> {
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const escala = Math.min(1, LADO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * escala);
    canvas.height = Math.round(img.naturalHeight * escala);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALIDADE));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], 'hodometro.jpg', { type: 'image/jpeg' });
  } catch {
    return file; // se o navegador não conseguir reduzir, manda a original
  }
}

function BotaoEnviar({ habilitado }: { habilitado: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={!habilitado || pending} className="btn-primary w-full text-lg disabled:opacity-50">
      {pending ? 'Enviando… aguarde' : 'Enviar'}
    </button>
  );
}

export function KmForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const campoFoto = useRef<HTMLInputElement>(null); // o campo que vai no envio (escondido)
  const [preview, setPreview] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  async function escolheuFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0];
    if (!original || !campoFoto.current) return;
    setProcessando(true);
    const final = await reduzirFoto(original);
    try {
      const dt = new DataTransfer();
      dt.items.add(final);
      campoFoto.current.files = dt.files;
      setPreview(URL.createObjectURL(final));
    } catch {
      setPreview(null);
    }
    setProcessando(false);
    e.target.value = ''; // permite escolher a mesma foto de novo, se precisar
  }

  return (
    <form action={action} className="card p-5 space-y-5">
      <div>
        <label htmlFor="km" className="label-lg block mb-2 text-base">
          1. Qual a quilometragem atual do carro?
        </label>
        <input
          id="km"
          name="km"
          type="number"
          inputMode="numeric"
          min={0}
          required
          placeholder="ex: 18540"
          className="field-lg text-xl text-center"
        />
      </div>

      <div>
        <p className="label-lg block mb-2 text-base">2. Foto do painel (hodômetro)</p>

        {/* campo que realmente vai no envio — preenchido pelos botões abaixo */}
        <input ref={campoFoto} name="foto" type="file" accept="image/*" className="hidden" tabIndex={-1} />

        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Foto escolhida" className="w-full max-h-64 object-contain rounded-xl bg-slate-100 mb-3" />
        )}

        <div className="grid grid-cols-1 gap-3">
          <label className="btn-secondary w-full cursor-pointer text-lg">
            📷 {preview ? 'Tirar outra foto' : 'Tirar foto agora'}
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={escolheuFoto} />
          </label>
          <label className="text-center text-sm text-blue-600 underline cursor-pointer py-2">
            ou escolher uma foto da galeria
            <input type="file" accept="image/*" className="sr-only" onChange={escolheuFoto} />
          </label>
        </div>
        {processando && <p className="text-sm text-slate-500 mt-2 text-center">Preparando a foto…</p>}
      </div>

      <BotaoEnviar habilitado={!!preview && !processando} />
      {!preview && <p className="text-xs text-center text-slate-400">O botão Enviar libera depois de escolher a foto.</p>}
    </form>
  );
}
