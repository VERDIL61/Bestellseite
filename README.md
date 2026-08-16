# Servio – Bestellsystem

Ein webbasiertes Bestellsystem für einen Fast-Food-Laden: Kunden bestellen per QR-Code, das Personal verwaltet die Bestellungen live, und ein TV-Bildschirm zeigt an, welche Bestellungen abholbereit sind. Alles in Echtzeit über Socket.io verbunden.

## Funktionen

**Kunden-Bestellseite** (`/`)
- Speisekarte nach Kategorien durchstöbern (mit Produktbildern)
- Produkte konfigurieren: Fleisch, Sauce, Extras usw.
- Warenkorb mit Mengenauswahl
- Vor Ort essen oder zum Mitnehmen
- Zahlungsmethode wählen (Kassa / Apple Pay / Google Pay)
- Nach der Bestellung: Live-Statusanzeige (eingegangen → in Zubereitung → abholbereit)

**Mitarbeiter-Dashboard** (`/dashboard`, Login geschützt)
- Neue Bestellungen kommen live an, mit Benachrichtigungston
- Status ändern: Neu → In Zubereitung → Fertig → Abgeholt
- Bon drucken (auch automatisch bei neuer Bestellung)
- Produktverwaltung: anlegen, bearbeiten, löschen, nach Kategorien gruppiert
- Produkte als "ausverkauft" markieren, ohne sie zu löschen
- Produktbilder hochladen
- Statistik: Umsatz, Bestellanzahl und Top-Produkte (Heute / Woche / Monat) mit Diagramm
- Passwort selbst ändern

**TV-Bildschirm** (`/tv`)
- Zeigt live, welche Bestellnummern abholbereit bzw. in Zubereitung sind
- Fertige Bestellungen werden nach 15 Minuten automatisch ausgeblendet

## Technik

- **Backend:** Node.js, Express
- **Datenbank:** MongoDB (Atlas Cloud)
- **Echtzeit:** Socket.io
- **Login:** Session-basiert, Passwort mit bcrypt gehasht
- **Frontend:** HTML, CSS, JavaScript (ohne Framework), Chart.js für Diagramme

## Setup

Voraussetzung: Node.js (>= 18) und eine MongoDB-Datenbank (empfohlen: MongoDB Atlas).

```bash
cd doener-shop
npm install
cp .env.example .env
```

Danach die `.env` anpassen:

```
MONGODB_URI=mongodb+srv://...   # dein Atlas-Connection-String
PORT=3000
SESSION_SECRET=eine-lange-zufällige-zeichenkette
ADMIN_PASSWORD=dein-start-passwort
```

Beim ersten Start wird aus `ADMIN_PASSWORD` automatisch ein Admin-Konto in der Datenbank angelegt.

Server starten:

```bash
npm start
```

- Kunden-Bestellseite: http://localhost:3000
- Mitarbeiter-Dashboard: http://localhost:3000/dashboard
- TV-Bildschirm: http://localhost:3000/tv

Tipp zum Ausprobieren: Kundenseite und Dashboard in zwei Fenstern gleichzeitig öffnen und selbst eine Bestellung aufgeben – sie erscheint sofort im Dashboard.

## Produkte pflegen

Produkte werden über das Dashboard verwaltet (Tab "Produkte"), nicht mehr über ein Skript. Jedes Produkt kann Options-Gruppen haben:

- **Einzelauswahl** (single): genau eine Auswahl, z.B. Fleischsorte
- **Mehrfachauswahl** (multi): beliebig viele, z.B. Extras mit Aufpreis

Hinweis: Das Skript `seed.js` legt Beispielprodukte an, überschreibt aber alle vorhandenen Produkte. Nur beim ersten Einrichten verwenden, nicht im laufenden Betrieb.

## Passwort zurücksetzen

Falls das Dashboard-Passwort vergessen wurde, lässt es sich über die Konsole neu setzen:

```bash
node reset-password.js NeuesPasswort
```

## Projektstruktur

```
doener-shop/
├── server.js              Express + Socket.io Setup
├── reset-password.js      Passwort über die Konsole zurücksetzen
├── config/db.js           MongoDB-Verbindung
├── middleware/
│   └── requireAuth.js     Login-Schutz für geschützte Routen
├── models/
│   ├── Product.js         Produkte mit Options-Gruppen und Bild
│   ├── Order.js           Bestellungen
│   ├── Counter.js         Tägliche Bestellnummern
│   └── Admin.js           Admin-Konto (gehashtes Passwort)
├── routes/
│   ├── products.js        Produkte lesen/anlegen/ändern/löschen
│   ├── orders.js          Bestellungen anlegen und Status ändern
│   ├── auth.js            Login, Logout, Passwort ändern
│   └── stats.js           Umsatz- und Verkaufsstatistik
└── public/
    ├── customer/          Kunden-Bestellseite
    ├── dashboard/         Mitarbeiter-Dashboard
    └── tv/                TV-Abholanzeige
```

## Hinweise

**Apple Pay / Google Pay:** Aktuell simuliert (kurzer Bestätigungsdialog), damit der Bestellablauf komplett durchspielbar ist. Für echte Zahlungen wird ein Payment-Gateway (z.B. Stripe, Adyen, Mollie) mit Händlerkonto und HTTPS benötigt.

**Registrierkasse:** Für den echten Betrieb mit Bargeldumsatz in Österreich gilt die Registrierkassen- und Belegerteilungspflicht (RKSV). Das System druckt aktuell nur einen internen Küchen-Bon, keinen fiskalisch gültigen Beleg.

## GitHub aktualisieren

```bash
git add .
git commit -m "Beschreibung der Änderung"
git push
```

## Lizenz

Dieses Projekt steht unter der PolyForm Noncommercial License 1.0.0.
Nutzung, Weitergabe und Veränderung sind für nicht-kommerzielle Zwecke gestattet.
Jede kommerzielle Nutzung bedarf der ausdrücklichen schriftlichen Genehmigung des Autors.

Copyright (c) 2026 Ferdinand Verdil