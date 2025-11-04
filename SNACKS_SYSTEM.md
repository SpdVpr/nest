# 🍕 Systém pro správu občerstvení - The Nest

## 📋 Přehled

Systém pro správu občerstvení na LAN parties byl zjednodušen a přesunut na jednu hlavní stránku `/snacks`, která slouží jako centrální místo pro sledování spotřeby všech hostů.

---

## 🎯 Hlavní vlastnosti

### 1. **Zjednodušená homepage (`/`)**
- Úvodní stránka s odkazy na:
  - 🍕 **Občerstvení** (`/snacks`) - hlavní stránka pro správu spotřeby
  - 🛡️ **Administrace** (`/admin/login`) - admin rozhraní

### 2. **Stránka Občerstvení (`/snacks`)**

#### **Horní sekce:**
- Název aktuální LAN Party a datum
- Tlačítko **"Přidat hosta"** - kdokoli může přidat nového hosta na místě

#### **Leaderboard (TOPky):**
Dvě kategorie žebříčků:

**🏆 TOP Jedlíci:**
- Ukazuje 3 hosty s nejvíce spotřebovanými položkami
- Zobrazuje počet položek a celkovou cenu
- 🥇🥈🥉 Medaile pro první tři místa

**🍺 TOP Pijani piv:**
- Ukazuje 3 hosty s nejvíce vypitými pivy
- Počítá produkty obsahující "pivo" nebo "beer" v názvu/kategorii
- 🥇🥈🥉 Medaile pro první tři místa

#### **Seznam hostů:**
- Každý host má svou kartu s:
  - **Jméno**
  - **Badge s počtem položek** (např. "15× položek")
  - **Badge s počtem piv** (pokud pil piva)
  - **Seznam všech spotřebovaných produktů** (např. "2× Coca Cola", "3× Pizza")
  - **Celková cena** - velké číslo v korunách
  - **Tlačítko "Přidat položku"** - otevře modal s výběrem produktů

#### **Modal pro přidání produktu:**
- Po kliknutí na "Přidat položku" u hosta se otevře dialog
- Zobrazí se všechny dostupné produkty v mřížce
- Každý produkt má obrázek, název a cenu
- Kliknutím na produkt se přidá 1× do spotřeby hosta
- Automaticky se zavře a aktualizuje data

#### **Modal pro přidání hosta:**
- Po kliknutí na "Přidat hosta" se otevře dialog
- Jednoduché pole pro zadání jména
- Host je okamžitě přidán k aktuálnímu eventu

---

## 🛡️ Admin funkce

### **Nová stránka: Správa hostů (`/admin/guests`)**

Admin může:
- ✅ Zobrazit seznam všech hostů aktuálního eventu
- ✅ Přidat nového hosta k eventu
- ✅ Vidět, kdy byl host vytvořen

### **Přístup:**
1. Přihlaš se do admina (`/admin/login`)
2. Na dashboardu klikni na **"Správa hostů"**
3. Nebo jdi přímo na `/admin/guests`

---

## 🔧 API Endpointy

### **`GET /api/snacks/guests-with-consumption`**
Vrací seznam všech hostů s jejich spotřebou a statistikami:

```json
{
  "guests": [
    {
      "id": "uuid",
      "name": "Jan Novák",
      "session_id": "uuid",
      "created_at": "2025-01-15T10:00:00Z",
      "is_active": true,
      "consumption": [
        {
          "id": "uuid",
          "quantity": 2,
          "products": {
            "id": "uuid",
            "name": "Coca Cola",
            "price": 25,
            "category": "Nápoje",
            "image_url": "..."
          }
        }
      ],
      "totalItems": 15,
      "totalBeers": 5,
      "totalPrice": 450
    }
  ]
}
```

**Vypočítané hodnoty:**
- `totalItems` - celkový počet všech spotřebovaných položek
- `totalBeers` - počet položek obsahujících "pivo" nebo "beer"
- `totalPrice` - celková cena všech položek v korunách

---

## 🎨 Design a UX

### **Barevné schéma:**
- **Homepage:** Fialovo-modrý gradient
- **Snacks stránka:** Oranžovo-červený gradient (tematické barvy jídla)
- **Leaderboard - Jedlíci:** Žluto-oranžový gradient
- **Leaderboard - Pivo:** Modro-indigový gradient

### **Interaktivita:**
- Všechna tlačítka mají hover efekty
- Karty hostů mají hover border změnu
- Produkty v modalu se zvětší při hoveru
- Modaly mají tmavé pozadí overlay

