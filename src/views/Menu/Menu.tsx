import { api } from '../../api/apiService'
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

interface MenuItem {
  id: string;
  name: string;
  cat: string;
  desc?: string;
  price: number;
  available: boolean;
  allergens?: string[];
  img?: string;
}

interface MenuCategory {
  id: string;
  name: string;
  icon: string;
  active: boolean;
}

interface MenuSettings {
  showPrices: boolean;
  showAllergens: boolean;
  showDesc: boolean;
  allowOrders: boolean;
  welcomeMsg: string;
  accentColor: string;
}

interface EditingItem {
  id: string;
  name: string;
  price: number;
  cat: string;
  desc: string;
  allergens: string;
}

const DEMO_ITEMS: MenuItem[] = [
  { id: 'm1', name: 'Salade César', cat: 'c1', desc: 'Laitue romaine, parmesan, croutons', price: 16, available: true, allergens: ['gluten', 'lactose'] },
  { id: 'm2', name: 'Carpaccio bœuf', cat: 'c1', desc: 'Finement tranché, roquette, câpres', price: 22, available: true, allergens: [] },
  { id: 'm3', name: 'Filet de perche', cat: 'c2', desc: 'Du lac Léman, servi avec légumes', price: 38, available: true, allergens: ['poisson'] },
  { id: 'm4', name: 'Entrecôte 250g', cat: 'c2', desc: 'Servie avec frites et sauce béarnaise', price: 46, available: true, allergens: ['lactose'] },
  { id: 'm5', name: 'Risotto champignons', cat: 'c2', desc: 'Crémeux, parmesan', price: 32, available: true, allergens: ['gluten', 'lactose'] },
  { id: 'm6', name: 'Tiramisu', cat: 'c3', price: 12, available: true, allergens: ['œuf', 'lactose'] },
  { id: 'm7', name: 'Jus de fruits', cat: 'c4', price: 6, available: true, allergens: [] },
  { id: 'm8', name: 'Eau 50cl', cat: 'c4', price: 5, available: true, allergens: [] },
  { id: 'm9', name: 'Chasselas Lavaux', cat: 'c5', desc: 'Blanc, 2023', price: 58, available: true, allergens: ['sulfites'] },
  { id: 'm10', name: 'Café', cat: 'c4', price: 4, available: true, allergens: [] },
  { id: 'm11', name: 'Pinot Noir Valais', cat: 'c5', desc: 'Rouge, 2022', price: 52, available: true, allergens: ['sulfites'] },
];

const DEMO_CATEGORIES: MenuCategory[] = [
  { id: 'c1', name: 'Entrées', icon: '🥗', active: true },
  { id: 'c2', name: 'Plats', icon: '🍽️', active: true },
  { id: 'c3', name: 'Desserts', icon: '🍰', active: true },
  { id: 'c4', name: 'Boissons', icon: '🥤', active: true },
  { id: 'c5', name: 'Vins', icon: '🍷', active: true },
];

