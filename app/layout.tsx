import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import CookieConsent from "@/components/CookieConsent";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Limen — Dati aperti italiani, finalmente in un unico posto",
    template: "%s | Limen",
  },
  description:
    "Piattaforma open-source per trovare, esplorare e combinare i dati pubblici italiani. Catalogo strutturato e workbench cartografico interattivo.",
  metadataBase: new URL("https://limen.city"),
  openGraph: {
    title: "Limen — Dati aperti italiani, finalmente in un unico posto",
    description:
      "Piattaforma open-source per trovare, esplorare e combinare i dati pubblici italiani. Catalogo strutturato e workbench cartografico interattivo.",
    url: "https://limen.city",
    siteName: "Limen",
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Limen — Dati aperti italiani",
    description:
      "Piattaforma open-source per i dati pubblici italiani. Catalogo + workbench cartografico.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-white text-gray-900">
        <GoogleAnalytics />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
