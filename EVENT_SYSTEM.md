# 🎮 Systém událostí (LAN Party Events)

## Koncept

Aplikace **The Nest** je postavená na konceptu **LAN Party událostí**. Každá LAN Party je samostatná událost s:
- **Názvem** (např. "LAN Party - Listopad 2025")
- **Datem začátku** a **konce**
- **Vlastními hosty** registrovanými pro tuto konkrétní událost
- **Spotřebou produktů** přiřazenou k události

## Workflow

### 1️⃣ Admin vytvoří novou LAN Party událost
- Přejde do **Admin → Správa eventů**
- Vytvoří nový event s názvem a daty (datum začátku a konce)
- Event se automaticky aktivuje (může být aktivní jen 1 event současně)

### 2️⃣ Hosté se registrují
- Na **homepage** vidí název a datum aktuální LAN Party
- Registrují se zadáním jména
- Host je přiřazen k aktuálně aktivnímu eventu

### 3️⃣ Hosté sledují spotřebu
- Vybírají produkty ze seznamu
- Každá spotřeba je zaznamenána k aktuálnímu eventu
- Vidí svoji celkovou částku za aktuální event

### 4️⃣ Konec události
- Admin ukončí aktivní event (tlačítko "Ukončit" v Správě eventů)
- Vytvoří nový event pro příští LAN Party
- Hosté z předchozího eventu zůstávají v historii

---

## Zobrazení událostí v aplikaci

### 📱 **Homepage (veřejná stránka)**
```
🪺 The Nest
Systém pro sledování spotřeby na LAN parties

┌─────────────────────────────────────┐
│  📅  LAN Party - Listopad 2025      │
│     30.10.2025 - 2.11.2025          │
└─────────────────────────────────────┘

[Jsem nový host]  [Už jsem tady]
```

### 👤 **Registrace hosta**
```
┌─────────────────────────────────────┐
│  📅  LAN Party - Listopad 2025      │
│     30.10.2025 - 2.11.2025          │
└─────────────────────────────────────┘

Nový host
Zadej své jméno a začni sledovat spotřebu

[Input: Tvoje jméno]
[Vytvořit účet]
```

### 👥 **Výběr z existujících hostů**
```
┌─────────────────────────────────────┐
│  📅  LAN Party - Listopad 2025      │
│     30.10.2025 - 2.11.2025          │
└─────────────────────────────────────┘

Vyber se ze seznamu

[Jan]  [Petr]  [Marie]  [Tomáš]
...
```

### 🛡️ **Admin Dashboard**
```
🪺 The Nest - Admin

┌──────────────────────────────────────────────┐
│  Aktuální event                          📅  │
│  LAN Party - Listopad 2025                   │
│  30.10.2025 - 2.11.2025                      │
└──────────────────────────────────────────────┘

┌─────────┐ ┌─────────┐ ┌─────────┐
│ Hosté   │ │Produkty │ │ Obrat   │
│   20    │ │   15    │ │ 2500 Kč │
└─────────┘ └─────────┘ └─────────┘
```

### 🎪 **Správa eventů (Admin)**
```
Správa eventů                    [+ Nový event]

┌────────────────────────────────────────────────────────┐
│ Název                  │ Začátek    │ Konec      │Status│
├────────────────────────────────────────────────────────│
│ LAN Party - Listopad   │ 30.10.2025 │ 2.11.2025  │✅ Aktivní│
│ LAN Party - Říjen      │ 28.9.2025  │ 30.9.2025  │❌ Neaktivní│
└────────────────────────────────────────────────────────┘
```

---

## Pravidla systému

### ✅ **Pouze jeden aktivní event**
- V jednu chvíli může být aktivní pouze **1 event**
- Při aktivaci nového eventu se předchozí automaticky deaktivuje
- Databázový constraint zajišťuje toto pravidlo

### 📅 **Data událostí**
- **Datum začátku**: Povinné (výchozí = NOW())
- **Datum konce**: Volitelné (lze vyplnit později)
- Formát: `datetime-local` input v admin rozhraní

