import { useState, useMemo } from 'react'
import { useToast } from '../../components/ui/Toast'
import { RADIUS, inputStyle, labelStyle } from '../../utils/design'

type Tab = 'equipe' | 'planning' | 'absences' | 'salaires'

interface Employee {
  id: string
  firstName: string
  lastName: string
  role: string
  email: string
  phone: string
  salary: number
  hourlyRate: number
  active: boolean
  hireDate: string
}

interface Absence {
  id: string
  empId: string
  empName: string
  type: string
  from: string
  to: string
  status: 'pending' | 'approved' | 'rejected'
  note: string
}

const ROLES = ['Chef Cuisine', 'Cuisinier', 'Commis', 'Serveur', 'Serveuse', 'Barman', 'Hotesse', 'Plongeur', 'Manager']

const INIT_EMPLOYEES: Employee[] = [
  { id: '1', firstName: 'Marco', lastName: 'Rossi', role: 'Chef Cuisine', email: 'marco@r3sto.ch', phone: '+41 79 100 0001', salary: 6500, hourlyRate: 32.5, active: true, hireDate: '2023-03-15' },
  { id: '2', firstName: 'Sophie', lastName: 'Mueller', role: 'Serveuse', email: 'sophie@r3sto.ch', phone: '+41 79 100 0002', salary: 4200, hourlyRate: 22, active: true, hireDate: '2023-06-01' },
  { id: '3', firstName: 'Antoine', lastName: 'Dubois', role: 'Cuisinier', email: 'antoine@r3sto.ch', phone: '+41 79 100 0003', salary: 5200, hourlyRate: 27, active: true, hireDate: '2024-01-10' },
  { id: '4', firstName: 'Laura', lastName: 'Bernasconi', role: 'Hotesse', email: 'laura@r3sto.ch', phone: '+41 79 100 0004', salary: 3800, hourlyRate: 20, active: true, hireDate: '2024-04-01' },
  { id: '5', firstName: 'Thomas', lastName: 'Keller', role: 'Barman', email: 'thomas@r3sto.ch', phone: '+41 79 100 0005', salary: 4500, hourlyRate: 23.5, active: true, hireDate: '2023-09-15' },
  { id: '6', firstName: 'Elena', lastName: 'Fontana', role: 'Commis', email: 'elena@r3sto.ch', phone: '+41 79 100 0006', salary: 3600, hourlyRate: 19.5, active: true, hireDate: '2025-01-15' },
  { id: '7', firstName: 'Nicolas', lastName: 'Favre', role: 'Plongeur', email: 'nicolas@r3sto.ch', phone: '+41 79 100 0007', salary: 3400, hourlyRate: 19, active: false, hireDate: '2024-06-01' },
  { id: '8', firstName: 'Isabelle', lastName: 'Weber', role: 'Serveuse', email: 'isabelle@r3sto.ch', phone: '+41 79 100 0008', salary: 4100, hourlyRate: 21.5, active: true, hireDate: '2024-11-01' },
]

const INIT_ABSENCES: Absence[] = [
  { id: 'a1', empId: '2', empName: 'Sophie Mueller', type: 'Vacances', from: '2026-04-20', to: '2026-04-27', status: 'pending', note: 'Vacances Paques' },
  { id: 'a2', empId: '3', empName: 'Antoine Dubois', type: 'Maladie', from: '2026-04-10', to: '2026-04-12', status: 'approved', note: 'Grippe' },
  { id: 'a3', empId: '5', empName: 'Thomas Keller', type: 'Formation', from: '2026-05-05', to: '2026-05-06', status: 'pending', note: 'Cours sommelier' },
]

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const card: React.CSSProperties = { background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: RADIUS.md, padding: 14 }
const btnP: React.CSSProperties = { padding: '8px 16px', borderRadius: RADIUS.sm, background: 'var(--bl)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--ff)' }
const btnS: React.CSSProperties = { ...btnP, background: 'var(--surf3)', color: 'var(--t2)', border: '1px solid var(--border)' }

