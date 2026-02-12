# 🖥️ Hardware Rezervační Systém

Kompletní dokumentace systému pro rezervaci monitorů a PC pro hosty LAN parties.

---

## 📋 Přehled

Hardware rezervační systém umožňuje hostům zapůjčit si monitory a herní PC na dobu trvání akce. Systém zahrnuje:

- 🖥️ **32 monitorů** ve dvou cenových kategoriích
- 💻 **11 herních PC** s výkonnými specifikacemi
- 💰 Automatickou kalkulaci ceny podle počtu nocí
- 📊 Admin rozhraní pro správu rezervací
- 🔒 Propojení rezervací s hosty a událostmi

---

## 🎯 Dostupný Hardware

### 💎 Monitory Premium (200 Kč/noc) - 14 ks

#### MAG 271QPX QD-OLED E2 (5 ks)
- **Rozlišení:** QHD (2560x1440)
- **Úhlopříčka:** 27"
- **Obnovovací frekvence:** 240 Hz
- **Panel:** QD-OLED
- **Čísla:** #1, #2, #3, #4, #5

#### MAG274QRX (4 ks)
- **Rozlišení:** WQHD (2560x1440)
- **Úhlopříčka:** 27"
- **Obnovovací frekvence:** 240 Hz
- **Čísla:** #1, #2, #3, #4

#### Optix MPG341QR (5 ks)
- **Rozlišení:** Ultra Wide QHD (3440x1440)
- **Úhlopříčka:** 34"
- **Obnovovací frekvence:** 144 Hz
- **Poměr stran:** 21:9
- **Čísla:** #1, #2, #3, #4, #5

---

### 🖥️ Monitory Standard (100 Kč/noc) - 18 ks

#### MAG274QRF (5 ks)
- **Rozlišení:** WQHD (2560x1440)
- **Úhlopříčka:** 27"
- **Obnovovací frekvence:** 165 Hz
- **Čísla:** #1, #2, #3, #4, #5

#### MAG274QRF-QD (5 ks)
- **Rozlišení:** WQHD (2560x1440)
- **Úhlopříčka:** 27"
- **Obnovovací frekvence:** 165 Hz
- **Panel:** Quantum Dot
- **Čísla:** #1, #2, #3, #4, #5

#### MAG272QP (4 ks)
- **Rozlišení:** WQHD (2560x1440)
- **Úhlopříčka:** 27"
- **Obnovovací frekvence:** 165 Hz
- **Čísla:** #1, #2, #3, #4

#### Optix G251PF (4 ks)
- **Rozlišení:** Full HD (1920x1080)
- **Úhlopříčka:** 24"
- **Obnovovací frekvence:** 165 Hz
- **Čísla:** #1, #2, #3, #4

---

### 💾 Gaming PC (250 Kč/noc) - 11 ks

#### MSI MAG Infinite S3 (11 ks)
- **Procesor:** Intel Core i5 14400F
  - 10 jader (6P + 4E)
  - Max. 4.7 GHz
- **RAM:** 32 GB DDR5
- **Grafická karta:** NVIDIA RTX 5070 12GB
  - Nejnovější Ada Lovelace architektura
  - 12 GB GDDR6X
- **Čísla:** #1 až #11

---

## 💰 Cenová kalkulace

### Příklady výpočtu:

```
Monitor Premium na 2 noci:
200 Kč × 2 noci = 400 Kč

Monitor Standard na 3 noci:
100 Kč × 3 noci = 300 Kč

Gaming PC na 1 noc:
250 Kč × 1 noc = 250 Kč

Kombinace (PC + Monitor Premium na 2 noci):
(250 Kč + 200 Kč) × 2 noci = 900 Kč
```

---

## 🔄 Workflow rezervace

### Pro hosta:

1. **Výběr akce** na homepage
2. Kliknutí na **"Rezervace HW"**
3. **Výběr kategorie** (Premium/Standard/PC)
4. **Výběr kusů** hardware (možnost vybrat více najednou)
5. **Nastavení počtu nocí**
6. **Výběr svého jména** ze seznamu hostů
7. **Potvrzení** rezervace

### Pro admina:

