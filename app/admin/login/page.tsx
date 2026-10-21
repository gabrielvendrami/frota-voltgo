import { login } from './actions';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  const next = searchParams.next || '/admin';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form action={login} className="w-full max-w-sm card p-8 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">VoltGo Frota</h1>
          <p className="text-base text-slate-500 mt-1">Entre para acessar o painel.</p>
        </div>

        {searchParams.error === '1' && (
          <p className="text-sm text-red-700 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3">
            Usuário ou senha inválidos. Tente novamente.
          </p>
        )}

        <input type="hidden" name="next" value={next} />

        <div className="space-y-1.5">
          <label className="label-lg">Usuário</label>
          <input name="username" required autoFocus className="field-lg" />
        </div>
        <div className="space-y-1.5">
          <label className="label-lg">Senha</label>
          <input type="password" name="password" required className="field-lg" />
        </div>

        <button type="submit" className="btn-primary w-full">
          Entrar
        </button>

        <p className="text-xs text-slate-400">
          Padrão inicial: admin / admin — troque em <code>ADMIN_USER</code> / <code>ADMIN_PASSWORD</code>.
        </p>
      </form>
    </div>
  );
}
