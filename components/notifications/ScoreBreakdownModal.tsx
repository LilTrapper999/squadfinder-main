'use client'

import { useT } from '@/context/I18nContext'
import { MatchBreakdown, MatchCategoryBreakdown, MatchFactor, MatchFactorId } from '@/lib/types'
import { scoreToColour } from '@/lib/matchColour'
import Dialog from '@/components/ui/Dialog'
import { CATEGORY_LABEL, RAGE_LABELS, SKILL_LABELS, ScoreCategory, sliderAnchor } from '@/lib/profileAnswers'

interface ScoreBreakdownModalProps {
  category: ScoreCategory
  breakdown: MatchBreakdown
  /** The requester's username — the other side of every comparison */
  senderUsername: string
  onClose: () => void
}

const FACTOR_LABEL: Record<MatchFactorId, string> = {
  weapons: 'Weapons',
  maps: 'Maps',
  roles: 'Roles',
  skill: 'Skill level',
  rage: 'Rage level',
  personality: 'Personality vibe',
  languages: 'Languages',
}

const SHARED_COLOUR = '#22c55e'
const YOU_COLOUR = '#e8a020'
const THEM_COLOUR = '#60a5fa'

function Bar({ value }: { value: number }) {
  return (
    <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.08)' }}>
      <div style={{ height: '100%', borderRadius: '3px', backgroundColor: scoreToColour(value), width: `${value}%` }} />
    </div>
  )
}

function Chips({ items, colour, mark }: { items: string[]; colour: string; mark: string }) {
  const { t } = useT()
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {items.map((item) => (
        <span
          key={item}
          style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.88)',
            padding: '3px 8px',
            borderRadius: '4px',
            backgroundColor: `${colour}14`,
            border: `1px solid ${colour}55`,
          }}
        >
          <span aria-hidden="true" style={{ color: colour, marginRight: '5px' }}>{mark}</span>
          {t(item)}
        </span>
      ))}
    </div>
  )
}

function ChipGroup({ title, colour, items, mark }: { title: string; colour: string; items: string[]; mark: string }) {
  if (items.length === 0) return null
  return (
    <div style={{ marginTop: '10px' }}>
      <p
        style={{
          margin: '0 0 5px',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: colour,
          fontFamily: 'var(--font-rajdhani), sans-serif',
        }}
      >
        {title} · {items.length}
      </p>
      <Chips items={items} colour={colour} mark={mark} />
    </div>
  )
}

