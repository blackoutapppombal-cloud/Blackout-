begin;

alter table public.services
  add column if not exists model text not null default '',
  add column if not exists image_url text,
  add column if not exists price_type text not null default 'normal',
  add column if not exists old_price numeric(12,2) not null default 0 check (old_price >= 0),
  add column if not exists promotional_price numeric(12,2) not null default 0 check (promotional_price >= 0),
  add column if not exists starting_price numeric(12,2) not null default 0 check (starting_price >= 0),
  add column if not exists benefits text[] not null default '{}';

alter table public.services drop constraint if exists services_name_key;
alter table public.services drop constraint if exists services_price_type_check;
alter table public.services
  add constraint services_price_type_check
  check (price_type in ('normal', 'sale', 'starting_at', 'consult'));

update public.services
set model = 'PS3'
where name = 'Limpeza Preventiva' and model = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'services_name_model_key'
      and conrelid = 'public.services'::regclass
  ) then
    alter table public.services
      add constraint services_name_model_key unique (name, model);
  end if;
end
$$;

insert into public.services
  (name, model, description, image_url, icon, price_type, price, old_price, promotional_price, starting_price, duration_label, benefits, sort_order, active)
values
  (
    'Limpeza Preventiva',
    'PS3',
    'Limpeza interna, troca de pasta térmica, revisão da refrigeração e verificação geral.',
    './assets/service-cleaning-ps3.jpg',
    '🎮',
    'sale',
    0,
    120,
    80,
    0,
    '',
    array['Limpeza completa', 'Troca de pasta térmica', 'Verificação geral', 'Mais durabilidade'],
    1,
    true
  ),
  (
    'Limpeza Preventiva',
    'PS4',
    'Limpeza interna, troca de pasta térmica, revisão da refrigeração e verificação geral.',
    './assets/service-cleaning-ps4.jpg',
    '🎮',
    'sale',
    0,
    180,
    80,
    0,
    '',
    array['Limpeza completa', 'Troca de pasta térmica', 'Verificação geral', 'Mais durabilidade'],
    2,
    true
  ),
  (
    'Limpeza Preventiva',
    'PS5',
    'Limpeza interna, troca de pasta térmica, revisão da refrigeração e verificação geral.',
    './assets/service-cleaning-ps5.jpg',
    '🎮',
    'sale',
    0,
    220,
    100,
    0,
    '',
    array['Limpeza completa', 'Troca de pasta térmica', 'Verificação geral', 'Mais durabilidade'],
    3,
    true
  ),
  (
    'Reparo de Controles',
    '',
    'Correção de drift, botões, conectores e falhas eletrônicas.',
    './assets/service-controller-repair.jpg',
    '🕹️',
    'starting_at',
    0,
    0,
    0,
    80,
    '',
    array['Correção de drift', 'Reparo de botões', 'Conectores', 'Mais vida útil'],
    4,
    true
  )
on conflict (name, model) do update
set description = excluded.description,
    image_url = excluded.image_url,
    icon = excluded.icon,
    price_type = excluded.price_type,
    price = excluded.price,
    old_price = excluded.old_price,
    promotional_price = excluded.promotional_price,
    starting_price = excluded.starting_price,
    duration_label = excluded.duration_label,
    benefits = excluded.benefits,
    sort_order = excluded.sort_order,
    active = excluded.active;

update public.services
set active = false
where (name, model) not in (
  ('Limpeza Preventiva', 'PS3'),
  ('Limpeza Preventiva', 'PS4'),
  ('Limpeza Preventiva', 'PS5'),
  ('Reparo de Controles', '')
);

alter table public.services enable row level security;
grant select on public.services to anon, authenticated;
grant insert, update, delete on public.services to authenticated;
grant usage, select on sequence public.services_id_seq to authenticated;

commit;
