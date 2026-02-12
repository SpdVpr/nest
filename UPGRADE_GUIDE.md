# The Nest - Upgrade Guide

## Verze 1.3.0 - Vylepšení správy

### 🎯 Co je nového

1. **Editace eventů** - Možnost upravit název a datum eventu
2. **Nákupní cena u produktů** - Přidána možnost zadat nákupní cenu (pro výpočet marže)
3. **Kategorie jako dropdown** - Výběr z přednastavených kategorií
4. **Detail hosta** - Prokliknutelné karty hostů s detailními statistikami
5. **Oprava loginu** - Heslo je nyní vidět při psaní

### 📦 Aktualizace databáze

Pro využití nových funkcí musíš aktualizovat databázi:

#### 1. Přidej pole purchase_price do tabulky products

```sql
-- Přidání nákupní ceny
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2) CHECK (purchase_price >= 0);

COMMENT ON COLUMN products.price IS 'Prodejní cena (selling price)';
COMMENT ON COLUMN products.purchase_price IS 'Nákupní cena (purchase price) - volitelné';
```

**Kde to spustit:**
1. Otevři Supabase Dashboard
2. Jdi do SQL Editor
3. Zkopíruj a spusť SQL kód výše

**Nebo použij migrační soubor:**
- Soubor: `supabase/migrations/0002_add_purchase_price.sql`

### 🔄 Aktualizace kódu

Pokud používáš Git:

```bash
git pull origin main
npm install
```

### ✅ Kontrola

Po aktualizaci zkontroluj:

1. ✅ Admin login - heslo je vidět při psaní
2. ✅ Správa eventů - tlačítko "Upravit" u každého eventu
3. ✅ Nový produkt - pole "Nákupní cena" a "Prodejní cena"
4. ✅ Kategorie - dropdown menu s kategoriemi
5. ✅ Hosté - klik na hosta otevře detail

### 📊 Nové funkce

#### Editace eventů
- Jdi do **Admin → Správa eventů**
- Klikni "Upravit" u eventu
- Uprav název nebo datum
- Klikni "Uložit změny"

#### Nákupní a prodejní cena
- **Prodejní cena** - cena, za kterou prodáváš (povinné)
- **Nákupní cena** - cena, za kterou jsi koupil (volitelné)
- Rozdíl = marže/profit

Příklad:
```
Produkt: Coca Cola 0.5L
Nákupní cena: 15 Kč
Prodejní cena: 25 Kč
Marže: 10 Kč (40%)
```

#### Detail hosta
Klikni na jakéhokoli hosta v "Správa hostů" a uvidíš:
- 📊 Statistiky (položky, piva, celková částka)
- 📝 Historie spotřeby
- 📈 Rozpad podle kategorií
- 📅 Informace o registraci

### 🚀 Budoucí funkce

V detailu hosta je sekce "Připravujeme":
- Rezervace PC
- Správa ubytování
- Platby a účty
- Turnaje a žebříčky

Tyto funkce budou přidány v dalších verzích.

### 🐛 Opravy chyb

- ✅ Heslo v admin loginu je nyní černé a dobře viditelné
- ✅ Prodejní cena je nyní jasně označena
- ✅ Kategorie mají konzistentní formátování

### 💡 Doporučení

1. **Vyplň nákupní ceny** u existujících produktů pro sledování marže
2. **Používej přednastavené kategorie** pro konzistenci
3. **Pravidelně kontroluj detail hostů** pro sledování spotřeby

### ❓ Problémy?

Pokud něco nefunguje:
1. Zkontroluj, že jsi spustil SQL migraci
2. Restartuj dev server (`npm run dev`)
3. Zkus vyčistit cache prohlížeče (Ctrl+Shift+R)

---

**Předchozí verze:** [Changelog](./CHANGELOG.md)