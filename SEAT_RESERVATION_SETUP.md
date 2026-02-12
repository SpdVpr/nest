# Nastavení Systému Rezervace Míst

## 1. Spuštění Databázové Migrace

Otevři Supabase Dashboard a spusť SQL migraci:

### Krok 1: Otevři SQL Editor
1. Jdi na https://app.supabase.com
2. Vyber svůj projekt
3. Klikni na "SQL Editor" v levém menu

### Krok 2: Spusť migraci
Zkopíruj a spusť obsah souboru: `supabase/migrations/0012_seat_reservations.sql`

```sql
-- Seat Reservations System
-- Migration to add seat reservation functionality

-- Create seat_reservations table
CREATE TABLE IF NOT EXISTS seat_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seat_id TEXT NOT NULL,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(seat_id, session_id)
);

-- Create indexes for better performance
CREATE INDEX idx_seat_reservations_session ON seat_reservations(session_id);
CREATE INDEX idx_seat_reservations_guest ON seat_reservations(guest_id);
CREATE INDEX idx_seat_reservations_seat ON seat_reservations(seat_id);

-- Add comments
COMMENT ON TABLE seat_reservations IS 'Rezervace míst k sezení pro jednotlivé eventy';
COMMENT ON COLUMN seat_reservations.seat_id IS 'ID místa (např. A1, B2, C3, atd.)';
COMMENT ON COLUMN seat_reservations.guest_name IS 'Jméno hosta pro rychlé zobrazení';
```

## 2. Jak Systém Funguje

### Plán Místnosti
Systém používá následující rozložení míst podle tvého plánu:

- **Řada A**: A1, A2, A3, A4, A5, A6
- **Řada B**: B1, B2, B3, B4, B5, B6
- **Řada C**: C1, C2, C3, C4, C5, C6
- **Řada D**: D1, D2, D3, D4, D5, D6
- **Řada E**: E1, E2, E3, E4, E5, E6
- **Řada F**: F1, F2, F3, F4, F5, F6, F7, F8

### Funkce Systému

1. **Výběr Hosta**: Uživatel si nejdřív vybere svého hosta ze seznamu
2. **Zobrazení Plánu**: Vidí grafický plán místnosti s barevným označením:
   - 🟢 **Zelená**: Volné místo
   - 🔴 **Červená**: Obsazené místo (jiným hostem)
   - 🔵 **Modrá**: Tvoje rezervace
3. **Rezervace**: Kliknutím na volné místo ho může rezervovat
4. **Zrušení**: Kliknutím na své rezervované místo ho může zrušit
5. **Informace**: Na každém místě se zobrazuje jméno rezervovaného hosta

## 3. Přístup k Systému

### Pro Uživatele
Systém je dostupný na event stránce:
- URL: `/event/[slug]/seats`
- Tlačítko: **"Rezervace Míst"** (modré tlačítko s ikonou křesla)
- Umístění: Vedle tlačítka "Rezervace HW"

### Pro Administrátory
Administrátoři mohou spravovat rezervace přímo v Supabase Dashboard:
1. Jdi do "Table Editor"
2. Vyber tabulku `seat_reservations`
3. Můžeš prohlížet, upravovat nebo mazat rezervace

## 4. API Endpointy

### GET /api/seats/reservations?session_id=xxx
Získá všechny rezervace míst pro daný event

### POST /api/seats/reservations
Vytvoří novou rezervaci místa
```json
{
  "seat_id": "A1",
  "guest_id": "uuid",
  "session_id": "uuid",
  "guest_name": "Jméno Hosta"
}
```

### DELETE /api/seats/reservations/[id]
Zruší rezervaci místa

## 5. Bezpečnost

- Každé místo může být rezervováno pouze jednou pro daný event
- Uživatel může zrušit pouze své vlastní rezervace
- Systém kontroluje dostupnost místa před vytvořením rezervace
- Při smazání hosta nebo eventu se automaticky smažou i jeho rezervace míst

## 6. Testování

Po nasazení otestuj:
1. ✅ Výběr hosta
2. ✅ Rezervaci volného místa
3. ✅ Pokus o rezervaci obsazeného místa (mělo by zobrazit chybu)
4. ✅ Zrušení vlastní rezervace
5. ✅ Zobrazení jmen na rezervovaných místech

## 7. Soubory Vytvořené/Upravené

### Nové soubory:
- `supabase/migrations/0012_seat_reservations.sql` - Databázová migrace
- `app/api/seats/reservations/route.ts` - API pro seznam a vytvoření rezervací
- `app/api/seats/reservations/[id]/route.ts` - API pro smazání rezervace
- `app/event/[slug]/seats/page.tsx` - Stránka s grafickým plánem místnosti

### Upravené soubory:
- `types/database.types.ts` - Přidány typy pro seat_reservations
- `app/event/[slug]/page.tsx` - Přidáno tlačítko "Rezervace Míst"

## 8. Možná Vylepšení do Budoucna

- 📊 Admin přehled všech rezervací
- 🖨️ Export plánu místnosti do PDF
- 📱 QR kódy pro rychlou rezervaci
- 🔄 Možnost přesunu rezervace na jiné místo
- 📧 Email notifikace při rezervaci
- 🎨 Vlastní barvy pro různé skupiny hostů

