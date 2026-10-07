update public.feature_registry
set status = 'IN_PROGRESS',
    test_status = 'PARTIAL',
    notes = 'Separate web/admin Vercel projects are deployed and connected to the same Supabase production backend; admin sign-in and MFA flow are live, while the full product surfaces remain incomplete.'
where feature_id = 'F-01';

update public.feature_registry
set status = 'IMPLEMENTED',
    test_status = 'PARTIAL',
    notes = 'Supabase Auth, SSR session refresh, RLS, active admin membership checks, SUPER_ADMIN permission mapping, and TOTP step-up flow are implemented. Full end-to-end sign-in remains pending confirmation/MFA verification with a real admin account.'
where feature_id = 'F-45';
