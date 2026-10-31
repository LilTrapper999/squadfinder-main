import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | SquadFinder',
  description: 'The rules for using SquadFinder.',
}

const CONTACT_EMAIL = 'squadfinder.support@gmail.com'
const LAST_UPDATED = 'October 31, 2026'

const h2: React.CSSProperties = { fontSize: 22, fontWeight: 700, marginTop: 32, marginBottom: 8 }
const p: React.CSSProperties = { lineHeight: 1.7, color: 'rgba(255,255,255,0.8)', marginBottom: 12 }
const li: React.CSSProperties = { lineHeight: 1.7, color: 'rgba(255,255,255,0.8)', marginBottom: 6 }

export default function TermsPage() {
  return (
    <main style={{ flex: 1, overflowY: 'auto', padding: '40px 24px' }}>
      <article style={{ maxWidth: 760, margin: '0 auto', color: '#fff' }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, fontFamily: 'var(--font-rajdhani)' }}>
          SquadFinder Terms of Service
        </h1>
        <p style={{ ...p, opacity: 0.7 }}>Last updated: {LAST_UPDATED}</p>

        <p style={p}>
          By using SquadFinder (&ldquo;the Service&rdquo;) you agree to these terms. If you do not agree, do not use the
          Service.
        </p>

        <h2 style={h2}>The Service</h2>
        <p style={p}>
          SquadFinder helps gamers find and connect with teammates. The Service is currently in beta, so features may
          change, break, or be removed without notice.
        </p>

        <h2 style={h2}>Your account</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li style={li}>You must be at least 13 years old to use SquadFinder.</li>
          <li style={li}>You sign in with Google and are responsible for activity under your account.</li>
          <li style={li}>Keep the information in your profile accurate and do not impersonate anyone.</li>
        </ul>

        <h2 style={h2}>Acceptable use</h2>
        <p style={p}>You agree not to:</p>
        <ul style={{ paddingLeft: 20 }}>
          <li style={li}>Harass, threaten, or discriminate against other users.</li>
          <li style={li}>Post illegal, hateful, sexual, or otherwise harmful content.</li>
          <li style={li}>Spam users, scrape the Service, or attempt to break or overload it.</li>
          <li style={li}>Try to access other users&rsquo; accounts or data.</li>
          <li style={li}>Use the Service to cheat, sell accounts, or break the rules of any game.</li>
        </ul>

        <h2 style={h2}>Your content</h2>
        <p style={p}>
          You keep ownership of the content you add, such as your profile and messages. You give us permission to
          store and display it as needed to run the Service, including showing your profile to other users.
        </p>

        <h2 style={h2}>Meeting other players</h2>
        <p style={p}>
          SquadFinder only connects people online. We do not verify users and are not responsible for what other users
          say or do. Use good judgment, and never share personal or financial information with people you meet in
          the app.
        </p>

        <h2 style={h2}>Suspension and termination</h2>
        <p style={p}>
          We may suspend or remove accounts that break these terms. You can stop using the Service at any time and
          can request account deletion by emailing us.
        </p>

        <h2 style={h2}>Trademarks</h2>
        <p style={p}>
          SquadFinder is not affiliated with or endorsed by any game publisher. Game names and logos belong to their
          respective owners.
        </p>

        <h2 style={h2}>Disclaimer and liability</h2>
        <p style={p}>
          The Service is provided &ldquo;as is&rdquo; without warranties of any kind. To the fullest extent allowed by
          law, we are not liable for any indirect or consequential damages arising from your use of the Service.
        </p>

        <h2 style={h2}>Changes to these terms</h2>
        <p style={p}>
          We may update these terms from time to time. Continuing to use the Service after a change means you accept
          the new terms.
        </p>

        <h2 style={h2}>Contact</h2>
        <p style={p}>
          Questions: <a href={`mailto:${CONTACT_EMAIL}`} style={{ textDecoration: 'underline' }}>{CONTACT_EMAIL}</a>
        </p>
      </article>
    </main>
  )
}
