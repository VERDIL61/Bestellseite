**Stadt Kebap & Pizzeria – Bestellsystem**  
   
 Kunden-Bestellseite + Mitarbeiter-Dashboard, live über Socket.io verbunden.  
   
 **Was ist enthalten**  
- **Kunden-Bestellseite** (/): Kategorien wählen → Produkt konfigurieren (Fleisch, Salat, Sauce, Extras …) → Warenkorb → Zahlungsmethode (Kassa / Apple Pay / Google Pay) → Bestellnummer  
- **Mitarbeiter-Dashboard** (/dashboard): Neue Bestellungen kommen live an, Status ändern (Neu → In Zubereitung → Fertig → Abgeholt), Bon drucken  
- Bestellnummern zählen täglich ab #1 hoch  
 **Setup**  
   
 Voraussetzung: Node.js (>=18) und eine laufende MongoDB-Instanz.  
   
 cd doener-shop  
   
  npm install  
   
  cp .env.example .env  
   
  # .env ggf. anpassen (MONGODB_URI, PORT)  
   
    
   
 Falls du noch keine MongoDB laufen hast (Ubuntu):  
   
 sudo apt install -y mongodb  
   
  sudo systemctl start mongodb  
   
  # oder mit Docker:  
   
  docker run -d -p 27017:27017 --name mongo mongo  
   
    
   
 Beispielprodukte einspielen:  
   
 npm run seed  
   
    
   
 Server starten:  
   
 npm start  
   
    
- Kunden-Bestellseite: http://localhost:3000  
- Mitarbeiter-Dashboard: http://localhost:3000/dashboard  
   
 Öffne beide gleichzeitig in zwei Browser-Fenstern und bestell dir selbst was – die Bestellung erscheint sofort im Dashboard.  
 **Wichtige Hinweise**  
 **Apple Pay / Google Pay:** Im echten Betrieb brauchst du dafür ein Payment-Gateway  
   
    
   
  (z.B. Stripe, Adyen, Mollie) mit Händlerkonto, Domain-Verifizierung und HTTPS.  
   
    
   
  Das ist hier bewusst simuliert (kurzer "Zahlung wird bestätigt"-Dialog), damit  
   
    
   
  der komplette Bestellablauf durchspielbar ist. Wenn du später Stripe einbaust,  
   
    
   
  ersetzt du in public/customer/app.js die placeOrder()-Funktion an der Stelle,  
   
    
   
  wo die Simulation läuft.  
 **Salat-Optionen:** Im Referenzbild gibt es Buttons wie "Alles" / "Ohne Zwiebeln" /  
   
    
   
  "Ohne Tomaten" einzeln. Ich habe das vereinfacht zu Checkboxen pro Zutat  
   
    
   
  (Zwiebeln, Tomaten, Gurken, Krautsalat) – angehakt heißt "dabei", nicht angehakt  
   
    
   
  heißt "ohne". Funktional dasselbe Ergebnis, aber weniger Buttons.  
 **TV-Bildschirm (Abholanzeige):** Noch nicht gebaut – das Order-Modell hat aber  
   
    
   
  bereits ein tv-Socket-Room vorbereitet (siehe server.js / routes/orders.js),  
   
    
   
  falls du das als nächstes willst.  
 **Projektstruktur**  
   
 doener-shop/  
   
  ├── server.js              # Express + Socket.io Setup  
   
  ├── config/db.js           # MongoDB Verbindung  
   
  ├── models/  
   
  │   ├── Product.js         # Produkte mit flexiblen Options-Gruppen  
   
  │   ├── Order.js           # Bestellungen  
   
  │   └── Counter.js         # Tägliche Bestellnummern  
   
  ├── routes/  
   
  │   ├── products.js  
   
  │   └── orders.js  
   
  ├── seed.js                # Beispielprodukte einspielen  
   
  └── public/  
   
      ├── customer/           # Kunden-Bestellseite  
   
      └── dashboard/          # Mitarbeiter-Dashboard  
   
    
 **Eigene Produkte anpassen**  
   
 Trag deine echten Produkte in seed.js ein (Name, Kategorie, Preis, Options-Gruppen)  
   
    
   
  und führ npm run seed erneut aus. Jede Options-Gruppe ist entweder:  
- type: 'single' → Radiobutton, genau eine Auswahl (z.B. Fleischsorte)  
- type: 'multi' → Checkbox, beliebig viele (z.B. Extras mit Aufpreis)  
   
   
**GitHub hochladen**  
1. Änderungen hinzufügen (Staging)  
   
 “ git add . “  
2. Änderungen lokal speichern (Commit)  
   
 “ git commit -m "Hier deine Beschreibung eintragen, z.B. Bugfix oder neues Feature" “  
3. Auf GitHub hochladen (Push)  
   
 “ git push “  
