-- WealthLink Supabase schema
-- Run this in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public."AdminAllowlist" (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  access_level text not null check (access_level in ('READ_ONLY_ADMIN', 'ADMIN', 'SUPER_ADMIN')),
  is_active boolean not null default true,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1
    from public."AdminAllowlist" a
    where a.auth_user_id = auth.uid()
      and a.is_active = true
      and (a.expires_at is null or a.expires_at > now())
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1
    from public."AdminAllowlist" a
    where a.auth_user_id = auth.uid()
      and a.access_level = 'SUPER_ADMIN'
      and a.is_active = true
      and (a.expires_at is null or a.expires_at > now())
  );
$$;

alter table public."AdminAllowlist" enable row level security;

create policy "super_admins_can_manage_admin_allowlist"
on public."AdminAllowlist"
for all
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

insert into public."AdminAllowlist" (auth_user_id, access_level, is_active, expires_at, created_at, updated_at)
values ('5b2796d3-d4b1-4d0a-b317-47bb69b5ca2e', 'ADMIN', true, null, now(), now())
on conflict (auth_user_id)
do update set
  access_level = excluded.access_level,
  is_active = excluded.is_active,
  expires_at = excluded.expires_at,
  updated_at = now();

-- Admin dashboard tables: only active, valid admins can read or change operational data.
create policy "admin_read_access_for_dashboard_tables"
on "User"
for select to authenticated using ((select public.is_admin()));

create policy "admin_write_access_for_dashboard_tables"
on "User"
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admin_read_access_for_investments"
on "Investment"
for select to authenticated using ((select public.is_admin()));

create policy "admin_write_access_for_investments"
on "Investment"
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admin_read_access_for_incentives"
on "Incentive"
for select to authenticated using ((select public.is_admin()));

create policy "admin_write_access_for_incentives"
on "Incentive"
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admin_read_access_for_compliance"
on "ComplianceFlag"
for select to authenticated using ((select public.is_admin()));

create policy "admin_write_access_for_compliance"
on "ComplianceFlag"
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admin_read_access_for_kyc"
on "KYCSubmission"
for select to authenticated using ((select public.is_admin()));

create policy "admin_write_access_for_kyc"
on "KYCSubmission"
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admin_read_access_for_coinbase"
on "CoinbaseConfig"
for select to authenticated using ((select public.is_admin()));

create policy "admin_write_access_for_coinbase"
on "CoinbaseConfig"
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admin_read_access_for_transactions"
on "CoinbaseTransaction"
for select to authenticated using ((select public.is_admin()));

create policy "admin_write_access_for_transactions"
on "CoinbaseTransaction"
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admin_read_access_for_wallet_admin"
on "WalletTransaction"
for select to authenticated using ((select public.is_admin()));

create policy "admin_read_access_for_withdrawals"
on "Withdrawal"
for select to authenticated using ((select public.is_admin()));

create policy "admin_write_access_for_withdrawals"
on "Withdrawal"
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admin_read_access_for_bank_accounts"
on "BankAccount"
for select to authenticated using ((select public.is_admin()));

create policy "admin_read_access_for_referrals"
on "ReferralRelationship"
for select to authenticated using ((select public.is_admin()));

-- Standard columns used by Base44 entities.
-- Every table gets an id + created_at + updated_at to match the app's entity behavior.

