// ═══════════════════════════════════════════
//  R3STO — Salles Routes
// ═══════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { getSession } = require('./auth');
async function auth(req,res){const s=await getSession(req);if(!s){res.status(401).json({error:'Non authentifié'});return null;}return s;}

router.get('/', async (req, res) => {
  try {
    const s = await auth(req,res); if(!s) return;
    const [rows] = await db.execute(
      'SELECT * FROM salles WHERE restaurant_id = ? ORDER BY position ASC, id ASC',
      [s.restaurant_id]
    );
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
});

router.post('/', async (req, res) => {
  try {
    const s = await auth(req,res); if(!s) return;
    const {nom,description,capacite_max,interieur,couleur} = req.body;
    if(!nom) return res.status(400).json({error:'Nom requis'});
    const [r] = await db.execute(
      'INSERT INTO salles (restaurant_id,nom,description,capacite_max,interieur,couleur) VALUES (?,?,?,?,?,?)',
      [s.restaurant_id,nom,description||null,capacite_max||0,interieur!==false?1:0,couleur||'#1c4f90']
    );
    res.status(201).json({id:r.insertId,ok:true});
  } catch(e){res.status(500).json({error:e.message});}
});

router.put('/:id', async (req, res) => {
  try {
    const s = await auth(req,res); if(!s) return;
    const b = req.body;
    const allowed = ['nom','description','capacite_max','interieur','actif','couleur','position'];
    const sets=[],vals=[];
    allowed.forEach(f=>{if(b[f]!==undefined){sets.push(`${f}=?`);vals.push(b[f]);}});
    if(!sets.length) return res.status(400).json({error:'Rien à mettre à jour'});
    vals.push(req.params.id,s.restaurant_id);
    await db.execute(`UPDATE salles SET ${sets.join(',')} WHERE id=? AND restaurant_id=?`,vals);
    res.json({ok:true});
  } catch(e){res.status(500).json({error:e.message});}
});

router.delete('/:id', async (req, res) => {
  try {
    const s = await auth(req,res); if(!s) return;
    await db.execute('DELETE FROM salles WHERE id=? AND restaurant_id=?',[req.params.id,s.restaurant_id]);
    res.json({ok:true});
  } catch(e){res.status(500).json({error:e.message});}
});

module.exports = router;
