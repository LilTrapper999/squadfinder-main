'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

interface GameOption {
  id: string
  name: string
}

interface SavedProfile {
  in_game_username: string
  skill: number
  rage: number
  updated_at: string
}

export default function DbSmokeTestPage() {
  const [status, setStatus] = useState('Connecting…')
  const [userId, setUserId] = useState<string | null>(null)
  const [games, setGames] = useState<GameOption[]>([])
  const [selectedGameId, setSelectedGameId] = useState('')
  const [maps, setMaps] = useState<string[] | null>(null)
  const [mapsError, setMapsError] = useState<string | null>(null)

  const [username, setUsername] = useState('')
  const [skill, setSkill] = useState(5)
  const [rage, setRage] = useState(5)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState<SavedProfile | null>(null)

  // Step 1: get (or create) an anonymous session, then load the selectable game list.
  useEffect(() => {
    let cancelled = false

    async function init() {
      const { data: sessionData } = await supabase.auth.getSession()
      let uid = sessionData.session?.user.id ?? null

      if (!uid) {
        const { data, error } = await supabase.auth.signInAnonymously()
        if (error) {
          if (cancelled) return
          setStatus(
            `Auth failed: ${error.message}. If this says anonymous sign-ins are disabled, ` +
            `enable them in Supabase → Authentication → Providers → Anonymous Sign-Ins.`
          )
          return
        }
        uid = data.user?.id ?? null
      }

      if (cancelled) return
      setUserId(uid)
      setStatus(uid ? `Connected as anonymous user ${uid}` : 'Connected, no session')

      const { data: gameRows, error: gameError } = await supabase
        .from('games')
        .select('id, name')
        .eq('is_selectable', true)
        .order('name')

      if (cancelled) return
      if (gameError) {
        setStatus(`Connected, but reading "games" failed: ${gameError.message}`)
        return
      }
      setGames(gameRows ?? [])
      if (gameRows && gameRows.length > 0) {
        setSelectedGameId(gameRows[0].id)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [])

  // Step 2 (read test): fetch maps for whichever game is selected, via its base game.
  useEffect(() => {
    if (!selectedGameId) return
    let cancelled = false

    async function loadMaps() {
      setMaps(null)
      setMapsError(null)

      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('id, base_game_id')
        .eq('id', selectedGameId)
        .single()

      if (cancelled) return
      if (gameError || !game) {
        setMapsError(gameError?.message ?? 'game not found')
        return
      }

      const referenceGameId = game.base_game_id ?? game.id
      const { data: refData, error: refError } = await supabase
        .from('game_reference_data')
        .select('maps')
        .eq('game_id', referenceGameId)
        .single()

      if (cancelled) return
      if (refError) {
        setMapsError(refError.message)
        return
      }
      setMaps((refData?.maps as string[]) ?? [])
    }

    loadMaps()
    return () => {
      cancelled = true
    }
  }, [selectedGameId])

  // Step 3 (write test): upsert a minimal game_profiles row, then read it back.
  async function savePreference() {
    if (!userId || !selectedGameId || !username.trim()) return
    setSaving(true)
    setSaveError(null)
    setSaved(null)

    const { error: upsertError } = await supabase
      .from('game_profiles')
      .upsert(
        {
          user_id: userId,
          game_id: selectedGameId,
          in_game_username: username.trim(),
          skill,
          rage,
        },
        { onConflict: 'user_id,game_id' }
      )

    if (upsertError) {
      setSaveError(upsertError.message)
      setSaving(false)
      return
    }

    const { data, error: readError } = await supabase
      .from('game_profiles')
      .select('in_game_username, skill, rage, updated_at')
      .eq('user_id', userId)
      .eq('game_id', selectedGameId)
      .single()

    setSaving(false)
    if (readError) {
      setSaveError(readError.message)
      return
    }
    setSaved(data as SavedProfile)
  }

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1rem', color: '#fff' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Supabase connectivity smoke test</h1>
      <p style={{ opacity: 0.8, marginBottom: '1.5rem' }}>{status}</p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Read test — maps for a game</h2>
        <select
          value={selectedGameId}
          onChange={(e) => setSelectedGameId(e.target.value)}
          style={{ padding: '0.4rem', marginBottom: '0.75rem', width: '100%' }}
        >
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        {mapsError && <p style={{ color: '#ff6b6b' }}>Error: {mapsError}</p>}
        {maps && (
          <ul>
            {maps.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Write test — save a preference</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 320 }}>
          <label>
            In-game username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', padding: '0.4rem' }}
            />
          </label>
          <label>
            Skill: {skill.toFixed(1)}
            <input
              type="range"
              min={0}
              max={10}
              step={0.1}
              value={skill}
              onChange={(e) => setSkill(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </label>
          <label>
            Rage: {rage.toFixed(1)}
            <input
              type="range"
              min={0}
              max={10}
              step={0.1}
              value={rage}
              onChange={(e) => setRage(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </label>
          <button
            onClick={savePreference}
            disabled={saving || !username.trim() || !selectedGameId}
            style={{ padding: '0.5rem 1rem', marginTop: '0.5rem' }}
          >
            {saving ? 'Saving…' : 'Save preference'}
          </button>
        </div>
        {saveError && <p style={{ color: '#ff6b6b' }}>Error: {saveError}</p>}
        {saved && (
          <p style={{ color: '#4dd08a', marginTop: '0.75rem' }}>
            Round trip confirmed — read back from Supabase: {saved.in_game_username}, skill {saved.skill}, rage{' '}
            {saved.rage}, saved at {new Date(saved.updated_at).toLocaleTimeString()}
          </p>
        )}
      </section>
    </main>
  )
}
