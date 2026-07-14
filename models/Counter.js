const mongoose = require('mongoose');

// _id = Datum als String (z.B. "2026-07-12"), value = letzte vergebene Bestellnummer
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  value: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', CounterSchema);

// Liefert die naechste Bestellnummer fuer den heutigen Tag (atomar, kein Race Condition)
async function getNextOrderNumber() {
  const dateKey = new Date().toISOString().slice(0, 10); // "2026-07-12"
  const counter = await Counter.findByIdAndUpdate(
    dateKey,
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return { orderNumber: counter.value, dateKey };
}

module.exports = { Counter, getNextOrderNumber };
