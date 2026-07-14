const mongoose = require('mongoose');

// Ein einzelner Bestellposten (Snapshot der Konfiguration zum Bestellzeitpunkt)
const OrderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unitPrice: { type: Number, required: true }, // Grundpreis + gewaehlte Aufpreise
    selectedOptions: [
      {
        groupName: String, // z.B. "Fleisch"
        labels: [String] // z.B. ["Kalb"] oder ["Schafkaese", "Extra Fleisch"]
      }
    ]
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: Number, required: true },
    dateKey: { type: String, required: true }, // "2026-07-12" - fuer taegliche Nummerierung ab #1
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['kassa', 'apple_pay', 'google_pay'],
      required: true
    },
    status: {
      type: String,
      enum: ['neu', 'in_zubereitung', 'fertig', 'abgeholt'],
      default: 'neu'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);
