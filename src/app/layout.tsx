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

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export const metadata: Metadata = {
  metadataBase: new URL("https://trading-desk.santiagopaz.com"),
  title: {
    default: "Multi-Agent Trading Desk",
    template: "%s | Multi-Agent Trading Desk",
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💸</text></svg>",
  },
  description: DEMO
    ? "AI-powered CEDEAR portfolio & investment management platform with real-time tracking and smart trading."
    : "Plataforma de gestión de portafolio e inversiones en CEDEARs con análisis impulsado por IA, seguimiento en tiempo real y trading inteligente.",
  keywords: DEMO
    ? [
        "cedears",
        "hedge fund",
        "investments",
        "portfolio",
        "algorithmic trading",
        "finance",
        "InvertirOnline",
        "artificial intelligence",
        "market analysis",
        "Argentina",
      ]
    : [
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
  authors: [{ name: "Multi-Agent Trading Desk" }],
  creator: "Multi-Agent Trading Desk",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    type: "website",
    locale: DEMO ? "en_US" : "es_AR",
    title: "Multi-Agent Trading Desk",
    description: DEMO
      ? "AI-powered CEDEAR portfolio & investment management platform with real-time tracking and smart trading."
      : "Plataforma de gestión de portafolio e inversiones en CEDEARs con análisis impulsado por IA.",
    siteName: "Multi-Agent Trading Desk",
  },
  twitter: {
    card: "summary_large_image",
    title: "Multi-Agent Trading Desk",
    description: DEMO
      ? "AI-powered CEDEAR portfolio & investment management platform with real-time tracking and smart trading."
      : "Plataforma de gestión de portafolio e inversiones en CEDEARs con análisis impulsado por IA.",
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
