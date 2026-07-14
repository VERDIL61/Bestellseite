const mongoose = require('mongoose');

// Eine Auswahl-Option innerhalb einer Gruppe, z.B. { label: "Kalb", priceModifier: 0 }
const ChoiceSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    priceModifier: { type: Number, default: 0 } // Aufpreis in Euro, kann 0 sein
  },
  { _id: false }
);

// Eine Options-Gruppe, z.B. "Fleisch" (single = Radiobutton) oder "Extras" (multi = Checkbox)
const OptionGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // z.B. "Fleisch", "Sauce", "Extras"
    type: { type: String, enum: ['single', 'multi'], required: true },
    required: { type: Boolean, default: false },
    choices: { type: [ChoiceSchema], default: [] }
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true }, // z.B. "Kebap & Duerum"
    description: { type: String, default: '' },
    basePrice: { type: Number, required: true },
    emoji: { type: String, default: '🍽️' }, // Platzhalter-Icon statt Foto
    popular: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    optionGroups: { type: [OptionGroupSchema], default: [] },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', ProductSchema);
