import type { Metadata } from 'next'
import Link from 'next/link'
import { CONTACT_EMAIL, LEGAL_UPDATED, MIN_AGE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How SquadFinder collects, uses, and protects your information.',
}

const h2: React.CSSProperties = { fontSize: 22, fontWeight: 700, marginTop: 32, marginBottom: 8 }
const p: React.CSSProperties = { lineHeight: 1.7, color: 'rgba(255,255,255,0.8)', marginBottom: 12 }
const li: React.CSSProperties = { lineHeight: 1.7, color: 'rgba(255,255,255,0.8)', marginBottom: 6 }
const a: React.CSSProperties = { color: '#e8a020', textDecoration: 'underline', textUnderlineOffset: 3 }

export default function PrivacyPage() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '40px 24px' }}>
      <article style={{ maxWidth: 760, margin: '0 auto', color: '#fff' }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, fontFamily: 'var(--font-rajdhani)' }}>
          SquadFinder Privacy Policy
        </h1>
        <p style={{ ...p, opacity: 0.7 }}>Last updated: {LEGAL_UPDATED}</p>

        <p style={p}>
          SquadFinder (&ldquo;we&rdquo;, &ldquo;us&rdquo;) helps gamers find teammates. This policy explains what
          information we collect when you use SquadFinder, how we use it, who can see it, and the choices you have.
        </p>

        <h2 style={h2}>Information we collect</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li style={li}>
            <strong>Sign-in details.</strong> If you sign in with Google, we receive your email address. If you sign up
            with email, we receive your email address and your password is stored only as a salted hash by our
            authentication provider. Google may also pass your name and photo to that provider; SquadFinder does not
            copy, show or use them.
          </li>
          <li style={li}>
            <strong>Profile information you provide.</strong> For each game: the in-game username you enter and your
            answers to the profile questions (such as play style, rank, schedule and how you like to communicate), plus
            your settings, such as whether you also want to see players who are online.
          </li>
          <li style={li}>
            <strong>Activity in the app.</strong> Squad requests you send and receive, your allies, the players you
            block, reports you file, and whether you are online or searching for a squad right now (a timestamp that
            expires on its own).
          </li>
          <li style={li}>
            <strong>Basic technical data.</strong> Standard server logs such as IP address and browser type, used for
            security and troubleshooting.
          </li>
        </ul>

        <h2 style={h2}>How we use your information</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li style={li}>To create your account and sign you in.</li>
          <li style={li}>To match you with compatible players and calculate match percentages.</li>
          <li style={li}>To deliver squad requests and notifications.</li>
          <li style={li}>To keep SquadFinder secure, limit abuse and act on reports.</li>
        </ul>
        <p style={p}>We do not sell your personal information, and we do not use it for advertising.</p>

        <h2 style={h2}>Who can see your information</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li style={li}>
            <strong>While browsing.</strong> Other players see your profile answers and a match percentage, but not your
            in-game username or your account. You appear only as an anonymous match.
          </li>
          <li style={li}>
            <strong>When you send a request.</strong> The player you ask sees your in-game username and your profile
            answers for that game, so they can decide whether to accept.
          </li>
          <li style={li}>
            <strong>When a request is accepted.</strong> You and the other player see each other&rsquo;s in-game
            username for that game, so you can add each other in the game. SquadFinder has no in-app chat.
          </li>
          <li style={li}>
            <strong>Never.</strong> Your email address is not shown to other players. If you block someone, or they block
            you, neither of you can find the other.
          </li>
        </ul>

        <h2 style={h2}>Reports and safety</h2>
        <p style={p}>
          You can report a player from the allies list or from a request. A report stores the reported in-game username
          as it was at the time, the reason you chose and any details you add. We review reports and may ban a username,
          which is stored as text with no link to an account. Reports can be kept after you delete your account so that
          abuse can still be acted on, but they are no longer linked to you.
        </p>

        <h2 style={h2}>Service providers</h2>
        <p style={p}>
          We use trusted providers to run SquadFinder: Supabase (database and authentication), Vercel (hosting), and
          Google (sign-in). They process data only to provide their services to us. We also use an AI service to keep
          the list of game maps, weapons and seasons up to date; no personal information is sent to it.
        </p>

        <h2 style={h2}>Your choices, retention and deletion</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li style={li}>
            <strong>Download your data.</strong> <Link href="/settings" style={a}>Settings</Link> &rarr; &ldquo;Download my data&rdquo;
            gives you everything we hold about you as a file.
          </li>
          <li style={li}>
            <strong>Delete your account.</strong> <Link href="/settings" style={a}>Settings</Link> &rarr; &ldquo;Delete my account&rdquo;
            permanently removes your account, profiles, allies, blocks and requests. It cannot be undone, and signing in
            again creates a new empty account. Backups held by our providers expire on their normal schedule.
          </li>
          <li style={li}>
            <strong>Retention.</strong> We keep your information while your account is active. Online and searching
            status expires within a day, and the request log used for rate limits is cleared after 90 days.
          </li>
          <li style={li}>
            <strong>Edit or correct.</strong> You can change your profile answers and in-game usernames at any time.
          </li>
        </ul>

        <h2 style={h2}>Children</h2>
        <p style={p}>
          SquadFinder is not intended for children under {MIN_AGE}, and we do not knowingly collect their information.
          If you believe a child under {MIN_AGE} has an account, email us and we will delete it.
        </p>

        <h2 style={h2}>Changes to this policy</h2>
        <p style={p}>
          We may update this policy from time to time. The &ldquo;Last updated&rdquo; date above shows when it last
          changed.
        </p>

        <h2 style={h2}>Contact us</h2>
        <p style={p}>
          Questions or requests: <a href={`mailto:${CONTACT_EMAIL}`} style={a}>{CONTACT_EMAIL}</a>
        </p>
      </article>
    </div>
  )
}
