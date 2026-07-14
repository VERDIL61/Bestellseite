// ---------- STATE ----------
let products = [];
let categories = [];
let activeCategory = null;
let cart = []; // [{ productId, name, emoji, unitPrice, quantity, selectedOptions: [{groupName, labels}] }]

let currentProduct = null;
let currentSelections = {}; // { groupName: [label, ...] }
let currentQty = 1;

let selectedPaymentMethod = null;

const fmt = (n) => n.toFixed(2).replace('.', ',') + ' €';

// ---------- INIT ----------
async function init() {
  try {
    const res = await fetch('/api/products');
    products = await res.json();
  } catch (err) {
    document.getElementById('menu').innerHTML = '<p class="loading">Speisekarte konnte nicht geladen werden. Läuft der Server?</p>';
    return;
  }

  categories = [...new Set(products.map((p) => p.category))];
  activeCategory = categories[0] || null;

  renderCategories();
  renderMenu();
  bindStaticEvents();
}

// ---------- KATEGORIEN & MENU ----------
function renderCategories() {
  const el = document.getElementById('categoryTabs');
  el.innerHTML = categories
    .map((c) => `<button class="category-chip ${c === activeCategory ? 'active' : ''}" data-cat="${c}">${c}</button>`)
    .join('');
  el.querySelectorAll('.category-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      renderCategories();
      renderMenu();
    });
  });
}

function renderMenu() {
  const el = document.getElementById('menu');
  const items = products.filter((p) => p.category === activeCategory);

  if (items.length === 0) {
    el.innerHTML = '<p class="loading">Keine Produkte in dieser Kategorie.</p>';
    return;
  }

  el.innerHTML = items
    .map(
      (p) => `
      <article class="product-card" data-id="${p._id}">
        ${p.popular ? '<span class="popular-badge">Beliebt</span>' : ''}
        <span class="emoji">${p.emoji}</span>
        <span class="name">${p.name}</span>
        <span class="price">ab ${fmt(p.basePrice)}</span>
      </article>`
    )
    .join('');

  el.querySelectorAll('.product-card').forEach((card) => {
    card.addEventListener('click', () => openProduct(card.dataset.id));
  });
}

// ---------- PRODUKT KONFIGURATION ----------
function openProduct(id) {
  currentProduct = products.find((p) => p._id === id);
  if (!currentProduct) return;

  currentSelections = {};
  currentQty = 1;

  // Standardwerte für "single"-Gruppen: erste Option vorauswählen
  currentProduct.optionGroups.forEach((g) => {
    if (g.type === 'single') {
      currentSelections[g.name] = [g.choices[0]?.label].filter(Boolean);
    } else {
      currentSelections[g.name] = [];
    }
  });

  renderProductSheet();
  document.getElementById('qtyValue').textContent = currentQty;
  document.getElementById('productOverlay').classList.remove('hidden');
}

function renderProductSheet() {
  const p = currentProduct;
  const body = document.getElementById('productBody');

  const groupsHtml = p.optionGroups
    .map((g) => {
      const choicesHtml = g.choices
        .map((c) => {
          const selected = (currentSelections[g.name] || []).includes(c.label);
          return `<button class="option-choice ${selected ? 'selected' : ''}" data-group="${g.name}" data-label="${c.label}" data-type="${g.type}">
            ${c.label}${c.priceModifier ? `<span class="mod">+${fmt(c.priceModifier)}</span>` : ''}
          </button>`;
        })
        .join('');
      return `
        <div class="option-group">
          <h3>${g.name} ${g.required ? '<span class="req">*</span>' : ''}</h3>
          <div class="option-choices">${choicesHtml}</div>
        </div>`;
    })
    .join('');

  body.innerHTML = `
    <div class="product-hero">
      <span class="emoji">${p.emoji}</span>
      <div>
        <h2>${p.name}</h2>
        <span class="base-price">${fmt(p.basePrice)}</span>
      </div>
    </div>
    ${p.description ? `<p class="product-desc">${p.description}</p>` : ''}
    ${groupsHtml}
  `;

  body.querySelectorAll('.option-choice').forEach((btn) => {
    btn.addEventListener('click', () => {
      const { group, label, type } = btn.dataset;
      if (type === 'single') {
        currentSelections[group] = [label];
      } else {
        const arr = currentSelections[group] || [];
        currentSelections[group] = arr.includes(label) ? arr.filter((l) => l !== label) : [...arr, label];
      }
      renderProductSheet();
      updateAddToCartPrice();
    });
  });

  updateAddToCartPrice();
}

