create type account_status as enum ('active','overdue','suspended','disconnected');
create type invoice_status as enum ('unpaid','partially_paid','paid','overdue');
create type payment_source as enum ('paystack_online','manual_eft');
create table subscription_plans (id uuid primary key default gen_random_uuid(), name text not null, speed text not null, monthly_price numeric(10,2) not null, description text, active boolean default true);
create table customers (id uuid primary key default gen_random_uuid(), auth_user_id uuid references auth.users(id), name text not null, contact_number text not null, email text not null, street text not null, extension text not null, account_number text unique not null, plan_id uuid references subscription_plans(id), installation_date date not null, status account_status default 'active');
create table invoices (id uuid primary key default gen_random_uuid(), customer_id uuid references customers(id) not null, billing_month date not null, due_date date not null, amount numeric(10,2) not null, paid_amount numeric(10,2) default 0, status invoice_status default 'unpaid', paid_date date, unique(customer_id,billing_month));
create table payments (id uuid primary key default gen_random_uuid(), customer_id uuid references customers(id) not null, invoice_id uuid references invoices(id), source payment_source not null, amount numeric(10,2) not null, paid_at date not null, verification_status text default 'pending_verification', proof_url text);
create table settings (id int primary key default 1, yellow_days int default 2, orange_days int default 4, red_days int default 5, disconnection_days int default 14, disconnection_months int default 2, notification_template text);
create table tickets (id uuid primary key default gen_random_uuid(), customer_id uuid references customers(id), subject text not null, status text default 'open', resolution_log text, updated_at timestamptz default now());
create table audit_trail (id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id), action text not null, target_table text not null, target_id uuid, metadata jsonb default '{}', created_at timestamptz default now());

-- Payment allocation must be oldest-first. Approving a payment should call an RPC/edge function
-- that locks unpaid invoices ordered by billing_month and increments paid_amount until exhausted.
