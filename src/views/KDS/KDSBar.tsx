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

export function KDSBar() {
  const [filter, setFilter] = useState<'active' | 'done'>('active');
  const [orders, setOrders] = useState<Order[]>([
    {
      id: 'kd4',
      table: 'T3',
      dest: 'bar',
      status: 'pending',
      items: [
        { id: 'm11', name: 'Pinot Noir Valais', qty: 1, price: 52 },
        { id: 'm8', name: 'Eau 50cl', qty: 2, price: 5 },
      ],
      total: 62,
      note: '',
      createdAt: Date.now() - 8 * 60000,
    },
    {
      id: 'kd5',
      table: 'T9',
      dest: 'bar',
      status: 'preparing',
      items: [
        { id: 'm10', name: 'Café', qty: 3, price: 4 },
        { id: 'm7', name: 'Jus de fruits', qty: 1, price: 6 },
      ],
      total: 18,
      note: 'Un café déca',
      createdAt: Date.now() - 5 * 60000,
    },
    {
      id: 'kd6',
      table: 'T11',
      dest: 'bar',
      status: 'ready',
      items: [
        { id: 'm9', name: 'Chasselas Lavaux', qty: 1, price: 58 },
      ],
      total: 58,
      note: '',
      createdAt: Date.now() - 2 * 60000,
    },
  ]);

  const all = orders.filter(cmd => cmd.dest === 'bar' || cmd.dest === 'both');
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
    pending: 'À préparer',
    preparing: 'En cours',
    ready: '✓ Prêt',
    served: 'Servi',
  };

  const cmdSetStatus = (id: string, status: Order['status']) => {
    setOrders(orders.map(cmd =>
      cmd.id === id ? { ...cmd, status } : cmd
    ));
  };

  const renderBarCard = (cmd: Order) => {
    const age = Math.round((Date.now() - cmd.createdAt) / 60000);
    const urgent = cmd.status === 'pending' && age >= 5;

    return (
      <div key={cmd.id} style={{
        background: 'var(--surf)',
        border: `2px solid ${urgent ? 'var(--rd)' : statusColors[cmd.status] || 'var(--border)'}`,
        borderRadius: '14px',
        padding: '14px 16px',
        animation: urgent ? 'pulse 2s infinite' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <div style={{
            fontSize: '22px',
            fontWeight: 900,
            fontFamily: 'DM Mono, monospace',
            color: 'var(--text)',
          }}>
            {cmd.table}
          </div>
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
              color: 'var(--rd)',
              fontWeight: 800,
            }}>
              ⚠ {age}min
            </span>
          )}
          <div style={{ flex: 1 }} />
          <span style={{
            fontSize: '11px',
            color: 'var(--t3)',
            fontFamily: 'DM Mono, monospace',
          }}>
            {new Date(cmd.createdAt).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {(cmd.items || []).map((item, idx) => (
          <div key={idx} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            background: 'var(--surf2)',
            borderRadius: '7px',
            marginBottom: '5px',
          }}>
            <span style={{
              fontSize: '16px',
              fontWeight: 900,
              fontFamily: 'DM Mono, monospace',
              color: 'var(--bl)',
              width: '24px',
            }}>
              {item.qty || 1}×
            </span>
            <span style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text)',
            }}>
              {item.name}
            </span>
          </div>
        ))}

        {cmd.note && (
          <div style={{
            fontSize: '11px',
            color: 'var(--am)',
            padding: '5px 8px',
            background: 'rgba(240, 160, 32, 0.08)',
            borderRadius: '6px',
            margin: '6px 0',
          }}>
            💬 {cmd.note}
          </div>
        )}

        <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
          {cmd.status === 'pending' && (
            <button
              onClick={() => cmdSetStatus(cmd.id, 'preparing')}
              style={{
                flex: 1,
                padding: '9px',
                fontSize: '12px',
                fontWeight: 800,
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: 'var(--am)',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              🍸 En cours
            </button>
          )}
          {cmd.status === 'preparing' && (
            <button
              onClick={() => cmdSetStatus(cmd.id, 'ready')}
              style={{
                flex: 1,
                padding: '9px',
                fontSize: '12px',
                fontWeight: 800,
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: 'var(--gn)',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              ✓ Prêt
            </button>
          )}
          {cmd.status === 'ready' && (
            <button
              onClick={() => cmdSetStatus(cmd.id, 'served')}
              style={{
                flex: 1,
                padding: '9px',
                fontSize: '11px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: 'transparent',
                color: 'var(--t3)',
                cursor: 'pointer',
              }}
            >
              Servi
            </button>
          )}
        </div>
      </div>
    );
  };

  const grid = list.length > 0
    ? (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '12px',
        padding: '14px 18px 80px',
      }}>
        {list.sort((a, b) => a.createdAt - b.createdAt).map(renderBarCard)}
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
        <div style={{ fontSize: '48px' }}>🍸</div>
        <div style={{ fontWeight: 700 }}>Aucune commande boissons</div>
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
        <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text)' }}>🍸 Bar & Boissons</div>
        <div style={{ display: 'flex', gap: '6px', marginLeft: '8px' }}>
          <span style={{
            fontSize: '11px',
            padding: '3px 10px',
            borderRadius: '20px',
            background: 'rgba(240, 160, 32, 0.15)',
            color: 'var(--am)',
            fontWeight: 700,
          }}>
            {counts.pending} à préparer
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
          En cours
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
          Servis
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>{grid}</div>
    </div>
  );
}
