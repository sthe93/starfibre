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

do $$
begin
  create type app_role as enum ('customer','admin');
exception
  when duplicate_object then null;
end
$$;

create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null default 'customer',
  display_name text not null,
  customer_id uuid references customers(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_profiles enable row level security;

create policy "Users can read own profile" on user_profiles for select to authenticated using (auth.uid() = id);
create policy "Admins can read all profiles" on user_profiles for select to authenticated using (
  exists (select 1 from user_profiles profile where profile.id = auth.uid() and profile.role = 'admin')
);

insert into subscription_plans (id, name, speed, monthly_price, description) values
('11111111-1111-4111-8111-111111111111', 'Home Essential', '25/25 Mbps', 399.00, 'Premium entry fibre for learning, streaming and messaging.'),
('22222222-2222-4222-8222-222222222222', 'Home Plus', '50/50 Mbps', 599.00, 'Balanced symmetrical fibre for busy homes and hybrid work.'),
('33333333-3333-4333-8333-333333333333', 'Business Max', '100/100 Mbps', 899.00, 'High-capacity service for power users and small businesses.')
on conflict (id) do update set name = excluded.name, speed = excluded.speed, monthly_price = excluded.monthly_price, description = excluded.description;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@starfibrecom.co.za', crypt('StarAdmin#2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Star Fibre Admin"}'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'customer@starfibrecom.co.za', crypt('StarCustomer#2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Test Customer"}')
on conflict (id) do update set email = excluded.email, encrypted_password = excluded.encrypted_password, updated_at = now();

insert into customers (id, auth_user_id, name, contact_number, email, street, extension, account_number, plan_id, installation_date, status)
values
('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Test Customer', '0781722024', 'customer@starfibrecom.co.za', '21607 Kei Street', 'Ext.29', 'SF-TEST-0001', '22222222-2222-4222-8222-222222222222', (current_date - interval '30 days')::date, 'active')
on conflict (account_number) do update set auth_user_id = excluded.auth_user_id, name = excluded.name, email = excluded.email, plan_id = excluded.plan_id, status = excluded.status;

insert into user_profiles (id, role, display_name, customer_id) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'admin', 'Star Fibre Admin', null),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'customer', 'Test Customer', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc')
on conflict (id) do update set role = excluded.role, display_name = excluded.display_name, customer_id = excluded.customer_id, updated_at = now();

insert into invoices (customer_id, billing_month, due_date, amount, paid_amount, status, paid_date) values
('cccccccc-cccc-4ccc-8ccc-cccccccccccc', (date_trunc('month', current_date)::date - interval '1 month')::date, ((date_trunc('month', current_date)::date + interval '6 days')::date - interval '1 month')::date, 599.00, 599.00, 'paid', (current_date - interval '20 days')::date),
('cccccccc-cccc-4ccc-8ccc-cccccccccccc', date_trunc('month', current_date)::date, (date_trunc('month', current_date)::date + interval '6 days')::date, 599.00, 0.00, 'unpaid', null)
on conflict (customer_id,billing_month) do update set amount = excluded.amount, paid_amount = excluded.paid_amount, status = excluded.status, paid_date = excluded.paid_date;

insert into payments (customer_id, source, amount, paid_at, verification_status)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'manual_eft', 599.00, (current_date - interval '20 days')::date, 'approved')
on conflict do nothing;

insert into tickets (customer_id, subject, status)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Installation quality check', 'open')
on conflict do nothing;

-- Replace demo-wide operational reads with role-aware RLS for launch readiness.
drop policy if exists "Authenticated read customers" on customers;
drop policy if exists "Authenticated read invoices" on invoices;
drop policy if exists "Authenticated read payments" on payments;
drop policy if exists "Authenticated read settings" on settings;
drop policy if exists "Authenticated read tickets" on tickets;
drop policy if exists "Authenticated read audit" on audit_trail;
drop policy if exists "Customers read own customer record" on customers;
drop policy if exists "Admins read all customers" on customers;
drop policy if exists "Customers read own invoices" on invoices;
drop policy if exists "Admins read all invoices" on invoices;
drop policy if exists "Customers read own payments" on payments;
drop policy if exists "Admins read all payments" on payments;
drop policy if exists "Admins read settings" on settings;
drop policy if exists "Customers read own tickets" on tickets;
drop policy if exists "Admins read all tickets" on tickets;
drop policy if exists "Admins read audit trail" on audit_trail;

create policy "Customers read own customer record" on customers for select to authenticated using (auth_user_id = auth.uid());
create policy "Admins read all customers" on customers for select to authenticated using (
  exists (select 1 from user_profiles profile where profile.id = auth.uid() and profile.role = 'admin')
);

create policy "Customers read own invoices" on invoices for select to authenticated using (
  exists (select 1 from customers customer where customer.id = invoices.customer_id and customer.auth_user_id = auth.uid())
);
create policy "Admins read all invoices" on invoices for select to authenticated using (
  exists (select 1 from user_profiles profile where profile.id = auth.uid() and profile.role = 'admin')
);

create policy "Customers read own payments" on payments for select to authenticated using (
  exists (select 1 from customers customer where customer.id = payments.customer_id and customer.auth_user_id = auth.uid())
);
create policy "Admins read all payments" on payments for select to authenticated using (
  exists (select 1 from user_profiles profile where profile.id = auth.uid() and profile.role = 'admin')
);

create policy "Admins read settings" on settings for select to authenticated using (
  exists (select 1 from user_profiles profile where profile.id = auth.uid() and profile.role = 'admin')
);

create policy "Customers read own tickets" on tickets for select to authenticated using (
  exists (select 1 from customers customer where customer.id = tickets.customer_id and customer.auth_user_id = auth.uid())
);
create policy "Admins read all tickets" on tickets for select to authenticated using (
  exists (select 1 from user_profiles profile where profile.id = auth.uid() and profile.role = 'admin')
);

create policy "Admins read audit trail" on audit_trail for select to authenticated using (
  exists (select 1 from user_profiles profile where profile.id = auth.uid() and profile.role = 'admin')
);
