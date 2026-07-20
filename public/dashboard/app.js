let orders = []; // alle heutigen Bestellungen
let currentView = 'neu'; // "neu" | "in_zubereitung" | "fertig" | "alle"

const fmt = (n) => n.toFixed(2).replace('.', ',') + ' €';
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });

const statusLabels = { neu: 'Neue Bestellungen', in_zubereitung: 'In Zubereitung', fertig: 'Fertig', alle: 'Alle Bestellungen', produkte: 'Produkte verwalten' };

// ---------- INIT ----------
async function init() {
  document.getElementById('todayLabel').textContent = new Date().toLocaleDateString('de-AT', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
  });

  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  await loadOrders();
  connectSocket();
}

async function loadOrders() {
  try {
    const res = await fetch('/api/orders');
    orders = await res.json();
    renderAll();
  } catch (err) {
    document.getElementById('ordersGrid').innerHTML = '<p class="empty">Bestellungen konnten nicht geladen werden.</p>';
  }
}

// Erzeugt einen kurzen Benachrichtigungston ohne externe Audiodatei
function playNotificationSound(){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator(); // erzeugt den Ton
    const gainNode = ctx.createGain(); // Steuert die Lautstärke

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.value = 880; // Tonhöhe in Hz

    // lautstärke: startet bei 0.3, klingt in 0.5s auf ~0 aus
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.5);
  } catch (error) {
    console.warn('Ton konnte nicht abgespielt werden:', error);
  }
}


// ---------- SOCKET.IO (Live-Updates) ----------
function connectSocket() {
  const socket = io();
  const statusEl = document.getElementById('connectionStatus');

  socket.on('connect', () => {
    socket.emit('join', 'dashboard');
    statusEl.textContent = '● live verbunden';
    statusEl.classList.add('online');
  });

  socket.on('disconnect', () => {
    statusEl.textContent = '● getrennt';
    statusEl.classList.remove('online');
  });

  socket.on('new-order', (order) => {
    orders.unshift(order);
    renderAll();
    playNotificationSound();
    if (document.getElementById('autoPrintToggle').checked) {
      printOrder(order._id);
    }
  });

  socket.on('order-updated', (updated) => {
    const idx = orders.findIndex((o) => o._id === updated._id);
    if (idx !== -1) orders[idx] = updated;
    renderAll();
  });
}

// ---------- VIEW SWITCH ----------
function switchView(view) {
  currentView = view;
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.getElementById('viewTitle').textContent = statusLabels[view];

  if (view === 'produkte') {
    document.getElementById('ordersGrid').classList.add('hidden');
    document.getElementById('productsView').classList.remove('hidden');
    loadProducts();
  } else {
    document.getElementById('productsView').classList.add('hidden');
    document.getElementById('ordersGrid').classList.remove('hidden');
    renderOrders();
  }
}

// ---------- RENDER ----------
function renderAll() {
  updateBadges();
  renderOrders();
}

function updateBadges() {
  document.getElementById('badgeNeu').textContent = orders.filter((o) => o.status === 'neu').length;
  document.getElementById('badgeZubereitung').textContent = orders.filter((o) => o.status === 'in_zubereitung').length;
  document.getElementById('badgeFertig').textContent = orders.filter((o) => o.status === 'fertig').length;
}

function paymentLabel(method) {
  if (method === 'kassa') return '💶 An der Kassa';
  if (method === 'apple_pay') return ' Apple Pay';
  if (method === 'google_pay') return 'G Google Pay';
  return method;
}

function renderOrders() {
  const grid = document.getElementById('ordersGrid');
  let list = orders;
  if (currentView !== 'alle') list = orders.filter((o) => o.status === currentView);

  // Abgeholte Bestellungen nicht in "Alle" Endlosliste hängen lassen zu Ende
  list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (list.length === 0) {
    grid.innerHTML = '<p class="empty">Keine Bestellungen in dieser Ansicht.</p>';
    return;
  }

  grid.innerHTML = list.map((o) => orderCardHtml(o)).join('');

  grid.querySelectorAll('[data-print]').forEach((b) => b.addEventListener('click', () => printOrder(b.dataset.print)));
  grid.querySelectorAll('[data-accept]').forEach((b) => b.addEventListener('click', () => setStatus(b.dataset.accept, 'in_zubereitung')));
  grid.querySelectorAll('[data-ready]').forEach((b) => b.addEventListener('click', () => setStatus(b.dataset.ready, 'fertig')));
  grid.querySelectorAll('[data-done]').forEach((b) => b.addEventListener('click', () => setStatus(b.dataset.done, 'abgeholt')));
}

