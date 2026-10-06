# Admin

The admin application is a separate Next.js codebase. Server-side checks require an authenticated Supabase user plus active `admin_memberships`; database RLS is the final authorization layer. Admin actions are auditable and users cannot self-promote.
