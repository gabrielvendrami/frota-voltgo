import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VoltGo Frota · Painel',
  description: 'Gestão da frota elétrica VoltGo: veículos, motoristas, quilometragem, cobranças e contratos.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
