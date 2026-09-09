import type { Metadata } from "next";
import { Geist_Mono, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "DukaOS — Business Operating System",
  description:
    "Point of sale, inventory, suppliers, customers and financials for Kenyan businesses.",
  icons: {
    icon: "/images/DukaOS-logo.png",
    shortcut: "/images/DukaOS-logo.png",
    apple: "/images/DukaOS-logo.png",
  },
  openGraph: {
    title: "DukaOS — Business Operating System",
    description:
      "Point of sale, inventory, suppliers, customers and financials for Kenyan businesses.",
    images: ["/images/DukaOS-logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "DukaOS — Business Operating System",
    description:
      "Point of sale, inventory, suppliers, customers and financials for Kenyan businesses.",
    images: ["/images/DukaOS-logo.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfairDisplay.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
