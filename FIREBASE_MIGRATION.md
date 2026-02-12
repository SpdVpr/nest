# 🔥 Firebase Migration Guide

## ✅ Co je hotové

### 1. Infrastruktura
- ✅ Firebase SDK nainstalováno (`firebase`, `firebase-admin`)
- ✅ Supabase SDK odebráno
- ✅ Firebase client pro browser (`lib/firebase/client.ts`)
- ✅ Firebase Admin SDK pro server (`lib/firebase/admin.ts`)
- ✅ Helper funkce pro Firestore (`lib/firebase/helpers.ts`)
- ✅ Query helper funkce (`lib/firebase/queries.ts`)

### 2. Type Definitions
- ✅ `types/database.types.ts` přepsán pro Firebase strukturu
- ✅ Všechny typy: Session, Guest, Product, Consumption, HardwareItem, HardwareReservation, SeatReservation

### 3. Migrované API Endpointy
- ✅ `/api/products` - GET, POST
- ✅ `/api/sessions/active` - GET
- ✅ `/api/guests` - GET, POST
- ✅ `/api/consumption` - GET, POST, DELETE

## 🚧 Co zbývá dokončit

### API Endpointy k migraci (cca 12 souborů)

1. **Hardware System**
   - `app/api/hardware/items/route.ts`
   - `app/api/hardware/reservations/route.ts`
   - `app/api/hardware/reservations/[id]/route.ts`

2. **Admin Endpointy**
   - `app/api/admin/products/route.ts`
   - `app/api/admin/products/[id]/route.ts`
   - `app/api/admin/hardware/route.ts`
   - `app/api/admin/hardware/[id]/route.ts`
   - `app/api/admin/guests/[id]/route.ts`
   - `app/api/admin/sessions/route.ts`
   - `app/api/admin/sessions/[id]/route.ts`
   - `app/api/admin/sync-products/route.ts` (možná nebude potřeba)

3. **Event System**
   - `app/api/event/[slug]/route.ts`
   - `app/api/event/[slug]/guests/route.ts`
   - `app/api/event/[slug]/products/route.ts`
   - `app/api/events/upcoming/route.ts`

4. **Snacks System**
   - `app/api/snacks/guests-with-consumption/route.ts`

5. **Seat Reservations**
   - `app/api/seats/route.ts`
   - `app/api/seats/[id]/route.ts`

### Ostatní
- Smazat složku `lib/supabase/`
- Smazat složku `supabase/` (SQL skripty už nebudou potřeba)
- Aktualizovat dokumentaci (README.md, START_HERE.md, atd.)
- Vytvořit Firebase setup skript

---

## 📋 Firebase Setup - Krok za krokem

### 1. Vytvoř Firebase Projekt

1. Jdi na https://console.firebase.google.com/
2. Klikni na "Add project" nebo "Přidat projekt"
3. Zadej název projektu (např. "the-nest")
4. Pokračuj přes wizard (můžeš vypnout Google Analytics, pokud nechceš)

### 2. Aktivuj Firestore Database

1. V levém menu klikni na "Firestore Database"
2. Klikni "Create database"
3. Vyber "Start in production mode" (pravidla nastavíme později)
4. Vyber region (např. `europe-west3` pro Frankfurt)

### 3. Získej Firebase Config

1. V Project Settings (⚙️ ikona) jdi na "General"
2. Scroll dolů na "Your apps"
3. Klikni na web ikonu `</>`
4. Zaregistruj aplikaci (např. "the-nest-web")
5. Zkopíruj `firebaseConfig` objekt

### 4. Vytvoř Service Account

1. V Project Settings jdi na "Service accounts"
2. Klikni "Generate new private key"
3. Stáhne se JSON soubor - **USCHOVEJ HO BEZPEČNĚ!**

### 5. Nastav Environment Variables

Vytvoř nebo uprav `.env.local`:

```env
# Firebase Client Config (pro browser)
NEXT_PUBLIC_FIREBASE_API_KEY=tvoje-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tvuj-projekt.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tvuj-projekt-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tvuj-projekt.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin (pro server) - celý JSON jako string
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...celý JSON..."}'

# Admin heslo (zachováno z původní aplikace)
ADMIN_PASSWORD=tvoje-silne-heslo
```

**TIP:** Pro `FIREBASE_SERVICE_ACCOUNT_KEY` zkopíruj celý obsah staženého JSON souboru a dej ho do jednoduchých uvozovek.

### 6. Nastav Firestore Security Rules

V Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Povolit čtení všem (pro public event pages)
    match /{document=**} {
      allow read: true;
    }
    
    // Povolit zápis pouze z server-side (Admin SDK)
    match /{document=**} {
      allow write: if false;
    }
  }
}
```

**Poznámka:** Všechny zápisy budou přes API routes s Admin SDK, takže nepotřebujeme složitá pravidla.

### 7. Nastav Firebase Storage (pro obrázky produktů)

1. V levém menu klikni na "Storage"
2. Klikni "Get started"
3. Vyber "Start in production mode"
4. Vyber stejný region jako Firestore

Storage Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /product-images/{imageId} {
      allow read: true;
      allow write: if false; // Pouze přes Admin SDK
    }
  }
}
```

