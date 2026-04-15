import { useState } from 'react'

// ══════════════════════════════════════════════════════════════
//  DemoShowcaseBar — Barre d'accès rapide aux sous-sites R3STO
//  Affichée uniquement sur demo.r3sto.ch, tout en haut de l'app
//  Chaque lien ouvre le sous-site dans un nouvel onglet avec ?demo=1
//  → Les sous-sites détectent ?demo=1 et affichent un jeu fictif riche
// ══════════════════════════════════════════════════════════════

interface ShowcaseLink {
  label: string
  icon: string
  url: string
  tag?: string
  color: string
}

const LINKS: ShowcaseLink[] = [
  { label: 'Widget Résa',    icon: '📅', url: 'https://booking.r3sto.ch/?demo=1',                 tag: 'Booking', color: '#2b5ba0' },
  { label: 'Menu digital',   icon: '🍽️', url: 'https://menu.r3sto.ch/?demo=1',                    tag: 'Menu',    color: '#e89420' },
  { label: 'Addition QR',    icon: '🧾', url: 'https://bill.r3sto.ch/?demo=1',                    tag: 'Bill',    color: '#1a9e6e' },
  { label: 'Delivery',       icon: '🛵', url: 'https://delivery.r3sto.ch/?demo=1',                tag: 'Delivery',color: '#dc5050' },
  { label: 'Marketplace',    icon: '🏪', url: 'https://r3sto.ch/restaurants/?demo=1',             tag: 'Public',  color: '#7c5cbe' },
  { label: "Bunny's Lausanne", icon: '🐰', url: 'https://demo.r3sto.ch/chezbunnys-lausanne/', tag: 'Vitrine', color: '#e89420' },
  { label: "Bunny's Bern",     icon: '🥨', url: 'https://demo.r3sto.ch/chezbunnys-bern/',     tag: 'Vitrine', color: '#b85a3c' },
  { label: "Bunny's Zürich",   icon: '🍷', url: 'https://demo.r3sto.ch/chezbunnys-zurich/',   tag: 'Vitrine', color: '#3b7ca8' },
]

export function DemoShowcaseBar() {
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        aria-label="Afficher la barre de démo"
        style={{
          position: 'fixed', top: 6, right: 6, zIndex: 9999,
          padding: '4px 10px', fontSize: 11, fontWeight: 700,
          border: '1px solid var(--border)', background: 'var(--am)',
          color: '#000', borderRadius: 6, cursor: 'pointer',
        }}
      >
        🎬 Démo
      </button>
    )
  }

  return (
    <div
      role="toolbar"
      aria-label="Accès aux sous-sites de démonstration"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px',
        background: 'linear-gradient(90deg, #1a1208 0%, #241708 50%, #1a1208 100%)',
        borderBottom: '1px solid rgba(232,148,32,.35)',
        boxShadow: '0 1px 0 rgba(232,148,32,.08)',
        flexWrap: 'wrap',
        position: 'relative',
        zIndex: 100,
      }}
    >
      <span
        style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '.08em',
          textTransform: 'uppercase', color: 'var(--am)',
          padding: '3px 8px', borderRadius: 4,
          background: 'rgba(232,148,32,.12)', border: '1px solid rgba(232,148,32,.3)',
          flexShrink: 0,
        }}
      >
        🎬 Démo R3STO
      </span>

      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', flexShrink: 0 }}>
        Ouvrir un module rempli d'exemples →
      </span>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
        {LINKS.map(link => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`Ouvrir ${link.label} rempli de données d'exemple`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,.04)',
              border: '1px solid ' + link.color + '55',
              color: '#fff', textDecoration: 'none',
              fontSize: 11, fontWeight: 600,
              transition: '.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = link.color + '22'
              e.currentTarget.style.borderColor = link.color
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,.04)'
              e.currentTarget.style.borderColor = link.color + '55'
            }}
          >
            <span aria-hidden="true">{link.icon}</span>
            <span>{link.label}</span>
            {link.tag && (
              <span
                style={{
                  fontSize: 9, fontWeight: 700,
                  padding: '1px 5px', borderRadius: 3,
                  background: link.color, color: '#fff',
                  letterSpacing: '.03em',
                }}
              >
                {link.tag}
              </span>
            )}
          </a>
        ))}
      </div>

      <button
        onClick={() => setCollapsed(true)}
        aria-label="Masquer la barre de démo"
        title="Masquer"
        style={{
          background: 'transparent', border: '1px solid rgba(255,255,255,.15)',
          color: 'rgba(255,255,255,.6)', borderRadius: 4,
          padding: '2px 8px', fontSize: 11, cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}
