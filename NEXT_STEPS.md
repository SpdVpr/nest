# 🎯 Další kroky - Firebase Migrace

## 🎉 Co je hotové

Gratulujeme! Základní migrace na Firebase je dokončena:

✅ **Infrastruktura** - Firebase SDK, helper funkce, type definitions  
✅ **Core API** - Products, Sessions, Guests, Consumption  
✅ **Hardware API** - Hardware items listing  
✅ **Events API** - Event detail, upcoming events  
✅ **Dokumentace** - Kompletní návody a guides  
✅ **Setup Script** - Automatická inicializace databáze  

**Aplikace je funkční pro základní použití!** 🚀

---

## 📋 Co zbývá dokončit

### 1️⃣ Priorita VYSOKÁ (nutné pro plnou funkčnost)

Tyto endpointy jsou potřeba pro kompletní funkčnost aplikace:

```
📁 app/api/hardware/reservations/
  ├─ route.ts (GET, POST)
  └─ [id]/route.ts (PATCH, DELETE)

📁 app/api/event/[slug]/
  ├─ guests/route.ts (GET s consumption)
  └─ products/route.ts (GET)

📁 app/api/snacks/
  └─ guests-with-consumption/route.ts (GET)
```

**Odhadovaný čas:** 2-3 hodiny

### 2️⃣ Priorita STŘEDNÍ (admin funkce)

Admin panel pro správu dat:

```
📁 app/api/admin/
  ├─ products/
  │  ├─ route.ts (GET, POST)
  │  └─ [id]/route.ts (GET, PATCH, DELETE)
  ├─ hardware/
  │  ├─ route.ts (GET, POST)
  │  └─ [id]/route.ts (GET, PATCH, DELETE)
  ├─ sessions/
  │  ├─ route.ts (GET, POST)
  │  └─ [id]/route.ts (GET, PATCH, DELETE)
  └─ guests/
     └─ [id]/route.ts (PATCH, DELETE)
```

**Odhadovaný čas:** 4-5 hodin

### 3️⃣ Priorita NÍZKÁ (pokročilé funkce)

Pouze pokud se používají:

```
📁 app/api/seats/
  ├─ route.ts (GET, POST)
  └─ [id]/route.ts (PATCH, DELETE)

📁 app/api/admin/
  └─ sync-products/route.ts (možná nebude potřeba)
```

**Odhadovaný čas:** 1-2 hodiny

### 4️⃣ Cleanup

```
✓ Smazat lib/supabase/ složku
✓ Smazat supabase/ složku
✓ Aktualizovat README.md
✓ Aktualizovat START_HERE.md (pokud existuje)
```

**Odhadovaný čas:** 30 minut

---

## 🚀 Jak začít

### Krok 1: Nastav Firebase

Pokud jsi to ještě neudělal, následuj **`FIREBASE_QUICKSTART.md`**

### Krok 2: Inicializuj databázi

```bash
npm run setup:firebase
```

### Krok 3: Spusť aplikaci

```bash
npm run dev
```

Otevři http://localhost:3000 a vyzkoušej, že základní funkce fungují.

### Krok 4: Migruj zbývající endpointy

Postupuj podle priority (viz výše). Pro každý endpoint:

1. Otevři soubor v editoru
2. Použij vzor z **`FIREBASE_MIGRATION.md`**
3. Využij helper funkce z `lib/firebase/queries.ts`
4. Otestuj v prohlížeči

**Příklad migrace:**

```typescript
// PŘED (Supabase)
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('field', 'value')

// PO (Firebase)
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { collection, query, where, getDocs } from 'firebase-admin/firestore'

const db = getFirebaseAdminDb()
const q = query(
  collection(db, 'table'),
  where('field', '==', 'value')
)
const snapshot = await getDocs(q)
const data = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}))
```

---

## 📚 Užitečné zdroje

| Dokument | Účel |
|----------|------|
| `FIREBASE_QUICKSTART.md` | Rychlý start s Firebase |
| `FIREBASE_MIGRATION.md` | Detailní migration guide |
| `MIGRATION_STATUS.md` | Checklist hotových/zbývajících úkolů |
| `lib/firebase/queries.ts` | Helper funkce pro časté dotazy |

---

