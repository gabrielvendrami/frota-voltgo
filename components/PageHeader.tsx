import Link from 'next/link';

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <Link href="/admin" className="btn-secondary !min-h-[48px] !py-2.5 !px-4 text-sm mb-4 inline-flex">
        ← Início
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {subtitle && <p className="text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}
