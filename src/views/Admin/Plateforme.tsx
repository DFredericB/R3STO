// ══════════════════════════════════════════════════
//  R3STO — Plateforme
//  Monitoring, Déploiements, Sécurité, Logs
// ══════════════════════════════════════════════════

import { useState } from 'react'
import { RADIUS } from '../../utils/design'

type TabType = 'monitoring' | 'deployments' | 'security' | 'logs'
type LogLevel = 'info' | 'warn' | 'error'

interface SubdomainStatus {
  name: string
  status: 'online' | 'degraded' | 'offline'
  uptime: number
  responseTime: number
  lastCheck: string
}

interface DeploymentRecord {
  id: number
  date: string
  sites: string[]
  status: 'success' | 'failed' | 'pending'
  duration: number
}

interface SecurityItem {
  id: number
  name: string
  status: 'pass' | 'fail' | 'warning'
  description: string
}

interface LogEntry {
  id: number
  level: LogLevel
  timestamp: string
  message: string
  service: string
}

// Demo data
const DEMO_SUBDOMAINS: SubdomainStatus[] = [
  { name: 'api.r3sto.com', status: 'online', uptime: 99.98, responseTime: 42, lastCheck: '2026-04-12 15:28' },
  { name: 'auth.r3sto.ch', status: 'online', uptime: 99.95, responseTime: 68, lastCheck: '2026-04-12 15:27' },
  { name: 'app.r3sto.ch', status: 'online', uptime: 99.92, responseTime: 156, lastCheck: '2026-04-12 15:26' },
  { name: 'admin.r3sto.ch', status: 'online', uptime: 99.97, responseTime: 78, lastCheck: '2026-04-12 15:27' },
  { name: 'bill.r3sto.ch', status: 'online', uptime: 99.99, responseTime: 52, lastCheck: '2026-04-12 15:28' },
  { name: 'booking.r3sto.ch', status: 'degraded', uptime: 99.45, responseTime: 890, lastCheck: '2026-04-12 15:25' },
  { name: 'demo.r3sto.ch', status: 'online', uptime: 99.91, responseTime: 234, lastCheck: '2026-04-12 15:26' },
  { name: 'menu.r3sto.ch', status: 'online', uptime: 99.94, responseTime: 123, lastCheck: '2026-04-12 15:27' },
  { name: 'r3sto.ch', status: 'online', uptime: 99.99, responseTime: 89, lastCheck: '2026-04-12 15:28' },
]

const DEMO_DEPLOYMENTS: DeploymentRecord[] = [
  { id: 1, date: '2026-04-12 09:15', sites: ['api', 'auth', 'app'], status: 'success', duration: 8 },
  { id: 2, date: '2026-04-11 14:32', sites: ['booking', 'demo'], status: 'success', duration: 5 },
  { id: 3, date: '2026-04-11 08:45', sites: ['admin', 'bill'], status: 'success', duration: 6 },
  { id: 4, date: '2026-04-10 16:20', sites: ['menu', 'r3sto.ch'], status: 'success', duration: 4 },
  { id: 5, date: '2026-04-10 10:05', sites: ['api'], status: 'failed', duration: 12 },
]

const DEMO_SECURITY: SecurityItem[] = [
  { id: 1, name: 'SSL Certificate', status: 'pass', description: 'All subdomains have valid SSL certs' },
  { id: 2, name: 'HSTS Header', status: 'pass', description: 'HSTS enabled for all domains' },
  { id: 3, name: 'API Authentication', status: 'pass', description: 'JWT tokens active and rotating' },
  { id: 4, name: 'CORS Policy', status: 'pass', description: 'Restrictive CORS headers configured' },
  { id: 5, name: 'Database Backup', status: 'pass', description: 'Daily backups running successfully' },
  { id: 6, name: 'Rate Limiting', status: 'warning', description: 'Consider increasing limits for peak hours' },
]

