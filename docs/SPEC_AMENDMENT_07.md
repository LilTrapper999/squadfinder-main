# SquadFinder — Spec Amendment 07
> Fixes invisible UI on /build-profile. Same root cause as SPEC_AMENDMENT_06 Fix 2. Apply after all previous spec files.

---

## FIX 1 — /build-profile Invisible UI

### Root Cause
Same issue as `/select-game` — content renders but is invisible due to missing explicit background colours, text colours, and z-index values. The AnimatedBackground sits behind everything but page content has no opaque background so it appears transparent.

---

### Fix A — Page Wrapper
```tsx
// app/build-profile/page.tsx
export default function BuildProfilePage() {
  return (
    <>
      <AnimatedBackground />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          width: '100vw',
          backgroundColor: '#0a0b0f',
          padding: '24px',
          boxSizing: 'border-box',
        }}
      >
        <h1 className="main-heading">BUILD YOUR LEGEND</h1>
        <ProfileForm />
      </div>
    </>
  );
}
```

---

### Fix B — Three Column Layout
```css
.profile-columns {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  width: 100%;
  height: calc(100vh - 120px); /* full height minus heading */
  overflow: hidden; /* no outer scroll */
  position: relative;
  z-index: 2;
}

.profile-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto; /* each column scrolls independently if needed */
  padding-right: 8px;
}

/* Scrollbar styling to match dark theme */
.profile-column::-webkit-scrollbar {
  width: 4px;
}
.profile-column::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.04);
}
.profile-column::-webkit-scrollbar-thumb {
  background: rgba(232,160,32,0.3);
  border-radius: 2px;
}
```

---

### Fix C — Question Block Explicit Styles
Every question block must have explicit colours and backgrounds. Do not rely on inherited styles:

```css
.question-block {
  background-color: #1a1d26;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 16px;
  width: 100%;
  box-sizing: border-box;
}

.question-label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 12px;
  display: inline-block; /* required for sub-heading animation */
}
```

Apply `className="sub-heading question-label"` to every question label.

---

### Fix D — Checkbox Options Explicit Styles
```css
.checkbox-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.checkbox-option:hover {
  background: rgba(255, 255, 255, 0.05);
}

.checkbox-option input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  min-width: 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  margin-top: 2px;
  position: relative;
}

.checkbox-option input[type="checkbox"]:checked {
  background: #e8a020;
  border-color: #e8a020;
}

.checkbox-option input[type="checkbox"]:checked::after {
  content: '✓';
  position: absolute;
  top: -1px;
  left: 2px;
  font-size: 12px;
  color: #0a0b0f;
  font-weight: 700;
}

.checkbox-label-primary {
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.3;
}

.checkbox-label-subtitle {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2px;
  line-height: 1.3;
}
```

---

### Fix E — Yes/No Toggle Explicit Styles
```css
.toggle-group {
  display: flex;
  gap: 10px;
}

.toggle-btn {
  flex: 1;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Rajdhani', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toggle-btn:hover {
  border-color: rgba(232, 160, 32, 0.5);
  color: rgba(255, 255, 255, 0.9);
}

.toggle-btn.selected {
  border-color: #e8a020;
  background: rgba(232, 160, 32, 0.12);
  color: #e8a020;
}
```

---

### Fix F — Slider Explicit Styles
```css
.slider-wrapper {
  width: 100%;
  padding: 8px 0 24px;
  position: relative;
}

input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #e8a020;
  cursor: pointer;
  box-shadow: 0 0 8px rgba(232, 160, 32, 0.6);
  transition: box-shadow 0.15s ease;
}

input[type="range"]::-webkit-slider-thumb:hover {
  box-shadow: 0 0 14px rgba(232, 160, 32, 0.9);
}

/* Filled track (left of thumb) */
input[type="range"] {
  background: linear-gradient(
    to right,
    #e8a020 0%,
    #e8a020 var(--slider-fill),
    rgba(255,255,255,0.1) var(--slider-fill),
    rgba(255,255,255,0.1) 100%
  );
}

.slider-value-display {
  font-family: 'Rajdhani', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #e8a020;
  text-align: center;
  margin-top: 8px;
}

.slider-anchor-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  position: relative;
}

.slider-anchor-label {
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
}

/* Tick marks */
.slider-ticks {
  display: flex;
  justify-content: space-between;
  padding: 0 9px; /* offset for thumb width */
  margin-top: 4px;
}

.slider-tick {
  width: 1px;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
}

.slider-tick.major {
  height: 10px;
  background: rgba(255, 255, 255, 0.4);
}
```

Update `--slider-fill` CSS variable dynamically in JS:
```tsx
const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const val = Number(e.target.value);
  setValue(val);
  e.target.style.setProperty('--slider-fill', `${val}%`);
};
```

---

### Fix G — Language Checkbox Grid Explicit Styles
```css
.language-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.language-other-input {
  width: 100%;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
}

.language-other-input:focus {
  border-color: #e8a020;
  background: rgba(232, 160, 32, 0.05);
}

.language-other-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}
```

---

### Fix H — Weapon Category Subtitle Explicit Styles
```css
.weapon-category-title {
  font-family: 'Rajdhani', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e8a020;
  margin-top: 14px;
  margin-bottom: 6px;
  display: inline-block; /* required for sub-heading animation */
}
```

Apply `className="sub-heading weapon-category-title"` to every weapon category label.

---

