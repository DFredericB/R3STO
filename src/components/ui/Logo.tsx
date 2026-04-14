// ══════════════════════════════════════════════════
//  R3STO — Logo
//  Composant réutilisable — logo carré officiel
//  Tailles : sm (24) | md (34) | lg (42) | xl (72)
// ══════════════════════════════════════════════════

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number
  /** @deprecated R3STO logo doit rester sans effet — prop ignorée */
  shadow?: boolean
  style?: React.CSSProperties
}

const SIZES = { sm: 24, md: 34, lg: 42, xl: 72 }

export function Logo({ size = 'md', style }: LogoProps) {
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
        boxShadow: 'none',
        filter: 'none',
        ...style,
      }}
    />
  )
}
