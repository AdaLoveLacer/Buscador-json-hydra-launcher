import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import ClientI18nProvider from "@/components/i18n-provider"
import { LanguageSelector } from "@/components/language-selector"
import ThemeSelector from "@/components/theme-selector"
import { ThemeProvider } from "@/components/theme-provider"
import DebugThemeBadge from "@/components/debug-theme-badge"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Hydra sources search engine",
  description: "Created with v0",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/placeholder-logo.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/placeholder-logo.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body suppressHydrationWarning className={`font-sans antialiased min-h-screen`}>
        {/* Inline script to apply persisted theme early (reads localStorage before React hydration)
            This prevents a flash of wrong theme and avoids needing a manual page reload. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (function(){
            try {
              // Prefer persisted theme; if none, apply the app default so the
              // initial render matches the intended "default" theme and avoids
              // a flash of the :root (unthemed) values.
              var t = localStorage.getItem('theme') || 'default';
              var root = document.documentElement;
              // dynamic list of known theme classes - update here when adding themes
              var known = ['dark','default'];
              known.forEach(function(c){ root.classList.remove(c); });
              // If the stored/default theme is known, apply it; otherwise ignore
              if (known.indexOf(t) !== -1) {
                root.classList.add(t);
                root.setAttribute('data-theme', t);
              }
            } catch (e) { /* ignore */ }
          })();
        `,
          }}
        />
        <ThemeProvider
          attribute="class"
          // Use the project's 'default' theme class (matches CSS .default block)
          defaultTheme="default"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ClientI18nProvider>
            <div className="fixed top-4 right-4 z-9999 pointer-events-auto bg-background/80 backdrop-blur-sm p-2 rounded-lg shadow-sm border border-border">
              <LanguageSelector />
            </div>
            <div className="fixed top-16 right-4 z-9999 pointer-events-auto bg-background/80 backdrop-blur-sm p-2 rounded-lg shadow-sm border border-border">
              <ThemeSelector />
            </div>
            <main className="min-h-screen">{children}</main>
            {/* Debug badge to help inspect applied theme and localStorage (visible in dev) */}
            <DebugThemeBadge />
            <Analytics />
          </ClientI18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