### Fix I — CTA Button Explicit Styles
```css
.find-squad-btn-profile {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 100;
  padding: 14px 40px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 18px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #e8a020;
  background: transparent;
  border: 2px solid #e8a020;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.find-squad-btn-profile:hover {
  background: rgba(232, 160, 32, 0.12);
  box-shadow:
    0 0 16px rgba(232, 160, 32, 0.5),
    0 0 32px rgba(232, 160, 32, 0.2);
}

.find-squad-btn-profile:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  box-shadow: none;
}
```

---

### Fix J — Apply AnimatedBackground to All Pages
Claude Code must confirm `<AnimatedBackground />` is the first child on ALL of these pages, each with the same page wrapper pattern as Fix A:

- `/` (login)
- `/select-game`
- `/build-profile`
- `/squad-matches`
- `/home`

If the root layout already includes it correctly with the right z-index, individual page imports are not needed. If the root layout version is still not working, add it explicitly to each page as shown in Fix A — do whichever works and is confirmed visible.

---

---

## FIX 2 — /squad-matches Invisible UI (Same Root Cause)

Apply the exact same explicit styling fix as Fix 1 to `/squad-matches`. Every element must have explicit background colours, text colours, and z-index. Do not rely on inherited styles.

### Fix K — Page Wrapper
```tsx
// app/squad-matches/page.tsx
export default function SquadMatchesPage() {
  return (
    <>
      <AnimatedBackground />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          width: '100vw',
          backgroundColor: '#0a0b0f',
          display: 'flex',
          flexDirection: 'row',
          boxSizing: 'border-box',
        }}
      >
        <AlliesPanel />
        <MatchesGrid />
      </div>
    </>
  );
}
```

### Fix L — Match Card Explicit Styles
Every match card must have explicit colours. No inherited or assumed values:

```css
.match-card {
  background-color: #1a1d26;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  z-index: 2;
  cursor: default;
}

.match-card-label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  display: inline-block;
}

.match-card-status {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  gap: 6px;
}

.match-card-score-label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  display: inline-block;
}

.match-card-score-value {
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  font-weight: 700;
}

.match-bar-track {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
}

.match-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}
```

### Fix M — Allies Panel Explicit Styles
```css
.allies-panel {
  width: 40%;
  min-width: 280px;
  background-color: #111318;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  height: 100vh;
  overflow-y: auto;
  padding: 24px 16px;
  position: relative;
  z-index: 2;
  flex-shrink: 0;
}

.ally-card {
  background-color: #1a1d26;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 12px;
  width: 90%;
  margin: 0 auto 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.85);
  font-family: 'Rajdhani', sans-serif;
}
```

### Fix N — Matches Grid Explicit Styles
```css
.matches-grid-panel {
  width: 60%;
  flex: 1;
  background-color: #0d0f14;
  height: 100vh;
  overflow-y: auto;
  padding: 24px;
  position: relative;
  z-index: 2;
}

.matches-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
```

### Fix O — Accepted Card Visibility

The accepted card is invisible because its state-change styles are not applying explicit colours. When a card enters the accepted state, ALL of its child elements must have explicit colours set — do not assume the state change cascades correctly.

```css
/* Accepted card — all text must be explicitly coloured */
.match-card.accepted {
  border: 2px solid #22c55e;
  background-color: #1a1d26; /* explicit — do not inherit */
}

.match-card.accepted .match-card-label {
  color: #e8a020; /* username revealed in amber */
  font-size: 18px;
  font-weight: 700;
  display: inline-block; /* explicit */
}

.match-card.accepted .accepted-badge {
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #22c55e; /* explicit green */
  display: flex;
  align-items: center;
  gap: 6px;
}

.match-card.accepted .accepted-note {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45); /* explicit muted */
  line-height: 1.4;
}

.match-card.accepted .add-ally-btn {
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #e8a020; /* explicit amber */
  background: transparent;
  border: 1px solid #e8a020;
  border-radius: 4px;
  padding: 6px 14px;
  cursor: pointer;
  width: 100%;
  margin-top: 8px;
  transition: all 0.15s ease;
}

.match-card.accepted .add-ally-btn:hover {
  background: rgba(232, 160, 32, 0.12);
}

.match-card.accepted .add-ally-btn.added {
  color: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.15);
  cursor: not-allowed;
}
```

The request button in accepted state:
```css
.request-btn.accepted {
  background: transparent;
  border: 1px solid rgba(34, 197, 94, 0.4);
  color: #22c55e; /* explicit — not inherited */
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 4px;
  width: 100%;
  cursor: default;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
```

---

## Summary of Changes

| Fix | Element | Change |
|-----|---------|--------|
| A | /build-profile page wrapper | Explicit `backgroundColor: #0a0b0f`, `zIndex: 1`, `position: relative` |
| B | Three column layout | Explicit grid, column overflow, dark scrollbar |
| C | Question blocks | Explicit `background: #1a1d26`, border, text colour |
| D | Checkboxes | Custom styled, amber when checked, subtitle text visible |
| E | Yes/No toggles | Explicit border, hover, selected amber state |
| F | Sliders | Custom styled track and thumb, amber fill, value display, tick marks |
| G | Language grid | 3-column grid, Other input styled and visible |
| H | Weapon categories | Amber uppercase subtitle, sub-heading animation |
| I | CTA button | Fixed position, amber border, hover glow, disabled state |
| J | AnimatedBackground | Confirmed present on all 5 pages |
| K | /squad-matches page wrapper | Same explicit wrapper fix as Fix A |
| L | Match cards | Explicit background, all text colours, score labels, bars |
| M | Allies panel | Explicit background, ally card colours |
| N | Matches grid | Explicit background, 3-column grid |
| O | Accepted card | All child elements get explicit colours — label, badge, note, buttons |
