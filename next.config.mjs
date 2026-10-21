/** @type {import('next').NextConfig} */
const nextConfig = {
  // Garante que o modelo de contrato (templates/contrato-modelo.docx) seja
  // incluído no bundle serverless da Vercel mesmo que o rastreamento
  // automático de arquivos não detecte o `fs.readFileSync` em runtime.
  // (há também uma cópia em base64 em lib/contract-template-fallback.ts
  // como rede de segurança extra — ver lib/contract.ts).
  experimental: {
    outputFileTracingIncludes: {
      '/api/contratos/route': ['./templates/**/*'],
      '/admin/contratos/page': ['./templates/**/*'],
    },
  },
};

export default nextConfig;
