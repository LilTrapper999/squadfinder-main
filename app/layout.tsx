import type { Metadata } from 'next'
import { Inter, Rajdhani } from 'next/font/google'
import './globals.css'
import { AppProvider } from '@/context/AppContext'
import { I18nProvider } from '@/context/I18nContext'
import AnimatedBackground from '@/components/AnimatedBackground'
import TopNav from '@/components/TopNav'

const inter = Inter({ subsets: ['latin'] })

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rajdhani',
})

export const metadata: Metadata = {
  title: 'SquadFinder',
  description: 'Find your perfect gaming squad',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${rajdhani.variable}`} style={{ position: 'relative' }}>
        {/* Animated geometric background — sits behind all content on every page */}
        <AnimatedBackground />
        <I18nProvider>
          <AppProvider>
            {/* All page content sits above the background */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
              {/* Global nav: settings icon (left) + home button (right) — hidden on login page */}
              <TopNav />
              {children}
            </div>
          </AppProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
