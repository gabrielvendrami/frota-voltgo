import { logout } from '@/app/admin/login/actions';

// Estas páginas consultam o banco e ficam atrás de login — nunca fazem
// sentido pré-renderizadas estaticamente no build.
export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-lg font-bold text-slate-900">⚡ VoltGo Frota</p>
          <form action={logout}>
            <button className="btn-secondary !min-h-[44px] !py-2 !px-4 text-sm">Sair</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
