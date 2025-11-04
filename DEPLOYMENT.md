# 🚀 Deployment Guide - The Nest

## Deployment na Vercel (doporučeno)

### 1. Příprava

1. Push kód na GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/tvoje-username/the-nest.git
git push -u origin main
```

### 2. Vercel Setup

1. Jdi na [vercel.com](https://vercel.com)
2. Klikni na **"Add New Project"**
3. Importuj svůj GitHub repository
4. Nastav environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=tvoje-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tvoje-anon-key
SUPABASE_SERVICE_ROLE_KEY=tvoje-service-role-key
ADMIN_PASSWORD=silne-heslo-pro-produkci
```

5. Klikni **"Deploy"**

### 3. Po deployu

1. Otevři URL tvé aplikace
2. Jdi na `/admin/login` a přihlas se
3. Vytvoř první session
4. Přidej produkty
5. Otestuj celý flow

## Alternativa: Self-hosting

### Docker (připravuje se)

```bash
# Build
docker build -t the-nest .

# Run
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  -e ADMIN_PASSWORD=... \
  the-nest
```

### VPS (Linux)

```bash
# Clone repo
git clone https://github.com/tvoje-username/the-nest.git
cd the-nest

# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local
# Edit .env.local with your values

# Build
npm run build

# Run with PM2
npm install -g pm2
pm2 start npm --name "the-nest" -- start
pm2 save
pm2 startup
```

## 🔒 Production Checklist

### Zabezpečení

- [ ] Změň `ADMIN_PASSWORD` na silné heslo
- [ ] Implementuj rate limiting (Vercel má built-in)
- [ ] Zkontroluj RLS policies v Supabase
- [ ] Zkontroluj Storage policies
- [ ] Zvažování implementace 2FA pro admin

### Performance

- [ ] Optimalizuj obrázky (Next.js Image component už je)
- [ ] Nastav caching headers
- [ ] Implementuj ISR (Incremental Static Regeneration)
- [ ] Zkontroluj bundle size

### Monitoring

- [ ] Nastav Vercel Analytics
- [ ] Nastav Sentry pro error tracking
- [ ] Implementuj logging (Winston, Pino)
- [ ] Monitoruj Supabase usage

### Backup

- [ ] Nastav automatický backup Supabase DB
- [ ] Backup Storage bucketu
- [ ] Export dat pravidelně

## 🎯 Post-deployment Testing

### Testy pro hosty:
1. Homepage loading
2. Registrace nového hosta
3. Výběr existujícího hosta
4. Přidání produktu do spotřeby
5. Zobrazení aktuálního součtu

### Testy pro admina:
1. Admin login
2. Vytvoření produktu (včetně upload obrázku)
3. Editace produktu
4. Smazání produktu
5. Toggle dostupnosti produktu
6. Vytvoření session
7. Aktivace/deaktivace session

## 🌍 Custom Domain

### Vercel:
1. Jdi do Project Settings → Domains
2. Přidej svou doménu
3. Nastav DNS záznamy podle instrukcí
4. Počkej na propagaci (max 48h)

### SSL Certificate:
- Vercel automaticky poskytuje Let's Encrypt SSL
- Není potřeba nic nastavovat

## 📊 Scaling

### Supabase:
- Free tier: až 500MB databáze, 1GB storage
- Pro tier: neomezeno
- Monitoruj usage v Supabase dashboardu

### Vercel:
- Hobby: unlimited requests
- Pro: advanced analytics, better support

## 🔄 Updates

### Deploy nové verze:
```bash
git add .
git commit -m "Update message"
git push
```

Vercel automaticky deployne novou verzi.

### Rollback:
V Vercel dashboardu můžeš vrátit na předchozí deployment jedním kliknutím.

## 💡 Tipy

1. **Vždy testuj na staging** před production deployem
2. **Používej Preview Deployments** v Vercel (automaticky pro PR)
3. **Monitoruj error rates** po každém deployu
4. **Backup před velkými změnami**
5. **Dokumentuj změny** v CHANGELOG.md

## 🆘 Support

Pokud narazíš na problémy:
1. Zkontroluj Vercel logs
2. Zkontroluj Supabase logs
3. Zkontroluj browser console
4. Zkontroluj Network tab v DevTools

## 🎉 Ready!

Aplikace je nyní live a připravená k použití!

Nezapomeň:
- Pravidelně aktualizovat dependencies
- Monitorovat performance
- Sbírat feedback od uživatelů
- Implementovat nové features podle priorit