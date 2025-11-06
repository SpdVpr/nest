# 🪺 The Nest - LAN Party Consumption Tracker

Systém pro sledování spotřeby produktů na LAN parties. Hosté mohou snadno vybírat produkty a sledovat svou spotřebu, admin má kompletní přehled a kontrolu.

## 🔥 Powered by Firebase

Aplikace používá **Firebase Firestore** jako databázi a **Firebase Storage** pro obrázky.

## 🚀 Rychlý start

### 1. Firebase Setup

**📖 Kompletní návod: [`FIREBASE_QUICKSTART.md`](FIREBASE_QUICKSTART.md)**

Stručně:
1. Vytvoř Firebase projekt na [console.firebase.google.com](https://console.firebase.google.com/)
2. Aktivuj Firestore Database
3. Aktivuj Storage
4. Získej credentials (Web App Config + Service Account)
5. Nastav Security Rules

### 2. Environment Variables

Zkopíruj `.env.example` do `.env.local` a vyplň hodnoty:

```bash
# Firebase Client Config
NEXT_PUBLIC_FIREBASE_API_KEY=tvoje-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tvuj-projekt.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tvuj-projekt-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tvuj-projekt.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin (celý JSON jako string)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Admin heslo
ADMIN_PASSWORD=tvoje-admin-heslo
```

### 3. Instalace a inicializace

```bash
# Instalace dependencies
npm install

# Inicializace Firebase databáze (vytvoří první session a testovací data)
npm run setup:firebase

# Spuštění dev serveru
npm run dev
```

Aplikace běží na `http://localhost:3000`

## 📱 Použití

### Pro hosty:

1. Otevři `http://localhost:3000` na tabletu
2. Vyber **"Jsem nový host"** nebo **"Už jsem tady"**
3. Zadej jméno nebo vyber ze seznamu
4. Klikni na produkty pro přidání do spotřeby
5. Sleduj aktuální součet v hlavičce

### Pro admina:

1. Jdi na `/admin/login`
2. Zadej admin heslo (z `.env.local`)
3. Dashboard - přehled statistik
4. **Správa produktů** - přidej, uprav nebo smaž produkty
5. **Správa eventů** - vytvoř a aktivuj LAN party event
6. **Historie spotřeby** - zobraz všechny záznamy

## 🏗️ Struktura projektu

```
the-nest/
├── app/
│   ├── (public)/              # Veřejné stránky pro hosty
│   │   ├── register/          # Registrace nového hosta
│   │   ├── select-guest/      # Výběr existujícího hosta
│   │   └── guest/[id]/        # Stránka hosta
│   │       └── products/      # Výběr produktů
│   ├── admin/                 # Admin rozhraní
│   │   ├── login/             # Admin přihlášení
│   │   ├── dashboard/         # Přehled
│   │   ├── products/          # CRUD produktů ⭐
│   │   ├── sessions/          # Správa eventů
│   │   └── consumption/       # Historie spotřeby
│   └── api/                   # API endpoints
│       ├── guests/            # CRUD hosté
│       ├── products/          # CRUD produkty
│       ├── consumption/       # Záznamy spotřeby
│       └── admin/             # Admin API
├── lib/
│   ├── firebase/              # Firebase clienty a helpers
│   │   ├── client.ts          # Client SDK (browser)
│   │   ├── admin.ts           # Admin SDK (server)
│   │   ├── helpers.ts         # Helper funkce
│   │   └── queries.ts         # Reusable queries
│   └── utils.ts               # Utility funkce
├── types/
│   └── database.types.ts      # TypeScript typy
├── scripts/
│   └── setup-firebase.ts      # Firebase inicializační skript
├── firestore.rules            # Firestore Security Rules
├── firestore.indexes.json     # Firestore indexy
├── storage.rules              # Storage Security Rules
└── components/
    └── ui/                    # UI komponenty
```

## 🎯 Implementované funkce (Sprint 1 - MVP)

✅ **Databázové schéma**
- Tabulky: sessions, guests, products, consumption
- Indexy pro výkon
- RLS policies pro zabezpečení
- Triggery pro automatickou aktualizaci

✅ **Supabase Storage**
- Bucket pro obrázky produktů
- Upload/delete funkcionalita
- Storage policies

✅ **Admin autentizace**
- Login stránka
- Ochrana admin routes
- Session management

✅ **CRUD pro produkty** ⭐ PRIORITA
- Seznam všech produktů
- Přidání nového produktu
- Editace produktu
- Smazání produktu
- Upload obrázků (drag & drop + file picker)
- Toggle dostupnosti
- Validace na client i server side

✅ **Session management**
- Vytvoření nového eventu
- Aktivace/deaktivace eventu
- Seznam všech eventů
- Pouze jeden aktivní event najednou

✅ **Veřejné rozhraní pro hosty**
- Homepage s navigací
- Registrace nového hosta
- Výběr existujícího hosta
- Grid produktů s obrázky
- Real-time součet spotřeby
- Přidávání produktů do spotřeby

## 🔜 Plánované funkce (Sprint 2-4)

- 📊 Dashboard statistiky (počet hostů, obrat, atd.)
- 👥 Správa hostů (seznam, označit jako zaplaceno)
- 📜 Detailní historie spotřeby s filtrováním
- 📤 Export dat (CSV)
- 📈 Grafy a statistiky
- ⚡ Real-time aktualizace (Supabase Realtime)
- 🎨 Animace a lepší UX
- 📱 Optimalizace pro tablet landscape

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore (NoSQL)
- **Storage**: Firebase Storage
- **Icons**: Lucide React

## 🔐 Zabezpečení

- Firestore Security Rules pro ochranu dat
- Storage Security Rules pro ochranu uploadů
- Admin autentizace pro citlivé operace
- Validace na client i server side
- Všechny zápisy pouze přes Admin SDK (API routes)

## 📝 Poznámky pro vývoj

### Environment
- Development: `npm run dev`
- Build: `npm run build`
- Start production: `npm start`
- Setup Firebase: `npm run setup:firebase`

### Firebase
- Firestore data vidíš v [Firebase Console](https://console.firebase.google.com/)
- Pokud změníš strukturu, aktualizuj `types/database.types.ts`
- Pro složité dotazy možná budeš potřebovat composite indexy

### Admin Password
- V produkci nahraď jednoduchý password check za Firebase Auth
- Implementuj JWT tokeny pro lepší zabezpečení

### Migration Status
- **Hotovo:** Core API (products, sessions, guests, consumption)
- **Zbývá:** Admin CRUD endpointy, hardware reservations
- **Detaily:** Viz `MIGRATION_STATUS.md`

## 🐛 Troubleshooting

### "No active session found"
- Spusť `npm run setup:firebase` pro vytvoření první session
- Nebo vytvoř session ručně v Firebase Console

### "Failed to initialize Firebase"
- Zkontroluj všechny env proměnné v `.env.local`
- Ujisti se, že `FIREBASE_SERVICE_ACCOUNT_KEY` je validní JSON
- Restartuj dev server

### Upload obrázků nefunguje
- Zkontroluj Firebase Storage v Console
- Ověř Storage Security Rules
- Zkontroluj `FIREBASE_SERVICE_ACCOUNT_KEY` v `.env.local`

### Admin login nefunguje
- Restartuj dev server po změně `.env.local`
- Zkontroluj `ADMIN_PASSWORD` hodnotu

### Products se nezobrazují
- Zkontroluj Firestore Security Rules
- Ověř že produkty mají `is_available = true`
- Zkontroluj Firebase connection v Console

### "Permission denied" v Firestore
- Zkontroluj `firestore.rules` - měl bys mít `allow read: true`
- Publikuj rules v Firebase Console

## 📚 Dokumentace

- **[FIREBASE_QUICKSTART.md](FIREBASE_QUICKSTART.md)** - Rychlý start s Firebase (10 minut)
- **[FIREBASE_MIGRATION.md](FIREBASE_MIGRATION.md)** - Detailní migration guide
- **[MIGRATION_STATUS.md](MIGRATION_STATUS.md)** - Checklist hotových/zbývajících úkolů
- **[NEXT_STEPS.md](NEXT_STEPS.md)** - Co dělat dál

## 📄 License

MIT

## 👨‍💻 Autor

Vytvořeno podle implementačního návodu pro The Nest projekt.
