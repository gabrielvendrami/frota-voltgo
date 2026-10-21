import Link from 'next/link';
import { ensureSchema, sql } from '@/lib/db';
import { diasAte, formatBRL, formatKm, inicioCicloAtual, proximaRevisao } from '@/lib/constants';

const TILES = [
  { href: '/admin/veiculos', icon: '🚗', label: 'Veículos', desc: 'Cadastro da frota' },
  { href: '/admin/motoristas', icon: '🧑', label: 'Motoristas', desc: 'Cadastro de motoristas' },
  { href: '/admin/vinculos', icon: '🔗', label: 'Vínculos', desc: 'Ligar motorista ao carro' },
  { href: '/admin/quilometragem', icon: '🛣', label: 'Quilometragem', desc: 'Registrar leituras de KM' },
  { href: '/admin/cobrancas', icon: '💸', label: 'Cobrança', desc: 'Gerar cobrança semanal' },
  { href: '/admin/multas', icon: '🚨', label: 'Multas', desc: 'Prazo para indicar o condutor' },
  { href: '/admin/contratos', icon: '📄', label: 'Contrato', desc: 'Gerar contrato do motorista' },
];

export default async function AdminHome() {
  await ensureSchema();

  const [veiculos, motoristas, vinculosAtivos, statusKm, cobrancasAbertas, multasAbertas] = await Promise.all([
    sql`SELECT COUNT(*)::int AS c FROM veiculos`,
    sql`SELECT COUNT(*)::int AS c FROM motoristas WHERE status = 'ativo'`,
    sql`SELECT COUNT(*)::int AS c FROM vinculos WHERE data_fim IS NULL`,
    sql`
      SELECT v.id, v.placa, v.dia_fechamento, v.ultima_revisao_marco, lk.data AS ultima_data, lk.km AS ultima_km
      FROM veiculos v
      LEFT JOIN LATERAL (
        SELECT data, km FROM leituras_km WHERE veiculo_id = v.id ORDER BY data DESC, created_at DESC LIMIT 1
      ) lk ON true
      WHERE v.status <> 'inativo'
      ORDER BY v.placa
    `,
    sql`
      SELECT c.id, c.valor_total, c.referencia_mes, v.placa, m.nome AS motorista_nome
      FROM cobrancas c
      JOIN veiculos v ON v.id = c.veiculo_id
      JOIN motoristas m ON m.id = c.motorista_id
      WHERE c.status <> 'paga'
      ORDER BY c.created_at ASC
    `,
    sql`
      SELECT mu.id, mu.prazo_indicacao, mu.valor, v.placa
      FROM multas mu
      JOIN veiculos v ON v.id = mu.veiculo_id
      WHERE mu.status = 'a_indicar'
      ORDER BY mu.prazo_indicacao ASC NULLS LAST
    `,
  ]);

  const stats = [
    { label: 'Veículos na frota', value: veiculos.rows[0]?.c ?? 0 },
    { label: 'Motoristas ativos', value: motoristas.rows[0]?.c ?? 0 },
    { label: 'Vínculos ativos', value: vinculosAtivos.rows[0]?.c ?? 0 },
  ];

  const pendentesKm = statusKm.rows.filter((v: any) => {
    const inicioCiclo = inicioCicloAtual(v.dia_fechamento ?? 1);
    return !v.ultima_data || new Date(v.ultima_data).toISOString().slice(0, 10) < inicioCiclo;
  });

  const revisoesProximas = statusKm.rows
    .filter((v: any) => v.ultima_km != null)
    .map((v: any) => ({ ...v, ...proximaRevisao(Number(v.ultima_km), Number(v.ultima_revisao_marco || 0)) }))
    .filter((v: any) => v.proxima)
    .sort((a: any, b: any) => a.faltam - b.faltam);

  const multas = multasAbertas.rows.map((m: any) => ({
    ...m,
    dias: m.prazo_indicacao ? diasAte(m.prazo_indicacao) : null,
  }));
  const multasUrgentes = multas.filter((m: any) => m.dias != null && m.dias <= 7);

  const cobrancas = cobrancasAbertas.rows;
  const totalEmAberto = cobrancas.reduce((acc: number, c: any) => acc + Number(c.valor_total), 0);

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

      {(pendentesKm.length > 0 || cobrancas.length > 0 || revisoesProximas.length > 0 || multas.length > 0) && (
        <div>
          <p className="text-lg font-semibold text-slate-900 mb-3">Pendências</p>
          <div className="space-y-2">
            {multas.length > 0 && (
              <Link
                href="/admin/multas"
                className={`card p-4 flex items-center justify-between gap-3 ${
                  multasUrgentes.length > 0 ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-200'
                }`}
              >
                <span className={`text-sm ${multasUrgentes.length > 0 ? 'text-red-800' : 'text-amber-800'}`}>
                  🚨 <span className="font-semibold">{multas.length}</span>{' '}
                  {multas.length === 1 ? 'multa' : 'multas'} sem condutor indicado
                  {multasUrgentes.length > 0 &&
                    ` — urgente: ${multasUrgentes
                      .map((m: any) => `${m.placa} (${m.dias < 0 ? `venceu há ${-m.dias}d` : m.dias === 0 ? 'vence hoje' : `${m.dias}d`})`)
                      .join(' · ')}`}
                </span>
                <span className="text-sm font-medium whitespace-nowrap">Ver →</span>
              </Link>
            )}
            {pendentesKm.length > 0 && (
              <Link href="/admin/quilometragem" className="card p-4 flex items-center justify-between gap-3 bg-amber-50 border-amber-200 hover:border-amber-300">
                <span className="text-sm text-amber-800">
                  ⏳ <span className="font-semibold">{pendentesKm.length}</span>{' '}
                  {pendentesKm.length === 1 ? 'veículo está' : 'veículos estão'} sem leitura de KM dessa semana (
                  {pendentesKm.map((v: any) => v.placa).join(', ')})
                </span>
                <span className="text-amber-700 text-sm font-medium whitespace-nowrap">Ver →</span>
              </Link>
            )}
            {cobrancas.length > 0 && (
              <Link href="/admin/cobrancas" className="card p-4 flex items-center justify-between gap-3 bg-blue-50 border-blue-200 hover:border-blue-300">
                <span className="text-sm text-blue-800">
                  💸 <span className="font-semibold">{cobrancas.length}</span>{' '}
                  {cobrancas.length === 1 ? 'cobrança em aberto' : 'cobranças em aberto'} — total{' '}
                  <span className="font-semibold">{formatBRL(totalEmAberto)}</span>
                </span>
                <span className="text-blue-700 text-sm font-medium whitespace-nowrap">Ver →</span>
              </Link>
            )}
            {revisoesProximas.length > 0 && (
              <Link href="/admin/veiculos" className="card p-4 flex items-center justify-between gap-3 bg-red-50 border-red-200 hover:border-red-300">
                <span className="text-sm text-red-800">
                  🔧 {revisoesProximas
                    .map((v: any) => `${v.placa} (${v.atrasada ? `atrasada ${formatKm(-v.faltam)}` : `faltam ${formatKm(v.faltam)}`})`)
                    .join(' · ')}{' '}
                  — revisão de fábrica
                </span>
                <span className="text-red-700 text-sm font-medium whitespace-nowrap">Ver →</span>
              </Link>
            )}
          </div>
        </div>
      )}

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
