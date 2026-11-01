import Link from 'next/link'
import { CONTACT_EMAIL } from '@/lib/site'
import T from '@/components/ui/T'

/**
 * Privacy · Terms · Contact plus the trademark line. Server-rendered plain <a> links so they are
 * found with JavaScript off (Google's verification looks for the privacy link on the home page).
 * The text goes through <T/> so it still translates once the client takes over.
 */
export default function LegalFooter({ compact = false }: { compact?: boolean }) {
  const link: React.CSSProperties = {
    color: 'rgba(255,255,255,0.75)',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '44px',
    padding: '0 6px',
  }
  return (
    <footer
      style={{
        flexShrink: 0,
        padding: compact ? '4px 16px calc(8px + env(safe-area-inset-bottom))' : '10px 16px calc(14px + env(safe-area-inset-bottom))',
        textAlign: 'center',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.65)',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <nav aria-label="Legal" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '2px 10px' }}>
        <Link href="/privacy" style={link}><T>Privacy</T></Link>
        <Link href="/terms" style={link}><T>Terms</T></Link>
        <a href={`mailto:${CONTACT_EMAIL}`} style={link}><T>Contact</T></a>
      </nav>
      {!compact && (
        <p style={{ margin: '2px auto 0', maxWidth: '560px', lineHeight: 1.5 }}>
          <T>Game names and logos belong to their owners. SquadFinder is not affiliated with or endorsed by them.</T>
        </p>
      )}
    </footer>
  )
}
