# SquadFinder — Spec Amendment 08
> Covers: full CSS rewrite from scratch, role complement/match slider, game version audit and accuracy, cloud version auto-updater. Apply after all previous spec files.

---

## FIX 1 — Full CSS Rewrite From Scratch

### The Problem
The UI invisibility issue has persisted across three spec amendments because Claude Code has been patching broken CSS on top of itself. The existing stylesheets are in a broken state and cannot be reliably fixed by addition.

### The Fix — Delete and Rewrite
Claude Code must:

1. **Delete** every existing CSS file in the project — `globals.css`, any CSS modules, any inline style objects, any Tailwind class strings that relate to colours, backgrounds, or visibility
2. **Rewrite** a single `globals.css` from scratch using only the styles below
3. **Apply explicit `style` props** on every component's root element as a safety net — do not rely solely on class names

This is a blocking step. Do not touch any other part of the codebase until the CSS rewrite is complete and every page is visibly rendering correctly.

---

### globals.css — Full Rewrite

```css
/* =============================================
   SQUADFINDER — globals.css
   Written from scratch. Do not patch this file.
   If something is broken, rewrite it, do not add to it.
   ============================================= */

/* ── Reset ── */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ── Base ── */
html, body {
  width: 100%;
  min-height: 100vh;
  background-color: #0a0b0f;
  color: #ffffff;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  overflow-x: hidden;
}

/* ── Typography ── */
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');

/* ── Heading Animations ── */
@keyframes mainPulse {
  0%, 100% {
    text-shadow:
      0 0 8px rgba(232, 160, 32, 0.5),
      0 0 16px rgba(232, 160, 32, 0.3);
  }
  50% {
    text-shadow:
      0 0 20px rgba(232, 160, 32, 1),
      0 0 40px rgba(232, 160, 32, 0.6),
      0 0 80px rgba(232, 160, 32, 0.2);
  }
}

@keyframes mainFloat {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-3px); }
}

@keyframes subPulse {
  0%, 100% {
    text-shadow:
      0 0 5px rgba(232, 160, 32, 0.35),
      0 0 10px rgba(232, 160, 32, 0.15);
  }
  50% {
    text-shadow:
      0 0 12px rgba(232, 160, 32, 0.8),
      0 0 24px rgba(232, 160, 32, 0.35);
  }
}

@keyframes subFloat {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-2px); }
}

.main-heading {
  display: inline-block;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 2rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #e8a020;
  animation: mainPulse 2.5s ease-in-out infinite,
             mainFloat 3s ease-in-out infinite;
}

.sub-heading {
  display: inline-block;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  animation: subPulse 3s ease-in-out infinite,
             subFloat 4s ease-in-out infinite;
}

/* ── Animated Background ── */
@keyframes lineFade {
  0%   { stroke-dashoffset: 1000; opacity: 0; }
  15%  { opacity: 1; }
  85%  { opacity: 1; }
  100% { stroke-dashoffset: 0; opacity: 0; }
}

@keyframes nodePulse {
  0%, 100% { opacity: 0.2; }
  50%       { opacity: 0.7; }
}

.animated-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
  background-color: #0a0b0f;
}

/* ── Page Wrapper (must wrap all page content) ── */
.page-content {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  width: 100vw;
  background-color: #0a0b0f;
}

/* ── Top Nav ── */
.top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 48px;
  background-color: #0a0b0f;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 100;
}

.top-nav-home-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-family: 'Rajdhani', sans-serif;
  font-size: 14px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.top-nav-home-btn:hover {
  color: #e8a020;
  transform: scale(1.15);
  filter: drop-shadow(0 0 8px rgba(232, 160, 32, 0.8));
}

.top-nav-settings {
  color: rgba(255, 255, 255, 0.3);
  width: 20px;
  height: 20px;
  cursor: default;
}

/* ── Sidebar (select-game) ── */
.game-sidebar {
  background-color: #111318;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  height: 100vh;
  padding: 72px 12px 24px;
  width: fit-content;
  min-width: 0;
  white-space: nowrap;
  flex-shrink: 0;
  overflow-y: auto;
}

.sidebar-category {
  display: block;
  color: rgba(255, 255, 255, 0.65);
  font-family: 'Rajdhani', sans-serif;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 14px;
  border-radius: 4px;
  border-left: 3px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  background: none;
  border-top: none;
  border-right: none;
  border-bottom: none;
  text-align: left;
  width: 100%;
}

.sidebar-category:hover {
  color: rgba(255, 255, 255, 0.95);
  background: rgba(255, 255, 255, 0.05);
}

.sidebar-category.active {
  color: #e8a020;
  border-left-color: #e8a020;
  background: rgba(232, 160, 32, 0.08);
}

/* ── Game Grid ── */
.game-grid-panel {
  flex: 1;
  height: 100vh;
  overflow-y: auto;
  padding: 72px 20px 24px;
  background-color: #0d0f14;
  min-width: 0;
}

.game-grid {
  display: grid;
  gap: 12px;
  /* grid-template-columns set dynamically via JS */
}

.game-tile {
  background-color: #1a1d26;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: box-shadow 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.game-tile:hover {
  border-color: rgba(232, 160, 32, 0.9);
  box-shadow:
    0 0 12px rgba(232, 160, 32, 0.6),
    0 0 24px rgba(232, 160, 32, 0.3),
    0 0 48px rgba(232, 160, 32, 0.1);
  transform: translateY(-2px) scale(1.02);
}

.game-tile.selected {
  border: 2px solid #e8a020;
  box-shadow:
    0 0 16px rgba(232, 160, 32, 0.8),
    0 0 32px rgba(232, 160, 32, 0.4),
    0 0 64px rgba(232, 160, 32, 0.15),
    inset 0 0 20px rgba(232, 160, 32, 0.08);
  background-color: rgba(232, 160, 32, 0.06);
}

.game-tile-image {
  width: 100%;
  height: 70%;
  object-fit: contain;
  object-position: center;
  background-color: #0a0b0f;
  padding: 8px;
}

.game-tile-name {
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  padding: 8px 6px;
  width: 100%;
  background-color: #1a1d26;
}

.game-tile-mark {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.35);
  vertical-align: super;
}

/* ── Grid Divider ── */
.grid-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  grid-column: 1 / -1;
}

.grid-divider-line {
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.grid-divider-label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 11px;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.25);
  white-space: nowrap;
  text-transform: uppercase;
}

/* ── Version Panel ── */
.version-panel {
  background-color: #111318;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  height: 100vh;
  padding: 72px 20px 24px;
  width: fit-content;
  min-width: 180px;
  max-width: 320px;
  flex-shrink: 0;
  overflow-y: auto;
  white-space: nowrap;
  transition: width 200ms ease, opacity 200ms ease;
}

.version-panel.closing {
  width: 0 !important;
  min-width: 0 !important;
  opacity: 0;
  padding: 0;
  overflow: hidden;
}

.platform-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.platform-btn {
  flex: 1;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.platform-btn.active {
  border-color: #e8a020;
  color: #e8a020;
  background: rgba(232, 160, 32, 0.08);
}

.version-item {
  display: block;
  color: rgba(255, 255, 255, 0.75);
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  font-weight: 500;
  padding: 10px 14px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 6px;
  cursor: pointer;
  white-space: nowrap;
  background-color: #1a1d26;
  transition: all 0.15s ease;
  width: 100%;
  text-align: left;
}

.version-item:hover {
  background-color: #22273a;
  color: rgba(255, 255, 255, 0.95);
  border-color: rgba(255, 255, 255, 0.15);
}

.version-item.selected {
  background-color: rgba(232, 160, 32, 0.1);
  border-color: #e8a020;
  color: #e8a020;
}

/* ── Find My Squad Button ── */
.find-squad-btn {
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
  animation: subPulse 3s ease-in-out infinite;
}

.find-squad-btn:hover {
  background: rgba(232, 160, 32, 0.12);
  box-shadow: 0 0 16px rgba(232, 160, 32, 0.5), 0 0 32px rgba(232, 160, 32, 0.2);
}

.find-squad-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  box-shadow: none;
  animation: none;
}

/* ── Build Profile ── */
.profile-page {
  padding: 72px 24px 100px;
  background-color: #0a0b0f;
  min-height: 100vh;
}

.profile-columns {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 24px;
  column-fill: balance;
}

.question-block {
  background-color: #1a1d26;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 16px;
  break-inside: avoid;
  margin-bottom: 16px;
}

.question-label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 12px;
  display: inline-block;
}

.checkbox-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.checkbox-option:hover {
  background: rgba(255, 255, 255, 0.04);
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
  transition: all 0.15s ease;
}

.checkbox-option input[type="checkbox"]:checked {
  background-color: #e8a020;
  border-color: #e8a020;
}

.checkbox-option input[type="checkbox"]:checked::after {
  content: '✓';
  position: absolute;
  top: -2px;
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

.weapon-category-title {
  font-family: 'Rajdhani', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e8a020;
  margin-top: 14px;
  margin-bottom: 6px;
  display: inline-block;
}

.language-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
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
  transition: border-color 0.15s ease;
}

.language-other-input:focus {
  border-color: #e8a020;
  background: rgba(232, 160, 32, 0.05);
}

.language-other-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

/* ── Sliders ── */
.slider-wrapper {
  width: 100%;
  padding: 8px 0 32px;
  position: relative;
}

input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  background: linear-gradient(
    to right,
    #e8a020 0%,
    #e8a020 var(--fill, 0%),
    rgba(255,255,255,0.1) var(--fill, 0%),
    rgba(255,255,255,0.1) 100%
  );
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
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

.slider-value-display {
  font-family: 'Rajdhani', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #e8a020;
  text-align: center;
  margin-top: 10px;
  display: block;
}

.slider-anchor-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
}

.slider-anchor-label {
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  max-width: 80px;
}

/* ── Role Complement Slider ── */
.role-mode-slider-wrapper {
  margin-top: 8px;
}

.role-mode-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
}

.role-mode-label {
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

/* ── Squad Matches ── */
.squad-matches-page {
  display: flex;
  flex-direction: row;
  height: 100vh;
  width: 100vw;
  padding-top: 48px;
  background-color: #0a0b0f;
}

.allies-panel {
  width: 40%;
  min-width: 280px;
  background-color: #111318;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  height: 100%;
  overflow-y: auto;
  padding: 24px 16px;
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
}

.ally-pfp {
  width: 40px;
  height: 40px;
  min-width: 40px;
  background-color: #0a0b0f;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Rajdhani', sans-serif;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.2);
  font-weight: 600;
}

.ally-name {
  font-family: 'Rajdhani', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.ally-overall {
  font-family: 'Rajdhani', sans-serif;
  font-size: 12px;
  font-weight: 600;
}

.matches-grid-panel {
  flex: 1;
  height: 100%;
  overflow-y: auto;
  padding: 24px;
  background-color: #0d0f14;
}

.matches-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.match-card {
  background-color: #1a1d26;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.match-card:hover {
  border-color: rgba(232, 160, 32, 0.4);
  box-shadow: 0 0 12px rgba(232, 160, 32, 0.2);
}

.match-card.accepted {
  border: 2px solid #22c55e;
  background-color: #1a1d26;
}

.match-label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  display: inline-block;
}

.match-label.revealed {
  color: #e8a020;
}

.match-status {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.score-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.score-label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.65);
  white-space: nowrap;
  display: inline-block;
  min-width: 100px;
}

.score-bar-track {
  flex: 1;
  height: 5px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  overflow: hidden;
}

.score-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}

.score-value {
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  font-weight: 700;
  min-width: 36px;
  text-align: right;
}

.request-btn {
  width: 100%;
  padding: 9px 14px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid #e8a020;
  background: transparent;
  color: #e8a020;
}

.request-btn:hover:not(:disabled) {
  background: rgba(232, 160, 32, 0.12);
  box-shadow: 0 0 10px rgba(232, 160, 32, 0.3);
}

.request-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.request-btn.waiting {
  color: rgba(255, 255, 255, 0.5);
  border-color: rgba(255, 255, 255, 0.2);
  animation: subPulse 1s ease-in-out infinite;
}

.request-btn.accepted-state {
  color: #22c55e;
  border-color: rgba(34, 197, 94, 0.4);
  cursor: default;
}

.request-btn.declined-state {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.4);
  cursor: default;
}

.request-btn.locked-state {
  color: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.08);
  cursor: not-allowed;
}

.accepted-note {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  line-height: 1.4;
}

.add-ally-btn {
  width: 100%;
  padding: 7px 14px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #e8a020;
  background: transparent;
  border: 1px solid #e8a020;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-ally-btn:hover {
  background: rgba(232, 160, 32, 0.1);
}

.add-ally-btn.added {
  color: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.12);
  cursor: not-allowed;
}

.countdown-text {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  margin-top: 4px;
}

/* ── Homepage ── */
.home-page {
  display: flex;
  flex-direction: row;
  height: 100vh;
  width: 100vw;
  padding-top: 48px;
  background-color: #0a0b0f;
}

.home-sidebar {
  width: 25%;
  min-width: 220px;
  background-color: #111318;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  height: 100%;
  overflow-y: auto;
  padding: 24px 16px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.home-feed {
  flex: 1;
  background-color: #0a0b0f;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
}

.home-ally-card {
  background-color: #1a1d26;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 12px;
  width: 90%;
  margin: 0 auto;
  height: calc(100vh / 8);
  min-height: 60px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.home-ally-name {
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.home-ally-overall {
  font-family: 'Rajdhani', sans-serif;
  font-size: 11px;
  font-weight: 600;
}

.home-ally-status {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.invite-to-squad-btn {
  font-family: 'Rajdhani', sans-serif;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border: 1px solid #e8a020;
  background: transparent;
  color: #e8a020;
  border-radius: 3px;
  cursor: pointer;
  margin-left: auto;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.invite-to-squad-btn:hover {
  background: rgba(232, 160, 32, 0.1);
}

.home-find-squad-btn {
  width: 90%;
  margin: 16px auto 0;
  padding: 14px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #e8a020;
  background: transparent;
  border: 2px solid #e8a020;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: block;
  text-align: center;
  animation: subPulse 3s ease-in-out infinite;
}

.home-find-squad-btn:hover {
  background: rgba(232, 160, 32, 0.12);
  box-shadow: 0 0 16px rgba(232, 160, 32, 0.4);
}

/* ── Login Page ── */
.login-page {
  min-height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0a0b0f;
}

.login-card {
  background-color: #111318;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 48px 40px;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  position: relative;
  z-index: 2;
}

.login-subheading {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  line-height: 1.5;
}

.google-btn {
  width: 100%;
  padding: 12px 20px;
  background: #ffffff;
  border: none;
  border-radius: 6px;
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.15s ease;
}

.google-btn:hover {
  background: #f0f0f0;
  box-shadow: 0 0 20px rgba(232, 160, 32, 0.3);
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
}

.demo-toggle {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

/* ── Incoming Request Popup ── */
.popup-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.popup-card {
  background-color: #111318;
  border: 1px solid rgba(232, 160, 32, 0.4);
  border-radius: 12px;
  padding: 28px;
  width: 33vw;
  min-width: 320px;
  min-height: calc(100vh / 6);
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow:
    0 0 40px rgba(232, 160, 32, 0.4),
    0 0 80px rgba(232, 160, 32, 0.15);
  animation: subPulse 2s ease-in-out infinite;
}

.popup-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 4px;
}

.popup-btn {
  padding: 9px;
  border-radius: 5px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid;
  background: transparent;
}

.popup-btn.decline {
  color: rgba(255, 255, 255, 0.6);
  border-color: rgba(255, 255, 255, 0.2);
}

.popup-btn.decline-block {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.4);
}

.popup-btn.accept {
  color: #e8a020;
  border-color: #e8a020;
}

.popup-btn.accept-ally {
  color: #22c55e;
  border-color: #22c55e;
}

.popup-btn:hover {
  opacity: 0.85;
}

.expire-bar-track {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
}

.expire-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 1s linear, background-color 1s ease;
}

.expire-text {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-align: right;
  margin-top: 2px;
}

/* ── Scrollbar (global) ── */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
::-webkit-scrollbar-thumb { background: rgba(232,160,32,0.25); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: rgba(232,160,32,0.45); }
```