### **Responsivní design:**
- Mobilní: Jeden sloupec
- Tablet: Dva sloupce
- Desktop: Tři sloupce pro produkty, dva pro leaderboard

---

## 📊 Jak to funguje

### **Workflow pro hosty:**

```
1️⃣ Host přijde na LAN party
   ↓
2️⃣ Otevře /snacks na svém telefonu/počítači
   ↓
3️⃣ Pokud není v seznamu:
   - Klikne "Přidat hosta"
   - Zadá své jméno
   ↓
4️⃣ Najde své jméno v seznamu
   ↓
5️⃣ Klikne "Přidat položku"
   ↓
6️⃣ Vybere, co si vzal (Cola, Pizza, atd.)
   ↓
7️⃣ Položka se okamžitě zobrazí v jeho seznamu
   ↓
8️⃣ Vidí svou aktuální spotřebu a cenu
   ↓
9️⃣ Může sledovat TOPky a soutěžit 🏆
```

### **Workflow pro admina:**

```
1️⃣ Admin vytvoří event v /admin/sessions
   ↓
2️⃣ Může předem přidat hosty v /admin/guests
   ↓
3️⃣ Během eventu sleduje spotřebu na /snacks
   ↓
4️⃣ Po eventu může generovat statistiky
```

---

## 🚀 Výhody nového systému

✅ **Jednodušší UX** - vše na jedné stránce
✅ **Rychlejší přidání položky** - 2 kliky místo navigace
✅ **Zábavné TOPky** - gamifikace spotřeby
✅ **Viditelnost ceny** - každý vidí, kolik utratil
✅ **Flexibilní přidání hostů** - kdokoli může přidat hosta na místě
✅ **Admin kontrola** - admin může předem připravit seznam hostů
✅ **Přehledné** - vše na jednom místě bez scrollování

---

## 🔮 Budoucí vylepšení

Možná rozšíření (v2.0):

- 📊 **Grafy spotřeby** - koláčový graf nejoblíbenějších produktů
- 🎯 **Týmové soutěže** - rozdělení hostů do týmů
- 💰 **Platby** - označení, kdo už zaplatil
- 📱 **PWA** - instalovatelná aplikace na mobil
- 🔔 **Notifikace** - upozornění na nové vedoucí v TOPce
- 🏅 **Achievementy** - odznaky za milníky (10 piv, 50 položek, atd.)
- 📸 **Fotky produktů** - lepší vizualizace
- ⏰ **Historie po hodinách** - graf spotřeby během dne

---

## 📁 Změněné soubory

### Nové soubory:
- `app/page.tsx` - Nová jednoduchá homepage
- `app/(public)/snacks/page.tsx` - Hlavní stránka pro občerstvení
- `app/api/snacks/guests-with-consumption/route.ts` - API pro data
- `app/admin/guests/page.tsx` - Admin správa hostů
- `SNACKS_SYSTEM.md` - Tato dokumentace

### Upravené soubory:
- `app/(public)/register/page.tsx` - Přesměrování na /snacks
- `app/(public)/select-guest/page.tsx` - Přesměrování na /snacks
- `app/admin/dashboard/page.tsx` - Přidán odkaz na správu hostů

---

## 🧪 Testování

### 1. Test základního flow:
```bash
# Spusť aplikaci
npm run dev

# Otevři http://localhost:3000
# Klikni na "Občerstvení"
# Přidej nového hosta
# Přidej mu nějaké produkty
# Zkontroluj, že se zobrazuje v TOPce
```

### 2. Test admin funkce:
```bash
# Přihlaš se do admina (heslo: nest1234)
# Jdi na "Správa hostů"
# Přidej hosta
# Ověř, že se zobrazuje na /snacks
```

### 3. Test leaderboardu:
```bash
# Přidej několik hostů
# Přidej jim různé množství produktů
# Některým přidej piva
# Zkontroluj, že se správně řadí v TOPkách
```

---

## 🎉 Výsledek

Nyní máš plně funkční systém pro správu občerstvení na LAN parties! 

**Klíčové stránky:**
- 🏠 `/` - Úvodní stránka
- 🍕 `/snacks` - Hlavní stránka (pro všechny)
- 🛡️ `/admin/guests` - Správa hostů (pro admina)

**Vyzkoušej to a užij si první LAN Party! 🎮🍕🍺**