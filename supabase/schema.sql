create extension if not exists pgcrypto;

create type account_status as enum ('active','overdue','suspended','disconnected');
create type invoice_status as enum ('unpaid','partially_paid','paid','overdue');
create type payment_source as enum ('paystack_online','manual_eft');
create type payment_verification_status as enum ('pending_verification','approved','rejected');
create type ticket_status as enum ('open','in_review','resolved');

create table if not exists company_profile (
  id int primary key default 1 check (id = 1),
  company_name text not null,
  tagline text not null,
  hero_title text not null,
  hero_summary text not null,
  about_title text not null,
  about_body text not null,
  mission text not null,
  vision text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists benefits (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null,
  title text not null,
  body text not null
);

create table if not exists value_propositions (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null,
  title text not null,
  body text not null
);

create table if not exists offerings (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null,
  title text not null,
  speed text not null,
  description text not null,
  active boolean default true
);

create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  quote text not null,
  active boolean default true
);

create table if not exists contact_channels (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  value text not null,
  sort_order int not null
);

create table if not exists subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  speed text not null,
  monthly_price numeric(10,2) not null,
  description text,
  active boolean default true
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id),
  name text not null,
  contact_number text not null,
  email text not null,
  street text not null,
  extension text not null,
  account_number text unique not null,
  plan_id uuid references subscription_plans(id),
  installation_date date not null,
  status account_status default 'active'
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) not null,
  billing_month date not null,
  due_date date not null,
  amount numeric(10,2) not null,
  paid_amount numeric(10,2) default 0,
  status invoice_status default 'unpaid',
  paid_date date,
  unique(customer_id,billing_month)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) not null,
  invoice_id uuid references invoices(id),
  source payment_source not null,
  amount numeric(10,2) not null,
  paid_at date not null,
  verification_status payment_verification_status default 'pending_verification',
  proof_url text,
  rejection_reason text
);

create table if not exists settings (
  id int primary key default 1 check (id = 1),
  yellow_days int default 2,
  orange_days int default 4,
  red_days int default 5,
  disconnection_days int default 14,
  disconnection_months int default 2,
  notification_template text
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  subject text not null,
  status ticket_status default 'open',
  resolution_log text,
  updated_at timestamptz default now()
);