function computeUnitPrice() {
  let price = currentProduct.basePrice;
  currentProduct.optionGroups.forEach((g) => {
    (currentSelections[g.name] || []).forEach((label) => {
      const choice = g.choices.find((c) => c.label === label);
      if (choice) price += choice.priceModifier;
    });
  });
  return price;
}

function updateAddToCartPrice() {
  const unit = computeUnitPrice();
  document.getElementById('addToCartPrice').textContent = fmt(unit * currentQty);

  // Pflichtfelder prüfen
  const missingRequired = currentProduct.optionGroups.some(
    (g) => g.required && (currentSelections[g.name] || []).length === 0
  );
  document.getElementById('addToCartBtn').disabled = missingRequired;
}

function bindStaticEvents() {
  document.getElementById('qtyMinus').addEventListener('click', () => {
    currentQty = Math.max(1, currentQty - 1);
    document.getElementById('qtyValue').textContent = currentQty;
    updateAddToCartPrice();
  });
  document.getElementById('qtyPlus').addEventListener('click', () => {
    currentQty += 1;
    document.getElementById('qtyValue').textContent = currentQty;
    updateAddToCartPrice();
  });

  document.getElementById('productClose').addEventListener('click', () => {
    document.getElementById('productOverlay').classList.add('hidden');
  });

  document.getElementById('addToCartBtn').addEventListener('click', addToCart);

  // Warenkorb
  document.getElementById('cartBar').addEventListener('click', openCart);
  document.getElementById('cartClose').addEventListener('click', () => {
    document.getElementById('cartOverlay').classList.add('hidden');
  });
  document.getElementById('toCheckoutBtn').addEventListener('click', openCheckout);

  // Checkout
  document.getElementById('checkoutClose').addEventListener('click', () => {
    document.getElementById('checkoutOverlay').classList.add('hidden');
  });
  document.querySelectorAll('.pay-option').forEach((btn) => {
    btn.addEventListener('click', () => selectPaymentMethod(btn.dataset.method, btn));
  });
  document.getElementById('placeOrderBtn').addEventListener('click', placeOrder);

  document.getElementById('newOrderBtn').addEventListener('click', resetForNewOrder);
}

// ---------- WARENKORB ----------
function addToCart() {
  const unitPrice = computeUnitPrice();
  const selectedOptions = currentProduct.optionGroups
    .filter((g) => (currentSelections[g.name] || []).length > 0)
    .map((g) => ({ groupName: g.name, labels: currentSelections[g.name] }));

  cart.push({
    productId: currentProduct._id,
    name: currentProduct.name,
    emoji: currentProduct.emoji,
    unitPrice,
    quantity: currentQty,
    selectedOptions
  });

  document.getElementById('productOverlay').classList.add('hidden');
  renderCartBar();
}

