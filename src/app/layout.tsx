import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
    default: "Schmid Meier Hedge Fund",
    template: "%s | Schmid Meier Hedge Fund",
  },
  description:
    "Plataforma de gestión de portafolio e inversiones con análisis impulsado por IA, seguimiento en tiempo real y trading inteligente.",
  keywords: [
    "hedge fund",
    "inversiones",
    "portafolio",
    "trading",
    "finanzas",
    "InvertirOnline",
    "inteligencia artificial",
    "análisis de mercado",
    "Argentina",
  ],
  authors: [{ name: "Schmid Meier" }],
  creator: "Schmid Meier",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    title: "Schmid Meier Hedge Fund",
    description:
      "Plataforma de gestión de portafolio e inversiones con análisis impulsado por IA.",
    siteName: "Schmid Meier Hedge Fund",
  },
  twitter: {
    card: "summary",
    title: "Schmid Meier Hedge Fund",
    description:
      "Plataforma de gestión de portafolio e inversiones con análisis impulsado por IA.",
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
        {children}
      </body>
    </html>
  );
}
