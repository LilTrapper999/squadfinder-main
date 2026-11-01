// Component checks that need no browser: render to static markup inside the real providers and read it.
// (Interaction flows that need a DOM and a database run in e2e/, which is not installed by default.)
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '@/context/I18nContext'
import ErrorBanner from '@/components/ui/ErrorBanner'
import SkipLink from '@/components/ui/SkipLink'
import RequestCard from '@/components/notifications/RequestCard'
import { explainMatch } from '@/lib/matching'
import { REQUEST_EXPIRY_DAYS } from '@/lib/site'
import type { Profile, SquadRequest } from '@/lib/types'

const render = (node: React.ReactNode) => renderToStaticMarkup(<I18nProvider>{node}</I18nProvider>)

const profile: Profile = {
  weapons: ['AK-74'],
  maps: ['Customs'],
  roles: ['Assault'],
  skill: 5,
  rage: 5,
  personality: ['chill'],
  languages: ['en'],
  willingToChat: true,
  willingToSpeak: false,
  gameId: 'tarkov-eft-pvp',
}

const DAY = 86_400_000
const request = (sentAgoMs: number | null): SquadRequest => ({
  id: 'req-1',
  gameId: 'tarkov-eft-pvp',
  senderUsername: 'SenderOne',
  senderStatus: 'searching',
  sentAt: sentAgoMs === null ? undefined : new Date(Date.now() - sentAgoMs).toISOString(),
  profile,
})

const card = (r: SquadRequest, onReport?: () => void) =>
  render(
    <RequestCard
      request={r}
      breakdown={explainMatch(profile, profile)}
      onAccept={() => {}}
      onDecline={() => {}}
      onDeclineAndBlock={() => {}}
      onReport={onReport}
    />,
  )

describe('ErrorBanner', () => {
  it('announces itself as an alert and shows the message', () => {
    const html = render(<ErrorBanner message="Daily request limit reached. Try again tomorrow." onDismiss={() => {}} />)
    expect(html).toContain('role="alert"')
    expect(html).toContain('Daily request limit reached. Try again tomorrow.')
    expect(html).toContain('aria-label="Dismiss"')
  })

  it('offers Retry only when there is something to retry', () => {
    expect(render(<ErrorBanner message="x" onDismiss={() => {}} />)).not.toContain('>Retry<')
    expect(render(<ErrorBanner message="x" onDismiss={() => {}} onRetry={() => {}} />)).toContain('>Retry<')
  })
})

describe('SkipLink', () => {
  it('points at the main landmark', () => {
    const html = render(<SkipLink />)
    expect(html).toContain('href="#main-content"')
    expect(html).toContain('Skip to main content')
  })
})

describe('RequestCard', () => {
  it('shows who asked and the actions', () => {
    const html = card(request(1000))
    expect(html).toContain('SenderOne')
    for (const label of ['Accept', 'Decline']) expect(html).toContain(label)
  })

  it('counts down to expiry from the send time', () => {
    expect(card(request(3 * DAY + 3_600_000))).toContain(`Expires in ${REQUEST_EXPIRY_DAYS - 4} days`)
  })

  it('says "today" in the last 24 hours and "1 day" with a day left', () => {
    expect(card(request(REQUEST_EXPIRY_DAYS * DAY - 3_600_000))).toContain('Expires today')
    expect(card(request((REQUEST_EXPIRY_DAYS - 1) * DAY - 3_600_000 * 0.5))).toContain('Expires in 1 day')
  })

  it('omits the countdown when the send time is unknown', () => {
    expect(card(request(null))).not.toContain('Expires')
  })

  it('has a report control only when the page provides one', () => {
    expect(card(request(1000), () => {})).toMatch(/report/i)
    expect(card(request(1000))).not.toMatch(/report/i)
  })
})
