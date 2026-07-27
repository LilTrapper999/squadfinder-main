'use client'

// Geometric amber circuit-board lines — fixed behind all page content.
// Uses SVG stroke-dashoffset animation with staggered delays.
// pointer-events: none so it never captures clicks.

const LINES = [
  // path, dasharray, delay (s), duration (s)
  { d: 'M 0 120 L 180 120 L 180 320 L 420 320',        delay: 0,    dur: 8  },
  { d: 'M 1920 240 L 1600 240 L 1600 80 L 1350 80',    delay: 1.2,  dur: 9  },
  { d: 'M 300 0 L 300 200 L 560 200 L 560 480',         delay: 2.4,  dur: 10 },
  { d: 'M 1920 600 L 1700 600 L 1700 400 L 1440 400',  delay: 0.8,  dur: 7  },
  { d: 'M 700 1080 L 700 820 L 960 820 L 960 640',      delay: 3.1,  dur: 11 },
  { d: 'M 0 700 L 220 700 L 220 520 L 480 520',         delay: 1.7,  dur: 9  },
  { d: 'M 1920 900 L 1560 900 L 1560 720 L 1300 720',  delay: 2.9,  dur: 8  },
  { d: 'M 1100 0 L 1100 180 L 860 180 L 860 380',       delay: 0.4,  dur: 12 },
  { d: 'M 0 400 L 120 400 L 120 600 L 340 600',         delay: 4.2,  dur: 9  },
  { d: 'M 1920 1080 L 1750 1080 L 1750 880 L 1500 880',delay: 1.5,  dur: 10 },
  { d: 'M 600 0 L 600 320 L 800 320 L 800 560',         delay: 3.7,  dur: 8  },
  { d: 'M 1400 1080 L 1400 860 L 1180 860 L 1180 680',  delay: 0.6,  dur: 11 },
  { d: 'M 0 900 L 280 900 L 280 740 L 520 740',         delay: 2.1,  dur: 9  },
  { d: 'M 1920 360 L 1680 360 L 1680 560 L 1420 560',  delay: 3.3,  dur: 10 },
  { d: 'M 900 1080 L 900 900 L 680 900 L 680 700',      delay: 1.9,  dur: 8  },
]

const NODES = [
  { cx: 180, cy: 120, delay: 0 },
  { cx: 180, cy: 320, delay: 0.6 },
  { cx: 1600, cy: 240, delay: 1.2 },
  { cx: 300, cy: 200, delay: 2.4 },
  { cx: 560, cy: 200, delay: 3.0 },
  { cx: 960, cy: 820, delay: 3.1 },
  { cx: 220, cy: 700, delay: 1.7 },
  { cx: 1560, cy: 900, delay: 2.9 },
  { cx: 1100, cy: 180, delay: 0.4 },
  { cx: 1750, cy: 880, delay: 1.5 },
  { cx: 800, cy: 320, delay: 3.7 },
  { cx: 1400, cy: 860, delay: 0.6 },
  { cx: 1180, cy: 860, delay: 1.1 },
]

export default function AnimatedBackground() {
  return (
    <svg
      className="animated-bg"
      viewBox="0 0 1920 1080"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {LINES.map((line, i) => (
        <path
          key={i}
          d={line.d}
          fill="none"
          stroke="rgba(232,160,32,0.22)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="1000"
          style={{
            animation: `lineDraw ${line.dur}s ease-in-out ${line.delay}s infinite`,
          }}
        />
      ))}
      {NODES.map((node, i) => (
        <circle
          key={i}
          cx={node.cx}
          cy={node.cy}
          r={3}
          fill="rgba(232,160,32,0.35)"
          style={{
            animation: `nodePulse 5s ease-in-out ${node.delay}s infinite`,
            transformOrigin: `${node.cx}px ${node.cy}px`,
          }}
        />
      ))}
    </svg>
  )
}
