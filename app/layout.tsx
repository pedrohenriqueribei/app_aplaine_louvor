import type { Metadata } from 'next';
import { Outfit, Inter } from 'next/font/google';
import { AuthProvider } from '@/components/AuthProvider';
import '@/app/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'Aplaine',
  description: 'Sistema de gestão de ministério de louvor',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br" className={`${inter.variable} ${outfit.variable}`}>
      <body suppressHydrationWarning className="antialiased">
        <AuthProvider>
          <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
