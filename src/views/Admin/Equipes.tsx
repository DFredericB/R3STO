import { useState, useMemo } from 'react'
import { useToast } from '../../components/ui/Toast'
import { RADIUS, inputStyle, labelStyle } from '../../utils/design'

type Tab = 'equipe' | 'planning' | 'absences' | 'salaires'

type ContractType = 'CDI' | 'CDD' | 'Extra' | 'Stage'

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
  contractType?: ContractType
  contractEnd?: string
}

interface EmployeeForm {
  firstName: string
  lastName: string
  role: string
  email: string
  phone: string
  salary: number
  hourlyRate: number
  active: boolean
  contractType: ContractType
  contractEnd: string
}

interface Shift {
  empId: string
  day: number
  startTime: string
  endTime: string
}

interface Document {
  id: string
  empId: string
  type: 'Contract' | 'ID' | 'Health' | 'Other'
  uploadDate: string
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
  { id: '1', firstName: 'Marco', lastName: 'Rossi', role: 'Chef Cuisine', email: 'marco@r3sto.ch', phone: '+41 79 100 0001', salary: 6500, hourlyRate: 32.5, active: true, hireDate: '2023-03-15', contractType: 'CDI' },
  { id: '2', firstName: 'Sophie', lastName: 'Mueller', role: 'Serveuse', email: 'sophie@r3sto.ch', phone: '+41 79 100 0002', salary: 4200, hourlyRate: 22, active: true, hireDate: '2023-06-01', contractType: 'CDI' },
  { id: '3', firstName: 'Antoine', lastName: 'Dubois', role: 'Cuisinier', email: 'antoine@r3sto.ch', phone: '+41 79 100 0003', salary: 5200, hourlyRate: 27, active: true, hireDate: '2024-01-10', contractType: 'CDI' },
  { id: '4', firstName: 'Laura', lastName: 'Bernasconi', role: 'Hotesse', email: 'laura@r3sto.ch', phone: '+41 79 100 0004', salary: 3800, hourlyRate: 20, active: true, hireDate: '2024-04-01', contractType: 'CDD', contractEnd: '2026-06-30' },
  { id: '5', firstName: 'Thomas', lastName: 'Keller', role: 'Barman', email: 'thomas@r3sto.ch', phone: '+41 79 100 0005', salary: 4500, hourlyRate: 23.5, active: true, hireDate: '2023-09-15', contractType: 'CDI' },
  { id: '6', firstName: 'Elena', lastName: 'Fontana', role: 'Commis', email: 'elena@r3sto.ch', phone: '+41 79 100 0006', salary: 3600, hourlyRate: 19.5, active: true, hireDate: '2025-01-15', contractType: 'Stage', contractEnd: '2026-07-31' },
  { id: '7', firstName: 'Nicolas', lastName: 'Favre', role: 'Plongeur', email: 'nicolas@r3sto.ch', phone: '+41 79 100 0007', salary: 3400, hourlyRate: 19, active: false, hireDate: '2024-06-01', contractType: 'Extra' },
  { id: '8', firstName: 'Isabelle', lastName: 'Weber', role: 'Serveuse', email: 'isabelle@r3sto.ch', phone: '+41 79 100 0008', salary: 4100, hourlyRate: 21.5, active: true, hireDate: '2024-11-01', contractType: 'CDI' },
]

const INIT_ABSENCES: Absence[] = [
  { id: 'a1', empId: '2', empName: 'Sophie Mueller', type: 'Vacances', from: '2026-04-20', to: '2026-04-27', status: 'pending', note: 'Vacances Paques' },
  { id: 'a2', empId: '3', empName: 'Antoine Dubois', type: 'Maladie', from: '2026-04-10', to: '2026-04-12', status: 'approved', note: 'Grippe' },
  { id: 'a3', empId: '5', empName: 'Thomas Keller', type: 'Formation', from: '2026-05-05', to: '2026-05-06', status: 'pending', note: 'Cours sommelier' },
]

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const SHIFTS = ['11h-15h', '17h-23h', 'OFF']

const INIT_SHIFTS: Shift[] = [
  { empId: '1', day: 0, startTime: '11:00', endTime: '15:00' },
  { empId: '1', day: 1, startTime: '17:00', endTime: '23:00' },
  { empId: '2', day: 0, startTime: '17:00', endTime: '23:00' },
  { empId: '2', day: 2, startTime: '11:00', endTime: '15:00' },
  { empId: '3', day: 0, startTime: '11:00', endTime: '15:00' },
  { empId: '3', day: 3, startTime: '17:00', endTime: '23:00' },
]

const INIT_DOCUMENTS: Document[] = [
  { id: 'd1', empId: '1', type: 'Contract', uploadDate: '2023-03-10' },
  { id: 'd2', empId: '2', type: 'ID', uploadDate: '2023-05-20' },
]

const card: React.CSSProperties = { background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: RADIUS.md, padding: 14 }
const btnP: React.CSSProperties = { padding: '8px 16px', borderRadius: RADIUS.sm, background: 'var(--bl)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--ff)' }
const btnS: React.CSSProperties = { ...btnP, background: 'var(--surf3)', color: 'var(--t2)', border: '1px solid var(--border)' }