---

## FIX 2 — Role Complement/Match Preference Slider

Add to the Gamesmanship question group on `/build-profile`, after the Roles checkbox question.

### Question
```
How should we match your roles?
[complement me ◄──────────────► match me]
```

- **Type:** Slider, 0–10, step 0.1, same spec as all other sliders
- **Label:** `Role matching style` — `.sub-heading` + `.question-label`
- **Left anchor (0.0):** `Complement me` — find players with DIFFERENT roles
- **Middle (5.0):** `Either works`
- **Right anchor (10.0):** `Match me` — find players with SAME roles
- **Data key:** `gamesmanship.roleMatchPreference: number` — stored 0.0–10.0

### Effect on roleScore in matching.ts

Update `roleScore()` in `/lib/matching.ts` to use this preference:

```ts
/**
 * roleScore — now accounts for both players' role match preferences.
 * 
 * preference = 0.0 → rewards diversity (complement)
 * preference = 5.0 → neutral (no preference)
 * preference = 10.0 → rewards similarity (match)
 * 
 * Average both players' preferences, then blend between
 * diversity score and similarity score accordingly.
 */
function roleScore(me: Profile, them: Profile): number {
  const u = union(me.roles, them.roles);
  if (u.length === 0) return 50;

  const overlapRatio = intersection(me.roles, them.roles).length / u.length;
  const similarityScore = overlapRatio * 100;         // high overlap = high score
  const diversityScore  = (1 - overlapRatio) * 100;  // low overlap = high score

  // Average both players' preferences (0–10 scale → 0–1)
  const avgPref = ((me.roleMatchPreference ?? 5) + (them.roleMatchPreference ?? 5)) / 20;

  // Blend: 0.0 pref = pure diversity, 1.0 pref = pure similarity
  return diversityScore * (1 - avgPref) + similarityScore * avgPref;
}
```

