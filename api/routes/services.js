// ═══════════════════════════════════════════
//  R3STO — Services Routes
// ═══════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { getSession } = require('./auth');
async function auth(req,res){const s=await getSession(req);if(!s){res.status(401).json({error:'Non authentifié'});return null;}return s;}

router.get('/', async (req,res) => {
  try {
    const s=await auth(req,res); if(!s) return;
    const [rows] = await db.execute(
      'SELECT * FROM services WHERE restaurant_id=? AND actif=1 ORDER BY heure_debut ASC',
      [s.restaurant_id]
    );
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
});

router.post('/', async (req,res) => {
  try {
    const s=await auth(req,res); if(!s) return;
    const {salle_id,nom,type,heure_debut,heure_fin,jours,slot_minutes,couverts_max,couleur}=req.body;
    if(!heure_debut||!heure_fin) return res.status(400).json({error:'Heures requises'});
    const [r]=await db.execute(
      'INSERT INTO services (restaurant_id,salle_id,nom,type,heure_debut,heure_fin,jours,slot_minutes,couverts_max,couleur) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [s.restaurant_id,salle_id||null,nom||'Service',type||'midi',
       heure_debut,heure_fin,jours||'1,2,3,4,5',slot_minutes||15,
       couverts_max||null,couleur||'#2B5BA0']
    );
    res.status(201).json({id:r.insertId,ok:true});
  } catch(e){res.status(500).json({error:e.message});}
});

router.put('/:id', async (req,res) => {
  try {
    const s=await auth(req,res); if(!s) return;
    const b=req.body;
    const allowed=['nom','type','heure_debut','heure_fin','jours','slot_minutes','couverts_max','actif','couleur'];
    const sets=[],vals=[];
    allowed.forEach(f=>{if(b[f]!==undefined){sets.push(`${f}=?`);vals.push(b[f]);}});
    if(!sets.length) return res.status(400).json({error:'Rien à mettre à jour'});
    vals.push(req.params.id,s.restaurant_id);
    await db.execute(`UPDATE services SET ${sets.join(',')} WHERE id=? AND restaurant_id=?`,vals);
    res.json({ok:true});
  } catch(e){res.status(500).json({error:e.message});}
});

router.delete('/:id', async (req,res) => {
  try {
    const s=await auth(req,res); if(!s) return;
    await db.execute('DELETE FROM services WHERE id=? AND restaurant_id=?',[req.params.id,s.restaurant_id]);
    res.json({ok:true});
  } catch(e){res.status(500).json({error:e.message});}
});

module.exports = router;