create table if not exists audit_trail (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  target_table text not null,
  target_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create or replace function allocate_payment_oldest_first(p_customer_id uuid, p_payment_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  remaining numeric(10,2);
  invoice_record record;
  applied numeric(10,2);
begin
  select amount into remaining from payments where id = p_payment_id and customer_id = p_customer_id for update;

  for invoice_record in
    select * from invoices
    where customer_id = p_customer_id and status <> 'paid'
    order by billing_month asc
    for update
  loop
    exit when remaining <= 0;
    applied := least(invoice_record.amount - invoice_record.paid_amount, remaining);
    remaining := remaining - applied;

    update invoices
    set paid_amount = paid_amount + applied,
        status = case when paid_amount + applied >= amount then 'paid'::invoice_status else 'partially_paid'::invoice_status end,
        paid_date = case when paid_amount + applied >= amount then current_date else paid_date end
    where id = invoice_record.id;
  end loop;

  update payments set verification_status = 'approved' where id = p_payment_id;
end;
$$;

alter table company_profile enable row level security;
alter table benefits enable row level security;
alter table value_propositions enable row level security;
alter table offerings enable row level security;
alter table testimonials enable row level security;
alter table contact_channels enable row level security;
alter table subscription_plans enable row level security;
alter table customers enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;
alter table settings enable row level security;
alter table tickets enable row level security;
alter table audit_trail enable row level security;

create policy "Public read company content" on company_profile for select using (true);
create policy "Public read benefits" on benefits for select using (true);
create policy "Public read value propositions" on value_propositions for select using (true);
create policy "Public read active offerings" on offerings for select using (active = true);
create policy "Public read active testimonials" on testimonials for select using (active = true);
create policy "Public read contacts" on contact_channels for select using (true);
create policy "Public read active plans" on subscription_plans for select using (active = true);

-- Customer, invoice, payment, ticket and audit policies should be tightened once Supabase Auth roles are connected.
-- For the public demo dashboard only, authenticated users may read operational data.
create policy "Authenticated read customers" on customers for select to authenticated using (true);
create policy "Authenticated read invoices" on invoices for select to authenticated using (true);
create policy "Authenticated read payments" on payments for select to authenticated using (true);
create policy "Authenticated read settings" on settings for select to authenticated using (true);
create policy "Authenticated read tickets" on tickets for select to authenticated using (true);
create policy "Authenticated read audit" on audit_trail for select to authenticated using (true);

insert into company_profile (id, company_name, tagline, hero_title, hero_summary, about_title, about_body, mission, vision)
values (
  1,
  'Starfibre Communications (Pty) Ltd',
  'The Star Connectivity',
  'Uncapped, unshaped, unthrottled fibre internet connectivity to the home.',
  'Protea Glen’s community-focused fibre ISP, combining stable underground network infrastructure with a modern billing portal that tracks every invoice month clearly.',
  'Starfibre Communications is a Protea Glen fibre internet service provider.',
  'Starfibre Communications was established in 2024 and registered in Johannesburg, Gauteng. The company was founded by Gugu Lucyl Khumalo, director and CEO, together with Linda Khumalo, co-director and COO. The company was born from a shift from a build-and-transfer model to a build-and-own model, with a focus on owning stable fibre network infrastructure and serving the local community directly. Star Fibre works alongside Siluthuli Construction and Projects, the fibre optic infrastructure builder, while Starfibre Communications operates as the ISP and reseller serving areas including Protea Glen Ext.44.',
  'The mission is to build and operate a strong, stable network in every area served so customers can rely on consistent connectivity for work, school and everyday life.',
  'The vision is to grow Starfibre Communications into one of the leading ISPs by providing first-class service and customer-centric connectivity.'
)
on conflict (id) do update set company_name = excluded.company_name, tagline = excluded.tagline, hero_title = excluded.hero_title, hero_summary = excluded.hero_summary, about_title = excluded.about_title, about_body = excluded.about_body, mission = excluded.mission, vision = excluded.vision, updated_at = now();

insert into benefits (sort_order, title, body) values
(1, 'Benefit 1', 'Uninterrupted internet and consistent network coverage for Protea Glen subscribers.'),
(2, 'Benefit 2', 'Stable connectivity for working from home, online learning, school projects and family entertainment.'),
(3, 'Benefit 3', 'Underground fibre infrastructure that can make homes fibre-ready and improve connectivity value.')
on conflict do nothing;

insert into value_propositions (sort_order, title, body) values
(1, 'Unique Value Proposition 1', 'The network is built underground for signal strength consistency, stability, low latency and fewer glitches.'),
(2, 'Unique Value Proposition 2', 'Excellent data packages at reasonable prices, with no first-installation fee for the first installation.'),
(3, 'Unique Value Proposition 3', 'Installations and activations can happen immediately after payment and proof-of-payment verification.')
on conflict do nothing;

insert into offerings (sort_order, title, speed, description) values
(1, 'Offering 01', '15/15 Mbps', 'Symmetrical low-latency fibre for small to medium households with 1 to 5 users and one extra device.'),
(2, 'Offering 02', '20/20 Mbps', 'Symmetrical 20 Mbps upload and download for homes with 5 to 7 users and one extra connected device.'),
(3, 'Offering 03', '25/25 Mbps', 'Reliable uncapped fibre for 5 to 10 household users who need continuous connectivity for school, work and entertainment.'),
(4, 'Offering 04', '50/50 Mbps', 'Fast symmetrical fibre for 10 to 15 users, remote work, streaming and stable low-latency browsing.'),
(5, 'Offering 05', '100/100 Mbps', 'Designed for heavy internet users, larger households of 10 to 20 users and home office teams.'),
(6, 'Offering 06', '200/200 Mbps', 'Star Fibre’s highest speed package for power users, home businesses and high-volume connectivity needs.')
on conflict do nothing;

insert into testimonials (customer_name, quote) values
('John Mabot', 'I have now subscribed with Starfibre Communications and my life has changed for the better. I am able to enjoy internet at home without signal losses or interruptions.'),
('Bibby Cumelo', 'Since subscribing with Starfibre Communications I am sailing all the way with no glitches and stoppages. Starfibre is really a Star in Connectivity.')
on conflict do nothing;

insert into contact_channels (sort_order, label, value) values
(1, 'Address', '21607 Kei Street, Protea Glen Ext.29, 1834'),
(2, 'Phone', '011 851 1945'),
(3, 'WhatsApp', '0781722024'),
(4, 'Email', 'Sales@starfibrecom.co.za / admin@starfibrecom.co.za / admin@starfibercomm.co.za')
on conflict do nothing;

insert into settings (id, notification_template) values
(1, 'Your Star Fibre account has an overdue balance. Payments are allocated to your oldest unpaid invoice first.')
on conflict (id) do nothing;

-- Launch hardening: least-privilege roles and strict RLS for operational data.
create table if not exists admin_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','manager','finance','support')),
  created_at timestamptz default now()
);

alter table admin_memberships enable row level security;

create or replace function is_admin_member(required_roles text[] default array['admin','manager'])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_memberships
    where user_id = auth.uid()
      and role = any(required_roles)
  );