export function Menu() {
  const isDemo = useAppStore(s => s.isDemo);
  const [tab, setTab] = useState<'carte' | 'settings'>('carte');
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [items, setItems] = useState<MenuItem[]>(isDemo ? DEMO_ITEMS : []);
  const [categories] = useState<MenuCategory[]>(isDemo ? DEMO_CATEGORIES : []);

  const [settings, setSettings] = useState<MenuSettings>({
    showPrices: true,
    showAllergens: true,
    showDesc: true,
    allowOrders: true,
    welcomeMsg: 'Bienvenue à notre restaurant! Découvrez notre menu',
    accentColor: '#68cbf0',
  });

  const toggleItemAvailability = (id: string) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, available: !item.available } : item
    ));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const addItem = (catId: string) => {
    const newItem: MenuItem = {
      id: `m${Date.now()}`,
      name: 'Nouveau plat',
      cat: catId,
      desc: '',
      price: 0,
      available: true,
      allergens: [],
    };
    setItems([...items, newItem]);
  };

  const editItem = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    setEditingItem({
      id,
      name: item.name,
      price: item.price,
      cat: item.cat,
      desc: item.desc || '',
      allergens: (item.allergens || []).join(', '),
    });
  };

  const saveEditingItem = () => {
    if (!editingItem) return;
    setItems(items.map(item =>
      item.id === editingItem.id
        ? {
          ...item,
          name: editingItem.name || item.name,
          price: editingItem.price,
          cat: editingItem.cat,
          desc: editingItem.desc.trim(),
          allergens: editingItem.allergens.split(',').map(a => a.trim()).filter(Boolean),
        }
        : item
    ));
    setEditingItem(null);
  };

  const updateSetting = <K extends keyof MenuSettings>(key: K, value: MenuSettings[K]) => {
    setSettings({ ...settings, [key]: value });
  };

  const activeCategories = categories.filter((c: MenuCategory) => c.active);
  const content = tab === 'carte' ? renderCarte() : renderSettings();

  function renderCarte() {
    return (
      <div style={{ padding: '14px 18px 24px' }}>
        {activeCategories.map((cat: MenuCategory) => {
          const catItems = items.filter(i => i.cat === cat.id);
          return (
            <div key={cat.id} style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '10px',
                paddingBottom: '6px',
                borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: '18px' }}>{cat.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>{cat.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--t3)' }}>
                  {catItems.length} article{catItems.length !== 1 ? 's' : ''}
                </span>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => addItem(cat.id)}
                  style={{
                    padding: '3px 10px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    background: 'transparent',
                    color: 'var(--t3)',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  + Ajouter
                </button>
              </div>

              {catItems.length === 0 && (
                <div style={{ fontSize: '11px', color: 'var(--t4)', padding: '8px 0' }}>
                  Aucun article dans cette catégorie
                </div>
              )}

              {catItems.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: 'var(--surf2)',
                    border: '1px solid var(--border)',
                    borderRadius: '9px',
                    marginBottom: '6px',
                    opacity: item.available ? 1 : 0.5,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                        {item.name}
                      </span>
                      {!item.available && (
                        <span
                          style={{
                            fontSize: '11px',
                            background: 'rgba(220,80,80,.15)',
                            color: 'var(--rd)',
                            borderRadius: '4px',
                            padding: '1px 6px',
                          }}
                        >
                          Indisponible
                        </span>
                      )}
                    </div>
                    {item.desc && (
                      <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>
                        {item.desc}
                      </div>
                    )}
                    {item.allergens && item.allergens.length > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--am)', marginTop: '3px' }}>
                        ⚠ {item.allergens.join(', ')}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      fontFamily: 'DM Mono, monospace',
                      color: 'var(--bl)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    CHF {item.price}
                  </span>
                  <button
                    onClick={() => toggleItemAvailability(item.id)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: item.available ? 'rgba(60,200,112,.1)' : 'var(--surf)',
                      color: item.available ? 'var(--gn)' : 'var(--t3)',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    {item.available ? '✓ Dispo' : '✗ Off'}
                  </button>
                  <button
                    onClick={() => editItem(item.id)}
                    style={{
                      padding: '3px 7px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'transparent',
                      color: 'var(--t3)',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    style={{
                      padding: '3px 7px',
                      borderRadius: '6px',
                      border: '1px solid rgba(220,80,80,.3)',
                      background: 'transparent',
                      color: 'var(--rd)',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  function renderSettings() {
    return (
      <div
        style={{
          padding: '14px 18px 24px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              background: 'var(--surf2)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '10px' }}>Affichage</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                ['showPrices', 'Afficher les prix'],
                ['showAllergens', 'Afficher les allergènes'],
                ['showDesc', 'Afficher les descriptions'],
                ['allowOrders', 'Autoriser les commandes'],
              ].map(([key, label]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text)', fontWeight: 600 }}>{label}</span>
                  <button
                    onClick={() => updateSetting(key as keyof MenuSettings, !settings[key as keyof MenuSettings])}
                    style={{
                      width: '40px',
                      height: '22px',
                      borderRadius: '11px',
                      border: 'none',
                      cursor: 'pointer',
                      background: settings[key as keyof MenuSettings] ? 'var(--gn)' : 'var(--surf3)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0',
                    }}
                  >
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#fff',
                        margin: settings[key as keyof MenuSettings] ? '3px 3px 3px auto' : '3px auto 3px 3px',
                      }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background: 'var(--surf2)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '10px' }}>Message d'accueil</div>
            <textarea
              value={settings.welcomeMsg}
              onChange={(e) => updateSetting('welcomeMsg', e.target.value)}
              style={{
                width: '100%',
                resize: 'none',
                height: '70px',
                fontSize: '11px',
                padding: '8px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'var(--surf)',
                color: 'var(--text)',
                fontFamily: 'var(--ff)',
              }}
            />
          </div>

          <div
            style={{
              background: 'var(--surf2)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>Couleur principale</div>
            <input
              type="color"
              value={settings.accentColor}
              onChange={(e) => updateSetting('accentColor', e.target.value)}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                padding: '2px',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              background: 'var(--surf2)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '10px' }}>🔔 Sonnette & Appel serveur</div>
            <div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '10px' }}>
              Les clients peuvent appeler un serveur depuis leur table via le QR code
            </div>
            <div
              style={{
                background: 'rgba(68,128,216,.06)',
                border: '1px solid rgba(68,128,216,.2)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '11px',
                color: 'var(--t2)',
              }}
            >
              🔔 Sonnette active sur toutes les tables
              <br />
              <span style={{ color: 'var(--t3)', fontSize: '11px' }}>
                Les alertes s'affichent dans l'app et jouent un son
              </span>
            </div>
            <button
              style={{
                width: '100%',
                marginTop: '10px',
                fontSize: '11px',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bl2)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              🔔 Tester la sonnette
            </button>
          </div>

          <div
            style={{
              background: 'var(--surf2)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>URL menu public</div>
            <input
              type="text"
              readOnly
              value={`https://menu.r3sto.ch/menu`}
              style={{
                width: '100%',
                fontSize: '11px',
                fontFamily: 'DM Mono, monospace',
                color: 'var(--bl)',
                padding: '8px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'var(--surf)',
              }}
            />
            <button
              style={{
                width: '100%',
                marginTop: '8px',
                fontSize: '11px',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bl2)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              📋 Copier le lien
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--hh))', overflow: 'hidden' }}>
      <div style={{ paddingBottom: '6px', flexShrink: 0, borderBottom: '1px solid var(--border)', padding: '10px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '16px', fontWeight: 900 }}>📋 Menu</div>
          <div style={{ fontSize: '12px', color: 'var(--t3)' }}>Carte interactive · accessible par QR code</div>
        </div>
      </div>

      <div style={{ padding: '5px 18px', display: 'flex', gap: '4px', alignItems: 'center', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {(['carte', 'settings'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              fontSize: '11px',
              padding: '3px 10px',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              background: tab === t ? 'var(--bl2)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--t3)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {t === 'carte' ? '📋 Carte' : '⚙️ Réglages'}
          </button>
        ))}
        <div style={{ flex: 1 }} />
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
          👁 Aperçu client
        </button>
        <button
          style={{
            fontSize: '11px',
            padding: '3px 10px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: 'var(--gn)',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          💾 Sauvegarder
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>{content}</div>

      {editingItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(6, 14, 28, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }} onClick={() => setEditingItem(null)}>
          <div style={{
            background: 'var(--surf)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '22px',
            width: '100%',
            maxWidth: '440px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '16px' }}>✏️ Modifier l'article</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)' }}>Nom</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                  style={{
                    width: '100%',
                    fontSize: '11px',
                    padding: '8px',
                    marginTop: '4px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    background: 'var(--surf2)',
                    color: 'var(--text)',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)' }}>Prix CHF</label>
                <input
                  type="number"
                  step="0.5"
                  value={editingItem.price}
                  onChange={e => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    fontSize: '11px',
                    padding: '8px',
                    marginTop: '4px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    background: 'var(--surf2)',
                    color: 'var(--text)',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)' }}>Catégorie</label>
              <select
                value={editingItem.cat}
                onChange={e => setEditingItem({ ...editingItem, cat: e.target.value })}
                style={{
                  width: '100%',
                  fontSize: '11px',
                  padding: '8px',
                  marginTop: '4px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  background: 'var(--surf2)',
                  color: 'var(--text)',
                }}
              >
                {categories.map((c: MenuCategory) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)' }}>Description</label>
              <input
                type="text"
                value={editingItem.desc}
                onChange={e => setEditingItem({ ...editingItem, desc: e.target.value })}
                style={{
                  width: '100%',
                  fontSize: '11px',
                  padding: '8px',
                  marginTop: '4px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  background: 'var(--surf2)',
                  color: 'var(--text)',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t3)' }}>Allergènes (séparés par virgule)</label>
              <input
                type="text"
                value={editingItem.allergens}
                onChange={e => setEditingItem({ ...editingItem, allergens: e.target.value })}
                style={{
                  width: '100%',
                  fontSize: '11px',
                  padding: '8px',
                  marginTop: '4px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  background: 'var(--surf2)',
                  color: 'var(--text)',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setEditingItem(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '1.5px solid var(--border)',
                  borderRadius: '9px',
                  background: 'transparent',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontFamily: 'var(--ff)',
                }}
              >
                Annuler
              </button>
              <button
                onClick={saveEditingItem}
                style={{
                  flex: 2,
                  padding: '10px',
                  border: 'none',
                  borderRadius: '9px',
                  background: 'var(--bl2)',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: 'pointer',
               