/** Two markers on a 0–10 track, so the gap is something you can see rather than read. */
function ScaleTrack({ you, them }: { you: number; them: number }) {
  // Different sizes, same centre line: when both players picked the same value the smaller dot
  // sits inside the larger one instead of hiding behind it.
  const marker = (value: number, colour: string, size: number) => (
    <span
      style={{
        position: 'absolute',
        left: `${(value / 10) * 100}%`,
        top: `${6 - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        marginLeft: `-${size / 2}px`,
        borderRadius: '50%',
        backgroundColor: colour,
        border: '2px solid #111318',
        boxSizing: 'border-box',
      }}
    />
  )
  return (
    <div style={{ position: 'relative', height: '12px', margin: '16px 8px 6px' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: '3px', height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
      {/* Highlight the gap between the two */}
      <div
        style={{
          position: 'absolute',
          top: '4px',
          height: '4px',
          left: `${(Math.min(you, them) / 10) * 100}%`,
          width: `${(Math.abs(you - them) / 10) * 100}%`,
          backgroundColor: 'rgba(255,255,255,0.35)',
          borderRadius: '2px',
        }}
      />
      {marker(you, YOU_COLOUR, 16)}
      {marker(them, THEM_COLOUR, 10)}
    </div>
  )
}

function FactorDetail({ factor, name }: { factor: MatchFactor; name: string }) {
  const { t } = useT()
  const { detail } = factor
  const noteStyle = { margin: '10px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.62)', lineHeight: 1.5 } as const

  if (detail.kind === 'scale') {
    const labels = factor.id === 'skill' ? SKILL_LABELS : RAGE_LABELS
    const row = (who: string, value: number, colour: string) => (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontSize: '12px' }}>
        <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colour, flexShrink: 0, alignSelf: 'center' }} />
        <span style={{ color: '#ffffff', fontWeight: 600 }}>{who}</span>
        <span style={{ color: 'rgba(255,255,255,0.85)' }}>{value.toFixed(1)} / 10</span>
        <span style={{ color: '#8b95a5' }}>— {t(sliderAnchor(value, labels))}</span>
      </div>
    )
    return (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px' }}>
          {row(t('You'), detail.you, YOU_COLOUR)}
          {row(name, detail.them, THEM_COLOUR)}
        </div>
        <ScaleTrack you={detail.you} them={detail.them} />
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
          {t('Gap of {gap} points', { gap: detail.gap.toFixed(1) })}
        </p>
        <p style={noteStyle}>{t('A gap of 0 scores 100%; a gap of 5 or more scores 0%.')}</p>
      </>
    )
  }

  const { shared, onlyYou, onlyThem } = detail
  const total = shared.length + onlyYou.length + onlyThem.length
  const isLanguages = factor.id === 'languages'

  if (total === 0) {
    return (
      <>
        <p style={{ ...noteStyle, fontStyle: 'italic' }}>{t('Neither of you picked any.')}</p>
        {factor.id === 'roles' && <p style={noteStyle}>{t('With no roles picked, this scores a neutral 50%.')}</p>}
      </>
    )
  }

  return (
    <>
      {/* Languages are pass/fail, so a "x of y" ratio would suggest partial credit that doesn't exist */}
      {!isLanguages && (
        <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
          {t('{shared} of {total} picks in common', { shared: shared.length, total })}
        </p>
      )}
      <ChipGroup title={t('Both of you')} colour={SHARED_COLOUR} items={shared} mark="✓" />
      <ChipGroup title={t('Only you')} colour={YOU_COLOUR} items={onlyYou} mark="•" />
      <ChipGroup title={t('Only {name}', { name })} colour={THEM_COLOUR} items={onlyThem} mark="•" />
      {shared.length === 0 && (
        <p style={{ ...noteStyle, fontStyle: 'italic' }}>{t('Nothing in common.')}</p>
      )}
      {isLanguages && <p style={noteStyle}>{t('Any shared language scores 100%; none scores 0%.')}</p>}
      {factor.id === 'roles' && detail.similarityLean !== undefined && (
        <p style={noteStyle}>
          {t('Role scoring leans {similar}% toward similar roles and {different}% toward different roles, based on both your role-matching styles.', {
            similar: Math.round(detail.similarityLean * 100),
            different: Math.round((1 - detail.similarityLean) * 100),
          })}
        </p>
      )}
    </>
  )
}

function FactorBlock({ factor, categoryLabel, name }: { factor: MatchFactor; categoryLabel: string; name: string }) {
  const { t } = useT()
  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: '8px',
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
        <div style={{ minWidth: 0 }}>
          <span className="sub-heading" style={{ fontSize: '14px', fontWeight: 600 }}>{t(FACTOR_LABEL[factor.id])}</span>
          {factor.weight < 1 && (
            <span style={{ marginLeft: '8px', fontSize: '10px', color: 'rgba(255,255,255,0.62)' }}>
              {t('{weight}% of {category}', { weight: Math.round(factor.weight * 100), category: categoryLabel })}
            </span>
          )}
        </div>
        <span style={{ fontSize: '15px', fontWeight: 700, color: scoreToColour(factor.score), fontFamily: 'var(--font-rajdhani), sans-serif' }}>
          {factor.score}%
        </span>
      </div>
      <Bar value={factor.score} />
      <FactorDetail factor={factor} name={name} />
    </div>
  )
}

function CategoryBlock({
  label,
  breakdown,
  name,
  showHeader,
}: {
  label: string
  breakdown: MatchCategoryBreakdown
  name: string
  showHeader: boolean
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {showHeader && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '4px' }}>
          <h3 className="sub-heading" style={{ margin: 0, fontSize: '15px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#e8a020' }}>
            {label}
          </h3>
          <span style={{ fontSize: '18px', fontWeight: 700, color: scoreToColour(breakdown.score), fontFamily: 'var(--font-rajdhani), sans-serif' }}>
            {breakdown.score}%
          </span>
        </div>
      )}
      {breakdown.factors.map((factor) => (
        <FactorBlock key={factor.id} factor={factor} categoryLabel={label} name={name} />
      ))}
    </section>
  )
}

/**
 * Centred dialog explaining exactly how one percentage was reached: every pick the two players
 * share, every pick only one of them made, and how far apart their sliders sit. Overall opens all
 * three categories, since the overall score is simply their average.
 */
export default function ScoreBreakdownModal({ category, breakdown, senderUsername, onClose }: ScoreBreakdownModalProps) {
  const { t } = useT()

  const score =
    category === 'overall' ? breakdown.scores.overall :
    category === 'gamesmanship' ? breakdown.scores.gamesmanship :
    category === 'vibe' ? breakdown.scores.vibeCheck :
    breakdown.scores.comms

  const sections: { id: Exclude<ScoreCategory, 'overall'>; data: MatchCategoryBreakdown }[] = [
    { id: 'gamesmanship', data: breakdown.gamesmanship },
    { id: 'vibe', data: breakdown.vibe },
    { id: 'comms', data: breakdown.comms },
  ]
  const shown = category === 'overall' ? sections : sections.filter((s) => s.id === category)

  return (
    <Dialog title={t(CATEGORY_LABEL[category])} onClose={onClose} maxWidth={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '-6px' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#8b95a5', overflowWrap: 'anywhere' }}>
            {t('You vs {name}', { name: senderUsername })}
          </p>
          <span
            style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1, color: scoreToColour(score), fontFamily: 'var(--font-rajdhani), sans-serif', flexShrink: 0 }}
          >
            {score}%
          </span>
        </div>

        {category === 'overall' && (
          <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
            {t('The overall match is the average of the three scores below.')}
          </p>
        )}

        {/* Legend for the colours used in the chips and slider dots */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: '11px', color: '#8b95a5' }}>
          {[
            { colour: SHARED_COLOUR, label: t('Both of you') },
            { colour: YOU_COLOUR, label: t('Only you') },
            { colour: THEM_COLOUR, label: t('Only {name}', { name: senderUsername }) },
          ].map(({ colour, label }) => (
            <span key={colour} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colour }} />
              {label}
            </span>
          ))}
        </div>

        {shown.map(({ id, data }) => (
          <CategoryBlock
            key={id}
            label={t(CATEGORY_LABEL[id])}
            breakdown={data}
            name={senderUsername}
            showHeader={category === 'overall'}
          />
        ))}
      </div>
    </Dialog>
  )
}
