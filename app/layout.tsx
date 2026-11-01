import type { Metadata, Viewport } from 'next'
import { Inter, Rajdhani } from 'next/font/google'
import './globals.css'
import './a11y.css'
import { AppProvider } from '@/context/AppContext'
import { CatalogueProvider } from '@/context/CatalogueContext'
import { I18nProvider } from '@/context/I18nContext'
import TopNav from '@/components/TopNav'
import NewRequestToast from '@/components/ui/NewRequestToast'
import AppFooter from '@/components/ui/AppFooter'
import OfflineBanner from '@/components/ui/OfflineBanner'
import SkipLink from '@/components/ui/SkipLink'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site'
import { siteUrl } from '@/lib/siteUrl'

const inter = Inter({ subsets: ['latin'] })

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rajdhani',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'SquadFinder', template: '%s | SquadFinder' },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: 'website', siteName: SITE_NAME, title: SITE_NAME, description: SITE_DESCRIPTION },
  twitter: { card: 'summary_large_image', title: SITE_NAME, description: SITE_DESCRIPTION },
}

export const viewport: Viewport = {
  themeColor: '#0a0b0f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // lets the pages pad for the notch with env(safe-area-inset-*)
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${rajdhani.variable}`} style={{ position: 'relative' }}>
        <I18nProvider>
          <AppProvider>
            <CatalogueProvider>
              {/* All page content sits above the background */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
                <SkipLink />
                <OfflineBanner />
                {/* Global nav, for pages that don't draw their own top bar */}
                <TopNav />
                <main id="main-content" tabIndex={-1} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', outline: 'none' }}>
                  {children}
                </main>
                <AppFooter />
                <NewRequestToast />
              </div>
            </CatalogueProvider>
          </AppProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
