// ═══════════════════════════════════════════
//  R3STO — Clients Routes
// ═══════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { getSession } = require('./auth');
async function auth(req,res){const s=await getSession(req);if(!s){res.status(401).json({error:'Non authentifié'});return null;}return s;}

router.get('/', async (req,res) => {
  try {
    const s=await auth(req,res); if(!s) return;
    const q = req.query.q || '';
    let rows;
    if(q) {
      const like = `%${q}%`;
      [rows] = await db.execute(
        'SELECT * FROM clients WHERE restaurant_id=? AND (nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR telephone LIKE ?) ORDER BY nom ASC LIMIT 50',
        [s.restaurant_id,like,like,like,like]
      );
    } else {
      [rows] = await db.execute(
        'SELECT * FROM clients WHERE restaurant_id=? ORDER BY derniere_visite DESC, nom ASC LIMIT 100',
        [s.restaurant_id]
      );
    }
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
});

router.get('/:id', async (req,res) => {
  try {
    const s=await auth(req,res); if(!s) return;
    const [[client]] = await db.execute(
      'SELECT * FROM clients WHERE id=? AND restaurant_id=?',
      [req.params.id,s.restaurant_id]
    );
    if(!client) return res.status(404).json({error:'Client introuvable'});
    const [resas] = await db.execute(
      'SELECT id,date_resa,heure,couverts,statut FROM reservations WHERE client_id=? ORDER BY date_resa DESC LIMIT 20',
      [req.params.id]
    );
    res.json({...client, reservations: resas});
  } catch(e){res.status(500).json({error:e.message});}
});

router.post('/', async (req,res) => {
  try {
    const s=await auth(req,res); if(!s) return;
    const {prenom,nom,email,telephone,note,vip}=req.body;
    if(!nom) return res.status(400).json({error:'Nom requis'});
    const [r]=await db.execute(
      'INSERT INTO clients (restaurant_id,prenom,nom,email,telephone,note,vip) VALUES (?,?,?,?,?,?,?)',
      [s.restaurant_id,prenom||'',nom,email||null,telephone||null,note||null,vip?1:0]
    );
    res.status(201).json({id:r.insertId,ok:true});
  } catch(e){res.status(500).json({error:e.message});}
});

router.put('/:id', async (req,res) => {
  try {
    const s=await auth(req,res); if(!s) return;
    const b=req.body;
    const allowed=['prenom','nom','email','telephone','note','vip','blacklist','blacklist_raison'];
    const sets=[],vals=[];
    allowed.forEach(f=>{if(b[f]!==undefined){sets.push(`${f}=?`);vals.push(b[f]);}});
    if(b.blacklist===true||b.blacklist===1) { sets.push('blacklist_date=CURDATE()'); }
    if(!sets.length) return res.status(400).json({error:'Rien à mettre à jour'});
    vals.push(req.params.id,s.restaurant_id);
    await db.execute(`UPDATE clients SET ${sets.join(',')} WHERE id=? AND restaurant_id=?`,vals);
    res.json({ok:true});
  } catch(e){res.status(500).json({error:e.message});}
});

module.exports = router;
