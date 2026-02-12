# 🚀 Upgrade na verzi 1.4.0 - Hardware Rezervační Systém

Tento průvodce ti pomůže upgradovat The Nest na verzi 1.4.0, která přidává kompletní systém pro rezervaci hardware (monitorů a PC).

---

## 📋 Co je nového?

### ✨ Hlavní funkce:
- 🖥️ **Rezervace hardware** - 33 monitorů + 11 PC
- 🎯 **Výběr akce na homepage** - Nový workflow s výběrem události
- 📊 **Admin správa rezervací** - Kompletní přehled a statistiky
- 💰 **Automatická kalkulace cen** - Podle počtu nocí

---

## ⚠️ Před upgradem

### 1. Záloha databáze
```sql
-- V Supabase Dashboard → Database → Backups
-- Nebo export tabulek:
SELECT * FROM sessions;
SELECT * FROM guests;
SELECT * FROM products;
SELECT * FROM consumption;
```

### 2. Zkontroluj aktivní session
- Ujisti se, že máš aktivní session v databázi
- Pokud ne, vytvoř ji před migrací

---

## 🔧 Instalace (Krok za krokem)

### Krok 1: Stáhni nové soubory

Všechny nové soubory jsou již ve složce `the-nest/`. Není třeba nic stahovat.

---

### Krok 2: Aplikuj databázovou migraci

#### Možnost A: Supabase Dashboard (doporučeno)

1. **Otevři Supabase Dashboard**
   - https://app.supabase.com
   - Vyber projekt "The Nest"

2. **Přejdi na SQL Editor**
   - V levém menu: **SQL Editor**

3. **Vytvoř nový query**
   - Klikni **"New query"**

4. **Zkopíruj obsah migrace**
   - Otevři soubor: `d:\nest\the-nest\supabase\migrations\0003_hardware_system.sql`
   - Zkopíruj celý obsah

5. **Vlož do SQL Editoru a spusť**
   - Vlož zkopírovaný SQL
   - Klikni **"Run"** nebo Ctrl+Enter

6. **Ověř úspěch**
   - Měl bys vidět: "Success. No rows returned"
   - V levém menu **Table Editor** zkontroluj nové tabulky:
     - `hardware_items` (měla by mít 43 řádků)
     - `hardware_reservations` (prázdná tabulka)

#### Možnost B: Supabase CLI

```bash
# Přejdi do složky projektu
cd the-nest

# Aplikuj migraci
supabase db push
```

---

### Krok 3: Ověř migraci

Spusť tento SQL pro kontrolu:

```sql
-- Zkontroluj počet hardware položek
SELECT 
  type,
  category,
  COUNT(*) as count
FROM hardware_items
GROUP BY type, category
ORDER BY type, category;

-- Očekávaný výsledek:
-- monitor | 100 | 18
-- monitor | 200 | 14
-- pc      | 250 | 11
```

---

### Krok 4: Restartuj aplikaci

```powershell
# Zastavit běžící server (Ctrl+C)

# Nainstaluj případné nové závislosti
npm install

# Spusť znovu
npm run dev
```

---

### Krok 5: Otestuj nové funkce

#### Test 1: Homepage s výběrem akce
1. Otevři: http://localhost:3000
2. ✅ Měl bys vidět seznam akcí
3. ✅ Vyber akci
4. ✅ Zobrazí se 3 tlačítka: Občerstvení, Rezervace HW, Admin

#### Test 2: Rezervace hardware
1. Klikni **"Rezervace HW"**
2. ✅ Zobrazí se 3 kategorie
3. ✅ Vyber "Monitory Premium"
4. ✅ Mělo by se zobrazit 14 kusů (15 mínus 1, pokud už nějaký rezervovaný)
5. ✅ Vyber pár monitorů
6. ✅ Nastav počet nocí
7. ✅ Klikni "Rezervovat"
8. ✅ Vyber hosta
9. ✅ Potvrď rezervaci

#### Test 3: Admin správa HW
1. Přejdi do **Admin → Rezervace HW**
2. ✅ Zobrazí se tabulka rezervací
3. ✅ Statistiky v hlavičce
4. ✅ Zkus změnit stav rezervace
5. ✅ Zkus filtrování

---

## 📊 Co se změnilo v databázi?

### Nové tabulky:

```sql
-- 1. Hardware Items (43 položek)
hardware_items
├── id (UUID)
├── name (TEXT)
├── type (monitor/pc)
├── category (200/100/250)
├── price_per_night (DECIMAL)
├── specs (JSONB)
├── is_available (BOOLEAN)
├── created_at
└── updated_at

-- 2. Hardware Reservations
hardware_reservations
├── id (UUID)
├── hardware_item_id (FK)
├── guest_id (FK)
├── session_id (FK)
├── nights_count (INTEGER)
├── total_price (DECIMAL)
├── status (active/completed/cancelled)
├── notes (TEXT)
├── created_at
└── updated_at
```