### 👥 **Hosté**
- Každý host je přiřazen k **jednomu eventu** (session_id)
- Hosté z jednoho eventu nevidí hosty z jiného eventu
- Host může mít stejné jméno v různých eventech (jsou to různé záznamy)

### 🛒 **Spotřeba**
- Každý záznam spotřeby má:
  - `guest_id` - kdo spotřeboval
  - `product_id` - co spotřeboval
  - `session_id` - při jakém eventu
  - `quantity` - kolik kusů
  - `consumed_at` - kdy

---

## API Endpointy

### **Veřejné API**
```typescript
GET /api/sessions/active
// Vrátí aktuálně aktivní event s daty

Response:
{
  session: {
    id: "uuid",
    name: "LAN Party - Listopad 2025",
    start_date: "2025-10-30T18:00:00Z",
    end_date: "2025-11-02T12:00:00Z",
    is_active: true
  }
}
```

### **Admin API**
```typescript
POST /api/admin/sessions
// Vytvoří nový event
Body: {
  name: string,
  start_date?: string (ISO),
  end_date?: string (ISO)
}

GET /api/admin/sessions
// Vrátí všechny eventy (seřazené podle data)

PATCH /api/admin/sessions/:id
// Aktivuje/deaktivuje event
Body: { is_active: boolean }
```

---

## Databázové schéma

### **sessions** tabulka
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constraint: pouze jeden aktivní event
CREATE UNIQUE INDEX unique_active_session 
ON sessions(is_active) 
WHERE is_active = true;
```

### **guests** tabulka
```sql
CREATE TABLE guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);
```

---

## Typický scénář použití

### 📆 **Příprava na LAN Party**
1. Admin se přihlásí do admin rozhraní
2. Přejde do **Správa eventů**
3. Klikne **+ Nový event**
4. Vyplní:
   - Název: "LAN Party - Prosinec 2025"
   - Datum začátku: 15.12.2025 18:00
   - Datum konce: 17.12.2025 12:00
5. Klikne **Vytvořit event**
6. Event se automaticky aktivuje

### 🎮 **Během LAN Party**
1. Hosté přicházejí a registrují se na homepage
2. Každý vidí název aktuálního eventu: "LAN Party - Prosinec 2025"
3. Hosté přidávají produkty do spotřeby
4. Admin sleduje statistiky na dashboardu

### 🏁 **Po skončení**
1. Admin přejde do **Správa eventů**
2. U aktuálního eventu klikne **Ukončit**
3. Event se deaktivuje, ale data zůstávají v databázi
4. Pro příští LAN Party se vytvoří nový event

---

## Budoucí vylepšení

- [ ] **Archivace eventů** - zobrazení statistik minulých eventů
- [ ] **Export dat per event** - stažení CSV pro konkrétní LAN Party
- [ ] **Porovnání eventů** - statistiky mezi různými LAN parties
- [ ] **Automatické ukončení** - event se automaticky ukončí podle end_date
- [ ] **Email notifikace** - upozornění hostům před začátkem eventu
- [ ] **QR kódy** - generování QR kódů pro rychlé přihlášení hostů

---

## Řešení problémů

### ❌ **"Není aktivní žádný event"**
**Problém:** Homepage nebo registrace zobrazuje chybu.

**Řešení:**
1. Přihlaš se jako admin
2. Přejdi do **Správa eventů**
3. Vytvoř nový event nebo aktivuj existující

### ❌ **"No active session found"**
**Problém:** API vrací 404 při registraci hosta.

**Řešení:**
Spusť setup skript:
```bash
npm run setup
```

Nebo ručně v Supabase SQL Editor:
```sql
INSERT INTO sessions (name, is_active, start_date)
VALUES ('První LAN Party', true, NOW());
```

---

## Technické detaily

### **Automatické vypnutí předchozího eventu**
```sql
CREATE OR REPLACE FUNCTION ensure_single_active_session()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true THEN
        UPDATE sessions 
        SET is_active = false 
        WHERE id != NEW.id AND is_active = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Tento trigger zajišťuje, že při aktivaci nového eventu se všechny ostatní automaticky deaktivují.

---

Máš otázky? Něco nefunguje? Napiš mi! 🚀