export function Equipes() {
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('equipe')
  const [employees, setEmployees] = useState<Employee[]>(INIT_EMPLOYEES)
  const [absences, setAbsences] = useState<Absence[]>(INIT_ABSENCES)
  const [showModal, setShowModal] = useState(false)
  const [editEmp, setEditEmp] = useState<Employee | null>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', role: 'Serveur', email: '', phone: '', salary: 4000, hourlyRate: 21, active: true })

  const pendingCount = useMemo(() => absences.filter(a => a.status === 'pending').length, [absences])

  const openAdd = () => { setEditEmp(null); setForm({ firstName: '', lastName: '', role: 'Serveur', email: '', phone: '', salary: 4000, hourlyRate: 21, active: true }); setShowModal(true) }
  const openEdit = (e: Employee) => { setEditEmp(e); setForm({ firstName: e.firstName, lastName: e.lastName, role: e.role, email: e.email, phone: e.phone, salary: e.salary, hourlyRate: e.hourlyRate, active: e.active }); setShowModal(true) }

  const saveEmp = () => {
    if (!form.firstName || !form.lastName) return
    if (editEmp) {
      setEmployees(employees.map(e => e.id === editEmp.id ? { ...e, ...form } : e))
      toast(form.firstName + ' ' + form.lastName + ' mis a jour')
    } else {
      setEmployees([...employees, { ...form, id: Date.now().toString(), hireDate: new Date().toISOString().slice(0, 10) }])
      toast(form.firstName + ' ' + form.lastName + ' ajoute')
    }
    setShowModal(false)
  }

  const updateAbsence = (id: string, status: 'approved' | 'rejected') => {
    const absence = absences.find(a => a.id === id)
    setAbsences(absences.map(a => a.id === id ? { ...a, status } : a))
    toast(absence ? absence.empName + ' — ' + (status === 'approved' ? 'approuve' : 'refuse') : 'Absence mise a jour')
  }

  const exportCSV = () => {
    const header = 'Nom,Role,Salaire CHF,Taux horaire CHF,Statut\n'
    const rows = employees.map(e => e.firstName + ' ' + e.lastName + ',' + e.role + ',' + e.salary + ',' + e.hourlyRate + ',' + (e.active ? 'Actif' : 'Inactif')).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'equipes-r3sto.csv'; a.click()
    URL.revokeObjectURL(url)
    toast('CSV exporte')
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'equipe', label: 'Equipe' },
    { key: 'planning', label: 'Planning' },
    { key: 'absences', label: 'Absences' + (pendingCount > 0 ? ' (' + pendingCount + ')' : '') },
    { key: 'salaires', label: 'Salaires' },
  ]

  return (
    <div style={{ padding: '16px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px', fontFamily: 'var(--ff)' }}>Equipes</h1>
      <p style={{ fontSize: 11, color: 'var(--t3)', margin: '0 0 16px', fontFamily: 'var(--ff)' }}>Gestion du personnel, planning, absences et salaires</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid var(--border)', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 18px', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
            fontFamily: 'var(--ff)', background: tab === t.key ? 'var(--surf)' : 'transparent',
            color: tab === t.key ? 'var(--bl)' : 'var(--t3)',
            borderBottom: tab === t.key ? '2px solid var(--bl)' : '2px solid transparent',
            marginBottom: -2, transition: '.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* TAB: Equipe */}
      {tab === 'equipe' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button style={btnP} onClick={openAdd}>+ Ajouter employe</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {employees.map(e => (
              <div key={e.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: e.active ? 'var(--bl)' : 'var(--surf3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: e.active ? '#fff' : 'var(--t3)', fontWeight: 800, fontSize: 14, fontFamily: 'var(--ff)', flexShrink: 0 }}>
                  {e.firstName[0]}{e.lastName[0]}
                </div>
                <div style={{ flex: '1 1 200px', minWidth: 150 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{e.firstName} {e.lastName}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>{e.role}</div>
                </div>
                <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>CHF {e.salary.toLocaleString()}/mois</div>
                  <div style={{ fontSize: 10, color: 'var(--t4)' }}>CHF {e.hourlyRate}/h</div>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: e.active ? 'var(--gp, #e6f9e6)' : 'var(--surf3)', color: e.active ? 'var(--gn)' : 'var(--t4)' }}>
                  {e.active ? 'Actif' : 'Inactif'}
                </span>
                <button style={{ ...btnS, padding: '5px 10px', fontSize: 11 }} onClick={() => openEdit(e)}>Modifier</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: Planning */}
      {tab === 'planning' && (
        <div style={{ overflowX: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--ff)' }}>
            <thead>
              <tr>
                <th style={{ padding: 8, textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--t3)', fontWeight: 700 }}>Employe</th>
                {DAYS.map(d => <th key={d} style={{ padding: 8, textAlign: 'center', borderBottom: '2px solid var(--border)', color: 'var(--t3)', fontWeight: 700 }}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {employees.filter(e => e.active).map(e => (
                <tr key={e.id}>
                  <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text)' }}>{e.firstName} {e.lastName[0]}.</td>
                  {DAYS.map((d, i) => {
                    const off = i >= 5 && e.role === 'Hotesse'
                    const shift = off ? '-' : (i % 2 === 0 ? '11h-15h' : '17h-23h')
                    return (
                      <td key={d} style={{ padding: 8, textAlign: 'center', borderBottom: '1px solid var(--border)', color: off ? 'var(--t4)' : 'var(--text)', fontSize: 10, fontWeight: 600 }}>
                        {shift}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: Absences */}
      {tab === 'absences' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {absences.map(a => (
            <div key={a.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', minWidth: 150 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{a.empName}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>{a.type} - {a.from} au {a.to}</div>
                {a.note && <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>{a.note}</div>}
              </div>
              <span style={{
                padding: '3px 10px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                background: a.status === 'approved' ? 'var(--gp, #e6f9e6)' : a.status === 'rejected' ? 'var(--rp, #fde8e8)' : 'var(--ap, #fff8e6)',
                color: a.status === 'approved' ? 'var(--gn)' : a.status === 'rejected' ? 'var(--rd)' : 'var(--am)',
              }}>
                {a.status === 'approved' ? 'Approuve' : a.status === 'rejected' ? 'Refuse' : 'En attente'}
              </span>
              {a.status === 'pending' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={{ ...btnP, padding: '5px 12px', fontSize: 11, background: 'var(--gn)' }} onClick={() => updateAbsence(a.id, 'approved')}>Approuver</button>
                  <button style={{ ...btnS, padding: '5px 12px', fontSize: 11, color: 'var(--rd)' }} onClick={() => updateAbsence(a.id, 'rejected')}>Refuser</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB: Salaires */}
      {tab === 'salaires' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button style={btnS} onClick={exportCSV}>Exporter CSV</button>
          </div>
          <div style={{ overflowX: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--ff)' }}>
              <thead>
                <tr>
                  {['Employe', 'Role', 'Salaire mensuel', 'Taux horaire', 'Statut'].map(h => (
                    <th key={h} style={{ padding: 8, textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--t3)', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(e => (
                  <tr key={e.id}>
                    <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text)' }}>{e.firstName} {e.lastName}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid var(--border)', color: 'var(--t3)' }}>{e.role}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'var(--text)' }}>CHF {e.salary.toLocaleString()}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid var(--border)', color: 'var(--t3)' }}>CHF {e.hourlyRate}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: e.active ? 'var(--gp, #e6f9e6)' : 'var(--surf3)', color: e.active ? 'var(--gn)' : 'var(--t4)' }}>
                        {e.active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ ...card, marginTop: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Total masse salariale</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--bl)' }}>CHF {employees.reduce((s, e) => s + e.salary, 0).toLocaleString()}/mois</span>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--surf)', borderRadius: RADIUS.lg, padding: 24, width: '100%', maxWidth: 500, border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 16px', fontFamily: 'var(--ff)', color: 'var(--text)' }}>
              {editEmp ? 'Modifier employe' : 'Nouvel employe'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Prenom</label>
                <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nom</label>
                <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={inputStyle}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Telephone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Salaire CHF/mois</label>
                <input type="number" value={form.salary} onChange={e => setForm({ ...form, salary: Number(e.target.value) })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Taux horaire CHF</label>
                <input type="number" value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: Number(e.target.value) })} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
                <label style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--ff)' }}>Actif</label>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={btnS} onClick={() => setShowModal(false)}>Annuler</button>
              <button style={btnP} onClick={saveEmp}>{editEmp ? 'Mettre a jour' : 'Ajouter'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
