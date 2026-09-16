import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import "@/app/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Applane",
  description: "Plataforma de gestão de ministérios de louvor, multimídia e escalas para igrejas",
  icons: {
    icon: "/icon_applane.png",
    shortcut: "/icon_applane.png",
    apple: "/icon_applane.png",
  },
  openGraph: {
    title: "Applane",
    description: "Plataforma de gestão de ministérios de louvor, multimídia e escalas para igrejas",
    images: ["/logo_aplane.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-br"
      suppressHydrationWarning
      className={`${inter.variable} ${outfit.variable}`}
    >
      <body suppressHydrationWarning className="antialiased font-sans">
        <AuthProvider>
          <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