const DEMO_LOGS: LogEntry[] = [
  { id: 1, level: 'info', timestamp: '2026-04-12 15:28:32', message: 'Health check passed for api.r3sto.com', service: 'monitoring' },
  { id: 2, level: 'info', timestamp: '2026-04-12 15:27:15', message: 'Deployment completed successfully', service: 'ci-cd' },
  { id: 3, level: 'warn', timestamp: '2026-04-12 15:25:48', message: 'High latency detected on booking.r3sto.ch', service: 'perf' },
  { id: 4, level: 'error', timestamp: '2026-04-12 15:18:09', message: 'Database connection timeout (recovered)', service: 'database' },
  { id: 5, level: 'info', timestamp: '2026-04-12 15:10:22', message: 'User authentication token refreshed', service: 'auth' },
  { id: 6, level: 'warn', timestamp: '2026-04-12 14:55:31', message: 'API rate limit approaching for client X', service: 'api' },
]

// Styles
const container: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  padding: '20px',
  color: 'var(--text)',
  fontFamily: 'var(--ff)',
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  scrollbarColor: 'var(--border) transparent',
}

const tabsHeader: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  borderBottom: '1px solid var(--border)',
  flexWrap: 'wrap',
}

const tabBtn: (active: boolean) => React.CSSProperties = (active) => ({
  padding: '12px 16px',
  background: 'transparent',
  border: 'none',
  borderBottom: active ? '2px solid var(--bl)' : 'none',
  color: active ? 'var(--bl)' : 'var(--t3)',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: active ? 600 : 500,
  fontFamily: 'var(--ff)',
  transition: 'all 200ms',
})

const cardS: React.CSSProperties = {
  background: 'var(--surf)',
  border: '1px solid var(--border)',
  borderRadius: RADIUS.md,
  padding: 14,
}

const gridWrapper: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  flexWrap: 'wrap',
}

const subdomainCard: React.CSSProperties = {
  ...cardS,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const statusBadge: (status: 'online' | 'degraded' | 'offline') => React.CSSProperties = (status) => {
  const colors = {
    online: { bg: 'rgba(60, 200, 112, 0.1)', text: 'var(--gn)' },
    degraded: { bg: 'rgba(232, 165, 48, 0.1)', text: 'var(--am)' },
    offline: { bg: 'rgba(220, 80, 80, 0.1)', text: 'var(--rd)' },
  }
  return {
    background: colors[status].bg,
    color: colors[status].text,
    padding: '6px 12px',
    borderRadius: RADIUS.sm,
    fontSize: 12,
    fontWeight: 600,
  }
}

const deploymentRow: React.CSSProperties = {
  ...cardS,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const securityRow: React.CSSProperties = {
  ...cardS,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
}

const logRow: React.CSSProperties = {
  ...cardS,
  display: 'flex',
  gap: 12,
  alignItems: 'flex-start',
}

const logLevelBadge: (level: LogLevel) => React.CSSProperties = (level) => {
  const colors = {
    info: { bg: 'rgba(68, 128, 216, 0.1)', text: 'var(--bl)' },
    warn: { bg: 'rgba(232, 165, 48, 0.1)', text: 'var(--am)' },
    error: { bg: 'rgba(220, 80, 80, 0.1)', text: 'var(--rd)' },
  }
  return {
    background: colors[level].bg,
    color: colors[level].text,
    padding: '4px 8px',
    borderRadius: RADIUS.xs,
    fontSize: 11,
    fontWeight: 600,
    minWidth: 40,
    textAlign: 'center',
  }
}

const sectionTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: 'var(--text)',
  marginBottom: 12,
}

const filterRow: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginBottom: 12,
  flexWrap: 'wrap',
}

const filterChip: (active: boolean) => React.CSSProperties = (active) => ({
  padding: '8px 12px',
  background: active ? 'var(--bl)' : 'var(--surf3)',
  color: active ? 'white' : 'var(--t3)',
  border: 'none',
  borderRadius: RADIUS.sm,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: 'var(--ff)',
  transition: 'all 200ms',
})

