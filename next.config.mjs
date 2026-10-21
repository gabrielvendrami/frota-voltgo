/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Garante que o modelo de contrato (templates/contrato-modelo.docx) seja
    // incluído no bundle serverless da Vercel mesmo que o rastreamento
    // automático de arquivos não detecte o `fs.readFileSync` em runtime.
    // (há também uma cópia em base64 em lib/contract-template-fallback.ts
    // como rede de segurança extra — ver lib/contract.ts).
    outputFileTracingIncludes: {
      '/api/contratos/route': ['./templates/**/*'],
      '/admin/contratos/page': ['./templates/**/*'],
    },
    // Server Actions têm limite de 1 MB por padrão — foto de celular passa
    // fácil disso. A tela do motorista já reduz a foto antes de enviar, mas
    // deixamos uma folga (o limite da Vercel pra função é ~4,5 MB).
    serverActions: {
      bodySizeLimit: '4mb',
    },
    // Não reaproveitar páginas dinâmicas do cache do navegador ao
    // navegar/voltar: sempre busca dados frescos (evita voltar pra uma tela
    // mostrando informação antiga depois de gerar cobrança, marcar pago etc.).
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