Also update the `Profile` type in `/lib/types.ts`:
```ts
roleMatchPreference?: number;  // 0.0–10.0, default 5.0 (neutral)
```

---

## FIX 3 — Game Version Accuracy: Full Re-Audit

### Rule
Every game's version list must be wiped and re-researched from scratch. Do not keep any existing version data — it is known to be inaccurate.

For every game in the catalogue, Claude Code must:
1. Visit the game's official site, Steam store page, or official wiki
2. Find the current live version/season name
3. Apply the playability rule from SPEC_UPDATE_01 Section B1 — only list versions currently playable on live servers
4. Write the result into `mockData.ts`

### Specific Known Issues to Fix

**Arena Breakout: Infinite (PC)**
Research the current PC season at implementation time.
Mandatory-update game — only the current season is playable.
Previous seasons (Breach, Dusk to Dawn, Distortion etc.) are NOT listable unless still playable.
List format: `Season X: [Season Name] (PC)`

**Arena Breakout (Mobile)**
This is a SEPARATE game from ABI PC. It has its own season cadence.
Research the current mobile season at implementation time.
List format: `Season X: [Season Name] (Mobile)`

These are two separate game entries in the catalogue — do not merge them.

**For all other games:**
Research and fix. Known problem areas:
- Any game showing seasons that ended more than one update ago
- Any game showing version numbers that don't match the current live client
- Any game where the "version" is actually a sub-area name (see SPEC_AMENDMENT_04 Fix 4)

