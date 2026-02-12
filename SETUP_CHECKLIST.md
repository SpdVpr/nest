# ✅ Setup Checklist - The Nest

Postupuj krok za krokem pro kompletní nastavení aplikace.

## 📋 Pre-requisites

- [ ] Node.js 18+ nainstalován
- [ ] Git nainstalován
- [ ] Účet na Supabase.com
- [ ] Text editor (VS Code doporučen)

## 🗄️ Supabase Setup

### 1. Vytvoření projektu
- [ ] Jdi na https://supabase.com
- [ ] Vytvoř nový projekt
- [ ] Počkej než projekt naběhne (~2 minuty)
- [ ] Poznamenej si credentials (Project URL, Anon Key, Service Role Key)

### 2. Databázové schéma
- [ ] Otevři SQL Editor v Supabase
- [ ] Zkopíruj a spusť `supabase/schema.sql`
- [ ] Zkontroluj že všechny 4 tabulky byly vytvořeny:
  - [ ] `sessions`
  - [ ] `guests`
  - [ ] `products`
  - [ ] `consumption`

### 3. RLS Policies
- [ ] V SQL Editoru spusť `supabase/rls-policies.sql`
- [ ] Zkontroluj že RLS je enabled na všech tabulkách
- [ ] Ověř že policies jsou vytvořené (v Table Editor → RLS Policies)

### 4. Storage Setup
- [ ] Jdi do Storage v Supabase
- [ ] Vytvoř nový bucket: `product-images`
- [ ] Nastav bucket jako **Public**
- [ ] V SQL Editoru spusť `supabase/storage-policies.sql`
- [ ] Zkontroluj storage policies

### 5. Vytvoř testovací session
- [ ] V SQL Editoru spusť:
```sql
INSERT INTO sessions (name, is_active) 
VALUES ('Test LAN Party', true);
```

## 💻 Aplikace Setup

### 1. Dependencies
- [ ] Otevři terminal v projektu
- [ ] Spusť `npm install`
- [ ] Počkaj na dokončení instalace

### 2. Environment Variables
- [ ] Zkopíruj `.env.example` do `.env.local`
- [ ] Vyplň hodnoty z Supabase:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` - Project URL
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon/Public Key
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service Role Key
  - [ ] `ADMIN_PASSWORD` - Zvol silné heslo

### 3. Spuštění
- [ ] Spusť `npm run dev`
- [ ] Otevři http://localhost:3000
- [ ] Měla by se načíst homepage

## 🧪 Testování

### Test 1: Homepage
- [ ] Vidíš 2 velká tlačítka (Nový host / Už jsem tady)
- [ ] Vidíš odkaz na Admin přihlášení

### Test 2: Admin Login
- [ ] Jdi na http://localhost:3000/admin/login
- [ ] Zadej heslo z `.env.local`
- [ ] Měl by ses přihlásit

### Test 3: Vytvoření produktu
- [ ] V admin → klikni na "Správa produktů"
- [ ] Klikni "Přidat produkt"
- [ ] Vyplň:
  - Název: "Coca Cola 0.5L"
  - Cena: 25
  - Kategorie: "Nápoje"
- [ ] (Volitelně) Nahraj obrázek
- [ ] Klikni "Vytvořit produkt"
- [ ] Produkt se objeví v seznamu

### Test 4: Registrace hosta
- [ ] Jdi na homepage
- [ ] Klikni "Jsem nový host"
- [ ] Zadej jméno "Test Host"
- [ ] Klikni "Vytvořit účet"
- [ ] Měla by se načíst stránka s produkty

### Test 5: Přidání produktu do spotřeby
- [ ] Měl by ses vidět produkty (včetně Coca Coly)
- [ ] Klikni "Přidat" u produktu
- [ ] Součet by se měl aktualizovat v hlavičce
- [ ] Produkt byl přidán do spotřeby ✅

### Test 6: Výběr existujícího hosta
- [ ] Jdi na homepage
- [ ] Klikni "Už jsem tady"
- [ ] Měl by ses vidět "Test Host" v seznamu
- [ ] Klikni na něj
- [ ] Měla by se načíst stránka s produkty
- [ ] Součet by měl zahrnovat předchozí spotřebu

## 🎉 Hotovo!

Pokud prošly všechny testy ✅, aplikace je plně funkční!

## 🚀 Další kroky

1. **Přidej více produktů** v admin rozhraní
2. **Vytvoř další hosty** pro testování
3. **Zkus různé scénáře** použití
4. **Připrav tablet** pro použití na LAN party

## 🐛 Něco nefunguje?

### Admin login nefunguje
→ Restartuj dev server (`Ctrl+C` a `npm run dev`)
→ Zkontroluj `.env.local`

### Produkty se nezobrazují
→ Zkontroluj RLS policies v Supabase
→ Zkontroluj že produkt má `is_available = true`

### Upload obrázků nefunguje
→ Zkontroluj Storage bucket existuje
→ Zkontroluj storage policies
→ Zkontroluj `SUPABASE_SERVICE_ROLE_KEY`

### "No active session found"
→ Vytvoř session v SQL Editoru (viz krok 5 Supabase Setup)
→ Nebo jdi do `/admin/sessions` a vytvoř tam

## 📚 Dokumentace

- `README.md` - Kompletní dokumentace projektu
- `DEPLOYMENT.md` - Návod na deployment
- `supabase/README.md` - Supabase setup detaily
- `the_nest_implementation_guide.md` - Původní implementační návod