function orderCardHtml(o) {
  const itemsHtml = o.items
    .map((item) => {
      const optsText = (item.selectedOptions || []).map((g) => `${g.groupName}: ${g.labels.join(', ')}`).join(' · ');
      return `<div class="order-item-row">
        <div class="qty-name">${item.quantity}x ${item.name}</div>
        ${optsText ? `<div class="opts">${optsText}</div>` : ''}
      </div>`;
    })
    .join('');

  let actionsHtml = `<button class="btn-print" data-print="${o._id}">🖨️ Drucken</button>`;
  if (o.status === 'neu') {
    actionsHtml += `<button class="btn-accept" data-accept="${o._id}">Annehmen</button>`;
  } else if (o.status === 'in_zubereitung') {
    actionsHtml += `<button class="btn-ready" data-ready="${o._id}">Fertig</button>`;
  } else if (o.status === 'fertig') {
    actionsHtml += `<button class="btn-done" data-done="${o._id}">Abgeholt</button>`;
  }

  return `
    <article class="order-card status-${o.status}">
      <div class="order-card-header">
        <span class="order-number">#${o.orderNumber} ${o.status === 'neu' ? '<span class="order-new-tag">Neu</span>' : ''}</span>
        <span class="order-time">${fmtTime(o.createdAt)}</span>
      </div>
      <div class="order-items">${itemsHtml}</div>
      <div class="order-payment">${paymentLabel(o.paymentMethod)}</div>
      <div class="order-total"><span>Summe</span><span>${fmt(o.subtotal)}</span></div>
      <div class="order-actions">${actionsHtml}</div>
    </article>
  `;
}

// ---------- AKTIONEN ----------
async function setStatus(orderId, status) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const updated = await res.json();
    const idx = orders.findIndex((o) => o._id === updated._id);
    if (idx !== -1) orders[idx] = updated;
    renderAll();
  } catch (err) {
    alert('Status konnte nicht geändert werden.');
  }
}

function printOrder(orderId) {
  const o = orders.find((x) => x._id === orderId);
  if (!o) return;

  const itemsText = o.items
    .map((item) => {
      const optsText = (item.selectedOptions || []).map((g) => `  ${g.groupName}: ${g.labels.join(', ')}`).join('\n');
      return `${item.quantity}x ${item.name}\n${optsText}`;
    })
    .join('\n\n');

  document.getElementById('printArea').innerHTML = `
    <div style="text-align:center; font-weight:bold; font-size:16px;">BESTELLUNG</div>
    <div style="text-align:center; font-size:22px; font-weight:bold; margin:6px 0;">#${o.orderNumber}</div>
    <div style="text-align:center; font-size:12px; margin-bottom:10px;">${new Date(o.createdAt).toLocaleString('de-AT')}</div>
    <div style="border-top:1px dashed #000; margin:8px 0;"></div>
    <pre style="white-space:pre-wrap; font-size:13px;">${itemsText}</pre>
    <div style="border-top:1px dashed #000; margin:8px 0;"></div>
    <div style="font-weight:bold;">Summe: ${fmt(o.subtotal)}</div>
    <div style="font-size:12px; margin-top:4px;">${paymentLabel(o.paymentMethod)}</div>
  `;
  window.print();
}

//
document.getElementById('testSoundBtn').addEventListener('click', playNotificationSound);

// Produktverwaltung
let products = [];

async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    products = await res.json();
    renderProducts();
  } catch (err) {
    document.getElementById('productsList').innerHTML = '<p class="empty">Produkte konnten nicht geladen werden.</p>';
  }
}

function renderProducts() {
  const el = document.getElementById('productsList');

  if (products.length === 0) {
    el.innerHTML = '<p class="empty">Noch keine Produkte angelegt.</p>';
    return;
  }

  el.innerHTML = products.map(p => `
  <div class="product-row"></div>
       <span class="emoji">${p.emoji}</span>
       <div class="product-row-info">
       <div class="name">${p.name}</div>
       <div class="meta">${p.category}</div>
</div>
<span class="products-row-price">${fmt(p.basePrice)}</span>
<div class="product-row-actions">
                <button class="btn-edit" data-edit="${p._id}">Bearbeiten</button>
                <button class="btn-delete" data-delete="${p._id}">Löschen</button>
</div>
  </div>
    \`).join('');
    
        el.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', () => deleteProduct(btn.dataset.delete));
    });
    el.querySelectorAll('[data-edit]').forEach(btn => {
        btn.addEventListener('click', () => {
            alert('Bearbeiten kommt im nächsten Schritt!'); // ← TODO Schritt 3
        });
    });
}

async function deleteProduct(id) {
    const product = products.find(p => p._id === id);
    if (!confirm(\`"${product.name}" wirklich löschen?\`)) return; // einfache Sicherheitsabfrage

    try {
        await fetch(\`/api/products/${id}\`, { method: 'DELETE' });
        loadProducts(); // Liste danach neu laden
    } catch (err) {
        alert('Produkt konnte nicht gelöscht werden.');
    }
}

document.getElementById('addProductBtn').addEventListener('click', () => {
    alert('Neues Produkt anlegen kommt im nächsten Schritt!'); // ← TODO Schritt 3
});
       
`)
}

init();
