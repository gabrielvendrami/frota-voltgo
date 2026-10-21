import Link from 'next/link';
import { ensureSchema, sql } from '@/lib/db';

const TILES = [
  { href: '/admin/veiculos', icon: '🚗', label: 'Veículos', desc: 'Cadastro da frota' },
  { href: '/admin/motoristas', icon: '🧑', label: 'Motoristas', desc: 'Cadastro de motoristas' },
  { href: '/admin/vinculos', icon: '🔗', label: 'Vínculos', desc: 'Ligar motorista ao carro' },
  { href: '/admin/quilometragem', icon: '🛣', label: 'Quilometragem', desc: 'Registrar leituras de KM' },
  { href: '/admin/cobrancas', icon: '💸', label: 'Cobrança', desc: 'Gerar cobrança semanal' },
  { href: '/admin/contratos', icon: '📄', label: 'Contrato', desc: 'Gerar contrato do motorista' },
];

export default async function AdminHome() {
  await ensureSchema();

  const [veiculos, motoristas, vinculosAtivos] = await Promise.all([
    sql`SELECT COUNT(*)::int AS c FROM veiculos`,
    sql`SELECT COUNT(*)::int AS c FROM motoristas WHERE status = 'ativo'`,
    sql`SELECT COUNT(*)::int AS c FROM vinculos WHERE data_fim IS NULL`,
  ]);

  const stats = [
    { label: 'Veículos na frota', value: veiculos.rows[0]?.c ?? 0 },
    { label: 'Motoristas ativos', value: motoristas.rows[0]?.c ?? 0 },
    { label: 'Vínculos ativos', value: vinculosAtivos.rows[0]?.c ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-lg font-semibold text-slate-900 mb-4">O que você quer fazer?</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {TILES.map((t) => (
            <Link key={t.href} href={t.href} className="tile min-h-[140px]">
              <span className="text-4xl">{t.icon}</span>
              <span className="font-semibold text-slate-900">{t.label}</span>
              <span className="text-xs text-slate-500">{t.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
