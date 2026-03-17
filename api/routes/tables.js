// ═══════════════════════════════════════════
//  R3STO — Tables Routes
// ═══════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { getSession } = require('./auth');
async function auth(req,res){const s=await getSession(req);if(!s){res.status(401).json({error:'Non authentifié'});return null;}return s;}

router.get('/', async (req, res) => {
  try {
    const s = await auth(req,res); if(!s) return;
    const [rows] = await db.execute(`
      SELECT t.*, sa.nom AS salle_nom
      FROM \`tables\` t
      LEFT JOIN salles sa ON sa.id = t.salle_id
      WHERE t.restaurant_id = ?
      ORDER BY t.salle_id ASC, t.numero ASC
    `, [s.restaurant_id]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
});

router.post('/', async (req, res) => {
  try {
    const s = await auth(req,res); if(!s) return;
    const {salle_id,numero,nom,couverts_min,couverts_max,forme,largeur,hauteur,pos_x,pos_y} = req.body;
    if(!numero) return res.status(400).json({error:'Numéro requis'});
    const [r] = await db.execute(`
      INSERT INTO \`tables\`
      (restaurant_id,salle_id,numero,nom,couverts_min,couverts_max,forme,largeur,hauteur,pos_x,pos_y)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `,[s.restaurant_id,salle_id||null,numero,nom||null,
       couverts_min||1,couverts_max||4,forme||'rect',
       largeur||10,hauteur||10,pos_x||0,pos_y||0]);
    res.status(201).json({id:r.insertId,ok:true});
  } catch(e){res.status(500).json({error:e.message});}
});

router.put('/:id', async (req, res) => {
  try {
    const s = await auth(req,res); if(!s) return;
    const b = req.body;
    const allowed = ['numero','nom','salle_id','couverts_min','couverts_max',
                     'forme','largeur','hauteur','pos_x','pos_y','rotation','bloquee','actif'];
    const sets=[],vals=[];
    allowed.forEach(f=>{if(b[f]!==undefined){sets.push(`${f}=?`);vals.push(b[f]);}});
    if(!sets.length) return res.status(400).json({error:'Rien à mettre à jour'});
    vals.push(req.params.id,s.restaurant_id);
    await db.execute(`UPDATE \`tables\` SET ${sets.join(',')} WHERE id=? AND restaurant_id=?`,vals);
    res.json({ok:true});
  } catch(e){res.status(500).json({error:e.message});}
});

router.delete('/:id', async (req, res) => {
  try {
    const s = await auth(req,res); if(!s) return;
    await db.execute('DELETE FROM `tables` WHERE id=? AND restaurant_id=?',[req.params.id,s.restaurant_id]);
    res.json({ok:true});
  } catch(e){res.status(500).json({error:e.message});}
});

module.exports = router;
