import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PWARegister from "./PWARegister";
import { CapacitorInit } from "../components/CapacitorInit";
import { LanguageProvider } from "../context/LanguageContext";
import { OfflineProvider } from "../context/OfflineContext";
import { AuthProvider } from "../context/AuthContext";
import { AuthGate } from "../components/AuthGate";
import { KisanMitraChatbot } from "../components/KisanMitraChatbot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KrishiRakshak AI - Crop Health Sentinel",
  description: "AI-Powered Crop Disease Detection, Pest Monitor, and Mandi Price Tracker.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KrishiRakshak",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 pb-16 md:pb-0">
        <LanguageProvider>
          <AuthProvider>
            <AuthGate>
              <OfflineProvider>
                <PWARegister />
                <CapacitorInit />
                {children}
                <KisanMitraChatbot />
              </OfflineProvider>
            </AuthGate>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

