import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useToast } from '../../components/ui/Toast';

// ══════════════════════════════════════════════════════════════════
//  TYPES & INTERFACES
// ══════════════════════════════════════════════════════════════════

interface OrderItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

interface Order {
  id: string;
  table: string;
  status: 'pending' | 'preparing' | 'ready' | 'done';
  items: OrderItem[];
  total: number;
  note?: string;
  createdAt: number;
}

interface BellAlert {
  id: string;
  table: string;
  msg: string;
  ts: string;
}

interface Notification {
  id: string;
  type: 'new_order' | 'order_ready' | 'bell_alert' | 'table_call';
  message: string;
  table: string;
  createdAt: number;
  read: boolean;
}

// ══════════════════════════════════════════════════════════════════
//  SOUND SYSTEM
// ══════════════════════════════════════════════════════════════════

// AudioContext créé LAZY au premier beep (user gesture requis par les navigateurs modernes).
// Sinon Chrome/Safari bloquent et log un warning « The AudioContext was not allowed to start ».
let _audioContext: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (_audioContext) return _audioContext;
  try {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    _audioContext = new Ctor();
    return _audioContext;
  } catch (err) {
    console.warn('[Commandes] AudioContext unavailable:', err);
    return null;
  }
}

function playBeep(freq: number = 800, duration: number = 200, volume: number = 0.3) {
  const ctx = getAudioContext();
  if (!ctx) return;
  // Si le contexte est suspendu (pas de user-gesture), on tente de le reprendre.
  if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); }
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
  } catch (err) {
    console.warn('[Commandes] playBeep failed:', err);
  }
}

function playDingSound(volume: number = 0.3) {
  playBeep(800, 150, volume);
  setTimeout(() => playBeep(1000, 150, volume), 160);
}

function playAlarmSound(volume: number = 0.3) {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      playBeep(600, 100, volume);
      setTimeout(() => playBeep(400, 100, volume), 110);
    }, i * 240);
  }
}

function playReadySound(volume: number = 0.3) {
  playBeep(1000, 150, volume);
  setTimeout(() => playBeep(1000, 150, volume), 160);
  setTimeout(() => playBeep(1200, 200, volume), 330);
}

// ══════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════

const DEMO_ORDERS: Order[] = [
  {
    id: 'cmd1',
    table: 'T3',
    status: 'pending',
    items: [
      { id: 'm1', name: 'Salade César', qty: 2, price: 16 },
      { id: 'm2', name: 'Carpaccio bœuf', qty: 1, price: 22 },
    ],
    total: 54,
    note: '',
    createdAt: Date.now() - 5 * 60000,
  },
  {
    id: 'cmd2',
    table: 'T7',
    status: 'preparing',
    items: [{ id: 'm4', name: 'Entrecôte 250g', qty: 2, price: 46 }],
    total: 92,
    note: 'Bien cuit',
    createdAt: Date.now() - 12 * 60000,
  },
  {
    id: 'cmd3',
    table: 'T5',
    status: 'ready',
    items: [
      { id: 'm3', name: 'Filet de perche', qty: 1, price: 38 },
    ],
    total: 38,
    note: '',
    createdAt: Date.now() - 18 * 60000,
  },
  {
    id: 'cmd4',
    table: 'T1',
    status: 'done',
    items: [
      { id: 'm5', name: 'Risotto', qty: 1, price: 32 },
    ],
    total: 32,
    note: '',
    createdAt: Date.now() - 45 * 60000,
  },
];

const DEMO_BELL_ALERTS: BellAlert[] = [
  { id: '1', table: 'T2', msg: 'Appel serveur', ts: '14:25' },
];

