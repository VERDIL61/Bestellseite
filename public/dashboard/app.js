let orders = []; // alle heutigen Bestellungen
let currentView = 'neu'; // "neu" | "in_zubereitung" | "fertig" | "alle"
let selectedPaymentMethod = null;

const fmt = (n) => n.toFixed(2).replace('.', ',') + ' €';
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });

const statusLabels = { neu: 'Neue Bestellungen', in_zubereitung: 'In Zubereitung', fertig: 'Fertig', alle: 'Alle Bestellungen', produkte: 'Produkte verwalten', statistik: 'Statistik' };

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
  closeProductForm();   // schließt sich beim jedem Tab-Wechsel
  currentView = view;
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.getElementById('viewTitle').textContent = statusLabels[view];
  document.getElementById('addProductIconBtn').classList.toggle('hidden', view !== 'produkte');

  // Alle drei Hauptbereiche erst verstecken
    document.getElementById('ordersGrid').classList.add('hidden');
    document.getElementById('productsView').classList.add('hidden');
    document.getElementById('statsView').classList.add('hidden');

    if (view === 'produkte') {
        document.getElementById('productsView').classList.remove('hidden');
        loadProducts();
    } else if (view === 'statistik') {
        document.getElementById('statsView').classList.remove('hidden');
        loadStats('heute');
    } else {
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

    const diningLabel = o.diningOption === 'vor_ort' ? '🍽️ Im Lokal' : '🥡 Zum Mitnehmen';
  return `
    <article class="order-card status-${o.status}">
      <div class="order-card-header">
        <span class="order-number">#${o.orderNumber} ${o.status === 'neu' ? '<span class="order-new-tag">Neu</span>' : ''}</span>
        <span class="order-time">${fmtTime(o.createdAt)}</span>
      </div>
      <div class="order-items">${itemsHtml}</div>
      <div class="order-payment">${diningLabel} · ${paymentLabel(o.paymentMethod)}</div>
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

// Klick Button für Produkt einfügen/Bearbeiten
document.getElementById('fileUploadBtn').addEventListener('click', () => {
    document.getElementById('pfImageFile').click();
});

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

// Liest eine Bilddatei ein, verkleinert sie auf max. 400px und gibt Base64 zurück
function readAndResizeImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const maxSize = 400;
                let {width, height} = img;

                // Seitenverhältnis beibehalten, größere Seite auf maxSize begrenzen
                if (width > height && width > maxSize) {
                    height = height * (maxSize / width);
                    width = maxSize;
                } else if (height > maxSize) {
                    width = width * (maxSize / height);
                    height = maxSize;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);

                // als JPEG mit 80% Qualität > kleiner als PNG
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

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

    // Produkte nach Kategorie gruppieren: { "Getränke": [...], "Burger": [...] }
    const grouped = {};
    products.forEach((p) => {
        if (!grouped[p.category]) grouped[p.category] = [];
        grouped[p.category].push(p);
    });

    // Kategorien alphabetisch sortiert durchgehen und je eine Gruppe rendern
    const categoriesSorted = Object.keys(grouped).sort();

    el.innerHTML = categoriesSorted.map((category) => {
        const rowsHtml = grouped[category].map((p) => `
            <div class="product-row ${!p.active ? 'sold-out' : ''}">
                ${p.imageData ? `<img class="product-img" src="${p.imageData}" alt="" />` : `<span class="emoji">${p.emoji}</span>`}
                <div class="product-row-info">
                    <div class="name">${p.name} ${!p.active ? '<span class="sold-out-tag">Ausverkauft</span>' : ''}</div>
                    <div class="meta">${p.category}</div>
                </div>
                <span class="product-row-price">${fmt(p.basePrice)}</span>
                <div class="product-row-actions">
                    <button class="btn-availability" data-availability="${p._id}">${p.active ? 'Als ausverkauft markieren' : 'Wieder verfügbar'}</button>
                    <button class="btn-edit" data-edit="${p._id}">Bearbeiten</button>
                    <button class="btn-delete" data-delete="${p._id}">Löschen</button>
                </div>
            </div>
        `).join('');

        return `
            <div class="category-group">
                <h3 class="category-heading">${category} <span class="category-count">${grouped[category].length}</span></h3>
                ${rowsHtml}
            </div>
        `;
    }).join('');

    // Event-Listener (wie gehabt)
    el.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', () => deleteProduct(btn.dataset.delete));
    });
    el.querySelectorAll('[data-edit]').forEach(btn => {
        btn.addEventListener('click', () => {
            const product = products.find(p => p._id === btn.dataset.edit);
            openProductForm(product);
        });
    });
    el.querySelectorAll('[data-availability]').forEach(btn => {
        btn.addEventListener('click', () => toggleAvailability(btn.dataset.availability));
    });
}

async function deleteProduct(id) {
    const product = products.find(p => p._id === id);
    if (!confirm(`"${product.name}" wirklich löschen`)) return; // einfache Sicherheitsabfrage

    try {
        const res = await fetch(`/api/products/${id}`, {
          method: 'DELETE'
        });
        if (!res.ok){
            alert('Produkt konnte nicht gelöscht werden (nicht angemeldet?).');
            return;
        }
        loadProducts(); // Liste danach neu laden
    } catch (err) {
        alert('Produkt konnte nicht gelöscht werden.');
    }
}

async function toggleAvailability(id) {
    const product = products.find(p => p._id === id);

    try {
        const res = await fetch(`/api/products/${id}/availability`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: !product.active })   // umdrehen: verfügbar <-> ausverkauft
        });
        if (!res.ok) {
            alert('Verfügbarkeit konnte nicht geändert werden (nicht angemeldet?).');
            return;
        }
        loadProducts();   // Liste neu laden, Button-Text und Markierung aktualisieren sich
    } catch (err) {
        alert('Verfügbarkeit konnte nicht geändert werden.');
    }
}

let editingProductId = null; // null = neues Produkt, sonst die ID des bearbeiteten Produkts
let currentImageData = ''; // Base64-Bild von gerade bearbeiteten Produkts
let currentOptionGroups = []; // die Options-Gruppen des gerade geöffneten Formulars

function renderOptionGroupsEditor() {
  const el = document.getElementById('optionGroupsList');

  el.innerHTML = currentOptionGroups.map((group, gIdx) => `
  <div class="option-group-card">
    <div class="option-group-card-header">
    <input type="text" placeholder="Name (z.B. Fleisch)" value="${group.name}" data-group-name="${gIdx}" />
    <select data-group-type="${gIdx}">
    <option value="single" ${group.type === 'single' ? 'selected' : ''}>Einzelauswahl</option>
                    <option value="multi" ${group.type === 'multi' ? 'selected' : ''}>Mehrfachauswahl</option>
                </select>
                <button type="button" data-remove-group="${gIdx}">✕</button>
            </div>
            <label class="option-group-required">
                <input type="checkbox" ${group.required ? 'checked' : ''} data-group-required="${gIdx}" />
                Pflichtfeld
            </label>
            ${group.choices.map((choice, cIdx) => `
                <div class="choice-row">
                    <input type="text" placeholder="Bezeichnung" value="${choice.label}" data-choice-label="${gIdx}-${cIdx}" />
                    <input type="number" step="0.10" placeholder="Aufpreis €" value="${choice.priceModifier}" data-choice-price="${gIdx}-${cIdx}" />
                    <button type="button" data-remove-choice="${gIdx}-${cIdx}">✕</button>
                </div>
            `).join('')}
            <button type="button" class="btn-add-choice" data-add-choice="${gIdx}">+ Auswahl hinzufügen</button>
        </div>
    `).join('');

// Texteingaben: Wert NUR im Array aktualisieren, KEIN renderOptionGroupsEditor() aufrufen!
    // Sonst verliert das Feld beim Tippen sofort den Fokus.
    el.querySelectorAll('[data-group-name]').forEach(input => {
        input.addEventListener('input', () => {
            currentOptionGroups[input.dataset.groupName].name = input.value;
        });
    });
    el.querySelectorAll('[data-group-type]').forEach(select => {
        select.addEventListener('change', () => {
            currentOptionGroups[select.dataset.groupType].type = select.value;
        });
    });
    el.querySelectorAll('[data-group-required]').forEach(cb => {
        cb.addEventListener('change', () => {
            currentOptionGroups[cb.dataset.groupRequired].required = cb.checked;
        });
    });
    el.querySelectorAll('[data-choice-label]').forEach(input => {
        input.addEventListener('input', () => {
            const [gIdx, cIdx] = input.dataset.choiceLabel.split('-');
            currentOptionGroups[gIdx].choices[cIdx].label = input.value;
        });
    });
    el.querySelectorAll('[data-choice-price]').forEach(input => {
        input.addEventListener('input', () => {
            const [gIdx, cIdx] = input.dataset.choicePrice.split('-');
            currentOptionGroups[gIdx].choices[cIdx].priceModifier = Number(input.value) || 0;
        });
    });

    // Strukturelle Aenderungen (Gruppe/Auswahl hinzufuegen oder entfernen): HIER wird neu gerendert
    el.querySelectorAll('[data-remove-group]').forEach(btn => {
        btn.addEventListener('click', () => {
            currentOptionGroups.splice(btn.dataset.removeGroup, 1);
            renderOptionGroupsEditor();
        });
    });
    el.querySelectorAll('[data-add-choice]').forEach(btn => {
        btn.addEventListener('click', () => {
            currentOptionGroups[btn.dataset.addChoice].choices.push({ label: '', priceModifier: 0 });
            renderOptionGroupsEditor();
        });
    });
    el.querySelectorAll('[data-remove-choice]').forEach(btn => {
        btn.addEventListener('click', () => {
            const [gIdx, cIdx] = btn.dataset.removeChoice.split('-');
            currentOptionGroups[gIdx].choices.splice(cIdx, 1);
            renderOptionGroupsEditor();
        });
    });
}

document.getElementById('addGroupBtn').addEventListener('click', () => {
    currentOptionGroups.push({ name: '', type: 'single', required: false, choices: [] });
    renderOptionGroupsEditor();
});

// Datei Auswahl-Handler
document.getElementById('pfImageFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        currentImageData = await readAndResizeImage(file);
        document.getElementById('imagePreview').innerHTML = `<img src="${currentImageData}" alt="Vorschau" />`;
    } catch (err) {
        alert('Bild konnte nicht verarbeitet werden.');
    }
});

function updateCategoryDatalist() {
  const categories = [...new Set(products.map(p => p.category))];
  document.getElementById('categoryOptions').innerHTML = categories.map(c => `<option value="${c}"></option>`).join('');
}

function openProductForm(product) {
  editingProductId = product ? product._id : null;
  document.getElementById('productFormTitle').textContent = product ? 'Produkt bearbeiten' : 'Neues Produkt';

  document.getElementById('pfName').value = product ? product.name : '';
  document.getElementById('pfCategory').value = product ? product.category : '';
  document.getElementById('pfDescription').value = product ? product.description : '';
  document.getElementById('pfBasePrice').value = product ? product.basePrice : '';
  document.getElementById('pfEmoji').value = product ? product.emoji : '';
  document.getElementById('pfPopular').checked = product ? product.popular : false;

  // Bild laden oder bei neuem Produkt leer
    currentImageData = product ? (product.imageData || ''): '';
    document.getElementById('pfImageFile').value = ''; // Datei Auswahl zurücksetzen
    document.getElementById('imagePreview').innerHTML = currentImageData
        ? `<img src="${currentImageData}" alt="Vorschau" />`
        : '';

  // Änderungen im Formular dürfen nicht sofort das Original in "products" verändern,
  // bevor "Speichern" geklickt wurde
  currentOptionGroups = product ? JSON.parse(JSON.stringify(product.optionGroups)) : [];
  renderOptionGroupsEditor();


  updateCategoryDatalist();
  document.getElementById('productFormOverlay').classList.remove('hidden');
}

function closeProductForm() {
  document.getElementById('productFormOverlay').classList.add('hidden');
}

document.getElementById('productFormClose').addEventListener('click', closeProductForm);
document.getElementById('productFormCancel').addEventListener('click', closeProductForm);

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault(); // verhindert, dass der Browser die Seite neu lädt (Standard-Verhalten von <form>)

  const payload = {
    name: document.getElementById('pfName').value,
    category: document.getElementById('pfCategory').value,
    description: document.getElementById('pfDescription').value,
    basePrice: Number(document.getElementById('pfBasePrice').value),
    emoji: document.getElementById('pfEmoji').value || '🍽️',
    popular: document.getElementById('pfPopular').checked,
    imageData: currentImageData,
    optionGroups: currentOptionGroups
  };

  // Fehler sichtbar machen
  try {
    const url = editingProductId ? `/api/products/${editingProductId}`: `/api/products`;
    const method = editingProductId ? `PUT` : 'POST';

    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Produkt konnte nicht gespeichert werden.');
        return;
    }

    closeProductForm();
    loadProducts();
  } catch (err) {
    alert('Produkt konnte nicht gespeichert werden.');
  }
});
//------------------------------------------------------

document.getElementById('addProductIconBtn').addEventListener('click', () => {
    openProductForm(null);
});

// Login
async function checkAuth() {
    try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();
        return data.isAdmin;
    } catch (err) {
        return false;
    }
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = '';

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (!res.ok) {
            errorEl.textContent = 'Falsches Passwort.';
            return;
        }

        document.getElementById('loginPassword').value = '';
        document.getElementById('loginOverlay').classList.add('hidden');
        init(); // erst Nach erfolgreichem Login das Dashboard starten
    } catch (err) {
        errorEl.textContent = 'Verbindung zum Server fehlgeschlagen';
    }
});

document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    await fetch('/api/auth/logout', { method: 'POST' });
    location.reload();
});

// ---------- PASSWORT ÄNDERN ----------
document.getElementById('changePasswordBtn').addEventListener('click', () => {
    document.getElementById('passwordForm').reset();
    document.getElementById('passwordFormError').textContent = '';
    document.getElementById('passwordFormOverlay').classList.remove('hidden');
});

document.getElementById('passwordFormClose').addEventListener('click', () => {
    document.getElementById('passwordFormOverlay').classList.add('hidden');
});
document.getElementById('passwordFormCancel').addEventListener('click', () => {
    document.getElementById('passwordFormOverlay').classList.add('hidden');
});

document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPasswordInput').value;
    const newPassword = document.getElementById('newPasswordInput').value;
    const confirmPassword = document.getElementById('confirmPasswordInput').value;
    const errorEl = document.getElementById('passwordFormError');
    errorEl.textContent = '';

    if (newPassword !== confirmPassword) {
        errorEl.textContent = 'Die neuen Passwörter stimmen nicht überein.';
        return;
    }

    try {
        const res = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            errorEl.textContent = data.error || 'Passwort konnte nicht geändert werden.';
            return;
        }

        document.getElementById('passwordFormOverlay').classList.add('hidden');
        alert('Passwort erfolgreich geändert.');
    } catch (err) {
        errorEl.textContent = 'Verbindung zum Server fehlgeschlagen.';
    }
});

// --- Statistik ---
let revenueChart = null; // merkt sich das Chart-Objekt, um es beim Neuladen zu zerstören

async function loadStats(range) {
    // aktiven Zeitraum Button markieren
    document.querySelectorAll('.range-btn').forEach((b) => b.classList.toggle('active', b.dataset.range === range));

    try {
        const res = await fetch(`/api/stats?range=${range}`);
        if (!res.ok) return;
        const data = await res.json();
        renderStats(data);
    } catch (err) {
        console.error('Statistik konnte nicht geladen werden', err);
    }
}

function renderStats(data) {
        document.getElementById('statRevenue').textContent = fmt(data.revenue);
        document.getElementById('statOrders').textContent = data.orderCount;

        // Top-Produkte
    const topEl = document.getElementById('topProductsList');
    if (data.topProducts.length === 0) {
        topEl.innerHTML = '<p class="empty">Noch keine Verkäufe in diesem Zeitraum.</p>';
    } else {
        topEl.innerHTML = data.topProducts.map((p, i) => `
            <div class="top-product-row">
                <span class="top-product-rank">${i + 1}</span>
                <span class="top-product-name">${p.name}</span>
                <span class="top-product-count">${p.count}x</span>
            </div>
        `).join('');
    }

    // Balkendiagramm
    renderChart(data.chartData);
}

function renderChart(chartData) {
        const ctx = document.getElementById('revenueChart');

        // altes Chart zerstören, sonst überlagern sie sich beim Umschalten
    if (revenueChart) revenueChart.destroy();

    revenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.map((d) => d.day),
            datasets: [{
                label: 'Umsatz (€)',
                data: chartData.map((d) => d.total),
                backgroundColor: '#d1471f',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// Zeitraum Buttons
    document.querySelectorAll('.range-btn').forEach((btn) => {
        btn.addEventListener('click', () => loadStats(btn.dataset.range));
    });

// beim Laden prüfen ob die Session noch gültig ist
checkAuth().then((isAdmin) => {
    if (isAdmin) {
        document.getElementById('loginOverlay').classList.add('hidden');
        init();
    }
})