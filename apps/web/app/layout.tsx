import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import { LanguageProvider } from "@/providers/language-provider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "LENZI — Your Ride. Your Way.",
    template: "%s · LENZI",
  },
  description:
    "LENZI is a locally operated ride-hailing platform for Chunya, Mbeya. Boda, bajaji and cars with clear pricing, verified drivers and support in Kiswahili and English.",
  applicationName: "LENZI",
  keywords: [
    "LENZI",
    "ride hailing Tanzania",
    "Chunya",
    "Mbeya",
    "bajaji",
    "boda boda",
    "Tanzania transport",
  ],
  authors: [{ name: "LENZI" }],
  openGraph: {
    title: "LENZI — Your Ride. Your Way.",
    description:
      "Rides for Chunya. Clear prices, verified drivers and technology built for Tanzania.",
    type: "website",
    locale: "sw_TZ",
    alternateLocale: ["en_TZ"],
    siteName: "LENZI",
  },
  twitter: {
    card: "summary_large_image",
    title: "LENZI — Your Ride. Your Way.",
    description:
      "Rides for Chunya. Clear prices, verified drivers and technology built for Tanzania.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#07110d",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="sw"
      className={`${manrope.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
