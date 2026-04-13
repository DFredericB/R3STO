// ══════════════════════════════════════════════════
//  R3STO Delivery — Dashboard
//  Vue d'ensemble livraison & take-away
// ══════════════════════════════════════════════════

import { useState, useMemo } from 'react'
// import { useT } from '../../i18n/useTranslation'

interface DeliveryOrder {
  id: string
  customer: string
  phone: string
  address: string
  items: { name: string; qty: number; price: number }[]
  total: number
  status: 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled'
  type: 'delivery' | 'takeaway'
  createdAt: string
  estimatedDelivery?: string
  driver?: string
}

const DEMO_ORDERS: DeliveryOrder[] = [
  { id: 'DEL-001', customer: 'Sophie Martin', phone: '+41 76 123 45 67', address: 'Rue de Lausanne 42, 1700 Fribourg', items: [{ name: 'Burger Classique', qty: 2, price: 24 }, { name: 'Frites maison', qty: 2, price: 8 }, { name: 'Tiramisu', qty: 1, price: 9 }], total: 65, status: 'delivering', type: 'delivery', createdAt: '12:34', estimatedDelivery: '13:05', driver: 'Lucas R.' },
  { id: 'DEL-002', customer: 'Marc Dupont', phone: '+41 79 876 54 32', address: '', items: [{ name: 'Pizza Margherita', qty: 1, price: 18 }, { name: 'Coca-Cola', qty: 2, price: 8 }], total: 26, status: 'ready', type: 'takeaway', createdAt: '12:41' },
  { id: 'DEL-003', customer: 'Anna Keller', phone: '+41 78 555 12 34', address: 'Avenue de la Gare 15, 1700 Fribourg', items: [{ name: 'Salade César', qty: 1, price: 16 }, { name: 'Risotto truffe', qty: 1, price: 28 }, { name: 'Eau minérale', qty: 1, price: 5 }], total: 49, status: 'preparing', type: 'delivery', createdAt: '12:48' },
  { id: 'DEL-004', customer: 'Pierre Blanc', phone: '+41 76 444 33 22', address: 'Chemin des Alpes 8, 1700 Fribourg', items: [{ name: 'Tartare de boeuf', qty: 2, price: 48 }, { name: 'Vin rouge (bouteille)', qty: 1, price: 35 }], total: 83, status: 'pending', type: 'delivery', createdAt: '12:52' },
  { id: 'DEL-005', customer: 'Julie Favre', phone: '+41 79 111 22 33', address: '', items: [{ name: 'Poke Bowl Saumon', qty: 3, price: 54 }], total: 54, status: 'delivered', type: 'takeaway', createdAt: '11:20' },
  { id: 'DEL-006', customer: 'Thomas Weber', phone: '+41 78 999 88 77', address: 'Rue de Morat 28, 1700 Fribourg', items: [{ name: 'Fondue moitié-moitié', qty: 1, price: 32 }, { name: 'Rösti', qty: 1, price: 14 }], total: 46, status: 'delivered', type: 'delivery', createdAt: '11:45', driver: 'Lucas R.' },
]

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  preparing: '#3b82f6',
  ready: '#8b5cf6',
  delivering: '#06b6d4',
  delivered: '#10b981',
  cancelled: '#ef4444',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  preparing: 'En préparation',
  ready: 'Prêt',
  delivering: 'En livraison',
  delivered: 'Livré',
  cancelled: 'Annulé',
}

export function DeliveryDashboard() {
  const [filter, setFilter] = useState<'all' | 'delivery' | 'takeaway'>('all')
  const [orders] = useState<DeliveryOrder[]>(DEMO_ORDERS)

  const filtered = useMemo(() =>
    filter === 'all' ? orders : orders.filter(o => o.type === filter)
  , [orders, filter])

  const active = orders.filter(o => !['delivered', 'cancelled'].includes(o.status))
  const todayCA = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0)

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <img src="/logo-r3sto.jpg" alt="R3STO" style={{ width: 36, height: 36, borderRadius: 0, objectFit: 'cover' }} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0 }}>R3STO Delivery</h1>
          <p style={{ fontSize: 13, color: 'var(--t3)', margin: 0 }}>Livraison & Take-away — commandes en temps réel</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Commandes actives', value: active.length, color: '#3b82f6', icon: '📦' },
          { label: 'En livraison', value: orders.filter(o => o.status === 'delivering').length, color: '#06b6d4', icon: '🛵' },
          { label: 'Take-away prêts', value: orders.filter(o => o.status === 'ready' && o.type === 'takeaway').length, color: '#8b5cf6', icon: '🏃' },
          { label: 'CA du jour', value: `${todayCA} CHF`, color: '#10b981', icon: '💰' },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 12,
            padding: 16, display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 24 }}>{kpi.icon}</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600 }}>{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['all', 'delivery', 'takeaway'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            fontFamily: 'var(--ff)', cursor: 'pointer', border: '1px solid var(--border)',
            background: filter === f ? 'var(--bl)' : 'var(--surf)',
            color: filter === f ? '#fff' : 'var(--t2)',
          }}>
            {f === 'all' ? 'Toutes' : f === 'delivery' ? '🛵 Livraison' : '🏃 Take-away'}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(order => (
          <div key={order.id} style={{
            background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 12,
            padding: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            {/* Status dot + ID */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: STATUS_COLORS[order.status],
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--fm)' }}>{order.id}</span>
            </div>

            {/* Customer + type */}
            <div style={{ flex: 1, minWidth: 150 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{order.customer}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                {order.type === 'delivery' ? `📍 ${order.address}` : '🏃 Take-away'}
              </div>
            </div>

            {/* Items summary */}
            <div style={{ fontSize: 12, color: 'var(--t2)', minWidth: 120 }}>
              {order.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
            </div>

            {/* Total */}
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gn)', minWidth: 80, textAlign: 'right' }}>
              {order.total} CHF
            </div>

            {/* Status badge */}
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
              background: `${STATUS_COLORS[order.status]}20`,
              color: STATUS_COLORS[order.status],
              minWidth: 100, textAlign: 'center',
            }}>
              {STATUS_LABELS[order.status]}
            </span>

            {/* Time + driver */}
            <div style={{ fontSize: 11, color: 'var(--t4)', minWidth: 80, textAlign: 'right' }}>
              <div>{order.createdAt}</div>
              {order.driver && <div style={{ color: 'var(--bl)' }}>{order.driver}</div>}
              {order.estimatedDelivery && <div>ETA {order.estimatedDelivery}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
