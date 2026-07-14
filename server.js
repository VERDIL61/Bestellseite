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

app.set('io', io); // damit routes/orders.js Events senden kann

app.use(cors());
app.use(express.json());

// Statische Dateien: Kunden-Seite unter /, Dashboard unter /dashboard
app.use('/', express.static('public/customer'));
app.use('/dashboard', express.static('public/dashboard'));
app.use('/tv', express.static('public/tv'));

// API
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

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

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🥙 Server laeuft auf http://localhost:${PORT}`);
    console.log(`   Kunden-Bestellseite: http://localhost:${PORT}`);
    console.log(`   Mitarbeiter-Dashboard: http://localhost:${PORT}/dashboard`);
  });
});
