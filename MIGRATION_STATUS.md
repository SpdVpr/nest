# 📊 Firebase Migration Status

Aktuální stav migrace z Supabase na Firebase.

---

## ✅ HOTOVO (Completed)

### Infrastruktura
- ✅ Firebase SDK nainstalováno (`firebase`, `firebase-admin`)
- ✅ Supabase SDK odstraněno (`@supabase/ssr`, `@supabase/supabase-js`)
- ✅ Firebase client library (`lib/firebase/client.ts`)
- ✅ Firebase Admin SDK (`lib/firebase/admin.ts`)
- ✅ Helper funkce (`lib/firebase/helpers.ts`)
- ✅ Query helper funkce (`lib/firebase/queries.ts`)
- ✅ Type definitions přepsány (`types/database.types.ts`)
- ✅ Environment variables example (`.env.example`)
- ✅ Setup script (`scripts/setup-firebase.ts`)
- ✅ Package.json aktualizován

### Dokumentace
- ✅ Firebase Migration Guide (`FIREBASE_MIGRATION.md`)
- ✅ Firebase Quick Start Guide (`FIREBASE_QUICKSTART.md`)
- ✅ Migration Status Checklist (`MIGRATION_STATUS.md`)

### API Endpointy - Core Functionality
- ✅ `app/api/products/route.ts` - GET, POST
- ✅ `app/api/sessions/active/route.ts` - GET
- ✅ `app/api/guests/route.ts` - GET, POST
- ✅ `app/api/consumption/route.ts` - GET, POST, DELETE

### API Endpointy - Hardware
- ✅ `app/api/hardware/items/route.ts` - GET

### API Endpointy - Events
- ✅ `app/api/event/[slug]/route.ts` - GET
- ✅ `app/api/events/upcoming/route.ts` - GET

---

## 🚧 ZBÝVÁ DOKONČIT (To Do)

### API Endpointy - Hardware (2 soubory)
- ⏳ `app/api/hardware/reservations/route.ts` - GET, POST
- ⏳ `app/api/hardware/reservations/[id]/route.ts` - PATCH, DELETE

### API Endpointy - Events (2 soubory)
- ⏳ `app/api/event/[slug]/guests/route.ts` - GET (s consumption joins)
- ⏳ `app/api/event/[slug]/products/route.ts` - GET

### API Endpointy - Snacks (1 soubor)
- ⏳ `app/api/snacks/guests-with-consumption/route.ts` - GET

### API Endpointy - Admin Products (2 soubory)
- ⏳ `app/api/admin/products/route.ts` - GET, POST
- ⏳ `app/api/admin/products/[id]/route.ts` - GET, PATCH, DELETE

### API Endpointy - Admin Hardware (2 soubory)
- ⏳ `app/api/admin/hardware/route.ts` - GET, POST
- ⏳ `app/api/admin/hardware/[id]/route.ts` - GET, PATCH, DELETE

### API Endpointy - Admin Sessions (2 soubory)
- ⏳ `app/api/admin/sessions/route.ts` - GET, POST
- ⏳ `app/api/admin/sessions/[id]/route.ts` - GET, PATCH, DELETE

### API Endpointy - Admin Guests (1 soubor)
- ⏳ `app/api/admin/guests/[id]/route.ts` - PATCH, DELETE

### API Endpointy - Admin Other (1 soubor)
- ⏳ `app/api/admin/sync-products/route.ts` - POST (možná nebude potřeba)

### Seat Reservations (pokud se používá)
- ⏳ `app/api/seats/route.ts` - GET, POST
- ⏳ `app/api/seats/[id]/route.ts` - PATCH, DELETE

### Cleanup
- ⏳ Smazat `lib/supabase/` složku
- ⏳ Smazat `supabase/` složku
- ⏳ Aktualizovat `README.md`
- ⏳ Aktualizovat `START_HERE.md` (pokud existuje)

---

## 📈 Progress

**Celkový progress:** ~40% hotovo

- **Infrastruktura:** 100% ✅
- **Dokumentace:** 100% ✅
- **Core API:** 100% ✅ (products, sessions, guests, consumption)
- **Hardware API:** 33% 🚧 (items hotovo, reservations zbývá)
- **Events API:** 50% 🚧 (základní hotovo, detail guests/products zbývá)
- **Admin API:** 0% ⏳ (všechny admin endpointy zbývají)
- **Ostatní:** 0% ⏳ (snacks, seats)

---

## 🎯 Doporučené pořadí dokončení

### Priorita 1 - VYSOKÁ (nutné pro základní funkčnost)
1. `app/api/hardware/reservations/route.ts`
2. `app/api/hardware/reservations/[id]/route.ts`
3. `app/api/event/[slug]/guests/route.ts`
4. `app/api/event/[slug]/products/route.ts`
5. `app/api/snacks/guests-with-consumption/route.ts`

### Priorita 2 - STŘEDNÍ (admin funkce)
6. `app/api/admin/products/route.ts`
7. `app/api/admin/products/[id]/route.ts`
8. `app/api/admin/hardware/route.ts`
9. `app/api/admin/hardware/[id]/route.ts`
10. `app/api/admin/sessions/route.ts`
11. `app/api/admin/sessions/[id]/route.ts`
12. `app/api/admin/guests/[id]/route.ts`

### Priorita 3 - NÍZKÁ (pokročilé funkce)
13. `app/api/seats/route.ts` (pokud se používá)
14. `app/api/seats/[id]/route.ts` (pokud se používá)
15. `app/api/admin/sync-products/route.ts` (možná nebude potřeba)

### Priorita 4 - CLEANUP
16. Smazat staré Supabase soubory
17. Aktualizovat dokumentaci

---

## 💡 Tipy pro dokončení

### Použij helper funkce
Místo psaní dotazů ručně, použij funkce z `lib/firebase/queries.ts`:
- `getActiveSession()`
- `getSessionById(sessionId)`
- `getSessionBySlug(slug)`
- `getGuestsBySessionId(sessionId)`
- `getGuestById(guestId)`
- `getAvailableProducts()`
- `getAllProducts()`
- `getProductById(productId)`
- `getAllHardwareItems()`
- `getAvailableHardwareItems()`
- `getHardwareItemById(itemId)`

### Vzor pro migraci
Viz `FIREBASE_MIGRATION.md` sekce "Jak migrovat zbývající API endpointy"

### Testování
Po každém migrovaném endpointu:
1. Spusť `npm run dev`
2. Otevři aplikaci v prohlížeči
3. Vyzkoušej funkci, která používá endpoint
4. Zkontroluj Network tab v DevTools

---

## 🔗 Užitečné odkazy

- **Firebase Console:** https://console.firebase.google.com/
- **Firestore Docs:** https://firebase.google.com/docs/firestore
- **Firebase Admin SDK:** https://firebase.google.com/docs/admin/setup

---

## 📝 Poznámky

### Co funguje hned teď
- ✅ Zobrazení produktů
- ✅ Vytvoření hosta
- ✅ Přidání consumption
- ✅ Zobrazení hardware items
- ✅ Zobrazení event detailu
- ✅ Zobrazení upcoming events

### Co ještě nefunguje
- ❌ Hardware rezervace
- ❌ Detail hostů na event stránce
- ❌ Admin panel (všechny CRUD operace)
- ❌ Snacks dashboard s consumption
- ❌ Seat rezervace (pokud se používá)

---

**Poslední aktualizace:** 2025-11-05

