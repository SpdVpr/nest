# 📝 Changelog

## [1.4.0] - Rezervační systém hardware - 2025-01-30

### ✨ Nové funkce

#### **🖥️ Rezervace Hardware (Monitory a PC)**
- **Nová sekce** na hlavní stránce: "Rezervace HW"
- **3 cenové kategorie**:
  - 💻 **Monitory Premium** (200 Kč/noc) - 14 ks
    - MAG 271QPX QD-OLED E2 (QHD, 27", 240Hz) - 5 ks
    - MAG274QRX (WQHD, 27", 240Hz) - 4 ks
    - Optix MPG341QR (Ultra Wide QHD, 34", 144Hz) - 5 ks
  - 🖥️ **Monitory Standard** (100 Kč/noc) - 18 ks
    - MAG274QRF (WQHD, 27", 165Hz) - 5 ks
    - MAG274QRF-QD (WQHD, 27", 165Hz) - 5 ks
    - MAG272QP (WQHD, 27", 165Hz) - 4 ks
    - Optix G251PF (Full HD, 24", 165Hz) - 4 ks
  - 💾 **Gaming PC** (250 Kč/noc) - 11 ks
    - MSI MAG Infinite S3 (i5 14400F, 32GB, RTX 5070 12GB)
- **Přehledný výběr** s filtrací podle kategorie
- **Detailní specifikace** každého kusu hardware
- **Výběr počtu nocí** pro kalkulaci ceny
- **Přiřazení k hostovi** při rezervaci

#### **🔍 Výběr akce na homepage**
- **Změna homepage workflow**:
  1. Nejdříve výběr akce (název + datum)
  2. Poté zobrazení menu: Občerstvení + Rezervace HW + Admin
- **Elegantní UI** pro výběr akce
- **Možnost změnit akci** pomocí tlačítka
- **Zobrazení aktivního eventu** v hlavičce

#### **📊 Admin správa rezervací HW**
- **Nová stránka** `/admin/hardware`
- **Přehledná tabulka rezervací** s:
  - Název hardware a typ (monitor/PC)
  - Jméno hosta
  - Počet nocí a celková cena
  - Status (Aktivní/Dokončeno/Zrušeno)
  - Datum vytvoření
- **Statistiky**:
  - Celkem rezervací
  - Počet aktivních/dokončených/zrušených
  - Celkový příjem z rezervací
- **Správa rezervací**:
  - Označit jako dokončeno ✅
  - Zrušit rezervaci ❌
  - Smazat rezervaci 🗑️
- **Filtrování** podle stavu (všechny/aktivní/dokončené/zrušené)

### 🔧 Technické změny

#### Databáze:
- **Nová migrace**: `0003_hardware_system.sql`
- **Nové tabulky**:
  - `hardware_items` - Seznam všech kusů hardware (43 položek)
  - `hardware_reservations` - Rezervace pro hosty
- **JSON specs** pro detailní specifikace hardware
- **Indexy** pro rychlé vyhledávání
- **Triggery** pro automatickou aktualizaci timestamp

#### Nové soubory:
- `supabase/migrations/0003_hardware_system.sql` - Databázová migrace + data
- `types/hardware.types.ts` - TypeScript typy pro hardware systém
- `app/(public)/hardware/page.tsx` - Veřejná stránka pro rezervace
- `app/admin/hardware/page.tsx` - Admin správa rezervací
- `app/api/hardware/items/route.ts` - API pro výpis hardware
- `app/api/hardware/reservations/route.ts` - API pro rezervace (GET/POST)
- `app/api/hardware/reservations/[id]/route.ts` - API pro úpravu/smazání (PATCH/DELETE)

#### Aktualizované soubory:
- `app/page.tsx` - Nový workflow s výběrem akce
- `app/admin/dashboard/page.tsx` - Přidán odkaz na správu HW
- `types/database.types.ts` - Přidány typy pro hardware tabulky
- `supabase/schema.sql` - Aktualizované schéma s hardware tabulkami

### 🎨 UI/UX vylepšení

- **Barevné schéma**:
  - Homepage: Kombinace fialovo-modro-zeleno-oranžových gradientů
  - Hardware: Oranžovo-purpurovo-červený gradient (technologické téma)
- **3 kategorie s ikonami**:
  - 🖥️ Monitory Premium (oranžová)
  - 💻 Monitory Standard (fialová)
  - 💾 Gaming PC (modrá)
- **Grid layout** pro přehledné zobrazení hardware
- **Zelené zvýraznění** vybraných položek
- **Responzivní design** - funguje na mobilu i desktopu
- **Modální okno** pro výběr hosta před dokončením rezervace

### 📊 Statistiky a sledování

- **Celkový příjem** z rezervací hardware
- **Počet aktivních rezervací** v reálném čase
- **Historie rezervací** per host
- **Přehled využití** jednotlivých kusů hardware

### 🚀 Výhody nového systému

✅ **Centralizovaná správa** - Všechny rezervace na jednom místě
✅ **Automatická kalkulace** - Cena se počítá podle počtu nocí
✅ **Přiřazení k hostovi** - Jasné propojení rezervací s hosty
✅ **Detailní specifikace** - Hosté vidí přesné parametry hardware
✅ **Flexibilní výběr** - Možnost rezervovat více kusů najednou
✅ **Admin kontrola** - Přehled všech rezervací a možnost úprav
✅ **Status tracking** - Sledování stavu rezervací (aktivní/dokončeno/zrušeno)

---

## [1.3.0] - Vylepšení správy a detaily hostů - 2025-01-30

### ✨ Nové funkce

#### **✏️ Editace eventů**
- Možnost upravit název eventu
- Úprava data začátku a konce
- Tlačítko "Upravit" u každého eventu v tabulce
- Inline editační formulář

#### **💰 Nákupní a prodejní cena produktů**
- **Prodejní cena** (`price`) - cena pro zákazníky (povinné)
- **Nákupní cena** (`purchase_price`) - cena nákupu (volitelné)
- Možnost sledování marže a profitu
- Formuláře rozděleny na dva sloupce

#### **📋 Kategorie jako dropdown menu**
- Přednastavené kategorie:
  - Nápoje
  - Pivo
  - Energetické nápoje
  - Snacky
  - Sladkosti
  - Pizza
  - Jídlo
  - Ostatní
- Select místo textového inputu
- Konzistentní kategorizace

#### **👤 Detail hosta s statistikami**
- **Prokliknutelné karty hostů** v admin panelu
- **Detailní stránka** (`/admin/guests/[id]`) obsahuje:
  - 📊 Statistiky (celkem položek, piv, částka)
  - 📝 Kompletní historie spotřeby s časovými značkami
  - 📈 Rozpad podle kategorií
  - 📅 Informace o registraci
  - 🚀 Placeholder pro budoucí funkce (PC, ubytování, platby)

### 🔧 Technické změny

#### Databáze:
- Nová migrace: `0002_add_purchase_price.sql`
- Přidáno pole `purchase_price DECIMAL(10,2)` do tabulky `products`
- SQL komentáře pro dokumentaci polí

#### Nové soubory:
- `lib/product-categories.ts` - Konstanty kategorií
- `app/admin/guests/[id]/page.tsx` - Detail hosta
- `app/api/admin/guests/[id]/route.ts` - API pro detail
- `supabase/migrations/0002_add_purchase_price.sql` - Databázová migrace
- `supabase/migrations/README.md` - Dokumentace migrací
- `UPGRADE_GUIDE.md` - Návod na aktualizaci

#### Aktualizované soubory:
- `types/database.types.ts` - Přidán typ `purchase_price`
- `app/admin/login/page.tsx` - Oprava barvy hesla (text-gray-900)
- `app/admin/sessions/page.tsx` - Přidána editace eventů
- `app/admin/products/new/page.tsx` - Dropdown kategorie + nákupní cena
- `app/admin/products/[id]/edit/page.tsx` - Dropdown kategorie + nákupní cena
- `app/admin/guests/page.tsx` - Prokliknutelné karty
- `supabase/schema.sql` - Aktualizované schéma s purchase_price

### 🐛 Opravy chyb

- ✅ **Admin login** - Heslo je nyní viditelné (černá barva místo světlé)
- ✅ **Formuláře** - Všechny inputy mají `text-gray-900` pro viditelnost

### 🎨 UI/UX vylepšení

- Modální okno pro editaci eventu má modré zvýraznění
- Karty hostů mají hover efekt s modrým rámečkem
- Detail hosta má barevné gradient karty pro statistiky
- Kategorie jsou konzistentní napříč celou aplikací
- Formuláře pro produkty jsou přehlednější (2 sloupce pro ceny)

### 📚 Dokumentace

- Nový `UPGRADE_GUIDE.md` s instrukcemi pro aktualizaci
- Dokumentace migrací v `supabase/migrations/README.md`
- Komentáře v databázi pro lepší pochopení

### 🚀 Připravováno

V detailu hosta jsou připraveny placeholdery pro:
- 💻 Rezervace PC
- 🏠 Správa ubytování
- 💳 Platby a účty
- 🏆 Turnaje a žebříčky

---

## [1.2.0] - Systém občerstvení (Snacks System) - 2025-01-30

### ✨ Nové funkce

#### **🍕 Zjednodušená stránka občerstvení (`/snacks`)**
- **Nová centrální stránka** - Vše na jednom místě
- **Přidání hosta na místě** - Kdokoli může přidat nového hosta
- **Inline přidávání produktů** - Klik na hosta → vyber produkt
- **Real-time aktualizace** - Okamžitý refresh dat po přidání

#### **🏆 Leaderboard (TOPky)**
- **TOP Jedlíci** 🥇🥈🥉
  - Zobrazuje 3 hosty s nejvíce položkami
  - Počet položek + celková cena
- **TOP Pijani piv** 🍺🥇🥈🥉
  - Zobrazuje 3 hosty s nejvíce pivy
  - Automatická detekce produktů s "pivo"/"beer"

#### **📊 Seznam hostů se spotřebou**
Každý host má kartu obsahující:
- Jméno
- Badge s počtem položek
- Badge s počtem piv (pokud pil)
- Seznam všech spotřebovaných produktů
- Celková cena v korunách
- Tlačítko "Přidat položku"

#### **🛡️ Admin správa hostů**
- **Nová stránka** `/admin/guests`
- Admin může přidat hosty předem k události
- Přehled všech hostů aktuálního eventu
- Datum vytvoření každého hosta

#### **🎨 Nová homepage**
- Zjednodušená úvodní stránka
- Dva velké buttons:
  - 🍕 Občerstvení (`/snacks`)
  - 🛡️ Administrace (`/admin`)

### 🔧 API změny

#### Nové endpointy:
- `GET /api/snacks/guests-with-consumption`
  - Vrací všechny hosty s jejich spotřebou
  - Vypočítává `totalItems`, `totalBeers`, `totalPrice`
  - Řadí podle aktivity

### 🎨 UI/UX vylepšení
- **Modaly místo stránek** - Rychlejší workflow
- **Hover efekty** - Lepší interaktivita
- **Barevné schéma**:
  - Homepage: Fialovo-modrý gradient
  - Snacks: Oranžovo-červený gradient (tematické barvy jídla)
  - Leaderboard: Žluto-oranžový (jedlíci), modro-indigový (pivo)
- **Responzivní design** - Funguje na mobilu i desktopu
- **Grid layout produktů** - Přehlednější výběr

### 🔄 Změny v navigaci
- `/register` → přesměrováno na `/snacks`
- `/select-guest` → přesměrováno na `/snacks`
- Admin dashboard → přidán odkaz na "Správa hostů"

### 📚 Dokumentace
- Přidán **SNACKS_SYSTEM.md** - Kompletní dokumentace nového systému
- Aktualizován **CHANGELOG.md**

### 🎯 Výhody nového systému
✅ Jednodušší UX - vše na jedné stránce
✅ Rychlejší přidání položky - 2 kliky místo navigace
✅ Zábavné TOPky - gamifikace spotřeby
✅ Viditelnost ceny - každý vidí, kolik utratil
✅ Flexibilní přidání hostů - kdokoli může přidat hosta na místě
✅ Admin kontrola - admin může předem připravit seznam hostů

---

## [1.1.0] - Systém událostí (Event System) - 2025-01-30

### ✨ Nové funkce

#### **🎪 Správa LAN Party událostí**
- Admin může vytvářet pojmenované LAN Party události
- Každá událost má:
  - Název (např. "LAN Party - Listopad 2025")
  - Datum začátku
  - Datum konce (volitelné)
  - Status (Aktivní/Neaktivní)
- Pouze jeden event může být aktivní současně

#### **📅 Zobrazení aktuální události**
- **Homepage**: Zobrazuje název a datum aktuálního eventu
- **Registrace**: Event info nad formulářem
- **Výběr hostů**: Event info nad seznamem hostů
- **Admin Dashboard**: Velký přehled aktuálního eventu s daty

#### **🎯 Vylepšený Admin Dashboard**
- Přehled aktuálního eventu s daty
- Počet hostů v reálném čase
- Upozornění, pokud není aktivní žádný event
- Lepší navigace

#### **📊 Vylepšená správa eventů**
- Formulář s datem začátku a konce
- Přehledná tabulka všech eventů
- Rychlé aktivace/deaktivace eventů
- Zobrazení data začátku a konce u každého eventu

### 🔧 API změny

#### Nové endpointy:
- `GET /api/sessions/active` - Vrací aktuálně aktivní event

#### Upravené endpointy:
- `POST /api/admin/sessions` - Nyní přijímá `start_date` a `end_date`

### 🎨 UI/UX vylepšení
- Jednotný design event boxů napříč aplikací
- Barevné odlišení eventů podle kontextu (modrá/zelená)
- Lepší čitelnost datumů
- Responzivní datum inputy v admin rozhraní

### 🐛 Opravy
- **Opraveno**: Neviditelný text v input poli pro registraci (přidáno `text-gray-900`)
- **Opraveno**: Správná URL pro Supabase API (opravena v `.env.local`)
- **Opraveno**: Setup skript nyní správně načítá `.env.local`

### 📚 Dokumentace
- Přidán **EVENT_SYSTEM.md** - Kompletní dokumentace systému událostí
- Přidán **CHANGELOG.md** - Historie změn
- Aktualizován **README.md** - Nové funkce

---

## [1.0.0] - Iniciální release - 2025-01-29

### ✨ Implementované funkce

#### **Základní infrastruktura**
- Next.js 16 s App Router
- TypeScript
- Tailwind CSS 4
- Supabase backend

#### **Databáze**
- 4 hlavní tabulky: sessions, guests, products, consumption
- Row Level Security (RLS) policies
- Storage bucket pro obrázky produktů
- Automatické triggery a constraints

#### **Veřejné rozhraní (pro hosty)**
- Homepage s dvěma tlačítky
- Registrace nových hostů
- Výběr z existujících hostů
- Grid produktů s real-time součtem

#### **Admin rozhraní**
- Jednoduchá autentizace heslem
- Dashboard s přehledem
- CRUD produktů s upload obrázků
- Správa sessions
- History placeholder

#### **API**
- 13 API endpoints
- Bezpečnostní ověření pro admin operace
- Validace dat
- Error handling

#### **Dokumentace**
- README.md
- START_HERE.md
- SETUP_CHECKLIST.md
- DEPLOYMENT.md
- supabase/README.md

---

## Plánované funkce (Roadmap)

### 🔮 Verze 1.2.0 - Statistiky a export
- [ ] Detailní statistiky spotřeby per host
- [ ] Detailní statistiky per produkt
- [ ] Export dat do CSV
- [ ] Grafy a vizualizace

### 🔮 Verze 1.3.0 - Real-time
- [ ] Real-time aktualizace pomocí Supabase Realtime
- [ ] Live dashboard s automatickou aktualizací
- [ ] Notifikace při nové spotřebě

### 🔮 Verze 1.4.0 - Platby
- [ ] Sledování plateb hostů
- [ ] Označení "zaplaceno/nezaplaceno"
- [ ] Export účtů pro hosty

### 🔮 Verze 2.0.0 - Vylepšení autentizace
- [ ] Nahrazení simple password auth za Supabase Auth
- [ ] JWT tokeny
- [ ] Role-based access control
- [ ] Multi-admin podpora

---

## Technické poznámky

### Next.js 16 kompatibilita
- Použití `@ts-nocheck` v některých API routes kvůli async params
- Pattern `context: { params }` místo `{ params }`

### Supabase
- Service Role Key pro admin operace
- Anon Key pro veřejné čtení
- Storage policies pro public read, admin write

### TypeScript
- Některé type assertions (`as any`) pro Supabase .eq() queries
- Database types generované z Supabase schématu