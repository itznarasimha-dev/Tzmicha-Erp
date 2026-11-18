-- =============================================================================
-- 004_erp_storage.sql
-- Private Supabase Storage buckets + org-scoped, permission-scoped policies.
--
-- Path convention (enforced by every policy):
--   org/<org_id>/<module>/<entity>/<record_id>/<filename>
--     module ∈ hr | marketing | finance
--
-- Buckets are PRIVATE. No public URL is ever generated for employee documents,
-- contracts, signatures or expense receipts.
-- =============================================================================

do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'storage schema not available — skipping bucket setup';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values
    ('erp-attachments', 'erp-attachments', false, 10485760,
      array['application/pdf','image/png','image/jpeg','image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
    ('signatures', 'signatures', false, 2097152,
      array['image/png','image/jpeg','image/webp','application/pdf']),
    ('receipts', 'receipts', false, 10485760,
      array['application/pdf','image/png','image/jpeg','image/webp'])
  on conflict (id) do nothing;

  -- Helper: path belongs to caller's organization
  --   (storage.foldername(name))[1] = 'org'
  --   (storage.foldername(name))[2] = <org uuid>

  drop policy if exists erp_attachments_read on storage.objects;
  create policy erp_attachments_read on storage.objects
    for select to authenticated
    using (
      bucket_id in ('erp-attachments','signatures','receipts')
      and (storage.foldername(name))[1] = 'org'
      and (storage.foldername(name))[2] = erp.current_org_id()::text
      and (
        erp.has_permission('hr.document.read')
        or erp.has_permission('marketing.document.read')
        or erp.has_permission('finance.document.read')
      )
    );

  drop policy if exists erp_attachments_insert on storage.objects;
  create policy erp_attachments_insert on storage.objects
    for insert to authenticated
    with check (
      bucket_id in ('erp-attachments','signatures','receipts')
      and (storage.foldername(name))[1] = 'org'
      and (storage.foldername(name))[2] = erp.current_org_id()::text
      and (
        ((storage.foldername(name))[3] = 'hr'        and erp.has_permission('hr.document.write'))
        or ((storage.foldername(name))[3] = 'marketing' and erp.has_permission('marketing.document.write'))
        or ((storage.foldername(name))[3] = 'finance'   and erp.has_permission('finance.document.write'))
      )
    );

  drop policy if exists erp_attachments_update on storage.objects;
  create policy erp_attachments_update on storage.objects
    for update to authenticated
    using (
      bucket_id in ('erp-attachments','signatures','receipts')
      and (storage.foldername(name))[1] = 'org'
      and (storage.foldername(name))[2] = erp.current_org_id()::text
      and (
        ((storage.foldername(name))[3] = 'hr'        and erp.has_permission('hr.document.write'))
        or ((storage.foldername(name))[3] = 'marketing' and erp.has_permission('marketing.document.write'))
        or ((storage.foldername(name))[3] = 'finance'   and erp.has_permission('finance.document.write'))
      )
    )
    with check (
      bucket_id in ('erp-attachments','signatures','receipts')
      and (storage.foldername(name))[1] = 'org'
      and (storage.foldername(name))[2] = erp.current_org_id()::text
    );

  drop policy if exists erp_attachments_delete on storage.objects;
  create policy erp_attachments_delete on storage.objects
    for delete to authenticated
    using (
      bucket_id in ('erp-attachments','signatures','receipts')
      and (storage.foldername(name))[1] = 'org'
      and (storage.foldername(name))[2] = erp.current_org_id()::text
      and (
        ((storage.foldername(name))[3] = 'hr'        and erp.has_permission('hr.document.delete'))
        or ((storage.foldername(name))[3] = 'marketing' and erp.has_permission('marketing.document.delete'))
        or ((storage.foldername(name))[3] = 'finance'   and erp.has_permission('finance.document.delete'))
      )
    );

  raise notice 'ERP storage buckets and policies configured';
end $$;
