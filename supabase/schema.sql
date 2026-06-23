-
create extension if not exists "pgcrypto";


create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text not null default 'Usuário' check (char_length(trim(nome)) > 0),
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now())
);

comment on table public.profiles is 'Perfil do operador do Finn; substitui User local do AsyncStorage.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();
-
create table public.clients (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles (id) on delete cascade,

 
  nome                 text not null,
  telefone             text not null,
  endereco             text,
  observacao           text,

 
  valor_emprestado     numeric(12, 2) not null check (valor_emprestado >= 0),
  valor_total_receber  numeric(12, 2) not null check (valor_total_receber >= 0),
  valor_parcela        numeric(12, 2) not null check (valor_parcela > 0),
  parcelas_ja_pagas    integer not null default 0 check (parcelas_ja_pagas >= 0),
  frequencia           text not null check (frequencia in ('Diário', 'Semanal', 'Mensal', 'Anual')),
  data_inicio          timestamptz not null,

  
  data_termino         timestamptz not null,
  proximo_vencimento   timestamptz not null,
  lucro_esperado       numeric(12, 2) not null default 0,
  valor_recebido       numeric(12, 2) not null default 0,
  saldo_devedor        numeric(12, 2) not null default 0,
  parcelas_totais      integer not null default 0 check (parcelas_totais >= 0),
  parcelas_pagas       integer not null default 0 check (parcelas_pagas >= 0),
  parcelas_restantes   integer not null default 0 check (parcelas_restantes >= 0),
  status               text not null default 'ativo'
    check (status in ('ativo', 'pendente', 'atrasado', 'quitado', 'cancelado')),

  created_at           timestamptz not null default timezone('utc', now()),
  updated_at           timestamptz not null default timezone('utc', now())
);

comment on table public.clients is 'Contratos de empréstimo; mapeia interface Client do TypeScript.';

create trigger clients_set_updated_at
  before update on public.clients
  for each row
  execute function public.set_updated_at();


create table public.charges (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  cliente_id       uuid not null references public.clients (id) on delete cascade,

 
  cliente_nome     text not null,
  telefone         text,

  valor            numeric(12, 2) not null check (valor > 0),
  data_vencimento  timestamptz not null,
  data_pagamento   timestamptz,
  status           text not null default 'pendente'
    check (status in ('pendente', 'pago', 'cancelado', 'em_transito')),
  parcela          integer check (parcela is null or parcela > 0),
  total_parcelas   integer check (total_parcelas is null or total_parcelas > 0),

  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now())
);

comment on table public.charges is 'Cobranças geradas por contrato; mapeia interface Charge do TypeScript.';

create trigger charges_set_updated_at
  before update on public.charges
  for each row
  execute function public.set_updated_at();


create table public.payments (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  charge_id        uuid not null references public.charges (id) on delete cascade,
  cliente_id       uuid not null references public.clients (id) on delete cascade,

  cliente_nome     text not null,

  valor            numeric(12, 2) not null check (valor > 0),
  data_pagamento   timestamptz not null,
  forma_pagamento  text,

  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now())
);

comment on table public.payments is 'Pagamentos efetivados; mapeia interface Payment do TypeScript.';

create trigger payments_set_updated_at
  before update on public.payments
  for each row
  execute function public.set_updated_at();



create index profiles_updated_at_idx on public.profiles (updated_at desc);


create index clients_user_id_idx on public.clients (user_id);
create index clients_user_id_status_idx on public.clients (user_id, status);
create index clients_user_id_proximo_vencimento_idx on public.clients (user_id, proximo_vencimento);
create index clients_user_id_nome_idx on public.clients (user_id, nome);


create index charges_user_id_idx on public.charges (user_id);
create index charges_cliente_id_idx on public.charges (cliente_id);
create index charges_user_id_status_idx on public.charges (user_id, status);
create index charges_user_id_data_vencimento_idx on public.charges (user_id, data_vencimento);
create index charges_cliente_id_data_vencimento_idx on public.charges (cliente_id, data_vencimento);
create index charges_user_id_data_pagamento_idx on public.charges (user_id, data_pagamento)
  where data_pagamento is not null;


create index payments_user_id_idx on public.payments (user_id);
create index payments_cliente_id_idx on public.payments (cliente_id);
create index payments_charge_id_idx on public.payments (charge_id);
create index payments_user_id_data_pagamento_idx on public.payments (user_id, data_pagamento desc);
create index payments_cliente_id_data_pagamento_idx on public.payments (cliente_id, data_pagamento desc);


create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'nome'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      'Usuário'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.charges enable row level security;
alter table public.payments enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_delete_own"
  on public.profiles
  for delete
  to authenticated
  using (id = auth.uid());

create policy "clients_select_own"
  on public.clients
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "clients_insert_own"
  on public.clients
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "clients_update_own"
  on public.clients
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "clients_delete_own"
  on public.clients
  for delete
  to authenticated
  using (user_id = auth.uid());

-- charges: CRUD restrito ao dono
create policy "charges_select_own"
  on public.charges
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "charges_insert_own"
  on public.charges
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.clients c
      where c.id = cliente_id
        and c.user_id = auth.uid()
    )
  );

create policy "charges_update_own"
  on public.charges
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.clients c
      where c.id = cliente_id
        and c.user_id = auth.uid()
    )
  );

create policy "charges_delete_own"
  on public.charges
  for delete
  to authenticated
  using (user_id = auth.uid());

create policy "payments_select_own"
  on public.payments
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "payments_insert_own"
  on public.payments
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.clients c
      where c.id = cliente_id
        and c.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.charges ch
      where ch.id = charge_id
        and ch.user_id = auth.uid()
        and ch.cliente_id = cliente_id
    )
  );

create policy "payments_update_own"
  on public.payments
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.clients c
      where c.id = cliente_id
        and c.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.charges ch
      where ch.id = charge_id
        and ch.user_id = auth.uid()
        and ch.cliente_id = cliente_id
    )
  );

create policy "payments_delete_own"
  on public.payments
  for delete
  to authenticated
  using (user_id = auth.uid());

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.charges to authenticated;
grant select, insert, update, delete on public.payments to authenticated;


grant all on public.profiles to service_role;
grant all on public.clients to service_role;
grant all on public.charges to service_role;
grant all on public.payments to service_role;