1. **Správa → Hardware**
2. Přehled všech rezervací
3. Možnost změnit stav:
   - ✅ Označit jako dokončeno
   - ❌ Zrušit rezervaci
   - 🗑️ Smazat rezervaci
4. Filtrování podle stavu

---

## 🗄️ Databázové schéma

### Tabulka `hardware_items`

```sql
CREATE TABLE hardware_items (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,              -- Např. "MAG 271QPX QD-OLED E2 #1"
    type TEXT NOT NULL,               -- 'monitor' nebo 'pc'
    category TEXT NOT NULL,           -- '200', '100', '250'
    price_per_night DECIMAL(10,2),   -- Cena za jednu noc
    specs JSONB,                      -- JSON s detailními specs
    is_available BOOLEAN,             -- Dostupnost
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### Struktura `specs` JSON:

**Pro monitory:**
```json
{
  "resolution": "QHD",
  "diagonal": "27",
  "hz": "240"
}
```

**Pro PC:**
```json
{
  "cpu": "Intel Core i5 14400F",
  "ram": "32 GB",
  "gpu": "RTX 5070 12GB"
}
```

---

### Tabulka `hardware_reservations`

```sql
CREATE TABLE hardware_reservations (
    id UUID PRIMARY KEY,
    hardware_item_id UUID,            -- FK na hardware_items
    guest_id UUID,                    -- FK na guests
    session_id UUID,                  -- FK na sessions
    nights_count INTEGER,             -- Počet nocí
    total_price DECIMAL(10,2),        -- Celková cena
    status TEXT,                      -- 'active', 'completed', 'cancelled'
    notes TEXT,                       -- Poznámky (volitelné)
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

---

## 🔌 API Endpointy

### `GET /api/hardware/items`

Vrací seznam všech dostupných hardware položek.

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "MAG 271QPX QD-OLED E2 #1",
      "type": "monitor",
      "category": "200",
      "price_per_night": 200.00,
      "specs": {
        "resolution": "QHD",
        "diagonal": "27",
        "hz": "240"
      },
      "is_available": true
    }
  ]
}
```

---

### `POST /api/hardware/reservations`

Vytvoří nové rezervace pro vybrané hardware položky.

**Request:**
```json
{
  "guest_id": "uuid",
  "hardware_item_ids": ["uuid1", "uuid2"],
  "nights_count": 2
}
```

**Response:**
```json
{
  "reservations": [
    {
      "id": "uuid",
      "hardware_item_id": "uuid1",
      "guest_id": "uuid",
      "session_id": "uuid",
      "nights_count": 2,
      "total_price": 400.00,
      "status": "active"
    }
  ]
}
```

---

### `GET /api/hardware/reservations`

Vrací všechny rezervace pro aktivní session.

**Response:**
```json
{
  "reservations": [
    {
      "id": "uuid",
      "nights_count": 2,
      "total_price": 400.00,
      "status": "active",
      "hardware_items": {
        "name": "MAG 271QPX QD-OLED E2 #1",
        "type": "monitor",
        "category": "200"
      },
      "guests": {
        "name": "Jan Novák"
      }
    }
  ]
}
```

---

### `PATCH /api/hardware/reservations/[id]`

Aktualizuje stav rezervace.

**Request:**
```json
{
  "status": "completed"  // nebo "cancelled"
}
```

---

### `DELETE /api/hardware/reservations/[id]`

Smaže rezervaci.

---

## 📊 Administrace

### Dashboard → Hardware

**Statistiky:**
- 📊 Celkem rezervací
- ✅ Aktivní rezervace
- ✓ Dokončené rezervace
- ❌ Zrušené rezervace
- 💰 Celkový příjem

**Filtrování:**
- Vše
- Aktivní
- Dokončené
- Zrušené

**Akce:**
- ✅ Označit jako dokončeno
- ❌ Zrušit rezervaci
- 🗑️ Smazat rezervaci

---

## 🎨 UI Komponenty

### Kategorie selector (3 karty)

```
┌─────────────────────────────────────────────┐
│  🖥️  Monitory Premium                      │
│     200 Kč za noc                           │
│     QHD/WQHD • 144-240Hz                    │
└─────────────────────────────────────────────┘
```

### Hardware položky grid

```
┌──────────────────────┬──────────────────────┐
│ MAG 271QPX #1     ✓ │ MAG 271QPX #2        │
│ QHD • 27"           │ QHD • 27"            │
│ 240 Hz              │ 240 Hz               │
│ 200 Kč/noc          │ 200 Kč/noc           │
└──────────────────────┴──────────────────────┘
```

### Rezervační panel

```
┌─────────────────────────────────────────────┐
│ Vybrané položky                             │
│ 2× monitor • 2× noc                         │
│                                             │
│ Počet nocí: [2]    Celkem: 800 Kč          │
│                                             │
│               [Rezervovat]                   │
└─────────────────────────────────────────────┘
```

---

## 🔐 Zabezpečení

- ✅ Rezervace vždy přiřazeny k aktivní session
- ✅ Propojení s konkrétním hostem
- ✅ Admin oprávnění pro změnu stavu
- ✅ Validace počtu nocí (min. 1)
- ✅ Validace ceny (vždy kladná)

---

## 📈 Statistiky a reporty

### Pro hosta (budoucí funkce):
- Historie všech rezervací
- Celková částka za hardware
- Aktuálně aktivní rezervace

### Pro admina:
- Přehled využití jednotlivých kusů
- Celkový příjem z rezervací
- Most popular hardware
- Průměrný počet nocí

---

## 🚀 Použití

### Spuštění migrace:

1. Otevři **Supabase Dashboard**
2. SQL Editor
3. Spusť soubor: `supabase/migrations/0003_hardware_system.sql`

```sql
-- Toto vytvoří tabulky a vloží všechny 44 kusů hardware
```

### Testování:

1. **Homepage** → Vyber akci
2. Klikni **"Rezervace HW"**
3. Vyber kategorii **"Monitory Premium"**
4. Vyber několik monitorů (kliknutím)
5. Nastav počet nocí na **2**
6. Klikni **"Rezervovat"**
7. Vyber svého hosta
8. **Potvrď** rezervaci

### Admin kontrola:

1. **Admin Dashboard**
2. **Rezervace HW**
3. Uvidíš novou rezervaci v tabulce
4. Zkus změnit stav na "Dokončeno"

---

## 💡 Tipy

### Pro hosty:
- ✅ Vyberte hardware podle svých potřeb (rozlišení, Hz)
- ✅ Ultrawide monitory jsou ideální pro streaming
- ✅ 240Hz monitory pro kompetitivní hry
- ✅ PC jsou top výkonu - RTX 5070 zvládne vše

### Pro adminy:
- ✅ Kontroluj dostupnost před akcí
- ✅ Označuj dokončené rezervace po vrácení HW
- ✅ Sleduj celkový příjem z rezervací
- ✅ Exportuj seznam rezervací pro přípravu HW

---

## 📦 Celkový přehled hardware

**Celkem kusů:** 43
- Monitory Premium (200 Kč): **14 ks**
- Monitory Standard (100 Kč): **18 ks**
- Gaming PC (250 Kč): **11 ks**

---

## 🐛 Troubleshooting

### Problém: Hardware se nezobrazuje
**Řešení:** Zkontroluj, že migrace proběhla úspěšně a hardware_items obsahuje data

### Problém: Nelze vytvořit rezervaci
**Řešení:** 
- Zkontroluj, že existuje aktivní session
- Ověř, že host existuje v systému
- Zkus refresh stránky

### Problém: Špatná celková cena
**Řešení:** Cena se počítá: `price_per_night × nights_count × počet_položek`

---

## 📚 Related dokumenty

- [CHANGELOG.md](./CHANGELOG.md) - Historie změn
- [README.md](./README.md) - Obecná dokumentace
- [supabase/migrations/0003_hardware_system.sql](./supabase/migrations/0003_hardware_system.sql) - SQL migrace

---

## 🎯 Budoucí vylepšení

- [ ] Kalendář dostupnosti hardware
- [ ] Automatické potvrzovací emaily
- [ ] QR kódy pro předávání/vracení
- [ ] Damage tracking (poškození)
- [ ] Rating system pro hardware
- [ ] Notifikace před koncem rezervace
- [ ] Export rezervací do PDF
- [ ] Deposit/záloha systém

---

**Verze:** 1.4.0  
**Datum:** 2025-01-30  
**Autor:** The Nest Team 🪺