---

## FIX 4 — Cloud Version Auto-Updater

### Overview
A scheduled cloud job runs daily and automatically updates game version data in the database. This runs whether or not the developer's computer is on.

**Do not implement in the prototype.** This is a Phase 2 item. Spec is provided here for DB and infrastructure planning.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│  CLOUD SCHEDULER (runs daily, 03:00 UTC)            │
│  Vercel Cron Job or GitHub Actions scheduled workflow│
└────────────────────┬────────────────────────────────┘
                     │ triggers
                     ▼
┌─────────────────────────────────────────────────────┐
│  VERSION CHECKER FUNCTION                           │
│  /api/cron/check-versions.ts (Vercel serverless)    │
│                                                     │
│  For each game in DB:                               │
│  1. Fetch current version from source               │
│  2. Compare to stored version                       │
│  3. If changed → update DB silently                 │
│  4. Log the change to version_changelog table       │
└────────────────────┬────────────────────────────────┘
                     │ reads/writes
                     ▼
┌─────────────────────────────────────────────────────┐
│  DATABASE                                           │
│  games table — current versions                     │
│  version_changelog table — history of all changes   │
└─────────────────────────────────────────────────────┘
```

### Version Sources Per Game Type

| Game Type | Source |
|-----------|--------|
| Steam games | Steam Store API: `https://store.steampowered.com/api/appdetails?appids={APP_ID}` — returns current build/version |
| VALORANT | Riot Games API: `https://valorant-api.com/v1/version` — returns current patch |
| Games with wikis | Scrape the game's official wiki infobox for current version (use Cheerio/JSDOM) |
| Manual-only games | Flag in DB as `auto_update: false` — version must be updated manually |

