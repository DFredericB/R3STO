// ══════════════════════════════════════════════════
//  R3STO — Logo
//  Composant réutilisable — logo carré officiel
//  Tailles : sm (24) | md (34) | lg (42) | xl (72)
// ══════════════════════════════════════════════════

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number
  shadow?: boolean
  style?: React.CSSProperties
}

const SIZES = { sm: 24, md: 34, lg: 42, xl: 72 }

export function Logo({ size = 'md', shadow = true, style }: LogoProps) {
  const px = typeof size === 'number' ? size : SIZES[size]

  return (
    <img
      src="/logo-r3sto.jpg"
      alt="R3STO"
      width={px}
      height={px}
      style={{
        width: px,
        height: px,
        objectFit: 'cover',
        flexShrink: 0,
        borderRadius: 0,
        boxShadow: shadow ? '0 2px 10px rgba(45,92,184,.4)' : 'none',
        ...style,
      }}
    />
  )
}
