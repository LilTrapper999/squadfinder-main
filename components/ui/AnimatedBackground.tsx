'use client'

/**
 * Self-contained animated geometric background.
 * Uses inline <defs><style> so keyframes are scoped to the SVG
 * and cannot be blocked by external CSS resets.
 * Place as the FIRST element inside every page component.
 */
export default function AnimatedBackground() {
  return (
    <div
      className="animated-bg"
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        backgroundColor: '#0a0b0f',
      }}
    >
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          <style>{`
            @keyframes lineFade1 {
              0%   { stroke-dashoffset: 800; opacity: 0; }
              15%  { opacity: 1; }
              85%  { opacity: 1; }
              100% { stroke-dashoffset: 0; opacity: 0; }
            }
            @keyframes lineFade2 {
              0%   { stroke-dashoffset: 600; opacity: 0; }
              20%  { opacity: 0.8; }
              80%  { opacity: 0.8; }
              100% { stroke-dashoffset: 0; opacity: 0; }
            }
            @keyframes geoNodePulse {
              0%, 100% { opacity: 0.2; }
              50%       { opacity: 0.65; }
            }
            .geo-line-1 {
              stroke: rgba(232,160,32,0.22);
              stroke-width: 1.2;
              fill: none;
              stroke-dasharray: 800;
              animation: lineFade1 8s ease-in-out infinite;
            }
            .geo-line-2 {
              stroke: rgba(232,160,32,0.15);
              stroke-width: 1;
              fill: none;
              stroke-dasharray: 600;
              animation: lineFade2 10s ease-in-out infinite;
            }
            .geo-line-3 {
              stroke: rgba(232,160,32,0.10);
              stroke-width: 1;
              fill: none;
              stroke-dasharray: 400;
              animation: lineFade1 12s ease-in-out infinite 2s;
            }
            .geo-node {
              fill: rgba(232,160,32,0.45);
              animation: geoNodePulse 4s ease-in-out infinite;
            }
          `}</style>
        </defs>

        {/* Circuit-board style paths with 90° turns */}
        <path className="geo-line-1" d="M 0 120 L 200 120 L 200 80 L 500 80" style={{ animationDelay: '0s' }} />
        <path className="geo-line-1" d="M 100 300 L 100 400 L 350 400 L 350 350 L 600 350" style={{ animationDelay: '1.5s' }} />
        <path className="geo-line-2" d="M 700 0 L 700 150 L 900 150 L 900 200" style={{ animationDelay: '3s' }} />
        <path className="geo-line-2" d="M 1200 100 L 1000 100 L 1000 250 L 1100 250 L 1100 400" style={{ animationDelay: '0.8s' }} />
        <path className="geo-line-3" d="M 0 500 L 300 500 L 300 550 L 500 550 L 500 600 L 800 600" style={{ animationDelay: '2s' }} />
        <path className="geo-line-3" d="M 1400 300 L 1200 300 L 1200 450 L 1400 450" style={{ animationDelay: '4s' }} />
        <path className="geo-line-1" d="M 400 700 L 400 800 L 600 800 L 600 750 L 900 750" style={{ animationDelay: '1s' }} />
        <path className="geo-line-2" d="M 800 900 L 1000 900 L 1000 850 L 1300 850" style={{ animationDelay: '5s' }} />
        <path className="geo-line-3" d="M 200 950 L 200 1000 L 500 1000" style={{ animationDelay: '3.5s' }} />
        <path className="geo-line-1" d="M 1500 600 L 1300 600 L 1300 700 L 1100 700 L 1100 750" style={{ animationDelay: '2.5s' }} />
        <path className="geo-line-2" d="M 600 200 L 800 200 L 800 100 L 1000 100" style={{ animationDelay: '6s' }} />
        <path className="geo-line-3" d="M 0 750 L 150 750 L 150 850 L 300 850" style={{ animationDelay: '1.2s' }} />

        {/* Node dots at intersections */}
        <circle className="geo-node" cx="200" cy="120" r="2.5" style={{ animationDelay: '0s' }} />
        <circle className="geo-node" cx="100" cy="400" r="2.5" style={{ animationDelay: '1.5s' }} />
        <circle className="geo-node" cx="350" cy="400" r="2.5" style={{ animationDelay: '0.5s' }} />
        <circle className="geo-node" cx="700" cy="150" r="2.5" style={{ animationDelay: '3s' }} />
        <circle className="geo-node" cx="1000" cy="250" r="2.5" style={{ animationDelay: '2s' }} />
        <circle className="geo-node" cx="500" cy="550" r="2.5" style={{ animationDelay: '4s' }} />
        <circle className="geo-node" cx="600" cy="800" r="2.5" style={{ animationDelay: '1s' }} />
        <circle className="geo-node" cx="1000" cy="900" r="2.5" style={{ animationDelay: '5s' }} />
        <circle className="geo-node" cx="800" cy="200" r="2.5" style={{ animationDelay: '6s' }} />
        <circle className="geo-node" cx="1300" cy="600" r="2.5" style={{ animationDelay: '2.5s' }} />
      </svg>
    </div>
  )
}