export function Commandes() {
  const { toast } = useToast();
  const isDemo = useAppStore(s => s.isDemo);
  // State
  const [filter, setFilter] = useState<'actives' | 'alertes' | 'terminees'>('actives');
  const [orders, setOrders] = useState<Order[]>(isDemo ? DEMO_ORDERS : []);
  const [bellAlerts, setBellAlerts] = useState<BellAlert[]>(isDemo ? DEMO_BELL_ALERTS : []);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  // Préférences son persistées (sinon Didier doit re-mute à chaque refresh)
  const [soundVolume, setSoundVolume] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem('r3sto_cmd_vol') || '');
      return isFinite(v) && v >= 0 && v <= 1 ? v : 0.3;
    } catch { return 0.3; }
  });
  const [soundMuted, setSoundMuted] = useState<boolean>(() => {
    try { return localStorage.getItem('r3sto_cmd_mute') === '1'; } catch { return false; }
  });
  useEffect(() => { try { localStorage.setItem('r3sto_cmd_vol', String(soundVolume)); } catch {} }, [soundVolume]);
  useEffect(() => { try { localStorage.setItem('r3sto_cmd_mute', soundMuted ? '1' : '0'); } catch {} }, [soundMuted]);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState<string | null>(null);
  const [statusFilterMulti, setStatusFilterMulti] = useState<Set<string>>(new Set(['pending', 'preparing', 'ready']));
  const notificationSoundTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Available tables (demo data)
  const tables = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10'];

  // Demande de permission déclenchée par USER GESTURE (bouton) — pas au mount,
  // sinon Chrome/Firefox refusent silencieusement et bloquent toute demande future.
  const requestNotifPermission = () => {
    if (!('Notification' in window)) {
      toast('Notifications navigateur non supportées', 'warning');
      return;
    }
    Notification.requestPermission().then(p => {
      setNotifPermission(p);
      if (p === 'granted') toast('Notifications activées', 'success');
      else if (p === 'denied') toast('Notifications bloquées — ouvrir les paramètres du navigateur', 'warning');
    }).catch(err => {
      console.error('[Commandes] requestPermission failed:', err);
      toast('Échec activation notifications', 'error');
    });
  };

  // Calculate statistics
  const actives = orders.filter(c => c.status !== 'done');
  const terminees = orders.filter(c => c.status === 'done');

  const avgWaitTime = actives.length > 0
    ? Math.round(actives.reduce((sum, o) => sum + (Date.now() - o.createdAt), 0) / actives.length / 60000)
    : 0;

  const totalRevenue = orders
    .filter(o => o.status === 'done')
    .reduce((sum, o) => sum + o.total, 0);

  // Commandes créées dans la dernière heure (vraie métrique, pas `orders.length * 1`)
  const ordersPerHour = orders.filter(o => (Date.now() - o.createdAt) <= 60 * 60 * 1000).length;

  // Add notification
  const addNotification = (type: Notification['type'], message: string, table: string) => {
    const notif: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      table,
      createdAt: Date.now(),
      read: false,
    };
    setNotifications(prev => [notif, ...prev].slice(0, 20)); // Keep last 20

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('R3STO - ' + type.replace('_', ' '), {
        body: `${message} (${table})`,
      });
    }

    // Sound alert
    if (!soundMuted) {
      if (notificationSoundTimeout.current) clearTimeout(notificationSoundTimeout.current);

      if (type === 'new_order') {
        playBeep(800, 200, soundVolume);
      } else if (type === 'order_ready') {
        playReadySound(soundVolume);
      } else if (type === 'bell_alert') {
        playAlarmSound(soundVolume);
      } else if (type === 'table_call') {
        playDingSound(soundVolume);
      }
    }
  };

  // Advance order status
  const cmdAdvance = (id: string) => {
    setOrders(orders.map(cmd => {
      if (cmd.id !== id) return cmd;
      const nextStatus = {
        pending: 'preparing' as const,
        preparing: 'ready' as const,
        ready: 'done' as const,
        done: 'done' as const,
      };
      const newStatus = nextStatus[cmd.status];

      if (newStatus === 'ready') {
        addNotification('order_ready', `Commande prête`, cmd.table);
      }

      return { ...cmd, status: newStatus };
    }));
  };

  // Delete order
  const cmdDelete = (id: string) => {
    setOrders(orders.filter(c => c.id !== id));
  };

  // Update order items and note
  const updateOrder = (id: string, items: OrderItem[], note: string) => {
    setOrders(orders.map(cmd => {
      if (cmd.id !== id) return cmd;
      const total = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
      return { ...cmd, items, note, total };
    }));
    setEditingOrderId(null);
  };

  // Create new order
  const createOrder = (table: string, items: OrderItem[], note: string) => {
    const newOrder: Order = {
      id: 'cmd' + Date.now(),
      table,
      status: 'pending',
      items,
      total: items.reduce((sum, item) => sum + (item.price * item.qty), 0),
      note,
      createdAt: Date.now(),
    };
    setOrders(prev => [newOrder, ...prev]);
    addNotification('new_order', `Nouvelle commande`, table);
    setShowNewOrderForm(false);
  };

  // Render order card
  const renderOrderCard = (cmd: Order, isEditing: boolean = false) => {
    const age = Math.round((Date.now() - cmd.createdAt) / 60000);
    const urgent = cmd.status === 'pending' && age >= 5;

    if (isEditing && editingOrderId === cmd.id) {
      return <OrderEditForm key={cmd.id} order={cmd} onSave={updateOrder} onCancel={() => setEditingOrderId(null)} />;
    }

    return (
      <div
        key={cmd.id}
        onClick={() => setEditingOrderId(cmd.id)}
        style={{
          background: 'var(--surf)',
          border: `1.5px solid ${urgent ? 'var(--rd)' : 'var(--border)'}`,
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '10px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          animation: urgent ? 'pulse 2s infinite' : 'none',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surf)')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 900,
            fontFamily: 'DM Mono, monospace',
            color: 'var(--text)',
          }}>
            Table {cmd.table}
          </div>
          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '5px',
            background: 'rgba(68, 128, 216, 0.12)',
            color: getStatusColor(cmd.status),
            fontWeight: 700,
          }}>
            {getStatusLabel(cmd.status)}
          </span>
          {urgent && (
            <span style={{
              fontSize: '11px',
              background: 'rgba(220, 80, 80, 0.15)',
              color: 'var(--rd)',
              borderRadius: '4px',
              padding: '1px 7px',
              fontWeight: 800,
              animation: 'blink 1s infinite',
            }}>
              {age}min — URGENT
            </span>
          )}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: '11px', color: 'var(--t3)' }}>
            {new Date(cmd.createdAt).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
          {cmd.items.map((it, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
              <span style={{
                fontWeight: 700,
                fontFamily: 'DM Mono, monospace',
                color: 'var(--t2)',
                width: '20px',
                textAlign: 'right',
              }}>
                ×{it.qty}
              </span>
              <span style={{ flex: 1, color: 'var(--text)' }}>{it.name}</span>
              <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--t3)' }}>
                CHF {(it.price * it.qty).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {cmd.note && (
          <div style={{
            fontSize: '11px',
            color: 'var(--am)',
            marginTop: '4px',
            padding: '5px 8px',
            background: 'rgba(240, 160, 32, 0.06)',
            borderRadius: '5px',
          }}>
            💬 {cmd.note}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
          <span style={{
            fontSize: '13px',
            fontWeight: 800,
            fontFamily: 'DM Mono, monospace',
            color: 'var(--bl)',
          }}>
            CHF {cmd.total.toFixed(2)}
          </span>
          <div style={{ display: 'flex', gap: '5px' }} onClick={(e) => e.stopPropagation()}>
            {cmd.status === 'pending' && (
              <button
                onClick={() => cmdAdvance(cmd.id)}
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  background: 'var(--am)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                🍳 En prép.
              </button>
            )}
            {cmd.status === 'preparing' && (
              <button
                onClick={() => cmdAdvance(cmd.id)}
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  background: 'var(--gn)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                ✓ Prêt
              </button>
            )}
            {cmd.status === 'ready' && (
              <button
                onClick={() => cmdAdvance(cmd.id)}
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  background: 'var(--gn)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                ✅ Servi
              </button>
            )}
            <button
              onClick={() => cmdDelete(cmd.id)}
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'var(--rd)',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              🗑
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Filtered orders based on all filters
  const filteredOrders = orders.filter(o => {
    if (filter === 'actives') {
      if (!statusFilterMulti.has(o.status)) return false;
    } else if (filter === 'terminees') {
      if (o.status !== 'done') return false;
    } else if (filter === 'alertes') {
      return false; // Handled separately
    }

    if (tableFilter && o.table !== tableFilter) return false;
    return true;
  });

  const notifBadge = notifications.filter(n => !n.read).length;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - var(--hh))',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* HEADER */}
      <div style={{
        paddingBottom: '6px',
        flexShrink: 0,
        borderBottom: '1px solid var(--border)',
        padding: '10px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '16px', fontWeight: 900 }}>📋 Commandes</div>
          <div style={{ fontSize: '12px', color: 'var(--t3)' }}>
            {actives.length} active{actives.length !== 1 ? 's' : ''} · {bellAlerts.length} alerte{bellAlerts.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div style={{
        padding: '8px 18px',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        flexWrap: 'wrap',
        background: 'var(--surf)',
      }}>
        {/* Filter tabs */}
        <button
          onClick={() => setFilter('actives')}
          style={{
            fontSize: '11px',
            padding: '4px 10px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: filter === 'actives' ? 'var(--bl2)' : 'transparent',
            color: filter === 'actives' ? '#fff' : 'var(--t3)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          En cours ({actives.length})
        </button>

        <button
          onClick={() => setFilter('alertes')}
          style={{
            fontSize: '11px',
            padding: '4px 10px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: filter === 'alertes' ? 'var(--bl2)' : 'transparent',
            color: filter === 'alertes' ? '#fff' : 'var(--t3)',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          🔔 Alertes
          {bellAlerts.length > 0 && (
            <span style={{
              fontSize: '10px',
              background: 'var(--rd)',
              color: '#fff',
              borderRadius: '10px',
              padding: '1px 5px',
              fontWeight: 800,
            }}>
              {bellAlerts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setFilter('terminees')}
          style={{
            fontSize: '11px',
            padding: '4px 10px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: filter === 'terminees' ? 'var(--bl2)' : 'transparent',
            color: filter === 'terminees' ? '#fff' : 'var(--t3)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Terminées ({terminees.length})
        </button>

        <div style={{ flex: 1 }} />

        {/* Bouton activation notifications navigateur — requiert user gesture */}
        {notifPermission !== 'granted' && (
          <button
            onClick={requestNotifPermission}
            title="Activer les notifications navigateur"
            style={{
              fontSize: '11px',
              padding: '4px 10px',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              background: notifPermission === 'denied' ? 'rgba(220,80,80,0.08)' : 'transparent',
              color: notifPermission === 'denied' ? 'var(--rd)' : 'var(--t3)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {notifPermission === 'denied' ? '🔕 Bloquées' : '🔔 Activer notifs'}
          </button>
        )}

        {/* Sound controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRight: '1px solid var(--border)', paddingRight: '8px' }}>
          <button
            onClick={() => {
              // Premier clic = user gesture → on initialise l'AudioContext
              const ctx = getAudioContext();
              if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
              setSoundMuted(!soundMuted);
            }}
            style={{
              fontSize: '14px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 4px',
            }}
          >
            {soundMuted ? '🔇' : '🔊'}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={soundVolume}
            onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
            style={{
              width: '60px',
              cursor: 'pointer',
            }}
          />
        </div>

        {/* Notifications panel button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifPanel(!showNotifPanel)}
            style={{
              fontSize: '11px',
              padding: '4px 10px',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              background: 'transparent',
              color: 'var(--t3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            🔔 Notifs
            {notifBadge > 0 && (
              <span style={{
                fontSize: '10px',
                background: 'var(--rd)',
                color: '#fff',
                borderRadius: '10px',
                padding: '1px 5px',
                fontWeight: 800,
              }}>
                {notifBadge}
              </span>
            )}
          </button>

          {showNotifPanel && <NotificationPanel notifications={notifications} onMarkRead={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))} />}
        </div>

        {/* New order button */}
        <button
          onClick={() => setShowNewOrderForm(!showNewOrderForm)}
          style={{
            fontSize: '11px',
            padding: '4px 10px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: 'var(--gn)',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          + Nouvelle commande
        </button>
      </div>

      {/* STATS BAR */}
      <div style={{
        display: 'flex',
        gap: '16px',
        padding: '8px 18px',
        background: 'rgba(68, 128, 216, 0.06)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        fontSize: '11px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: 'var(--t3)' }}>⏱ Temps moy.</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--text)' }}>{avgWaitTime}min</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: 'var(--t3)' }}>📊 Par heure</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--text)' }}>{ordersPerHour}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: 'var(--t3)' }}>💰 Revenu/jour</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--gn)' }}>CHF {totalRevenue.toFixed(2)}</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0, position: 'relative' }}>
        {showNewOrderForm && (
          <NewOrderForm
            tables={tables}
            onCreate={createOrder}
            onCancel={() => setShowNewOrderForm(false)}
          />
        )}

        {filter === 'alertes' ? (
          <div style={{ padding: '14px 18px 24px' }}>
            {bellAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)', fontSize: '12px' }}>
                ✅ Aucune alerte active
              </div>
            ) : (
              <>
                {bellAlerts.map(a => (
                  <div key={a.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    background: 'var(--surf)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    marginBottom: '8px',
                  }}>
                    <span style={{ fontSize: '20px' }}>🔔</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                        Table {a.table}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{a.msg}</div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontFamily: 'DM Mono, monospace',
                      color: 'var(--t4)',
                    }}>
                      {a.ts}
                    </span>
                  </div>
                ))}
                <button
                  onClick={() => setBellAlerts([])}
                  style={{
                    width: '100%',
                    fontSize: '11px',
                    marginTop: '4px',
                    padding: '10px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    background: 'var(--rd)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  🗑 Effacer toutes les alertes
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ padding: '14px 18px 24px' }}>
            {filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)', fontSize: '12px' }}>
                {filter === 'actives' ? 'Aucune commande en cours' : 'Aucune commande terminée'}
              </div>
            ) : (
              filteredOrders.map(order => renderOrderCard(order, true))
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { border-color: var(--rd); }
          50% { border-color: rgba(220, 80, 80, 0.5); }
        }
        @keyframes blink {
          0%, 50%, 100% { opacity: 1; }
          25%, 75% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    preparing: 'En préparation',
    ready: 'Prêt à servir',
    done: 'Terminé',
  };
  return labels[status] || status;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'var(--am)',
    preparing: 'var(--bl)',
    ready: 'var(--gn)',
    done: 'var(--t3)',
  };
  return colors[status] || 'var(--t3)';
}

// ══════════════════════════════════════════════════════════════════
//  NEW ORDER FORM
// ══════════════════════════════════════════════════════════════════

function NewOrderForm({
  tables,
  onCreate,
  onCancel,
}: {
  tables: string[];
  onCreate: (table: string, items: OrderItem[], note: string) => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState(tables[0]);
  const [items, setItems] = useState<OrderItem[]>([{ id: '1', name: '', qty: 1, price: 0 }]);
  const [note, setNote] = useState('');

  const addItem = () => {
    setItems(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name: '', qty: 1, price: 0 }]);
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = () => {
    const validItems = items.filter(i => i.name.trim() && i.qty > 0 && i.price > 0);
    if (validItems.length === 0) {
      toast('Veuillez ajouter au moins un article', 'error');
      return;
    }
    onCreate(selectedTable, validItems, note);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--surf)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 900, color: 'var(--text)' }}>
          Nouvelle commande
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--t3)', marginBottom: '4px', fontWeight: 600 }}>
            Table
          </label>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontSize: '11px',
              fontFamily: 'DM Mono, monospace',
            }}
          >
            {tables.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--t3)', marginBottom: '4px', fontWeight: 600 }}>
            Articles
          </label>
          {items.map((item, idx) => (
            <div key={item.id} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
              <input
                type="text"
                placeholder="Nom"
                value={item.name}
                onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '10px',
                }}
              />
              <input
                type="number"
                min="1"
                value={item.qty}
                onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                style={{
                  width: '40px',
                  padding: '6px 8px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '10px',
                }}
              />
              <input
                type="number"
                min="0"
                step="0.5"
                value={item.price}
                onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                placeholder="Prix"
                style={{
                  width: '60px',
                  padding: '6px 8px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '10px',
                  fontFamily: 'DM Mono, monospace',
                }}
              />
              <button
                onClick={() => removeItem(item.id)}
                style={{
                  padding: '4px 8px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  background: 'var(--rd)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '10px',
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={addItem}
            style={{
              fontSize: '10px',
              padding: '6px 10px',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              background: 'var(--bl)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            + Ajouter article
          </button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--t3)', marginBottom: '4px', fontWeight: 600 }}>
            Notes cuisine
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Allergies, cuisson, etc."
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontSize: '11px',
              minHeight: '60px',
              fontFamily: 'inherit',
              resize: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              background: 'transparent',
              color: 'var(--t3)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '11px',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              background: 'var(--gn)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '11px',
            }}
          >
            Créer commande
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  ORDER EDIT FORM
// ══════════════════════════════════════════════════════════════════

function OrderEditForm({
  order,
  onSave,
  onCancel,
}: {
  order: Order;
  onSave: (id: string, items: OrderItem[], note: string) => void;
  onCancel: () => void;
}) {
  const [items, setItems] = useState(order.items);
  const [note, setNote] = useState(order.note || '');
  const { toast } = useToast();

  const updateItem = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = () => {
    const validItems = items.filter(i => i.name.trim() && i.qty > 0 && i.price > 0);
    if (validItems.length === 0) {
      toast('Veuillez garder au moins un article', 'error');
      return;
    }
    onSave(order.id, validItems, note);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--surf)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 900, color: 'var(--text)' }}>
          Éditer commande — Table {order.table}
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--t3)', marginBottom: '4px', fontWeight: 600 }}>
            Articles
          </label>
          {items.map((item) => (
            <div key={item.id} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
              <input
                type="text"
                placeholder="Nom"
                value={item.name}
                onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '10px',
                }}
              />
              <input
                type="number"
                min="1"
                value={item.qty}
                onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                style={{
                  width: '40px',
                  padding: '6px 8px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '10px',
                }}
              />
              <input
                type="number"
                min="0"
                step="0.5"
                value={item.price}
                onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                placeholder="Prix"
                style={{
                  width: '60px',
                  padding: '6px 8px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '10px',
                  fontFamily: 'DM Mono, monospace',
                }}
              />
              <button
                onClick={() => removeItem(item.id)}
                style={{
                  padding: '4px 8px',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  background: 'var(--rd)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '10px',
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--t3)', marginBottom: '4px', fontWeight: 600 }}>
            Notes cuisine
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Allergies, cuisson, etc."
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontSize: '11px',
              minHeight: '60px',
              fontFamily: 'inherit',
              resize: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              background: 'transparent',
              color: 'var(--t3)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '11px',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              background: 'var(--bl)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '11px',
            }}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  NOTIFICATION PANEL
// ══════════════════════════════════════════════════════════════════

function NotificationPanel({
  notifications,
  onMarkRead,
}: {
  notifications: Notification[];
  onMarkRead: () => void;
}) {
  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'new_order': return '🆕';
      case 'order_ready': return '✅';
      case 'bell_alert': return '🔔';
      case 'table_call': return '📞';
      default: return '📌';
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      right: 0,
      background: 'var(--surf)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      zIndex: 1000,
      width: '300px',
      maxHeight: '400px',
      overflow: 'auto',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
          Notifications ({notifications.length})
        </span>
        {notifications.some(n => !n.read) && (
          <button
            onClick={onMarkRead}
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              border: '1px solid var(--border)',
              borderRadius: '3px',
              background: 'transparent',
              color: 'var(--t3)',
              cursor: 'pointer',
            }}
          >
            Marquer lu
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--t3)', fontSize: '11px' }}>
          Aucune notification
        </div>
      ) : (
        notifications.map(notif => (
          <div
            key={notif.id}
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border)',
              background: notif.read ? 'transparent' : 'rgba(68, 128, 216, 0.06)',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '16px' }}>{getNotifIcon(notif.type)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)' }}>
                  {notif.message}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '2px' }}>
                  {notif.table}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--t4)', marginTop: '2px' }}>
                  {new Date(notif.createdAt).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