$$;

create or replace function owns_customer_record(customer_record_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from customers
    where id = customer_record_id
      and auth_user_id = auth.uid()
  );
$$;

drop policy if exists "Authenticated read customers" on customers;
drop policy if exists "Authenticated read invoices" on invoices;
drop policy if exists "Authenticated read payments" on payments;
drop policy if exists "Authenticated read settings" on settings;
drop policy if exists "Authenticated read tickets" on tickets;
drop policy if exists "Authenticated read audit" on audit_trail;

create policy "Customers read own profile" on customers for select to authenticated using (auth_user_id = auth.uid());
create policy "Managers read customers" on customers for select to authenticated using (is_admin_member(array['admin','manager','support','finance']));

create policy "Customers read own invoices" on invoices for select to authenticated using (owns_customer_record(customer_id));
create policy "Managers read invoices" on invoices for select to authenticated using (is_admin_member(array['admin','manager','finance','support']));

create policy "Customers read own payments" on payments for select to authenticated using (owns_customer_record(customer_id));
create policy "Finance reads payments" on payments for select to authenticated using (is_admin_member(array['admin','manager','finance']));

create policy "Managers read settings" on settings for select to authenticated using (is_admin_member(array['admin','manager','finance','support']));
create policy "Customers read own tickets" on tickets for select to authenticated using (customer_id is not null and owns_customer_record(customer_id));
create policy "Support reads tickets" on tickets for select to authenticated using (is_admin_member(array['admin','manager','support']));
create policy "Admins read audit trail" on audit_trail for select to authenticated using (is_admin_member(array['admin','manager']));
create policy "Admins read memberships" on admin_memberships for select to authenticated using (is_admin_member(array['admin']));

create index if not exists customers_auth_user_id_idx on customers(auth_user_id);
create index if not exists invoices_customer_billing_idx on invoices(customer_id, billing_month desc);
create index if not exists payments_customer_paid_at_idx on payments(customer_id, paid_at desc);
create index if not exists payments_verification_status_idx on payments(verification_status);
create index if not exists audit_trail_created_at_idx on audit_trail(created_at desc);

