// ══════════════════════════════════════════════════════════════════════════════
//  R3STO — post-build sync
//  Copie dist/ vers deploy/app.r3sto.ch/ et deploy/demo.r3sto.ch/
//  Lancé automatiquement après `npm run build` (voir package.json "postbuild").
// ══════════════════════════════════════════════════════════════════════════════
import { cpSync, rmSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const dist = resolve(root, 'dist')
if (\!existsSync(dist)) {
  console.error('[post-build] dist/ absent — build a échoué ?')
  process.exit(1)
}
const targets = ['deploy/app.r3sto.ch', 'deploy/demo.r3sto.ch']
for (const t of targets) {
  const dest = resolve(root, t)
  try { rmSync(dest, { recursive: true, force: true }) } catch {}
  cpSync(dist, dest, { recursive: true })
  console.log(`[post-build] ✓ ${t} ← dist`)
}
