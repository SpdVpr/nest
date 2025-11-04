# Supabase Setup Instructions

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for project to be ready
4. Copy your credentials:
   - Project URL
   - Anon/Public API key
   - Service Role API key

## 2. Update Environment Variables

Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_PASSWORD=your-chosen-password
```

## 3. Run SQL Scripts (IN ORDER!)

Run these SQL scripts in Supabase SQL Editor in this exact order:

### Step 1: Create Database Schema
```bash
# File: supabase/schema.sql
```
This creates:
- Tables: sessions, guests, products, consumption
- Indexes for performance
- Constraints for data integrity
- Triggers for automatic updates

### Step 2: Setup Row Level Security Policies
```bash
# File: supabase/rls-policies.sql
```
This creates:
- RLS policies for all tables
- Public read access for available products
- Admin-only write access
- Guest creation access for everyone

### Step 3: Create Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Create new bucket: `product-images`
3. Set as **Public** bucket
4. Then run: `supabase/storage-policies.sql`

## 4. Verify Setup

After running all scripts:

1. Check Tables:
   - Go to Table Editor
   - Verify all 4 tables exist

2. Check RLS:
   - Go to each table
   - Verify RLS is enabled
   - Check policies are created

3. Check Storage:
   - Go to Storage
   - Verify `product-images` bucket exists
   - Verify it's public

## 5. Create Test Data (Optional)

You can create a test session:

```sql
INSERT INTO sessions (name, is_active) 
VALUES ('Test LAN Party', true);
```

## 6. Admin Authentication Setup

For production, you should:
1. Go to Supabase Dashboard → Authentication
2. Enable Email provider
3. Create an admin user
4. Use that user for admin login

For development, the app uses a simple password check (ADMIN_PASSWORD from .env.local).

## Troubleshooting

### RLS Policies not working?
- Make sure RLS is enabled on all tables
- Check if policies are created correctly
- Try running the script again

### Storage upload failing?
- Verify bucket exists and is public
- Check storage policies are applied
- Verify SUPABASE_SERVICE_ROLE_KEY is set correctly

### Can't authenticate?
- Check environment variables are loaded
- Restart Next.js dev server
- Verify Supabase URL and keys are correct