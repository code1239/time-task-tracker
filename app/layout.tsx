import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuroraBackground } from "@/components/aurora-background";
import { ThemeProvider, themeInitScript } from "@/components/theme-provider";
import { MotionConfig } from "motion/react";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zaman — Türkiye Saati & Görev Takibi",
  description:
    "Türkiye saati, günlük görev sayacı ve geri sayım. Sakin, odaklı ve zarif bir çalışma alanı.",
  applicationName: "Zaman",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4fc" },
    { media: "(prefers-color-scheme: dark)", color: "#06050d" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${geistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        <MotionConfig reducedMotion="user">
          <ThemeProvider>
            <AuroraBackground />
            {children}
          </ThemeProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
