import type { Metadata } from 'next';
import '@/styles/globals.css';
import '@/styles/document.css';

export const metadata: Metadata = {
  title: 'LOTO SOP Editor',
  description: 'LOTO SOP ve Kilitleme / Etiketleme doküman editörü',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
