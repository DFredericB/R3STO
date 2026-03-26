// ══════════════════════════════════════════════════
//  R3STO — App.tsx
//  Point d'entrée React — routing et layout global
// ══════════════════════════════════════════════════

import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store/useAppStore'
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import { BottomNav } from './components/layout/BottomNav'
import { ToastProvider } from './components/ui/Toast'
import { Dashboard } from './views/Dashboard/Dashboard'
import { Grille } from './views/Grille/Grille'
import { Resas } from './views/Resas/Resas'
import { Waitlist } from './views/Waitlist/Waitlist'
import { Groupes } from './views/Groupes/Groupes'
import { Marketing } from './views/Marketing/Marketing'
import { Blacklist } from './views/Blacklist/Blacklist'
import { Clients } from './views/Clients/Clients'
import { Widget } from './views/Widget/Widget'
import { QRCode } from './views/QRCode/QRCode'
import { Prepaiement } from './views/Prepaiement/Prepaiement'
import { Profil } from './views/Profil/Profil'
import { Salles } from './views/Salles/Salles'
import { Fermetures } from './views/Fermetures/Fermetures'
import { Tables } from './views/Tables/Tables'
import { Options } from './views/Options/Options'
import { AccesRoles } from './views/AccesRoles/AccesRoles'
import { Historique } from './views/Historique/Historique'
import { Support } from './views/Support/Support'
import { Menu } from './views/Menu/Menu'
import { Commandes } from './views/Commandes/Commandes'
import { KDSCuisine } from './views/KDS/KDSCuisine'
import { KDSBar } from './views/KDS/KDSBar'
import { ServiceView } from './views/Service/ServiceView'
import { CaisseView } from './views/Caisse/CaisseView'
import { SetupPlan } from './views/SetupPlan/SetupPlan'
import { Plan } from './views/Plan/Plan'
import { loadDemoFallback } from './utils/demoData'
import './styles/global.css'

export default function App() {
  const { resas, tables, loadDemoData, theme } = useAppStore()

  // Auto-charger démo si pas de données OU si version demo obsolète
  useEffect(() => {
    const store = useAppStore.getState() as any
    const demoData = loadDemoFallback() as any
    const currentVersion = store._demoVersion ?? 0
    const targetVersion  = demoData._demoVersion ?? 0
    // Recharger si : aucune donnée, OU version obsolète (même si isDemo n'est pas set)
    const isEmpty      = resas.length === 0 && tables.length === 0
    const needsRefresh = currentVersion < targetVersion
    if (isEmpty || needsRefresh) {
      loadDemoData(demoData)
    }
  }, [])

  // Appliquer thème au montage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="app-layout">
          <Header />
          <div className="app-body">
            <Sidebar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                {/* OPÉRATIONS */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/reservations" element={<Resas />} />
                <Route path="/grille" element={<Grille />} />
                <Route path="/plan" element={<Plan />} />
                <Route path="/waitlist" element={<Waitlist />} />
                <Route path="/groupes" element={<Groupes />} />
                {/* CLIENTS & MARKETING */}
                <Route path="/clients" element={<Clients />} />
                <Route path="/marketing" element={<Marketing />} />
                <Route path="/blacklist" element={<Blacklist />} />
                {/* CANAUX & REVENUS */}
                <Route path="/widget" element={<Widget />} />
                <Route path="/qrcode" element={<QRCode />} />
                <Route path="/menu" element={<Menu />} />
                <Route path="/commandes" element={<Commandes />} />
                <Route path="/prepaiement" element={<Prepaiement />} />
                {/* R3STO ORDER (BÊTA) */}
                <Route path="/kds-cuisine" element={<KDSCuisine />} />
                <Route path="/kds-bar" element={<KDSBar />} />
                <Route path="/service" element={<ServiceView />} />
                <Route path="/caisse" element={<CaisseView />} />
                {/* CONFIGURATION */}
                <Route path="/profil" element={<Profil />} />
                <Route path="/salles" element={<Salles />} />
                <Route path="/fermetures" element={<Fermetures />} />
                <Route path="/setup-plan" element={<SetupPlan />} />
                <Route path="/tables" element={<Tables />} />
                <Route path="/options" element={<Options />} />
                {/* ADMINISTRATION */}
                <Route path="/acces-roles" element={<AccesRoles />} />
                <Route path="/historique" element={<Historique />} />
                <Route path="/support" element={<Support />} />
                {/* Fallback */}
                <Route path="*" element={
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>
                    Page introuvable — 404
                  </div>
                } />
              </Routes>
            </main>
          </div>
          <BottomNav />
        </div>
      </ToastProvider>
    </BrowserRouter>
  )
}
