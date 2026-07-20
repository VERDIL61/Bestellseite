const READY_TIMEOUT_MS = 15 * 60 * 1000; // 15 Min. - danach verschwindet eine "Fertig"-Bestellung automatisch

let orders = [];

async function init() {
    try {
        const res = await fetch("/api/orders");
        orders = await res.json();
    } catch (error) {
        console.error('Bestellungen konnten nicht geladen werden', error);
    }
    render();
    connectSocket();
    setInterval(render, 30000); // alle 30s neu prüfen, ob "Fertig"-Einträge ausgeblendet werden sollen
}

function connectSocket() {
    const socket = io();
    const statusEl = document.getElementById('connectionStatus');

    socket.on("connect", () => {
        socket.emit('join', 'tv');
        statusEl.textContent = '● live verbunden';
        statusEl.classList.add('online');
    });

    socket.on('disconnect', () => {
        statusEl.textContent = '● getrennt';
        statusEl.classList.remove('online');
    });

    socket.on('order-updated', (updated) => {
        const idx = orders.findIndex(o => o._id === updated._id);
        if (idx !== -1) {
            orders[idx] = updated;
        } else {
            orders.unshift(updated);
        }
        render();
    });
}

function render() {
    const now = Date.now();

    const preparing = orders.filter(o => o.status === 'in_zubereitung');

    // Nur "Fertig"-Bestellungen zeigen, die vor weniger als READY_TIMEOUT_MS zuletzt geändert wurden
    const ready = orders.filter(o => {
        if (o.status !== 'fertig') return false;
        const age = now - new Date(o.updatedAt).getTime();
        return age < READY_TIMEOUT_MS;
    });

    document.getElementById('readyNumbers').innerHTML = ready.length
        ? ready.map(o => `<span class="tv-number">#${o.orderNumber}</span>`).join('')
        : '<p class="tv-empty">Gerade keine Bestellungen fertig</p>';

    document.getElementById('preparingNumbers').innerHTML = preparing.length
        ? preparing.map(o => `<span class="tv-number">#${o.orderNumber}</span>`).join('')
        : '<p class="tv-empty">Gerade wird nichts zubereitet</p>';
}

init();