---

## 🔧 Jak migrovat zbývající API endpointy

### Vzor pro migraci

**PŘED (Supabase):**
```typescript
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('field', 'value')
  
  if (error) throw error
  return NextResponse.json({ data })
}
```

**PO (Firebase):**
```typescript
import { getFirebaseAdminDb } from '@/lib/firebase/admin'
import { collection, query, where, getDocs } from 'firebase-admin/firestore'

export async function GET() {
  const db = getFirebaseAdminDb()
  const ref = collection(db, 'table_name')
  const q = query(ref, where('field', '==', 'value'))
  
  const snapshot = await getDocs(q)
  const data = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    // Convert Timestamps to ISO strings
    created_at: doc.data().created_at?.toDate().toISOString()
  }))
  
  return NextResponse.json({ data })
}
```

### Použij helper funkce

Místo psaní dotazů ručně, použij funkce z `lib/firebase/queries.ts`:

```typescript
import { getActiveSession, getGuestsBySessionId } from '@/lib/firebase/queries'

export async function GET() {
  const session = await getActiveSession()
  if (!session) {
    return NextResponse.json({ error: 'No active session' }, { status: 404 })
  }
  
  const guests = await getGuestsBySessionId(session.id)
  return NextResponse.json({ guests })
}
```

### Firestore operace

**SELECT (čtení):**
```typescript
import { collection, query, where, getDocs, getDoc, doc } from 'firebase-admin/firestore'

// Jeden dokument podle ID
const docRef = doc(db, 'collection', 'documentId')
const docSnap = await getDoc(docRef)
if (docSnap.exists()) {
  const data = { id: docSnap.id, ...docSnap.data() }
}

// Více dokumentů s filtrem
const q = query(
  collection(db, 'collection'),
  where('field', '==', 'value'),
  orderBy('name', 'asc'),
  limit(10)
)
const snapshot = await getDocs(q)
const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
```

**INSERT (vytvoření):**
```typescript
import { collection, addDoc, Timestamp } from 'firebase-admin/firestore'

const ref = collection(db, 'collection')
const docRef = await addDoc(ref, {
  field1: 'value',
  field2: 123,
  created_at: Timestamp.now()
})

// docRef.id obsahuje ID nového dokumentu
```

**UPDATE (aktualizace):**
```typescript
import { doc, updateDoc, Timestamp } from 'firebase-admin/firestore'

const docRef = doc(db, 'collection', 'documentId')
await updateDoc(docRef, {
  field1: 'new value',
  updated_at: Timestamp.now()
})
```

**DELETE (smazání):**
```typescript
import { doc, deleteDoc } from 'firebase-admin/firestore'

const docRef = doc(db, 'collection', 'documentId')
await deleteDoc(docRef)
```

---

## 🎯 Priorita migrace

1. **VYSOKÁ** (nutné pro základní funkčnost):
   - ✅ products, sessions, guests, consumption - HOTOVO
   - hardware/items, hardware/reservations
   - events/upcoming, event/[slug]

2. **STŘEDNÍ** (admin funkce):
   - admin/products, admin/hardware
   - admin/sessions, admin/guests

3. **NÍZKÁ** (pokročilé funkce):
   - snacks/guests-with-consumption
   - seats API
   - admin/sync-products (možná nebude potřeba)

---

## 🧪 Testování

Po migraci každého endpointu:

1. Spusť dev server: `npm run dev`
2. Otevři aplikaci v prohlížeči
3. Otevři DevTools → Network tab
4. Vyzkoušej funkci, která používá daný endpoint
5. Zkontroluj, že API vrací správná data

---

## 📝 Poznámky

### Rozdíly mezi Supabase a Firebase

| Funkce | Supabase | Firebase |
|--------|----------|----------|
| Databáze | PostgreSQL (SQL) | Firestore (NoSQL) |
| Dotazy | `.from().select()` | `query(collection())` |
| Relace | Foreign keys | Manuální reference |
| Triggery | SQL triggers | Cloud Functions |
| Real-time | Supabase Realtime | Firestore onSnapshot |

### Firestore Limity

- Maximální velikost dokumentu: 1 MB
- Maximální hloubka vnořených kolekcí: 100
- Maximální počet indexů: 200
- Zápisy: 1 write/sec na dokument

### Tipy

- Používej `Timestamp.now()` pro časové značky
- Vždy konvertuj Timestamp na ISO string při vracení dat
- Firestore nemá JOIN - musíš dělat více dotazů
- Používej batch writes pro více operací najednou

