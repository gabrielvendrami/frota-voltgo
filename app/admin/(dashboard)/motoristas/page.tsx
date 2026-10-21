import { ensureSchema, sql } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { StatusSelect } from '@/components/StatusSelect';
import { createMotorista, deleteMotorista, updateMotoristaStatus } from './actions';

const STATUS_OPTIONS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
];

export default async function MotoristasPage() {
  await ensureSchema();
  const { rows } = await sql`
    SELECT m.*, v.placa AS veiculo_placa
    FROM motoristas m
    LEFT JOIN veiculos v ON v.motorista_id = m.id
    ORDER BY m.nome
  `;

  return (
    <div>
      <PageHeader title="Motoristas" subtitle="Cadastro dos motoristas parceiros." />

      <form
        key={`motorista-form-${rows.length}`}
        action={createMotorista}
        className="card p-5 grid gap-4 md:grid-cols-2 mb-6"
      >
        <div className="md:col-span-2">
          <label className="label-lg">Nome completo</label>
          <input name="nome" required className="field-lg mt-1" />
        </div>
        <div>
          <label className="label-lg">Telefone / WhatsApp</label>
          <input name="telefone" required placeholder="11999998888" className="field-lg mt-1" />
        </div>
        <div>
          <label className="label-lg">E-mail</label>
          <input name="email" type="email" className="field-lg mt-1" />
        </div>
        <div>
          <label className="label-lg">CPF</label>
          <input name="cpf" className="field-lg mt-1" />
        </div>
        <div>
          <label className="label-lg">CNH</label>
          <input name="cnh" className="field-lg mt-1" />
        </div>
        <div>
          <label className="label-lg">Data de nascimento</label>
          <input name="data_nascimento" type="date" className="field-lg mt-1" />
        </div>
        <div className="md:col-span-2">
          <label className="label-lg">Endereço</label>
          <input name="endereco" className="field-lg mt-1" placeholder="Rua, número, bairro, cidade/UF" />
        </div>
        <button type="submit" className="btn-primary md:col-span-2">
          + Adicionar motorista
        </button>
      </form>

      <div className="space-y-3">
        {rows.map((m: any) => (
          <div key={m.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-slate-900">{m.nome}</p>
                <p className="text-sm text-slate-500">{m.telefone}</p>
              </div>
              <span
                className={`pill ${
                  m.status === 'ativo' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {m.status}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600 mt-4">
              <div>
                <dt className="text-xs text-slate-400">CPF</dt>
                <dd>{m.cpf || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">CNH</dt>
                <dd>{m.cnh || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Nascimento</dt>
                <dd>{m.data_nascimento ? new Date(m.data_nascimento).toLocaleDateString('pt-BR') : '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">E-mail</dt>
                <dd>{m.email || '-'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-slate-400">Endereço</dt>
                <dd>{m.endereco || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Veículo vinculado</dt>
                <dd>{m.veiculo_placa || '-'}</dd>
              </div>
            </dl>

            <div className="flex items-center justify-between gap-3 mt-4">
              <StatusSelect value={m.status} options={STATUS_OPTIONS} action={updateMotoristaStatus.bind(null, m.id)} />
              <form action={deleteMotorista.bind(null, m.id)}>
                <button className="text-red-600 text-sm font-medium">Excluir</button>
              </form>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="card p-6 text-center text-slate-400">Nenhum motorista cadastrado ainda.</p>
        )}
      </div>
    </div>
  );
}
