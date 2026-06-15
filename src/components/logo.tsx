import Link from 'next/link'

interface LogoProps {
  size?: number
  href?: string | null
}

export default function Logo({ size = 28, href = '/dashboard' }: LogoProps) {
  const fontSize = Math.max(16, Math.round(size * 0.6))

  const content = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
        <circle
          cx="48" cy="48" r="37"
          stroke="var(--brand)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray="178 55"
          transform="rotate(128 48 48)"
        />
        <polyline
          points="26,58 38,48 49,54 67,30"
          fill="none"
          stroke="var(--brand)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="67" cy="30" r="6.2" fill="var(--brand)" />
      </svg>
      <span style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 600,
        fontSize: `${fontSize}px`,
        letterSpacing: '-0.01em',
        color: 'var(--ink)',
      }}>
        A<span style={{ color: 'var(--brand)' }}>₹</span>tha
      </span>
    </span>
  )

  if (href === null) return content
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      {content}
    </Link>
  )
}
