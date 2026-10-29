import LoginCard from '@/components/auth/LoginCard'
import AnimatedBackground from '@/components/ui/AnimatedBackground'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

export default function LoginPage() {
  return (
    <div
      className="login-page"
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#0a0b0f',
        color: '#ffffff',
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      <AnimatedBackground />
      {/* Animated grid background */}
      <div
        className="animated-grid"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          animation: 'gridPulse 5s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Diagonal scan overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, transparent 40%, rgba(232,160,32,0.015) 50%, transparent 60%)',
          animation: 'scanDiag 8s linear infinite',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Radial glow behind card */}
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,160,32,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ position: 'absolute', top: '16px', insetInlineEnd: '20px', zIndex: 2 }}>
        <LanguageSwitcher />
      </div>

      <LoginCard />
    </div>
  )
}
