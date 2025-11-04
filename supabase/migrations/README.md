# Database Migrations

Tento adresář obsahuje databázové migrace pro The Nest aplikaci.

## Jak aplikovat migrace

### Možnost 1: Supabase Dashboard (Doporučeno)
1. Otevři Supabase Dashboard: https://app.supabase.com
2. Vyber svůj projekt
3. Jdi do SQL Editor
4. Zkopíruj obsah migračního souboru
5. Spusť SQL příkaz

### Možnost 2: Supabase CLI
```bash
supabase db push
```

## Seznam migrací

### 0002_add_purchase_price.sql
**Datum:** 2024
**Popis:** Přidává pole `purchase_price` (nákupní cena) do tabulky `products`

**Změny:**
- Přidáno pole `purchase_price` do tabulky `products`
- Pole je volitelné (nullable)
- Přidány komentáře pro lepší dokumentaci

**Před použitím:**
```sql
SELECT name, price FROM products LIMIT 5;
-- Pole: name, price
```

**Po aplikaci:**
```sql
SELECT name, price, purchase_price FROM products LIMIT 5;
-- Pole: name, price, purchase_price
```

## Postup při tvorbě nové migrace

1. Vytvoř nový soubor `XXXX_popis_zmeny.sql`
2. Používaj čísla postupně (0003, 0004, atd.)
3. Vždy přidej `IF NOT EXISTS` nebo `IF EXISTS` kontroly
4. Otestuj na lokální databázi
5. Aplikuj na produkci
6. Aktualizuj tento README

## Důležité poznámky

⚠️ **Vždy zálohuj databázi před aplikací migrace!**
⚠️ **Migrace by měly být idempotentní** (lze je spustit vícekrát bez chyby)
⚠️ **Nikdy nemazej staré migrační soubory**