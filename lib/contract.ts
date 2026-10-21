import fs from 'node:fs';
import path from 'node:path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { CONTRACT_TEMPLATE_FALLBACK_BASE64 } from './contract-template-fallback';

export interface ContratoDados {
  // Motorista (LOCATÁRIO)
  nomeMotorista: string;
  cpfMotorista: string;
  cnhMotorista: string;
  telefoneMotorista: string;
  enderecoMotorista: string;

  // Veículo
  modeloVeiculo: string;
  corVeiculo: string;
  placaVeiculo: string;
  chassiVeiculo: string;

  // Vínculo / prazo
  dataInicioVinculo: string;

  // Valores (cláusula 2.2)
  valorTotalSemanalFmt: string;
  valorTotalSemanalExtenso: string;
  valorLocacaoSemanalFmt: string;
  valorSeguroSemanalFmt: string;

  // Quilometragem (cláusula 2.5)
  kmFranquiaMensalFmt: string;
  valorKmExcedenteFmt: string;
  valorKmExcedenteExtenso: string;

  // Franquia do seguro (cláusula 3.2)
  franquiaSinistroFmt: string;

  // Pix (cláusula 2.3)
  pixKey: string;

  // Data de assinatura
  dataContratoExtenso: string;
}

function loadTemplateBuffer(): Buffer {
  const templatePath = path.join(process.cwd(), 'templates', 'contrato-modelo.docx');
  try {
    return fs.readFileSync(templatePath);
  } catch {
    // Em alguns ambientes serverless o arquivo pode não ter sido incluído no
    // bundle — usamos a cópia embutida como rede de segurança.
    return Buffer.from(CONTRACT_TEMPLATE_FALLBACK_BASE64, 'base64');
  }
}

export function gerarContratoDocx(dados: ContratoDados): Buffer {
  const content = loadTemplateBuffer();
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render({
    nome_motorista: dados.nomeMotorista,
    cpf_motorista: dados.cpfMotorista,
    cnh_motorista: dados.cnhMotorista,
    telefone_motorista: dados.telefoneMotorista,
    endereco_motorista: dados.enderecoMotorista,

    modelo_veiculo: dados.modeloVeiculo,
    cor_veiculo: dados.corVeiculo,
    placa_veiculo: dados.placaVeiculo,
    chassi_veiculo: dados.chassiVeiculo,

    data_inicio_vinculo: dados.dataInicioVinculo,

    valor_total_semanal_fmt: dados.valorTotalSemanalFmt,
    valor_total_semanal_extenso: dados.valorTotalSemanalExtenso,
    valor_locacao_semanal_fmt: dados.valorLocacaoSemanalFmt,
    valor_seguro_semanal_fmt: dados.valorSeguroSemanalFmt,

    km_franquia_mensal_fmt: dados.kmFranquiaMensalFmt,
    valor_km_excedente_fmt: dados.valorKmExcedenteFmt,
    valor_km_excedente_extenso: dados.valorKmExcedenteExtenso,

    franquia_sinistro_fmt: dados.franquiaSinistroFmt,

    pix_key: dados.pixKey,

    data_contrato_extenso: dados.dataContratoExtenso,
  });

  return doc.getZip().generate({ type: 'nodebuffer' });
}
