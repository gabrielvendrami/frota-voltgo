import { NextRequest, NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';
import { gerarContratoDocx } from '@/lib/contract';
import {
  formatBRL,
  formatNumeroBR,
  KM_FRANQUIA_MENSAL,
  VALOR_KM_EXCEDENTE,
  FRANQUIA_SINISTRO_VALOR,
} from '@/lib/constants';
import { valorPorExtenso, centavosPorExtenso, dataPorExtenso } from '@/lib/extenso';

function formatDataBR(value: string | Date | null) {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export async function POST(request: NextRequest) {
  await ensureSchema();
  const formData = await request.formData();
  const vinculoId = parseInt(String(formData.get('vinculo_id') || ''), 10);

  if (!vinculoId) {
    return NextResponse.json({ error: 'Vínculo inválido' }, { status: 400 });
  }

  const { rows } = await sql`
    SELECT
      vi.id AS vinculo_id, vi.data_inicio,
      v.id AS veiculo_id, v.placa, v.modelo, v.cor, v.chassi,
      v.valor_locacao_semanal, v.valor_seguro_semanal,
      m.id AS motorista_id, m.nome, m.cpf, m.cnh, m.endereco, m.telefone
    FROM vinculos vi
    JOIN veiculos v ON v.id = vi.veiculo_id
    JOIN motoristas m ON m.id = vi.motorista_id
    WHERE vi.id = ${vinculoId} AND vi.data_fim IS NULL
  `;
  const v = rows[0];
  if (!v) {
    return NextResponse.json({ error: 'Vínculo não encontrado ou já encerrado' }, { status: 404 });
  }

  const valorLocacao = Number(v.valor_locacao_semanal || 0);
  const valorSeguro = Number(v.valor_seguro_semanal || 0);
  const valorTotal = Math.round((valorLocacao + valorSeguro) * 100) / 100;

  const buffer = gerarContratoDocx({
    nomeMotorista: v.nome,
    cpfMotorista: v.cpf || '-',
    cnhMotorista: v.cnh || '-',
    telefoneMotorista: v.telefone || '-',
    enderecoMotorista: v.endereco || '-',

    modeloVeiculo: v.modelo,
    corVeiculo: v.cor || '-',
    placaVeiculo: v.placa,
    chassiVeiculo: v.chassi || '-',

    dataInicioVinculo: formatDataBR(v.data_inicio),

    valorTotalSemanalFmt: formatBRL(valorTotal),
    valorTotalSemanalExtenso: valorPorExtenso(valorTotal),
    valorLocacaoSemanalFmt: formatBRL(valorLocacao),
    valorSeguroSemanalFmt: formatBRL(valorSeguro),

    kmFranquiaMensalFmt: formatNumeroBR(KM_FRANQUIA_MENSAL),
    valorKmExcedenteFmt: formatBRL(VALOR_KM_EXCEDENTE),
    valorKmExcedenteExtenso: centavosPorExtenso(VALOR_KM_EXCEDENTE),

    franquiaSinistroFmt: formatBRL(FRANQUIA_SINISTRO_VALOR),

    pixKey: process.env.PIX_KEY || '',

    dataContratoExtenso: dataPorExtenso(new Date()),
  });

  await sql`
    INSERT INTO contratos_gerados (motorista_id, veiculo_id, vinculo_id)
    VALUES (${v.motorista_id}, ${v.veiculo_id}, ${v.vinculo_id})
  `;

  const fileSafeName = `${v.placa}-${v.nome}`.replace(/[^a-zA-Z0-9-]+/g, '-');

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="contrato-${fileSafeName}.docx"`,
    },
  });
}
