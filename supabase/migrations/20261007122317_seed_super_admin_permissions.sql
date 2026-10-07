insert into public.admin_role_permissions (admin_role_id, permission_id)
select r.id, p.id
from public.admin_roles r
cross join public.admin_permissions p
where r.role_key = 'SUPER_ADMIN'
on conflict (admin_role_id, permission_id) do nothing;
