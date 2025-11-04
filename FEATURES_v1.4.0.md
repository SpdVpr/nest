# 🚀 The Nest v1.4.0 - Rezervační systém hardware

Kompletní přehled nových funkcí a vylepšení ve verzi 1.4.0.

---

## ✨ Co je nového?

### 🖥️ **1. Rezervační systém hardware**

Zcela nový systém pro zapůjčování monitorů a herních PC hostům.

#### Dostupný hardware:

**Monitory Premium (200 Kč/noc) - 14 ks:**
- MAG 271QPX QD-OLED E2 (QHD, 27", 240Hz) × 5
- MAG274QRX (WQHD, 27", 240Hz) × 4  
- Optix MPG341QR (Ultra Wide QHD, 34", 144Hz) × 5

**Monitory Standard (100 Kč/noc) - 18 ks:**
- MAG274QRF (WQHD, 27", 165Hz) × 5
- MAG274QRF-QD (WQHD, 27", 165Hz) × 5
- MAG272QP (WQHD, 27", 165Hz) × 4
- Optix G251PF (Full HD, 24", 165Hz) × 4

**Gaming PC (250 Kč/noc) - 11 ks:**
- MSI MAG Infinite S3 (i5 14400F, 32GB RAM, RTX 5070 12GB) × 11

**Celkem: 43 kusů hardware!** 🎮

---

### 🎯 **2. Nový homepage workflow**

Homepage má nový dvoustupňový workflow:

**Krok 1: Výběr akce**
- Seznam všech akcí s názvy a daty
- Zvýraznění aktivní akce
- Možnost změnit vybranou akci

**Krok 2: Hlavní menu**
Po výběru akce se zobrazí 3 tlačítka:
- 🍕 **Občerstvení** - Přidat spotřebu
- 🖥️ **Rezervace HW** - Zapůjčit hardware
- 🛡️ **Administrace** - Správa systému

---

### 📊 **3. Admin správa hardware**

Nová admin stránka: `/admin/hardware`

**Funkce:**
- ✅ Přehled všech rezervací
- ✅ Filtrování (Vše/Aktivní/Dokončené/Zrušené)
- ✅ Statistiky (celkem, aktivní, dokončené, zrušené, příjem)
- ✅ Změna stavu rezervace
- ✅ Smazání rezervace
- ✅ Export dat

**Statistiky v reálném čase:**
- 📊 Celkem rezervací
- ✅ Počet aktivních
- ✓ Počet dokončených  
- ❌ Počet zrušených
- 💰 Celkový příjem

---

## 🎮 Jak to funguje?

### Pro hosta:

1. **Homepage** → Vyber akci
2. Klikni **"Rezervace HW"**
3. **Vyber kategorii** (Premium/Standard/PC)
4. **Vyber kusy** (můžeš vybrat více najednou)
5. **Nastav počet nocí** (automatická kalkulace ceny)
6. Klikni **"Rezervovat"**
7. **Vyber své jméno** ze seznamu
8. **Potvrď** rezervaci

**✅ Hotovo! Rezervace vytvořena.**

---

### Pro admina:

1. **Admin Dashboard** → **Rezervace HW**
2. Vidíš **tabulku všech rezervací**
3. **Statistiky** v hlavičce
4. **Možnosti:**
   - ✅ Označit jako dokončeno
   - ❌ Zrušit rezervaci
   - 🗑️ Smazat rezervaci
5. **Filtruj** podle stavu

---

## 💰 Příklady cen

```
Monitor Premium na 2 noci:
200 Kč × 2 = 400 Kč

Monitor Standard na 3 noci:
100 Kč × 3 = 300 Kč

Gaming PC na 1 noc:
250 Kč × 1 = 250 Kč

PC + 2× Monitor Premium na 2 noci:
(250 + 200 + 200) × 2 = 1 300 Kč
```

---

## 🗄️ Databázové změny

### Nové tabulky:

**1. `hardware_items` (43 řádků)**
- Seznam všech kusů hardware
- Obsahuje název, typ, kategorii, cenu, specs
- JSON formát pro detailní specifikace

**2. `hardware_reservations`**
- Rezervace hardware pro hosty
- Propojení s hostem, sessionem, hardware položkou
- Status tracking (aktivní/dokončeno/zrušeno)
- Automatická kalkulace celkové ceny

### Nové indexy:
- Rychlé vyhledávání podle typu/kategorie
- Optimalizace pro queries podle session/guest
- Filtrování dostupnosti

---

## 📁 Nové soubory

### Migrace & typy:
```
supabase/migrations/0003_hardware_system.sql
types/hardware.types.ts
```

### Frontend:
```
app/(public)/hardware/page.tsx           - Stránka pro rezervace
app/admin/hardware/page.tsx              - Admin správa
```

### API:
```
app/api/hardware/items/route.ts          - Seznam HW
app/api/hardware/reservations/route.ts   - GET/POST rezervace
app/api/hardware/reservations/[id]/route.ts  - PATCH/DELETE
```

### Dokumentace:
```
HARDWARE_SYSTEM.md      - Kompletní dokumentace
HARDWARE_UPGRADE.md     - Návod na upgrade
CHANGELOG.md            - Historie změn
FEATURES_v1.4.0.md      - Tento soubor
```

---

## 🎨 UI Vylepšení

### Homepage:
- ✅ Dvoustupňový workflow (výběr akce → menu)
- ✅ Elegantní výběr akcí s daty
- ✅ 3 barevné gradient karty (zelená/oranžová/modrá)
- ✅ Možnost změnit akci

### Hardware stránka:
- ✅ 3 barevné kategorie (oranžová/fialová/modrá)
- ✅ Grid layout pro hardware
- ✅ Zelené zvýraznění vybraných položek
- ✅ Velký rezervační panel s cenou
- ✅ Modální okno pro výběr hosta

### Admin hardware:
- ✅ 5 statistických karet s gradienty
- ✅ Filtrovací tlačítka
- ✅ Přehledná tabulka
- ✅ Action buttons (dokončit/zrušit/smazat)
- ✅ Barevné stavy (zelená/šedá/červená)

---

## 🔒 Bezpečnost

- ✅ Rezervace pouze pro aktivní session
- ✅ Propojení s existujícím hostem
- ✅ Admin oprávnění pro změny
- ✅ Validace počtu nocí (min. 1)
- ✅ Validace ceny (vždy kladná)
- ✅ Foreign key constraints

---

## 📊 Reporting & Statistiky

### Aktuálně dostupné:
- ✅ Celkový počet rezervací
- ✅ Aktivní rezervace
- ✅ Dokončené rezervace
- ✅ Zrušené rezervace
- ✅ Celkový příjem z HW

### Připravováno v budoucnu:
- [ ] Historie rezervací per host
- [ ] Most popular hardware
- [ ] Průměrný počet nocí
- [ ] Vytížení jednotlivých kusů
- [ ] Export do PDF/CSV
- [ ] Grafy a vizualizace

---

## 🚀 Instalace

### 1. Aplikuj migraci:

**Supabase Dashboard:**
1. Otevři https://app.supabase.com
2. SQL Editor → New query
3. Zkopíruj `supabase/migrations/0003_hardware_system.sql`
4. Spusť (Run)

**Ověření:**
```sql
SELECT COUNT(*) FROM hardware_items;
-- Mělo by vrátit: 43
```

### 2. Restartuj server:

```powershell
npm run dev
```

### 3. Otestuj:

1. Homepage → Vyber akci → Rezervace HW
2. Vyber monitor → Rezervuj
3. Admin → Rezervace HW → Zkontroluj tabulku

---

## 🎯 Use Cases

### 1. Host bez vlastního monitoru
```
Host: "Potřebuji monitor na celou akci"
→ Rezervace HW → Monitor Standard → 2 noci
→ Celkem: 200 Kč
```

### 2. Host chce prémiový zážitek
```
Host: "Chci nejlepší monitor a výkonný PC"
→ Monitor Premium (240Hz OLED) + Gaming PC
→ 2 noci = 900 Kč
```

### 3. Host má PC, potřebuje jen extra monitor
```
Host: "Přivezu si PC, chci jen druhý monitor"
→ Monitor Standard → 2 noci → 200 Kč
```

### 4. Host bez PC i monitoru
```
Host: "Nemám nic, potřebuji komplet"
→ Gaming PC + Monitor → 2 noci → 700 Kč
```

---

## 💡 Tipy pro používání

### Pro hosty:
- ✅ **QD-OLED monitory** = nejlepší obraz (200 Kč)
- ✅ **240Hz monitory** = pro kompetitivní hry
- ✅ **Ultrawide 34"** = pro simulátory a streamy
- ✅ **PC s RTX 5070** = zvládne AAA hry na ultra

### Pro adminy:
- ✅ **Před akcí:** Zkontroluj dostupnost hardware
- ✅ **Během akce:** Sleduj aktivní rezervace
- ✅ **Po akci:** Označuj dokončené rezervace
- ✅ **Export:** Připrav seznam pro přípravu HW

---

## 🔄 Upgrade z 1.3.0 na 1.4.0

**Podrobný návod:** [HARDWARE_UPGRADE.md](./HARDWARE_UPGRADE.md)

**Quick start:**
1. ✅ Záloha databáze
2. ✅ Aplikuj migraci 0003
3. ✅ Restartuj server
4. ✅ Otestuj funkce

---

## 📚 Další dokumentace

- 📖 [HARDWARE_SYSTEM.md](./HARDWARE_SYSTEM.md) - Detailní dokumentace
- 🔧 [HARDWARE_UPGRADE.md](./HARDWARE_UPGRADE.md) - Návod na upgrade
- 📝 [CHANGELOG.md](./CHANGELOG.md) - Historie všech změn
- 🚀 [README.md](./README.md) - Obecná dokumentace

---

## 🐛 Známé limitace

- ⚠️ Rezervace nelze editovat (pouze zrušit/dokončit/smazat)
- ⚠️ Není kalendářní zobrazení dostupnosti
- ⚠️ Nelze rezervovat na konkrétní datum (pouze počet nocí)
- ⚠️ Není deposit/záloha systém

*Tyto funkce jsou plánovány v budoucích verzích.*

---

## 🎉 Výhody nového systému

✅ **Centralizovaná správa** - Vše na jednom místě
✅ **Automatická kalkulace** - Žádné ruční počítání
✅ **Flexibilní výběr** - Rezervuj více kusů najednou
✅ **Detailní specs** - Hosté vidí přesné parametry
✅ **Admin kontrola** - Kompletní přehled a statistiky
✅ **Status tracking** - Sledování stavu rezervací
✅ **Responzivní** - Funguje na mobilu i desktopu

---

## 🔮 Budoucí plány (v2.0)

- [ ] Kalendářní systém dostupnosti
- [ ] Rezervace na konkrétní dny
- [ ] Email potvrzení
- [ ] QR kódy pro předávání
- [ ] Damage tracking
- [ ] Rating systém
- [ ] Deposit/záloha
- [ ] Notifikace
- [ ] PDF export

---

## ✅ Testing Checklist

- [ ] Vytvořit novou rezervaci monitoru
- [ ] Vytvořit rezervaci PC
- [ ] Rezervovat více kusů najednou
- [ ] Změnit počet nocí
- [ ] Označit rezervaci jako dokončenou
- [ ] Zrušit rezervaci
- [ ] Smazat rezervaci
- [ ] Otestovat filtry v admin panelu
- [ ] Zkontrolovat statistiky
- [ ] Vyzkoušet na mobilu

---

**Verze:** 1.4.0  
**Datum vydání:** 2025-01-30  
**Stabilita:** Production Ready ✅

---

**🪺 The Nest Team**

*Systém pro sledování spotřeby a rezervace hardware na LAN parties*