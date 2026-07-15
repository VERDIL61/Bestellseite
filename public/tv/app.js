let orders = [];

async function init() {
    try {
        const res = await fetch("/api/orders"); //ohne status= -> alle heutigen Bestellungen
        orders = await res.json();
    } catch (error) {
        console.error('Bestellungen konnten nicht geladen werden', error);
    }
    render();
    connectSocket();
}

function connectSocket() {
    const socket = io();
    socket.on("connect", () => socket.emit('join', 'tv'));

    socket.on('order-updated', (updated) => {
        const idx = orders.findIndex(o => o._id === updated._id);
        if (idx !== -1) {
            orders[idx] = updated; // bestehende Bestellung aktualisieren
        } else {
            orders.unshift(updated); // falls neu, vorne einfügen
        }
        render();
    });
}

function render() {
    const ready = orders.filter(o => o.status === 'fertig');
    const preaparing = orders.filter(o => o.status === 'in_zubereitung');

    document.getElementById('readyNumbers').innerHTML = ready
        .map(o => `<span class="tv-number">#${o.orderNumber}</span>`)
        .join('');

    document.getElementById('preparingNumbers').innerHTML = preaparing
        .map(o => `<span class="tv-number">#${o.orderNumber}</span>`)
    .join('');
}

init();