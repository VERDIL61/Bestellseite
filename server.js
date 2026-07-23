require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const session = require('express-session');
const authRoutes = require('./routes/auth');

const Admin = require('./models/Admin');
const bcrypt =require('bcryptjs');

app.set('io', io); // damit routes/orders.js Events senden kann

app.use(cors());
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 } // Session bleibt 8 Stunden gültig
}));

// Statische Dateien: Kunden-Seite unter /, Dashboard unter /dashboard
app.use('/', express.static('public/customer'));
app.use('/dashboard', express.static('public/dashboard'));
app.use('/tv', express.static('public/tv'));

// API
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);

// Sockets: Clients treten "Raeumen" bei, je nachdem ob sie Dashboard oder TV-Screen sind
io.on('connection', (socket) => {
  socket.on('join', (room) => {
    // erlaubte Raeume: "dashboard", "tv"
    if (['dashboard', 'tv'].includes(room)) {
      socket.join(room);
    }
  });
});

const PORT = process.env.PORT || 3000;

connectDB().then(async () => {
  // Beim allerersten Start: Admin-Konto aus ADMIN_PASSWORD (.env) anlegen, falls noch keins existiert
  const existingAdmin = await Admin.findOne();
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10)
    await Admin.create({ passwordHash });
    console.log('🔑Erstes Admin-Konto aus ADMIN_PASSWORD angelegt.');
  }

  server.listen(PORT, () => {
    console.log(`🥙 Server läuft auf http://localhost:${PORT}`);
    console.log(`   Kunden-Bestellseite: http://localhost:${PORT}`);
    console.log(`   Mitarbeiter-Dashboard: http://localhost:${PORT}/dashboard`);
  })
})

