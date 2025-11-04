# 🪺 The Nest - LAN Party Consumption Tracker

Systém pro sledování spotřeby produktů na LAN parties. Hosté mohou snadno vybírat produkty a sledovat svou spotřebu, admin má kompletní přehled a kontrolu.

## 🚀 Rychlý start

### 1. Supabase Setup

Nejprve nastav Supabase projekt:

1. Vytvoř nový projekt na [supabase.com](https://supabase.com)
2. V SQL Editoru postupně spusť tyto skripty (V TOMTO POŘADÍ!):
   - `supabase/schema.sql` - Vytvoří databázové schéma
   - `supabase/rls-policies.sql` - Nastaví RLS policies
3. Ve Storage vytvoř bucket `product-images` (veřejný pro čtení)
4. V SQL Editoru spusť `supabase/storage-policies.sql`

📖 Detailní instrukce: `supabase/README.md`

### 2. Environment Variables

Zkopíruj `.env.example` do `.env.local` a vyplň hodnoty:

```bash
NEXT_PUBLIC_SUPABASE_URL=tvoje-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tvoje-anon-key
SUPABASE_SERVICE_ROLE_KEY=tvoje-service-role-key
ADMIN_PASSWORD=tvoje-admin-heslo
```

### 3. Instalace a spuštění

```bash
# Instalace dependencies
npm install

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
│   ├── supabase/              # Supabase clienty
│   └── utils.ts               # Utility funkce
├── types/
│   └── database.types.ts      # TypeScript typy
├── supabase/
│   ├── schema.sql             # Databázové schéma
│   ├── rls-policies.sql       # RLS policies
│   ├── storage-policies.sql   # Storage policies
│   └── README.md              # Supabase setup guide
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
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Icons**: Lucide React

## 🔐 Zabezpečení

- Row Level Security (RLS) na všech tabulkách
- Storage policies pro ochranu uploadů
- Admin autentizace pro citlivé operace
- Validace na client i server side
- Ochrana proti SQL injection (Supabase připravené dotazy)

## 📝 Poznámky pro vývoj

### Environment
- Development: `npm run dev`
- Build: `npm run build`
- Start production: `npm start`

### Supabase
- Pokud změníš schéma, aktualizuj `types/database.types.ts`
- Pro generování typů můžeš použít Supabase CLI

### Admin Password
- V produkci nahraď jednoduchý password check za Supabase Auth
- Implementuj JWT tokeny pro lepší zabezpečení

## 🐛 Troubleshooting

### "No active session found"
- Vytvoř nový session v `/admin/sessions`
- Aktivuj existující session

### Upload obrázků nefunguje
- Zkontroluj Supabase Storage bucket (`product-images`)
- Ověř storage policies
- Zkontroluj `SUPABASE_SERVICE_ROLE_KEY` v `.env.local`

### Admin login nefunguje
- Restartuj dev server po změně `.env.local`
- Zkontroluj `ADMIN_PASSWORD` hodnotu

### Products se nezobrazují
- Zkontroluj RLS policies
- Ověř že produkty mají `is_available = true`
- Zkontroluj Supabase connection

## 📄 License

MIT

## 👨‍💻 Autor

Vytvořeno podle implementačního návodu pro The Nest projekt.
