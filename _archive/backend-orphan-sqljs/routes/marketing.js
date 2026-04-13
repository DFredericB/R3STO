import { Router } from 'express'
import { all, row, run } from '../db.js'
import { sendMenuDuJourEmail } from '../utils/mailer.js'

const router = Router()

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/marketing/menu-du-jour
//  Send daily menu email to all subscribed clients
// ════════════════════════════════════════════════════════════════════════════

router.post('/menu-du-jour', async (req, res) => {
  try {
    const { titre, entree, plat, dessert, prix, note, restoName } = req.body

    if (!plat) {
      return res.status(400).json({ message: 'Le plat est requis' })
    }

    // Find all subscribed clients with email
    const subscribers = all(
      "SELECT id, nom, prenom, email FROM clients WHERE menuDuJourOptin = 1 AND email IS NOT NULL AND email != ''"
    )

    if (!subscribers || subscribers.length === 0) {
      return res.json({ sent: 0, message: 'Aucun abonné' })
    }

    const menu = { titre, entree, plat, dessert, prix, note }
    let sent = 0

    for (const client of subscribers) {
      const name = `${client.prenom || ''} ${client.nom || ''}`.trim() || 'Client'
      const ok = await sendMenuDuJourEmail(client.email, name, menu, restoName)
      if (ok) sent++
    }

    console.log(`[MENU DU JOUR] Sent to ${sent}/${subscribers.length} subscribers`)
    res.json({ sent, total: subscribers.length })
  } catch (error) {
    console.error('[MENU_DU_JOUR]', error)
    res.status(500).json({ message: 'Send failed' })
  }
})

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/marketing/unsub-menu
//  Unsubscribe from daily menu emails
// ════════════════════════════════════════════════════════════════════════════

router.get('/unsub-menu', (req, res) => {
  try {
    const { email } = req.query
    if (!email) return res.status(400).send('Email requis')

    const client = row('SELECT id FROM clients WHERE email = ?', email)
    if (client) {
      run('UPDATE clients SET menuDuJourOptin = 0 WHERE id = ?', client.id)
    }

    // Show a simple unsubscribe confirmation page
    res.send(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Désabonnement</title>
      <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0b1120;color:#e2e8f0}
      .card{text-align:center;padding:40px;max-width:400px}</style>
      </head><body><div class="card">
        <div style="font-size:48px;margin-bottom:16px">✅</div>
        <h2 style="margin:0 0 8px">Désabonnement confirmé</h2>
        <p style="color:#94a3b8;font-size:14px">Vous ne recevrez plus le menu du jour par email.</p>
        <p style="color:#64748b;font-size:12px;margin-top:20px">Vous pouvez vous réabonner à tout moment lors de votre prochaine réservation.</p>
      </div></body></html>
    `)
  } catch (error) {
    console.error('[UNSUB_MENU]', error)
    res.status(500).send('Erreur')
  }
})

export default router
