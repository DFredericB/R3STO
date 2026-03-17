const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

// Routes
app.use('/api/auth', require('./api/routes/auth'));
app.use('/api/reservations', require('./api/routes/reservations'));
app.use('/api/clients', require('./api/routes/clients'));
app.use('/api/salles', require('./api/routes/salles'));
app.use('/api/tables', require('./api/routes/tables'));
app.use('/api/services', require('./api/routes/services'));
app.use('/api/dashboard', require('./api/routes/dashboard'));
app.use('/api/restaurant', require('./api/routes/restaurant'));
app.use('/api/admin', require('./api/routes/admin'));

// Test connexion BDD
const db = require('./api/config/db');
db.getConnection()
  .then(() => console.log('✅ MariaDB connecté'))
  .catch(e => console.error('❌ BDD:', e.message));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 R3STO API sur port ${PORT}`));