-- Scale indexes for high-cardinality billing and reconciliation fields.
create index if not exists invoices_billing_month_status_idx on invoices(billing_month desc, status);
create index if not exists invoices_due_date_unpaid_idx on invoices(due_date, customer_id) where status <> 'paid';
create index if not exists invoices_customer_status_due_idx on invoices(customer_id, status, due_date);
create index if not exists payments_paid_at_status_idx on payments(paid_at desc, verification_status);
create index if not exists payments_invoice_status_idx on payments(invoice_id, verification_status) where invoice_id is not null;
create index if not exists customers_account_number_idx on customers(account_number);
create index if not exists customers_status_plan_idx on customers(status, plan_id);

create table if not exists reminder_queue (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) not null,
  invoice_id uuid references invoices(id) not null,
  channel text not null default 'email',
  status text not null default 'queued' check (status in ('queued','sent','failed','suppressed')),
  scheduled_for timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(invoice_id, channel, status)
);

alter table reminder_queue enable row level security;
create policy "Support reads reminder queue" on reminder_queue for select to authenticated using (is_admin_member(array['admin','manager','support','finance']));
create index if not exists reminder_queue_status_schedule_idx on reminder_queue(status, scheduled_for);
create index if not exists reminder_queue_customer_idx on reminder_queue(customer_id, created_at desc);

create or replace function queue_overdue_reminders(p_limit int default 1000)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  queued_count int;
begin
  with overdue as (
    select i.id invoice_id, i.customer_id
    from invoices i
    where i.status <> 'paid'
      and i.due_date < current_date
      and not exists (
        select 1 from reminder_queue rq
        where rq.invoice_id = i.id
          and rq.status in ('queued','sent')
          and rq.created_at > now() - interval '7 days'
      )
    order by i.due_date asc
    limit greatest(1, p_limit)
  ), inserted as (
    insert into reminder_queue (invoice_id, customer_id)
    select invoice_id, customer_id from overdue
    on conflict do nothing
    returning 1
  )
  select count(*) into queued_count from inserted;

  return queued_count;
end;
$$;


alter table payments add column if not exists allocated_at timestamptz;
create index if not exists payments_allocation_queue_idx on payments(verification_status, paid_at) where allocated_at is null;

create or replace function allocate_payment_oldest_first(p_customer_id uuid, p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining numeric(10,2);
  invoice_record record;
  applied numeric(10,2);
begin
  select amount into remaining
  from payments
  where id = p_payment_id
    and customer_id = p_customer_id
    and allocated_at is null
  for update;

  if remaining is null then
    return;
  end if;

  for invoice_record in
    select * from invoices
    where customer_id = p_customer_id and status <> 'paid'
    order by billing_month asc
    for update
  loop
    exit when remaining <= 0;
    applied := least(invoice_record.amount - invoice_record.paid_amount, remaining);
    remaining := remaining - applied;

    update invoices
    set paid_amount = paid_amount + applied,
        status = case when paid_amount + applied >= amount then 'paid'::invoice_status else 'partially_paid'::invoice_status end,
        paid_date = case when paid_amount + applied >= amount then current_date else paid_date end
    where id = invoice_record.id;
  end loop;

  update payments
  set verification_status = 'approved',
      allocated_at = now()
  where id = p_payment_id;
end;
$$;

create or replace function allocate_approved_payments_batch(p_limit int default 500)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_record record;
  processed_count int := 0;
begin
  for payment_record in
    select p.id, p.customer_id
    from payments p
    where p.verification_status = 'approved'
      and p.allocated_at is null
      and exists (
        select 1 from invoices i
        where i.customer_id = p.customer_id
          and i.status <> 'paid'
      )
    order by p.paid_at asc
    limit greatest(1, p_limit)
    for update skip locked
  loop
    perform allocate_payment_oldest_first(payment_record.customer_id, payment_record.id);
    processed_count := processed_count + 1;
  end loop;

  return processed_count;
end;
$$;

-- Optional Supabase pg_cron scheduling; enable pg_cron first if available in your project.
-- select cron.schedule('starfibre-overdue-reminders', '*/15 * * * *', $$select queue_overdue_reminders(1000);$$);
-- select cron.schedule('starfibre-payment-allocation', '*/5 * * * *', $$select allocate_approved_payments_batch(500);$$);