### DB Schema

```sql
CREATE TABLE games (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL,
  steam_app_id    INTEGER,
  logo_url        TEXT,
  has_team_feature BOOLEAN DEFAULT TRUE,
  auto_update     BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE game_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     TEXT REFERENCES games(id),
  version     TEXT NOT NULL,
  platform    TEXT DEFAULT 'PC',  -- 'PC' | 'Mobile' | 'Console'
  is_current  BOOLEAN DEFAULT TRUE,
  added_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE version_changelog (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     TEXT REFERENCES games(id),
  old_version TEXT,
  new_version TEXT,
  platform    TEXT,
  changed_at  TIMESTAMPTZ DEFAULT NOW(),
  source      TEXT  -- URL that returned the new version
);
```

### Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/check-versions",
      "schedule": "0 3 * * *"
    }
  ]
}
```

### Version Checker Function

```ts
// /api/cron/check-versions.ts

export async function GET(request: Request) {
  // Verify this is called by Vercel Cron, not a random request
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const games = await db.query('SELECT * FROM games WHERE auto_update = true');

  for (const game of games) {
    const currentVersions = await fetchCurrentVersions(game);

    for (const version of currentVersions) {
      const stored = await db.query(
        'SELECT * FROM game_versions WHERE game_id = $1 AND platform = $2 AND is_current = true',
        [game.id, version.platform]
      );

      if (stored.rows[0]?.version !== version.version) {
        // Version has changed — update silently
        await db.query(
          'UPDATE game_versions SET is_current = false WHERE game_id = $1 AND platform = $2',
          [game.id, version.platform]
        );
        await db.query(
          'INSERT INTO game_versions (game_id, version, platform, is_current) VALUES ($1, $2, $3, true)',
          [game.id, version.version, version.platform]
        );
        await db.query(
          'INSERT INTO version_changelog (game_id, old_version, new_version, platform, source) VALUES ($1, $2, $3, $4, $5)',
          [game.id, stored.rows[0]?.version, version.version, version.platform, version.source]
        );
      }
    }
  }

  return new Response('Version check complete', { status: 200 });
}
```

---

## Summary of All Changes

| Fix | Area | Change |
|-----|------|--------|
| 1 | Global CSS | Delete all existing CSS. Rewrite globals.css from scratch with every element explicitly styled |
| 2 | Build Profile | Role complement/match preference slider added to Gamesmanship section |
| 2 | matching.ts | roleScore() updated to blend diversity and similarity based on both players' preferences |
| 2 | types.ts | roleMatchPreference field added to Profile interface |
| 3 | mockData.ts | All game versions wiped and re-researched from scratch. ABI PC and Mobile treated as separate entries |
| 4 | Phase 2 spec | Cloud version auto-updater fully specced — Vercel Cron, DB schema, version sources, changelog |
