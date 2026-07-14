require('dotenv').config();
const connectDB = require('./config/db');
const Product = require('./models/Product');

const fleischGruppe = {
  name: 'Fleisch',
  type: 'single',
  required: true,
  choices: [
    { label: 'Kalb', priceModifier: 0 },
    { label: 'Huhn', priceModifier: 0 },
    { label: 'Gemischt', priceModifier: 0 }
  ]
};

const salatGruppe = {
  name: 'Salat',
  type: 'multi',
  required: false,
  choices: [
    { label: 'Zwiebeln', priceModifier: 0 },
    { label: 'Tomaten', priceModifier: 0 },
    { label: 'Gurken', priceModifier: 0 },
    { label: 'Krautsalat', priceModifier: 0 }
  ]
};

const sauceGruppe = {
  name: 'Sauce',
  type: 'single',
  required: true,
  choices: [
    { label: 'Knoblauch', priceModifier: 0 },
    { label: 'Cocktail', priceModifier: 0 },
    { label: 'Scharf', priceModifier: 0 },
    { label: 'Joghurt', priceModifier: 0 }
  ]
};

const extrasGruppeKebap = {
  name: 'Extras',
  type: 'multi',
  required: false,
  choices: [
    { label: 'Schafkäse', priceModifier: 0.6 },
    { label: 'Extra Fleisch', priceModifier: 2.0 }
  ]
};

const pizzaGroesse = {
  name: 'Größe',
  type: 'single',
  required: true,
  choices: [
    { label: '26cm', priceModifier: 0 },
    { label: '32cm', priceModifier: 3.0 },
    { label: '40cm', priceModifier: 6.5 }
  ]
};

const pizzaExtras = {
  name: 'Extra Toppings',
  type: 'multi',
  required: false,
  choices: [
    { label: 'Extra Käse', priceModifier: 1.5 },
    { label: 'Champignons', priceModifier: 1.0 },
    { label: 'Peperoni', priceModifier: 1.0 },
    { label: 'Oliven', priceModifier: 1.0 }
  ]
};

const burgerExtras = {
  name: 'Extras',
  type: 'multi',
  required: false,
  choices: [
    { label: 'Extra Käse', priceModifier: 1.0 },
    { label: 'Bacon', priceModifier: 1.5 },
    { label: 'Extra Patty', priceModifier: 2.5 }
  ]
};

const products = [
  // Kebap & Dürüm
  {
    name: 'Döner Kebap',
    category: 'Kebap & Dürüm',
    description: 'Im Fladenbrot mit frischem Salat und Sauce nach Wahl',
    basePrice: 5.9,
    emoji: '🥙',
    popular: true,
    sortOrder: 1,
    optionGroups: [fleischGruppe, salatGruppe, sauceGruppe, extrasGruppeKebap]
  },
  {
    name: 'Dürüm',
    category: 'Kebap & Dürüm',
    description: 'Im dünnen Yufka-Fladen gerollt',
    basePrice: 6.4,
    emoji: '🌯',
    sortOrder: 2,
    optionGroups: [fleischGruppe, salatGruppe, sauceGruppe, extrasGruppeKebap]
  },
  {
    name: 'Pizza Kebap',
    category: 'Kebap & Dürüm',
    description: 'Pizza-Boden mit Döner-Fleisch belegt',
    basePrice: 8.9,
    emoji: '🍕',
    sortOrder: 3,
    optionGroups: [fleischGruppe, extrasGruppeKebap]
  },

  // Pizza
  {
    name: 'Pizza Margherita',
    category: 'Pizza',
    description: 'Tomatensauce, Mozzarella, Basilikum',
    basePrice: 6.9,
    emoji: '🍕',
    popular: true,
    sortOrder: 1,
    optionGroups: [pizzaGroesse, pizzaExtras]
  },
  {
    name: 'Pizza Salami',
    category: 'Pizza',
    description: 'Tomatensauce, Mozzarella, Salami',
    basePrice: 7.9,
    emoji: '🍕',
    sortOrder: 2,
    optionGroups: [pizzaGroesse, pizzaExtras]
  },

  // Hauptgerichte
  {
    name: 'Gemischter Grillteller',
    category: 'Hauptgerichte',
    description: 'Mit Reis, Salat und Sauce nach Wahl',
    basePrice: 12.9,
    emoji: '🍖',
    sortOrder: 1,
    optionGroups: [sauceGruppe]
  },

  // Salate
  {
    name: 'Hirtensalat',
    category: 'Salate',
    description: 'Tomaten, Gurken, Zwiebeln, Schafkäse',
    basePrice: 6.5,
    emoji: '🥗',
    sortOrder: 1,
    optionGroups: []
  },

  // Burger
  {
    name: 'Cheeseburger',
    category: 'Burger',
    description: 'Rindfleisch-Patty, Cheddar, Salat, Tomate',
    basePrice: 7.5,
    emoji: '🍔',
    sortOrder: 1,
    optionGroups: [burgerExtras]
  },

  // Beilagen
  {
    name: 'Pommes Frites',
    category: 'Beilagen',
    description: '',
    basePrice: 3.5,
    emoji: '🍟',
    sortOrder: 1,
    optionGroups: [
      {
        name: 'Größe',
        type: 'single',
        required: true,
        choices: [
          { label: 'Klein', priceModifier: 0 },
          { label: 'Groß', priceModifier: 1.2 }
        ]
      }
    ]
  },

  // Getränke
  {
    name: 'Coca-Cola 0,5l',
    category: 'Getränke',
    description: '',
    basePrice: 2.5,
    emoji: '🥤',
    sortOrder: 1,
    optionGroups: []
  },
  {
    name: 'Ayran 0,25l',
    category: 'Getränke',
    description: '',
    basePrice: 2.0,
    emoji: '🥛',
    sortOrder: 2,
    optionGroups: []
  },
  {
    name: 'Fanta 0,5l',
    category: 'Getränke',
    description: '',
    basePrice: 2.5,
    emoji: '🧃',
    sortOrder: 3,
    optionGroups: []
  }
];

async function seed() {
  await connectDB();
  await Product.deleteMany({});
  await Product.insertMany(products);
  console.log(`✅ ${products.length} Produkte eingefügt.`);
  process.exit(0);
}

seed();