function cartTotal() {
  return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

function renderCartBar() {
  const bar = document.getElementById('cartBar');
  const count = cart.reduce((s, i) => s + i.quantity, 0);

  if (count === 0) {
    bar.classList.add('hidden');
    return;
  }
  bar.classList.remove('hidden');
  document.getElementById('cartBarCount').textContent = count;
  document.getElementById('cartBarTotal').textContent = fmt(cartTotal());
}

function openCart() {
  renderCartItems();
  document.getElementById('cartOverlay').classList.remove('hidden');
}

function renderCartItems() {
  const el = document.getElementById('cartItems');

  if (cart.length === 0) {
    el.innerHTML = '<p class="loading">Dein Warenkorb ist leer.</p>';
  } else {
    el.innerHTML = cart
      .map((item, idx) => {
        const optsText = item.selectedOptions.map((o) => `${o.groupName}: ${o.labels.join(', ')}`).join(' · ');
        return `
        <div class="cart-item">
          <span class="emoji">${item.emoji}</span>
          <div class="cart-item-info">
            <div class="name">${item.name}</div>
            ${optsText ? `<div class="opts">${optsText}</div>` : ''}
            <button class="cart-item-remove" data-idx="${idx}">Entfernen</button>
          </div>
          <div>
            <div class="cart-item-controls">
              <button class="qty-dec" data-idx="${idx}">–</button>
              <span>${item.quantity}</span>
              <button class="qty-inc" data-idx="${idx}">+</button>
            </div>
            <div class="cart-item-price">${fmt(item.unitPrice * item.quantity)}</div>
          </div>
        </div>`;
      })
      .join('');
  }

  document.getElementById('cartSubtotal').textContent = fmt(cartTotal());

  el.querySelectorAll('.qty-inc').forEach((b) =>
    b.addEventListener('click', () => {
      cart[b.dataset.idx].quantity += 1;
      renderCartItems();
      renderCartBar();
    })
  );
  el.querySelectorAll('.qty-dec').forEach((b) =>
    b.addEventListener('click', () => {
      const idx = b.dataset.idx;
      cart[idx].quantity -= 1;
      if (cart[idx].quantity <= 0) cart.splice(idx, 1);
      renderCartItems();
      renderCartBar();
    })
  );
  el.querySelectorAll('.cart-item-remove').forEach((b) =>
    b.addEventListener('click', () => {
      cart.splice(b.dataset.idx, 1);
      renderCartItems();
      renderCartBar();
    })
  );
}

// ---------- CHECKOUT ----------
function openCheckout() {
  if (cart.length === 0) return;
  document.getElementById('cartOverlay').classList.add('hidden');
  selectedPaymentMethod = null;
  document.querySelectorAll('.pay-option').forEach((b) => b.classList.remove('selected'));
  document.getElementById('placeOrderBtn').disabled = true;
  document.getElementById('checkoutTotal').textContent = fmt(cartTotal());
  document.getElementById('checkoutOverlay').classList.remove('hidden');
}

function selectPaymentMethod(method, btn) {
  selectedPaymentMethod = method;
  document.querySelectorAll('.pay-option').forEach((b) => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('placeOrderBtn').disabled = false;
}

async function placeOrder() {
  if (!selectedPaymentMethod || cart.length === 0) return;

  document.getElementById('checkoutOverlay').classList.add('hidden');

  // Apple Pay / Google Pay: kurze simulierte Bestaetigung anzeigen.
  // Hinweis: echte Anbindung braucht ein Payment-Gateway (z.B. Stripe) + HTTPS-Domainverifizierung.
  if (selectedPaymentMethod !== 'kassa') {
    document.getElementById('processingText').textContent =
      selectedPaymentMethod === 'apple_pay' ? 'Apple Pay wird bestätigt …' : 'Google Pay wird bestätigt …';
    document.getElementById('processingOverlay').classList.remove('hidden');
    await new Promise((r) => setTimeout(r, 1400));
    document.getElementById('processingOverlay').classList.add('hidden');
  }

  const payload = {
    items: cart.map((i) => ({
      productId: i.productId,
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      selectedOptions: i.selectedOptions
    })),
    subtotal: cartTotal(),
    paymentMethod: selectedPaymentMethod
  };

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Bestellung fehlgeschlagen');
    const order = await res.json();
    showConfirmation(order);
  } catch (err) {
    alert('Deine Bestellung konnte nicht übermittelt werden. Bitte versuche es erneut.');
  }
}

function showConfirmation(order) {
  document.getElementById('confirmNumber').textContent = '#' + order.orderNumber;
  const waitMin = 10 + order.items.reduce((s, i) => s + i.quantity, 0) * 2;
  document.getElementById('confirmWait').textContent = `${waitMin}–${waitMin + 3} Min.`;
  document.getElementById('confirmOverlay').classList.remove('hidden');
}

function resetForNewOrder() {
  cart = [];
  renderCartBar();
  document.getElementById('confirmOverlay').classList.add('hidden');
}

init();
