import { useState } from 'react';

interface OrderItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

interface Order {
  id: string;
  table: string;
  dest: 'cuisine' | 'bar' | 'both';
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
  items: OrderItem[];
  total: number;
  note?: string;
  createdAt: number;
}

export function KDSCuisine() {
  const [filter, setFilter] = useState<'active' | 'done'>('active');
  const [orders, setOrders] = useState<Order[]>([
    {
      id: 'kd1',
      table: 'T3',
      dest: 'cuisine',
      status: 'pending',
      items: [
        { id: 'm3', name: 'Filet de perche', qty: 1, price: 38 },
        { id: 'm5', name: 'Risotto champignons', qty: 2, price: 32 },
      ],
      total: 102,
      note: 'Risotto sans parmesan pour l\'un',
      createdAt: Date.now() - 8 * 60000,
    },
    {
      id: 'kd2',
      table: 'T7',
      dest: 'cuisine',
      status: 'preparing',
      items: [{ id: 'm4', name: 'Entrecôte 250g', qty: 2, price: 46 }],
      total: 92,
      note: '',
      createdAt: Date.now() - 12 * 60000,
    },
    {
      id: 'kd3',
      table: 'T5',
      dest: 'cuisine',
      status: 'ready',
      items: [
        { id: 'm1', name: 'Salade César', qty: 2, price: 16 },
        { id: 'm2', name: 'Carpaccio bœuf', qty: 1, price: 22 },
      ],
      total: 54,
      note: '',
      createdAt: Date.now() - 18 * 60000,
    },
  ]);

  const all = orders.filter(cmd => cmd.dest === 'cuisine' || cmd.dest === 'both');
  const active = all.filter(c => c.status !== 'served' && c.status !== 'cancelled');
  const done = all.filter(c => c.status === 'served');
  const list = filter === 'active' ? active : done;

  const counts = {
    pending: active.filter(c => c.status === 'pending').length,
    preparing: active.filter(c => c.status === 'preparing').length,
    ready: active.filter(c => c.status === 'ready').length,
  };

  const statusColors: Record<string, string> = {
    pending: 'var(--am)',
    preparing: 'var(--bl)',
    ready: 'var(--gn)',
    served: 'var(--t3)',
  };

  const statusLabels: Record<string, string> = {
    pending: 'En attente',
    preparing: 'En préparation',
    ready: '✓ Prêt',
    served: 'Servi',
  };

  const cmdSetStatus = (id: string, status: Order['status']) => {
    setOrders(orders.map(cmd =>
      cmd.id === id ? { ...cmd, status } : cmd
    ));
  };

  const renderKDSCard = (cmd: Order) => {
    const age = Math.round((Date.now() - cmd.createdAt) / 60000);
    const urgent = cmd.status === 'pending' && age >= 8;

    return (
      <div key={cmd.id} style={{
        background: 'var(--surf)',
        border: `2px solid ${urgent ? 'var(--rd)' : statusColors[cmd.status] || 'var(--border)'}`,
        borderRadius: '14px',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        animation: urgent ? 'pulse 2s infinite' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            fontSize: '22px',
            fontWeight: 900,
            fontFamily: 'DM Mono, monospace',
            color: 'var(--text)',
          }}>
            {cmd.table}
          </div>
          <div style={{ flex: 1 }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '2px 10px',
              borderRadius: '20px',
              background: 'rgba(68, 128, 216, 0.12)',
              color: statusColors[cmd.status] || 'var(--t3)',
            }}>
              {statusLabels[cmd.status] || cmd.status}
            </span>
            {urgent && (
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--rd)',
                marginLeft: '6px',
              }}>
                ⚠ {age}min
              </span>
            )}
          </div>
          <span style={{
            fontSize: '11px',
            color: 'var(--t3)',
            fontFamily: 'DM Mono, monospace',
          }}>
            {new Date(cmd.createdAt).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {(cmd.items || []).map((item, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              background: 'var(--surf2)',
              borderRadius: '8px',
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--bl2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 900,
                color: '#fff',
                flexShrink: 0,
              }}>
                {item.qty || 1}
              </div>
              <div style={{
                flex: 1,
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text)',
              }}>
                {item.name}
              </div>
            </div>
          ))}
        </div>

        {cmd.note && (
          <div style={{
            fontSize: '11px',
            color: 'var(--am)',
            background: 'rgba(240, 160, 32, 0.08)',
            borderRadius: '7px',
            padding: '6px 10px',
          }}>
            💬 {cmd.note}
          </div>
        )}

        <div style={{ display: 'flex', gap: '6px' }}>
          {cmd.status === 'pending' && (
            <button
              onClick={() => cmdSetStatus(cmd.id, 'preparing')}
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '12px',
                fontWeight: 800,
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: 'var(--am)',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              🍳 En préparation
            </button>
          )}
          {cmd.status === 'preparing' && (
            <button
              onClick={() => cmdSetStatus(cmd.id, 'ready')}
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '12px',
                fontWeight: 800,
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: 'var(--gn)',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              ✓ Prêt à servir
            </button>
          )}
          {cmd.status === 'ready' && (
            <button
              onClick={() => cmdSetStatus(cmd.id, 'served')}
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '12px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: 'transparent',
                color: 'var(--t3)',
                cursor: 'pointer',
              }}
            >
              Servi ✓
            </button>
          )}
          <button
            onClick={() => cmdSetStatus(cmd.id, 'cancelled')}
            style={{
              padding: '10px 12px',
              fontSize: '11px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              background: 'var(--rd)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      </div>
    );
  };

  const grid = list.length > 0
    ? (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '12px',
        padding: '14px 18px 80px',
      }}>
        {list.sort((a, b) => a.createdAt - b.createdAt).map(renderKDSCard)}
      </div>
    )
    : (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        color: 'var(--t3)',
        fontSize: '14px',
        gap: '8px',
      }}>
        <div style={{ fontSize: '48px' }}>✅</div>
        <div style={{ fontWeight: 700 }}>Aucune commande en attente</div>
        <div style={{ fontSize: '12px' }}>La cuisine est à jour</div>
      </div>
    );

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - var(--hh))',
      background: 'var(--bg)',
    }}>
      <div style={{
        padding: '10px 18px',
        background: 'var(--surf)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text)' }}>🍳 Cuisine</div>
        <div style={{ display: 'flex', gap: '6px', marginLeft: '8px' }}>
          <span style={{
            fontSize: '11px',
            padding: '3px 10px',
            borderRadius: '20px',
            background: 'rgba(240, 160, 32, 0.15)',
            color: 'var(--am)',
            fontWeight: 700,
          }}>
            {counts.pending} en attente
          </span>
          <span style={{
            fontSize: '11px',
            padding: '3px 10px',
            borderRadius: '20px',
            background: 'rgba(68, 128, 216, 0.15)',
            color: 'var(--bl)',
            fontWeight: 700,
          }}>
            {counts.preparing} en cours
          </span>
          <span style={{
            fontSize: '11px',
            padding: '3px 10px',
            borderRadius: '20px',
            background: 'rgba(60, 200, 112, 0.15)',
            color: 'var(--gn)',
            fontWeight: 700,
          }}>
            {counts.ready} prêts
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setFilter('active')}
          style={{
            fontSize: '11px',
            padding: '3px 10px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: filter === 'active' ? 'var(--bl2)' : 'transparent',
            color: filter === 'active' ? '#fff' : 'var(--t3)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          En cours ({active.length})
        </button>
        <button
          onClick={() => setFilter('done')}
          style={{
            fontSize: '11px',
            padding: '3px 10px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: filter === 'done' ? 'var(--bl2)' : 'transparent',
            color: filter === 'done' ? '#fff' : 'var(--t3)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Servis ({done.length})
        </button>
        <button
          style={{
            fontSize: '11px',
            padding: '3px 10px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: 'transparent',
            color: 'var(--t3)',
            cursor: 'pointer',
          }}
        >
          🔊 Test
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>{grid}</div>
    </div>
  );
}