export function Equipes() {
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('equipe')
  const [employees, setEmployees] = useState<Employee[]>(INIT_EMPLOYEES)
  const [absences, setAbsences] = useState<Absence[]>(INIT_ABSENCES)
  const [shifts, setShifts] = useState<Shift[]>(INIT_SHIFTS)
  const [documents, setDocuments] = useState<Document[]>(INIT_DOCUMENTS)
  const [showModal, setShowModal] = useState(false)
  const [editEmp, setEditEmp] = useState<Employee | null>(null)
  const [form, setForm] = useState<EmployeeForm>({ firstName: '', lastName: '', role: 'Support', email: '', phone: '', salary: 4000, hourlyRate: 21, active: true, contractType: 'CDI', contractEnd: '' })

  const pendingCount = useMemo(() => absences.filter(a => a.status === 'pending').length, [absences])
  const totalMasseSalariale = useMemo(() => employees.filter(e => e.active).reduce((s, e) => s + e.salary, 0), [employees])

  const openAdd = () => { setEditEmp(null); setForm({ firstName: '', lastName: '', role: 'Support', email: '', phone: '', salary: 4000, hourlyRate: 21, active: true, contractType: 'CDI', contractEnd: '' }); setShowModal(true) }
  const openEdit = (e: Employee) => { setEditEmp(e); setForm({ firstName: e.firstName, lastName: e.lastName, role: e.role, email: e.email, phone: e.phone, salary: e.salary, hourlyRate: e.hourlyRate, active: e.active, contractType: e.contractType || 'CDI', contractEnd: e.contractEnd || '' }); setShowModal(true) }

  const saveEmp = () => {
    if (!form.firstName || !form.lastName) return
    if (editEmp) {
      setEmployees(employees.map(e => e.id === editEmp.id ? { ...e, ...form } : e))
      toast(form.firstName + ' ' + form.lastName + ' mis a jour')
    } else {
      const newId = Date.now().toString()
      setEmployees([...employees, { ...form, id: newId, hireDate: new Date().toISOString().slice(0, 10) }])
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
            <button style={btnP} onClick={openAdd}>+ Ajouter employe</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {employees.map(e => (
              <div key={e.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: e.active ? 'var(--bl)' : 'var(--surf3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: e.active ? '#fff' : 'var(--t3)', fontWeight: 800, fontSize: 14, fontFamily: 'var(--ff)', flexShrink: 0 }}>
                  {e.firstName[0]}{e.lastName[0]}
                </div>
                <div style={{ flex: '1 1 200px', minWidth: 150 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{e.firstName} {e.lastName}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>{e.role}</div>
                  <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>
                    {e.contractType} {e.contractType !== 'CDI' && e.contractEnd ? `• Fin: ${e.contractEnd}` : ''}
                  </div>
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
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {employees.filter(e => e.active).map(e => (
              <div key={e.id} style={card}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
                  {e.firstName} {e.lastName} - {e.role}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
                  {DAYS.map((d, dayIdx) => {
                    const dayShift = shifts.find(s => s.empId === e.id && s.day === dayIdx)
                    return (
                      <div
                        key={d}
                        style={{
                          padding: 10,
                          background: dayShift ? 'var(--surf2)' : 'var(--surf3)',
                          border: '1px solid var(--border)',
                          borderRadius: RADIUS.sm,
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', marginBottom: 4 }}>{d}</div>
                        {dayShift ? (
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>
                            {dayShift.startTime}
                          </div>
                        ) : (
                          <div style={{ fontSize: 10, color: 'var(--t4)', fontStyle: 'italic' }}>OFF</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Masse salariale active</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--bl)' }}>CHF {totalMasseSalariale.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>{employees.filter(e => e.active).length} employes actifs</div>
            </div>
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Salaire moyen</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gn)' }}>CHF {Math.round(totalMasseSalariale / employees.filter(e => e.active).length).toLocaleString()}</div>
              <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>par mois</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button style={btnS} onClick={exportCSV}>Exporter CSV</button>
          </div>
          <div style={{ overflowX: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--ff)' }}>
              <thead>
                <tr>
                  {['Employe', 'Role', 'Salaire mensuel', 'Taux horaire', 'Contrat', 'Statut'].map(h => (
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
                    <td style={{ padding: 8, borderBottom: '1px solid var(--border)', color: 'var(--t3)', fontSize: 10 }}>
                      <span style={{ padding: '2px 6px', borderRadius: 6, background: 'var(--surf2)', color: 'var(--text)', fontWeight: 600 }}>
                        {e.contractType}
                      </span>
                    </td>
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
              <div>
                <label style={labelStyle}>Type de contrat</label>
                <select value={form.contractType} onChange={e => setForm(f => ({ ...f, contractType: e.target.value as ContractType }))} style={inputStyle}>
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                  <option value="Extra">Extra</option>
                  <option value="Stage">Stage</option>
                </select>
              </div>
              {form.contractType !== 'CDI' && (
                <div>
                  <label style={labelStyle}>Date fin contrat</label>
                  <input type="date" value={form.contractEnd} onChange={e => setForm({ ...form, contractEnd: e.target.value })} style={inputStyle} />
                </div>
              )}
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
