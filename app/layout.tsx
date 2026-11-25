import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";
import { ThemeProvider, themeInitScript } from "@/components/theme-provider";
import { MotionConfig } from "motion/react";

// Rounded, toy-like display face for headings and numbers.
const display = Fredoka({
  variable: "--font-display-face",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const body = Nunito({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zaman — Odak ve Görev Takibi",
  description:
    "Konu konu odak zamanlayıcı, günlük görev sayacı, geri sayım ve Notion yapılacakları. Günün nereye gittiğini renkli grafiklerle gör.",
  applicationName: "Zaman",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eaf2ff" },
    { media: "(prefers-color-scheme: dark)", color: "#111a2c" },
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
      className={`${display.variable} ${body.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        <MotionConfig reducedMotion="user">
          <ThemeProvider>{children}</ThemeProvider>
          <span
            aria-hidden="true"
            className="pointer-events-none fixed bottom-1 right-3 z-10 select-none font-display text-[11px] font-semibold text-faint/80"
          >
            v2
          </span>
        </MotionConfig>
      </body>
    </html>
  );
}
