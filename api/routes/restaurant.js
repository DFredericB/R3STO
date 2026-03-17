// ═══════════════════════════════════════════
//  R3STO — Restaurant Routes
// ═══════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { getSession } = require('./auth');
async function auth(req,res){const s=await getSession(req);if(!s){res.status(401).json({error:'Non authentifié'});return null;}return s;}

router.get('/', async (req,res) => {
  try {
    const s=await auth(req,res); if(!s) return;
    const [[resto]] = await db.execute(
      'SELECT r.*, p.code AS plan_code, p.nom AS plan_nom FROM restaurants r LEFT JOIN plans p ON p.id=r.plan_id WHERE r.id=?',
      [s.restaurant_id]
    );
    res.json(resto);
  } catch(e){res.status(500).json({error:e.message});}
});

router.put('/', async (req,res) => {
  try {
    const s=await auth(req,res); if(!s) return;
    const b=req.body;
    const allowed=['nom','telephone','adresse','ville','code_postal','pays','site_web','description','type_cuisine'];
    const sets=[],vals=[];
    allowed.forEach(f=>{if(b[f]!==undefined){sets.push(`${f}=?`);vals.push(b[f]);}});
    if(!sets.length) return res.status(400).json({error:'Rien à mettre à jour'});
    vals.push(s.restaurant_id);
    await db.execute(`UPDATE restaurants SET ${sets.join(',')} WHERE id=?`,vals);
    res.json({ok:true});
  } catch(e){res.status(500).json({error:e.message});}
});

// GET /api/restaurant/options
router.get('/options', async (req,res) => {
  try {
    const s=await auth(req,res); if(!s) return;
    let [[opts]] = await db.execute('SELECT * FROM options WHERE restaurant_id=?',[s.restaurant_id]);
    if(!opts){
      await db.execute('INSERT INTO options (restaurant_id) VALUES (?)',[s.restaurant_id]);
      [[opts]] = await db.execute('SELECT * FROM options WHERE restaurant_id=?',[s.restaurant_id]);
    }
    res.json(opts);
  } catch(e){res.status(500).json({error:e.message});}
});

// PUT /api/restaurant/options
router.put('/options', async (req,res) => {
  try {
    const s=await auth(req,res); if(!s) return;
    const b=req.body;
    const allowed=['wifi','parking','parking_places','terrasse','terrasse_couverte',
                   'terrasse_chauffee','accessible','climatisation','animaux','fumeur',
                   'code_vestimentaire','langues','annulation_heures',
                   'reservation_min_cvts','reservation_max_cvts',
                   'groupes_actif','groupes_seuil','groupes_max','groupes_validation',
                   'dispersion_mode','dispersion_intervalle','dispersion_max_slot',
                   'notif_rappel_actif','notif_rappel_heures','notif_confirmation'];
    const sets=[],vals=[];
    allowed.forEach(f=>{if(b[f]!==undefined){sets.push(`\`${f}\`=?`);vals.push(b[f]);}});
    if(!sets.length) return res.status(400).json({error:'Rien à mettre à jour'});
    vals.push(s.restaurant_id);
    await db.execute(`UPDATE options SET ${sets.join(',')} WHERE restaurant_id=?`,vals);
    res.json({ok:true});
  } catch(e){res.status(500).json({error:e.message});}
});

// GET /api/restaurant/widget
router.get('/widget', async (req,res) => {
  try {
    const s=await auth(req,res); if(!s) return;
    let [[w]] = await db.execute('SELECT * FROM widget_config WHERE restaurant_id=?',[s.restaurant_id]);
    if(!w){
      await db.execute('INSERT INTO widget_config (restaurant_id) VALUES (?)',[s.restaurant_id]);
      [[w]] = await db.execute('SELECT * FROM widget_config WHERE restaurant_id=?',[s.restaurant_id]);
    }
    res.json(w);
  } catch(e){res.status(500).json({error:e.message});}
});

module.exports = router;
