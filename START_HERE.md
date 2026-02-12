# 🚀 START HERE - The Nest Quick Start

## ✅ Co je hotovo

Aplikace je **KOMPLETNĚ VYTVOŘENÁ** a připravená k použití!

```
✅ Next.js 16 projekt s TypeScript
✅ Supabase integration
✅ Databázové schéma (SQL skripty připraveny)
✅ RLS policies
✅ Storage policies
✅ Admin autentizace
✅ CRUD produktů s upload obrázků ⭐
✅ Session management
✅ Registrace a výběr hostů
✅ Výběr produktů hostem
✅ Real-time součet spotřeby
✅ API endpoints
✅ Responsive design
```

## 📝 Co musíš udělat TEĎ

### Krok 1: Supabase Setup (15 minut)

1. **Vytvoř projekt** na https://supabase.com
2. **V SQL Editoru spusť** (v tomto pořadí!):
   - `supabase/schema.sql` ← Databázové tabulky
   - `supabase/rls-policies.sql` ← Zabezpečení
3. **Ve Storage vytvoř** bucket `product-images` (veřejný)
4. **V SQL Editoru spusť** `supabase/storage-policies.sql`
5. **Poznamenej si** Project URL, Anon Key, Service Role Key

📖 Detailní návod: `supabase/README.md`

### Krok 2: Environment Variables (2 minuty)

1. Zkopíruj `.env.example` do `.env.local`
2. Vyplň hodnoty z Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=tvoje-url-zde
NEXT_PUBLIC_SUPABASE_ANON_KEY=tvoje-anon-key-zde
SUPABASE_SERVICE_ROLE_KEY=tvoje-service-role-key-zde
ADMIN_PASSWORD=silne-heslo-zde
```

### Krok 3: První session (1 minuta)

V Supabase SQL Editoru:
```sql
INSERT INTO sessions (name, is_active) 
VALUES ('Test LAN Party', true);
```

### Krok 4: Spuštění (1 minuta)

```bash
npm run dev
```

Otevři: http://localhost:3000

## 🧪 Rychlý test

### 1. Admin Login
- Jdi na: http://localhost:3000/admin/login
- Zadej heslo z `.env.local`
- ✅ Měl bys vidět dashboard

### 2. Přidej produkt
- Klikni "Správa produktů"
- "Přidat produkt"
- Vyplň: Název, Cena, (volitelně) Obrázek
- ✅ Produkt se objeví v seznamu

### 3. Test hosta
- Jdi na homepage: http://localhost:3000
- "Jsem nový host" → zadej jméno
- ✅ Měl bys vidět produkty
- Klikni "Přidat" na produkt
- ✅ Součet by se měl aktualizovat

## 🎯 Všechno funguje?

**Ano?** 🎉 Můžeš začít používat aplikaci!
**Ne?** 📖 Projdi `SETUP_CHECKLIST.md`

## 📚 Dokumentace

- **README.md** - Kompletní dokumentace
- **SETUP_CHECKLIST.md** - Detailní setup checklist
- **DEPLOYMENT.md** - Jak nasadit na Vercel
- **supabase/README.md** - Supabase setup detaily

## 🚀 Co dál?

1. **Přidej více produktů** v admin rozhraní
2. **Vytvoř více hostů** pro testování
3. **Připrav tablet** pro LAN party
4. **Nasaď na Vercel** (viz DEPLOYMENT.md)

## 💡 Důležité poznámky

- **Bez Supabase setup** aplikace nebude fungovat!
- **Admin heslo** si dobře zapamatuj
- **Storage bucket** musí být PUBLIC
- **Jeden aktivní session** najednou

## 🆘 Pomoc

Něco nefunguje? Zkontroluj:
1. Jsou všechny SQL skripty spuštěny?
2. Existuje aktivní session?
3. Je storage bucket vytvořený?
4. Jsou správně vyplněné environment variables?
5. Byl restartován dev server?

---

**Připraven začít?** → Začni krokem 1 (Supabase Setup) ⬆️