### Nové indexy:
- `idx_hardware_items_type`
- `idx_hardware_items_category`
- `idx_hardware_items_available`
- `idx_hardware_reservations_guest`
- `idx_hardware_reservations_session`
- `idx_hardware_reservations_item`

### Nové triggery:
- `update_hardware_items_updated_at`
- `update_hardware_reservations_updated_at`

---

## 📁 Nové soubory v projektu

```
the-nest/
├── supabase/
│   └── migrations/
│       └── 0003_hardware_system.sql          ← Nová migrace
├── types/
│   └── hardware.types.ts                     ← Nové TypeScript typy
├── app/
│   ├── (public)/
│   │   └── hardware/
│   │       └── page.tsx                      ← Stránka pro rezervace
│   ├── admin/
│   │   └── hardware/
│   │       └── page.tsx                      ← Admin správa HW
│   └── api/
│       └── hardware/
│           ├── items/
│           │   └── route.ts                  ← API: seznam HW
│           └── reservations/
│               ├── route.ts                  ← API: rezervace
│               └── [id]/
│                   └── route.ts              ← API: update/delete
├── HARDWARE_SYSTEM.md                        ← Dokumentace
├── HARDWARE_UPGRADE.md                       ← Tento soubor
└── CHANGELOG.md                              ← Aktualizováno
```

---

## 🐛 Řešení problémů

### Problém: Migrace selhala

**Error: relation "hardware_items" already exists**
```sql
-- Smaž existující tabulky a zkus znovu
DROP TABLE IF EXISTS hardware_reservations CASCADE;
DROP TABLE IF EXISTS hardware_items CASCADE;
-- Potom spusť migraci znovu
```

---

### Problém: Hardware se nezobrazuje

**Kontrola 1: Ověř data v databázi**
```sql
SELECT COUNT(*) FROM hardware_items;
-- Mělo by vrátit: 43
```

**Kontrola 2: Zkontroluj API endpoint**
- Otevři: http://localhost:3000/api/hardware/items
- Měl bys vidět JSON s hardwarem

---

### Problém: Rezervace nefunguje

**Kontrola 1: Zkontroluj aktivní session**
```sql
SELECT * FROM sessions WHERE is_active = true;
-- Musí vrátit alespoň 1 řádek
```

**Kontrola 2: Zkontroluj hosty**
```sql
SELECT COUNT(*) FROM guests;
-- Musí existovat alespoň 1 host
```

---

### Problém: Chyba v API

**Zkontroluj browser console:**
1. Otevři Developer Tools (F12)
2. Console tab
3. Hledej chybové hlášky

**Zkontroluj server log:**
```powershell
# V terminálu kde běží npm run dev
# Měly by být vidět případné errory
```

---

## 🔄 Rollback (návrat zpět)

Pokud chceš vrátit změny:

### 1. Databáze:
```sql
DROP TABLE IF EXISTS hardware_reservations CASCADE;
DROP TABLE IF EXISTS hardware_items CASCADE;

-- Smaž indexy
DROP INDEX IF EXISTS idx_hardware_items_type;
DROP INDEX IF EXISTS idx_hardware_items_category;
DROP INDEX IF EXISTS idx_hardware_items_available;
DROP INDEX IF EXISTS idx_hardware_reservations_guest;
DROP INDEX IF EXISTS idx_hardware_reservations_session;
DROP INDEX IF EXISTS idx_hardware_reservations_item;

-- Smaž triggery
DROP TRIGGER IF EXISTS update_hardware_items_updated_at ON hardware_items;
DROP TRIGGER IF EXISTS update_hardware_reservations_updated_at ON hardware_reservations;
```

### 2. Kód:
```bash
# Vrať se na předchozí commit
git checkout HEAD~1

# Nebo smaž nové soubory ručně
```

---

## 📚 Další kroky

Po úspěšném upgradu:

1. ✅ Přečti si [HARDWARE_SYSTEM.md](./HARDWARE_SYSTEM.md)
2. ✅ Otestuj rezervace s reálnými hosty
3. ✅ Nastav ceny podle svých potřeb (update v databázi)
4. ✅ Přidej další hardware, pokud potřebuješ

---

## 💬 Potřebuješ pomoc?

- 📖 [HARDWARE_SYSTEM.md](./HARDWARE_SYSTEM.md) - Kompletní dokumentace
- 📝 [CHANGELOG.md](./CHANGELOG.md) - Všechny změny
- 🐛 Issues na GitHubu

---

## ✅ Checklist upgradu

- [ ] Záloha databáze
- [ ] Aplikována migrace 0003
- [ ] Ověřeno 43 hardware položek
- [ ] Restartován server
- [ ] Otestován výběr akce na homepage
- [ ] Otestována rezervace HW
- [ ] Otestována admin správa
- [ ] Přečtena dokumentace

---

**Gratulujeme! 🎉**

Nyní máš plně funkční rezervační systém hardware!

**Verze:** 1.4.0  
**Datum:** 2025-01-30