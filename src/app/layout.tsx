import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CEDEARs Fund",
    template: "%s | CEDEARs Fund",
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💸</text></svg>",
  },
  description:
    "Plataforma de gestión de portafolio e inversiones en CEDEARs con análisis impulsado por IA, seguimiento en tiempo real y trading inteligente.",
  keywords: [
    "cedears",
    "hedge fund",
    "inversiones",
    "portafolio",
    "trading algorítmico",
    "finanzas",
    "InvertirOnline",
    "inteligencia artificial",
    "análisis de mercado",
    "Argentina",
  ],
  authors: [{ name: "CEDEARs Fund" }],
  creator: "CEDEARs Fund",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    title: "CEDEARs Fund",
    description:
      "Plataforma de gestión de portafolio e inversiones en CEDEARs con análisis impulsado por IA.",
    siteName: "CEDEARs Fund",
  },
  twitter: {
    card: "summary",
    title: "CEDEARs Fund",
    description:
      "Plataforma de gestión de portafolio e inversiones en CEDEARs con análisis impulsado por IA.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
