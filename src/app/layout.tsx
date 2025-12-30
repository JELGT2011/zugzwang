import { AppShell } from "@/components/AppShell";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/contexts/AuthContext";
import { StockfishProvider } from "@/contexts/StockfishContext";
import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Zugzwang - AI Chess Coach",
  description: "Play chess against an adaptive AI opponent with real-time coaching powered by Stockfish analysis and LLM explanations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <AuthProvider>
          <Analytics />
          <Navbar />
          <StockfishProvider>
            <AppShell>
              <main className="flex-1">
                {children}
              </main>
            </AppShell>
          </StockfishProvider>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
