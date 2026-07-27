// /lib/matchColour.ts
// Connects a 0–100 match score to the display colour used across squad-matches.

export function scoreToColour(score: number): string {
  if (score >= 90) return '#22c55e'  // bright green
  if (score >= 80) return '#86efac'  // soft green
  if (score >= 70) return '#facc15'  // yellow
  if (score >= 60) return '#f97316'  // amber
  return '#ef4444'                   // red
}