// Monitoring tab component
function MonitoringTab() {
  return (
    <div style={gridWrapper}>
      <h3 style={sectionTitle}>Infrastructure Status (9 Subdomains)</h3>
      {DEMO_SUBDOMAINS.map((subdomain) => (
        <div key={subdomain.name} style={subdomainCard}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{subdomain.name}</div>
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>
              Uptime: {subdomain.uptime.toFixed(2)}% | Response: {subdomain.responseTime}ms | Last check: {subdomain.lastCheck}
            </div>
          </div>
          <div style={statusBadge(subdomain.status)}>
            {subdomain.status === 'online' ? '✓ Online' : subdomain.status === 'degraded' ? '⚠ Degraded' : '✗ Offline'}
          </div>
        </div>
      ))}
    </div>
  )
}

// Deployments tab component
function DeploymentsTab() {
  return (
    <div style={gridWrapper}>
      <h3 style={sectionTitle}>Deployment History</h3>
      {DEMO_DEPLOYMENTS.map((deploy) => (
        <div key={deploy.id} style={deploymentRow}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              {deploy.sites.join(', ')} — {deploy.date}
            </div>
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>Duration: {deploy.duration} minutes</div>
          </div>
          <div
            style={statusBadge(
              deploy.status === 'success' ? 'online' : deploy.status === 'pending' ? 'degraded' : 'offline',
            )}
          >
            {deploy.status === 'success' ? '✓ Success' : deploy.status === 'pending' ? '⏳ Pending' : '✗ Failed'}
          </div>
        </div>
      ))}
    </div>
  )
}

// Security tab component
function SecurityTab() {
  return (
    <div style={gridWrapper}>
      <h3 style={sectionTitle}>Security Checklist</h3>
      {DEMO_SECURITY.map((item) => (
        <div key={item.id} style={securityRow}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{item.name}</div>
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>{item.description}</div>
          </div>
          <div
            style={statusBadge(
              item.status === 'pass' ? 'online' : item.status === 'warning' ? 'degraded' : 'offline',
            )}
          >
            {item.status === 'pass' ? '✓ Pass' : item.status === 'warning' ? '⚠ Warning' : '✗ Fail'}
          </div>
        </div>
      ))}
    </div>
  )
}

// Logs tab component
function LogsTab() {
  const [activeLevel, setActiveLevel] = useState<LogLevel | 'all'>('all')

  const filteredLogs = activeLevel === 'all' ? DEMO_LOGS : DEMO_LOGS.filter((log) => log.level === activeLevel)

  return (
    <div style={gridWrapper}>
      <div>
        <h3 style={sectionTitle}>Log Viewer</h3>
        <div style={filterRow}>
          <button style={filterChip(activeLevel === 'all')} onClick={() => setActiveLevel('all')}>
            All Levels
          </button>
          <button style={filterChip(activeLevel === 'info')} onClick={() => setActiveLevel('info')}>
            Info
          </button>
          <button style={filterChip(activeLevel === 'warn')} onClick={() => setActiveLevel('warn')}>
            Warn
          </button>
          <button style={filterChip(activeLevel === 'error')} onClick={() => setActiveLevel('error')}>
            Error
          </button>
        </div>
      </div>
      {filteredLogs.map((log) => (
        <div key={log.id} style={logRow}>
          <div style={logLevelBadge(log.level)}>{log.level.toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>
              {log.timestamp} | {log.service}
            </div>
            <div style={{ fontSize: 13 }}>{log.message}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Main component
export function Plateforme() {
  const [activeTab, setActiveTab] = useState<TabType>('monitoring')

  return (
    <div style={container}>
      <div style={tabsHeader}>
        <button style={tabBtn(activeTab === 'monitoring')} onClick={() => setActiveTab('monitoring')}>
          Monitoring
        </button>
        <button style={tabBtn(activeTab === 'deployments')} onClick={() => setActiveTab('deployments')}>
          Déploiements
        </button>
        <button style={tabBtn(activeTab === 'security')} onClick={() => setActiveTab('security')}>
          Sécurité
        </button>
        <button style={tabBtn(activeTab === 'logs')} onClick={() => setActiveTab('logs')}>
          Logs
        </button>
      </div>

      <div style={{ paddingTop: 12 }}>
        {activeTab === 'monitoring' && <MonitoringTab />}
        {activeTab === 'deployments' && <DeploymentsTab />}
        {activeTab === 'security' && <SecurityTab />}
        {activeTab === 'logs' && <LogsTab />}
      </div>
    </div>
  )
}
