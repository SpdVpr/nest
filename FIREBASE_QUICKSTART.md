# 🚀 Firebase Quick Start Guide

Rychlý návod, jak rozjet aplikaci s Firebase.

## 📋 Prerekvizity

- Node.js 18+ nainstalovaný
- Firebase účet (zdarma)
- 10 minut času

## 🔥 Krok za krokem

### 1. Vytvoř Firebase projekt

1. Jdi na https://console.firebase.google.com/
2. Klikni **"Add project"** nebo **"Přidat projekt"**
3. Zadej název (např. `the-nest`)
4. Pokračuj přes wizard (Google Analytics můžeš vypnout)

### 2. Aktivuj Firestore

1. V levém menu: **"Firestore Database"**
2. Klikni **"Create database"**
3. Vyber **"Start in production mode"**
4. Vyber region: **`europe-west3`** (Frankfurt) nebo nejbližší

### 3. Aktivuj Storage

1. V levém menu: **"Storage"**
2. Klikni **"Get started"**
3. Vyber **"Start in production mode"**
4. Stejný region jako Firestore

### 4. Získej Firebase credentials

#### A) Web App Config

1. V **Project Settings** (⚙️ ikona) → **"General"**
2. Scroll dolů na **"Your apps"**
3. Klikni na web ikonu **`</>`**
4. Zaregistruj app (např. `the-nest-web`)
5. Zkopíruj `firebaseConfig` objekt

#### B) Service Account

1. V **Project Settings** → **"Service accounts"**
2. Klikni **"Generate new private key"**
3. Stáhne se JSON soubor → **USCHOVEJ HO BEZPEČNĚ!**

### 5. Nastav environment variables

Vytvoř soubor `.env.local` v root složce projektu:

```env
# Firebase Client (z kroku 4A)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=the-nest-xxxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=the-nest-xxxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=the-nest-xxxxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin (z kroku 4B - celý JSON jako string)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"the-nest-xxxxx",...celý JSON...}'

# Admin heslo (vymysli si silné heslo)
ADMIN_PASSWORD=tvoje-super-silne-heslo-123
```

**💡 TIP:** Pro `FIREBASE_SERVICE_ACCOUNT_KEY` otevři stažený JSON v editoru, zkopíruj celý obsah a vlož ho mezi jednoduché uvozovky `'...'`

### 6. Nastav Firestore Security Rules

V Firebase Console → **Firestore Database** → **Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Povolit čtení všem (pro public stránky)
    match /{document=**} {
      allow read: true;
    }
    
    // Zápis pouze přes Admin SDK (API routes)
    match /{document=**} {
      allow write: if false;
    }
  }
}
```

Klikni **"Publish"**

### 7. Nastav Storage Rules

V Firebase Console → **Storage** → **Rules**:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Povolit čtení všem
    match /{allPaths=**} {
      allow read: true;
    }
    
    // Zápis pouze přes Admin SDK
    match /{allPaths=**} {
      allow write: if false;
    }
  }
}
```

Klikni **"Publish"**

### 8. Nainstaluj dependencies

```bash
npm install
```

### 9. Inicializuj databázi

```bash
npm run setup:firebase
```

Tento skript vytvoří:
- ✅ První aktivní session (LAN party)
- ✅ 5 ukázkových produktů (Coca Cola, Red Bull, Pizza, atd.)
- ✅ 2 hardware items (Monitor, Gaming PC)
- ✅ 1 testovacího hosta
- ✅ 1 consumption záznam

### 10. Spusť aplikaci

```bash
npm run dev
```

Otevři prohlížeč na: **http://localhost:3000**

---

## 🎉 Hotovo!

Aplikace běží! Můžeš:

- **Public stránka**: http://localhost:3000
- **Admin panel**: http://localhost:3000/admin (použij heslo z `.env.local`)
- **Snack tracking**: http://localhost:3000/snacks

---

## 🔍 Ověření, že vše funguje

### 1. Zkontroluj Firebase Console

V **Firestore Database** bys měl vidět kolekce:
- `sessions` (1 dokument)
- `products` (5 dokumentů)
- `guests` (1 dokument)
- `consumption` (1 dokument)
- `hardware_items` (2 dokumenty)

### 2. Vyzkoušej aplikaci

1. Otevři http://localhost:3000
2. Měl bys vidět úvodní stránku
3. Jdi na http://localhost:3000/admin
4. Zadej admin heslo
5. Měl bys vidět admin dashboard

---

## ❓ Problémy?

### "Failed to initialize Firebase"

- Zkontroluj, že máš správně nastavené všechny env proměnné
- Zkontroluj, že `FIREBASE_SERVICE_ACCOUNT_KEY` je validní JSON
- Restartuj dev server (`Ctrl+C` a znovu `npm run dev`)

### "Permission denied" v Firestore

- Zkontroluj Firestore Security Rules (krok 6)
- Ujisti se, že máš `allow read: true`

### "No active session found"

- Spusť znovu `npm run setup:firebase`
- Nebo vytvoř session ručně v Firebase Console

### Další problémy

Podívej se do `FIREBASE_MIGRATION.md` pro detailnější informace.

---

## 📚 Další kroky

1. **Dokončit migraci zbývajících API endpointů** - viz `FIREBASE_MIGRATION.md`
2. **Nahrát obrázky produktů** do Firebase Storage
3. **Přizpůsobit design** podle svých potřeb
4. **Nasadit na produkci** (Vercel, Firebase Hosting, atd.)

---

## 🆘 Potřebuješ pomoc?

Detailní dokumentace migrace: **`FIREBASE_MIGRATION.md`**

Tam najdeš:
- Seznam všech zbývajících endpointů k migraci
- Vzory pro přepis Supabase → Firebase
- Tipy a triky pro Firestore
- Troubleshooting guide

