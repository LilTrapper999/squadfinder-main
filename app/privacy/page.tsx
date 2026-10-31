import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | SquadFinder',
  description: 'How SquadFinder collects, uses, and protects your information.',
}

const CONTACT_EMAIL = 'squadfinder.support@gmail.com'
const LAST_UPDATED = 'October 31, 2026'

const h2: React.CSSProperties = { fontSize: 22, fontWeight: 700, marginTop: 32, marginBottom: 8 }
const p: React.CSSProperties = { lineHeight: 1.7, color: 'rgba(255,255,255,0.8)', marginBottom: 12 }
const li: React.CSSProperties = { lineHeight: 1.7, color: 'rgba(255,255,255,0.8)', marginBottom: 6 }

export default function PrivacyPage() {
  return (
    <main style={{ flex: 1, overflowY: 'auto', padding: '40px 24px' }}>
      <article style={{ maxWidth: 760, margin: '0 auto', color: '#fff' }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, fontFamily: 'var(--font-rajdhani)' }}>
          SquadFinder Privacy Policy
        </h1>
        <p style={{ ...p, opacity: 0.7 }}>Last updated: {LAST_UPDATED}</p>

        <p style={p}>
          SquadFinder (&ldquo;we&rdquo;, &ldquo;us&rdquo;) helps gamers find teammates. This policy explains what
          information we collect when you use SquadFinder, how we use it, and the choices you have.
        </p>

        <h2 style={h2}>Information we collect</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li style={li}>
            <strong>Google account information.</strong> If you sign in with Google, we receive your name, email
            address, and profile picture. We do not receive your Google password and we do not access your Gmail,
            Drive, contacts, or any other Google data.
          </li>
          <li style={li}>
            <strong>Profile information you provide.</strong> Games you play, your answers to profile questions
            (such as play style, rank, and availability), and your preferences.
          </li>
          <li style={li}>
            <strong>Activity in the app.</strong> Squad requests you send and receive, your allies, messages you
            send in chat, and whether you are currently looking for a squad.
          </li>
          <li style={li}>
            <strong>Basic technical data.</strong> Standard server logs such as IP address and browser type, used
            for security and troubleshooting.
          </li>
        </ul>

        <h2 style={h2}>How we use your information</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li style={li}>To create your account and sign you in.</li>
          <li style={li}>To match you with compatible players and show them your gaming profile.</li>
          <li style={li}>To deliver squad requests, notifications, and chat messages.</li>
          <li style={li}>To keep SquadFinder secure and prevent abuse.</li>
        </ul>
        <p style={p}>We do not sell your personal information, and we do not use it for advertising.</p>

        <h2 style={h2}>Who can see your information</h2>
        <p style={p}>
          Other SquadFinder users can see the profile information you choose to share, such as your display name and
          game profile. Your email address is not shown to other users. You can block users, and blocked users cannot
          see or contact you.
        </p>

        <h2 style={h2}>Service providers</h2>
        <p style={p}>
          We use trusted providers to run SquadFinder: Supabase (database and authentication), Vercel (hosting), and
          Google (sign-in). They process data only to provide their services to us.
        </p>

        <h2 style={h2}>Data retention and deletion</h2>
        <p style={p}>
          We keep your information for as long as your account is active. You can ask us to delete your account and
          associated data at any time by emailing us at the address below.
        </p>

        <h2 style={h2}>Children</h2>
        <p style={p}>
          SquadFinder is not intended for children under 13, and we do not knowingly collect their information.
        </p>

        <h2 style={h2}>Changes to this policy</h2>
        <p style={p}>
          We may update this policy from time to time. The &ldquo;Last updated&rdquo; date above shows when it last
          changed.
        </p>

        <h2 style={h2}>Contact us</h2>
        <p style={p}>
          Questions or deletion requests: <a href={`mailto:${CONTACT_EMAIL}`} style={{ textDecoration: 'underline' }}>{CONTACT_EMAIL}</a>
        </p>
      </article>
    </main>
  )
}