## 💡 Tipy pro rychlejší migraci

### 1. Použij helper funkce

Místo psaní dotazů ručně:

```typescript
// ❌ Špatně - psát dotaz ručně
const db = getFirebaseAdminDb()
const q = query(
  collection(db, 'sessions'),
  where('is_active', '==', true),
  limit(1)
)
const snapshot = await getDocs(q)
// ... konverze dat ...

// ✅ Dobře - použít helper
import { getActiveSession } from '@/lib/firebase/queries'
const session = await getActiveSession()
```

### 2. Kopíruj existující migrované endpointy

Podívej se na už hotové endpointy jako vzor:
- `app/api/products/route.ts`
- `app/api/guests/route.ts`
- `app/api/consumption/route.ts`

### 3. Testuj průběžně

Po každém migrovaném endpointu:
1. Restartuj dev server
2. Otevři aplikaci
3. Vyzkoušej funkci
4. Zkontroluj Network tab

### 4. Přidej nové helper funkce

Pokud zjistíš, že nějaký dotaz používáš vícekrát, přidej ho do `lib/firebase/queries.ts`

---

## 🧪 Testování

### Základní funkce (už fungují)

- ✅ Zobrazení produktů
- ✅ Vytvoření hosta
- ✅ Přidání consumption
- ✅ Zobrazení hardware items
- ✅ Event detail
- ✅ Upcoming events

### Co otestovat po dokončení Priority 1

- Hardware rezervace (vytvoření, zobrazení, smazání)
- Detail hostů na event stránce s consumption
- Snacks dashboard

### Co otestovat po dokončení Priority 2

- Admin panel - CRUD operace pro všechny entity
- Vytvoření nové session
- Editace produktů
- Správa hardware

---

## 🐛 Časté problémy a řešení

### "Cannot read property 'toDate' of undefined"

**Problém:** Timestamp field je null nebo undefined

**Řešení:**
```typescript
created_at: doc.data().created_at?.toDate().toISOString() || new Date().toISOString()
```

### "Missing or insufficient permissions"

**Problém:** Firestore Security Rules blokují přístup

**Řešení:** Zkontroluj `firestore.rules` a ujisti se, že máš `allow read: true`

### "Index not found"

**Problém:** Firestore potřebuje composite index pro složitý dotaz

**Řešení:** 
1. Firebase ti ukáže link na vytvoření indexu
2. Nebo použij `firestore.indexes.json` a nahraj ho do Firebase Console

### "Firebase Admin not initialized"

**Problém:** Chybí nebo je špatně nastavený `FIREBASE_SERVICE_ACCOUNT_KEY`

**Řešení:**
1. Zkontroluj `.env.local`
2. Ujisti se, že JSON je validní
3. Restartuj dev server

---

## 📊 Progress Tracking

Použij **`MIGRATION_STATUS.md`** pro sledování pokroku:

```bash
# Otevři v editoru
code MIGRATION_STATUS.md

# Nebo v terminálu
cat MIGRATION_STATUS.md
```

Zaškrtávej ✅ položky jak je dokončuješ!

---

## 🎓 Naučíš se

Během dokončování migrace se naučíš:

- 🔥 Práci s Firebase Firestore
- 📦 NoSQL databázový design
- 🔄 Asynchronní operace v Next.js
- 🛠️ TypeScript type safety
- 🧪 API testování

---

## 🆘 Potřebuješ pomoc?

1. **Přečti si dokumentaci** - `FIREBASE_MIGRATION.md` má detailní návody
2. **Podívej se na hotové endpointy** - jsou vzorem pro ostatní
3. **Zkontroluj Firebase Console** - vidíš tam data v reálném čase
4. **Použij DevTools** - Network tab ukazuje API requesty

---

## ✨ Po dokončení

Až budeš mít vše hotové:

1. ✅ Smaž staré Supabase soubory
2. ✅ Aktualizuj README.md
3. ✅ Commitni změny do gitu
4. ✅ Nasaď na produkci (Vercel, Firebase Hosting, atd.)
5. 🎉 **Užívej si Firebase!**

---

**Hodně štěstí! 🚀**

Pokud máš jakékoliv otázky, všechny odpovědi najdeš v dokumentaci nebo v už hotových souborech.