create table if not exists "User" (
  id uuid primary key default gen_random_uuid(),
  role text not null default 'user' check (role in ('user', 'admin')),
  app_role text not null default 'MEMBER' check (
    app_role in (
      'MEMBER',
      'GROWTH_PARTNER',
      'SUPPORT',
      'COMPLIANCE_OFFICER',
      'FINANCE_ADMIN',
      'ADMIN',
      'SUPER_ADMIN'
    )
  ),
  mobile_number text,
  country text,
  date_of_birth date,
  member_number text,
  referral_code text,
  referred_by_member_id text,
  member_status text not null default 'ACTIVE' check (
    member_status in ('ACTIVE', 'SUSPENDED', 'CLOSED')
  ),
  kyc_status text not null default 'PENDING' check (
    kyc_status in ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED')
  ),
  leadership_level integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "Activity" (
  id uuid primary key default gen_random_uuid(),
  type text,
  description text,
  amount numeric(18, 2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "AuditLog" (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  user_role text,
  action text,
  entity text,
  entity_id text,
  previous_value text,
  new_value text,
  reason text,
  "timestamp" timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "BankAccount" (
  id uuid primary key default gen_random_uuid(),
  member_id text not null,
  bank_name text,
  account_holder text,
  account_number_masked text,
  account_fingerprint text,
  account_type text,
  branch_code text,
  is_verified boolean not null default false,
  status text not null default 'PENDING_VERIFICATION' check (
    status in ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'LOCKED')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "BinanceApiLog" (
  id uuid primary key default gen_random_uuid(),
  "timestamp" timestamptz not null default now(),
  endpoint_category text,
  member_id text,
  response_status integer,
  error_code text,
  request_id text,
  processing_time_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "BinanceConfig" (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'INACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  environment text not null default 'TEST' check (environment in ('PRODUCTION', 'TEST')),
  api_base_url text not null default 'https://api.binance.com',
  connection_mode text not null default 'READ_ONLY',
  allowed_permissions text not null default 'USER_DATA',
  last_sync_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "BinanceConnection" (
  id uuid primary key default gen_random_uuid(),
  member_id text not null,
  status text,
  api_key text,
  api_secret_encrypted text,
  permissions jsonb not null default '[]'::jsonb,
  connection_mode text,
  funding_status text,
  connected_date timestamptz,
  disconnected_date timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "CoinbaseConfig" (
  id uuid primary key default gen_random_uuid(),
  status text,
  default_chain_id text,
  supported_tokens jsonb not null default '[]'::jsonb,
  treasury_wallet_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "CoinbaseTransaction" (
  id uuid primary key default gen_random_uuid(),
  member_id text not null,
  wallet_address text,
  chain_id text,
  chain_name text,
  token_symbol text,
  amount numeric(18, 8) default 0,
  recipient_address text,
  token_contract_address text,
  transaction_hash text,
  status text,
  block_explorer_url text,
  "timestamp" timestamptz not null default now(),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "ComplianceFlag" (
  id uuid primary key default gen_random_uuid(),
  flag_id text not null,
  member_id text not null,
  category text,
  severity text,
  status text,
  reason text,
  related_entity text,
  related_entity_id text,
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "ExchangeRate" (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null,
  quote_currency text not null,
  rate numeric(18, 8) not null default 0,
  is_illustrative boolean not null default false,
  effective_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "FundingTransaction" (
  id uuid primary key default gen_random_uuid(),
  transaction_id text not null,
  member_id text not null,
  "date" date,
  currency text,
  amount numeric(18, 2) default 0,
  zar_value numeric(18, 2) default 0,
  funding_method text,
  binance_status text,
  wealthlink_status text,
  blockchain_txid text,
  submitted_reference text,
  notes text,
  reviewed_by text,
  reviewed_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "Incentive" (
  id uuid primary key default gen_random_uuid(),
  incentive_id text not null,
  member_id text not null,
  source_member_id text,
  investment_id text,
  base_amount numeric(18, 2) default 0,
  percentage numeric(18, 4) default 0,
  amount numeric(18, 2) default 0,
  incentive_type text,
  level integer,
  status text,
  calculation_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "IncentiveConfiguration" (
  id uuid primary key default gen_random_uuid(),
  programme_enabled boolean not null default false,
  direct_percentage numeric(18, 4) default 0,
  leadership_percentage numeric(18, 4) default 0,
  qualification_requirement text,
  maximum_leadership_levels integer default 0,
  minimum_qualifying_transaction numeric(18, 2) default 0,
  approval_required boolean not null default false,
  kyc_required_for_investment boolean not null default false,
  kyc_required_for_withdrawal boolean not null default false,
  bank_verification_required boolean not null default false,
  leaderboard_enabled boolean not null default false,
  reversal_rule text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "Investment" (
  id uuid primary key default gen_random_uuid(),
  investment_id text not null,
  member_id text not null,
  product_id text,
  product_name text,
  investment_amount numeric(18, 2) default 0,
  currency text,
  exchange_rate numeric(18, 8) default 0,
  zar_equivalent numeric(18, 2) default 0,
  transaction_reference text,
  payment_status text,
  investment_status text,
  start_date date,
  maturity_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "InvestmentProduct" (
  id uuid primary key default gen_random_uuid(),
  name text,
  description text,
  minimum_investment numeric(18, 2) default 0,
  currency text,
  term_months integer,
  risk_level text,
  return_method text,
  rate numeric(18, 4) default 0,
  is_active boolean not null default true,
  disclosure text,
  terms text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "KYCSubmission" (
  id uuid primary key default gen_random_uuid(),
  member_id text not null,
  document_type text,
  document_uri text,
  identity_fingerprint text,
  status text not null default 'PENDING' check (
    status in ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED')
  ),
  review_notes text,
  reviewed_by text,
  reviewed_date timestamptz,
  expiry_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "LegalDocument" (
  id uuid primary key default gen_random_uuid(),
  document_type text,
  title text,
  content text,
  version text,
  is_published boolean not null default false,
  effective_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "LunoConnection" (
  id uuid primary key default gen_random_uuid(),
  member_id text not null,
  status text,
  api_key_id text,
  api_secret_encrypted text,
  connected_date timestamptz,
  disconnected_date timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "LunoTransaction" (
  id uuid primary key default gen_random_uuid(),
  member_id text not null,
  asset text,
  amount numeric(18, 8) default 0,
  recipient_address text,
  transaction_reference text,
  status text,
  "timestamp" timestamptz not null default now(),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "Notification" (
  id uuid primary key default gen_random_uuid(),
  member_id text not null,
  type text,
  title text,
  message text,
  is_read boolean not null default false,
  "timestamp" timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "OfficialLink" (
  id uuid primary key default gen_random_uuid(),
  name text,
  url text,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "ReferralRelationship" (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id text not null,
  referred_user_id text not null,
  referrer_member_number text,
  referred_member_number text,
  level integer not null default 1,
  is_qualified boolean not null default false,
  relationship_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "VirtualInvestment" (
  id uuid primary key default gen_random_uuid(),
  amount numeric(18, 2) default 0,
  period_days integer,
  start_date date,
  end_date date,
  status text,
  daily_rate numeric(18, 8) default 0,
  index_name text,
  index_annual_rate numeric(18, 8) default 0,
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "WalletTransaction" (
  id uuid primary key default gen_random_uuid(),
  transaction_id text not null,
  member_id text not null,
  amount numeric(18, 2) default 0,
  balance_type text,
  type text,
  description text,
  source text,
  source_id text,
  status text,
  "timestamp" timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "Withdrawal" (
  id uuid primary key default gen_random_uuid(),
  withdrawal_id text not null,
  member_id text not null,
  amount numeric(18, 2) default 0,
  bank_account_id text,
  bank_account_masked text,
  status text,
  requested_date timestamptz,
  approved_date timestamptz,
  payment_date timestamptz,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Useful indexes that match the app's filters and lookups.
create index if not exists idx_user_member_number on "User" (member_number);
create index if not exists idx_user_referral_code on "User" (referral_code);
create index if not exists idx_user_referred_by on "User" (referred_by_member_id);
create index if not exists idx_bankaccount_member on "BankAccount" (member_id);
create index if not exists idx_bankaccount_fingerprint on "BankAccount" (account_fingerprint);
create index if not exists idx_binance_connection_member on "BinanceConnection" (member_id);
create index if not exists idx_coinbase_tx_member on "CoinbaseTransaction" (member_id);
create index if not exists idx_compliance_member on "ComplianceFlag" (member_id);
create index if not exists idx_exchange_rate_active on "ExchangeRate" (base_currency, quote_currency, is_active, effective_date);
create index if not exists idx_investment_member on "Investment" (member_id);
create index if not exists idx_investment_ref on "Investment" (transaction_reference);
create index if not exists idx_investment_status on "Investment" (investment_status);
create index if not exists idx_kyc_member on "KYCSubmission" (member_id);
create index if not exists idx_luno_connection_member on "LunoConnection" (member_id);
create index if not exists idx_luno_tx_member on "LunoTransaction" (member_id);
create index if not exists idx_notification_member on "Notification" (member_id);
create index if not exists idx_referral_referred on "ReferralRelationship" (referred_user_id);
create index if not exists idx_referral_referrer on "ReferralRelationship" (referrer_user_id);
create index if not exists idx_wallet_member on "WalletTransaction" (member_id);
create index if not exists idx_withdrawal_member on "Withdrawal" (member_id);
create index if not exists idx_withdrawal_status on "Withdrawal" (status);

-- Optional: create a trigger to auto-update updated_at for all tables.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger trg_user_updated_at
before update on "User"
for each row execute function set_updated_at();

create or replace trigger trg_activity_updated_at
before update on "Activity"
for each row execute function set_updated_at();

create or replace trigger trg_auditlog_updated_at
before update on "AuditLog"
for each row execute function set_updated_at();

create or replace trigger trg_bankaccount_updated_at
before update on "BankAccount"
for each row execute function set_updated_at();

create or replace trigger trg_binanceapi_updated_at
before update on "BinanceApiLog"
for each row execute function set_updated_at();

create or replace trigger trg_binanceconfig_updated_at
before update on "BinanceConfig"
for each row execute function set_updated_at();

create or replace trigger trg_binanceconnection_updated_at
before update on "BinanceConnection"
for each row execute function set_updated_at();

create or replace trigger trg_coinbaseconfig_updated_at
before update on "CoinbaseConfig"
for each row execute function set_updated_at();

create or replace trigger trg_coinbasetx_updated_at
before update on "CoinbaseTransaction"
for each row execute function set_updated_at();

create or replace trigger trg_complianceflag_updated_at
before update on "ComplianceFlag"
for each row execute function set_updated_at();

create or replace trigger trg_exchangerate_updated_at
before update on "ExchangeRate"
for each row execute function set_updated_at();

create or replace trigger trg_fundingtransaction_updated_at
before update on "FundingTransaction"
for each row execute function set_updated_at();

create or replace trigger trg_incentive_updated_at
before update on "Incentive"
for each row execute function set_updated_at();

create or replace trigger trg_incentiveconfig_updated_at
before update on "IncentiveConfiguration"
for each row execute function set_updated_at();

create or replace trigger trg_investment_updated_at
before update on "Investment"
for each row execute function set_updated_at();

create or replace trigger trg_investmentproduct_updated_at
before update on "InvestmentProduct"
for each row execute function set_updated_at();

create or replace trigger trg_kycsubmission_updated_at
before update on "KYCSubmission"
for each row execute function set_updated_at();

create or replace trigger trg_legaldocument_updated_at
before update on "LegalDocument"
for each row execute function set_updated_at();

create or replace trigger trg_lunoconnection_updated_at
before update on "LunoConnection"
for each row execute function set_updated_at();

create or replace trigger trg_lunotransaction_updated_at
before update on "LunoTransaction"
for each row execute function set_updated_at();

create or replace trigger trg_notification_updated_at
before update on "Notification"
for each row execute function set_updated_at();

create or replace trigger trg_officiallink_updated_at
before update on "OfficialLink"
for each row execute function set_updated_at();

create or replace trigger trg_referralrelationship_updated_at
before update on "ReferralRelationship"
for each row execute function set_updated_at();

create or replace trigger trg_virtualinvestment_updated_at
before update on "VirtualInvestment"
for each row execute function set_updated_at();

create or replace trigger trg_wallettransaction_updated_at
before update on "WalletTransaction"
for each row execute function set_updated_at();

create or replace trigger trg_withdrawal_updated_at
before update on "Withdrawal"
for each row execute function set_updated_at();
