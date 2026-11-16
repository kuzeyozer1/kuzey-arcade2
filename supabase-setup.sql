-- Kuzey Arcade online accounts. Paste all of this into Supabase: SQL Editor -> New query -> Run.
-- It is safe to run again later (it updates the functions and keeps the accounts).
--
-- How it is locked down:
--  * The tables have Row Level Security on and NO policies, and the website's key is not allowed to touch
--    them directly. The website can only call the kz_* functions below.
--  * Passwords are stored as bcrypt hashes. Each device gets its own random login token; only a hash of it is stored.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.kz_accounts(
  username   text primary key check (username ~ '^[a-z0-9_]{3,20}$'),
  pass_hash  text not null,
  profile    jsonb not null default '{}'::jsonb,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now());
create table if not exists public.kz_sessions(
  token_hash text primary key,
  username   text not null references public.kz_accounts(username) on delete cascade,
  device     text,
  created_at timestamptz not null default now(),
  used_at    timestamptz not null default now());
create table if not exists public.kz_attempts(
  username text not null,
  at       timestamptz not null default now());
create index if not exists kz_attempts_user on public.kz_attempts(username, at);

alter table public.kz_accounts enable row level security;
alter table public.kz_sessions enable row level security;
alter table public.kz_attempts enable row level security;
revoke all on public.kz_accounts, public.kz_sessions, public.kz_attempts from anon, authenticated;

-- helpers (not callable from the website)
create or replace function public.kz_new_session(p_user text, p_device text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare t text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  insert into kz_sessions(token_hash, username, device) values (encode(extensions.digest(t, 'sha256'), 'hex'), p_user, left(p_device, 60));
  return t;
end $$;
create or replace function public.kz_user_for(p_token text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare u text;
begin
  update kz_sessions set used_at = now() where token_hash = encode(extensions.digest(coalesce(p_token,''), 'sha256'), 'hex') returning username into u;
  if u is null then raise exception 'kz_logged_out'; end if;
  return u;
end $$;
revoke all on function public.kz_new_session(text, text) from public, anon, authenticated;
revoke all on function public.kz_user_for(text) from public, anon, authenticated;

-- make a new online account (uploads the progress that is on the device now)
create or replace function public.kz_signup(p_user text, p_pass text, p_profile jsonb, p_data jsonb, p_device text default '')
returns json language plpgsql security definer set search_path = public, extensions as $$
declare u text := lower(trim(p_user)); ts timestamptz;
begin
  if u !~ '^[a-z0-9_]{3,20}$' then raise exception 'kz_bad_name'; end if;
  if length(coalesce(p_pass,'')) < 6 then raise exception 'kz_short_pass'; end if;
  if exists(select 1 from kz_accounts where username = u) then raise exception 'kz_taken'; end if;
  insert into kz_accounts(username, pass_hash, profile, data)
    values (u, extensions.crypt(p_pass, extensions.gen_salt('bf', 8)), coalesce(p_profile,'{}'), coalesce(p_data,'{}'))
    returning updated_at into ts;
  return json_build_object('username', u, 'token', kz_new_session(u, p_device), 'updated_at', ts);
end $$;

-- log in on any device: gives back the progress and a token for this device
create or replace function public.kz_login(p_user text, p_pass text, p_device text default '')
returns json language plpgsql security definer set search_path = public, extensions as $$
declare u text := lower(trim(p_user)); a kz_accounts;
begin
  if (select count(*) from kz_attempts where username = u and at > now() - interval '10 minutes') >= 10 then raise exception 'kz_slow_down'; end if;
  select * into a from kz_accounts where username = u;
  if a.username is null or a.pass_hash <> extensions.crypt(coalesce(p_pass,''), a.pass_hash) then
    insert into kz_attempts(username) values (u);
    return json_build_object('error', 'kz_wrong');  -- not an exception, so the attempt above is kept
  end if;
  delete from kz_attempts where username = u;
  delete from kz_attempts where at < now() - interval '1 day';
  return json_build_object('username', u, 'token', kz_new_session(u, p_device), 'profile', a.profile, 'data', a.data, 'updated_at', a.updated_at);
end $$;

-- when was the online copy last changed?
create or replace function public.kz_meta(p_token text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare u text := kz_user_for(p_token); ts timestamptz;
begin
  select updated_at into ts from kz_accounts where username = u;
  return json_build_object('username', u, 'updated_at', ts);
end $$;

-- download the online progress
create or replace function public.kz_pull(p_token text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare u text := kz_user_for(p_token); a kz_accounts;
begin
  select * into a from kz_accounts where username = u;
  return json_build_object('username', u, 'profile', a.profile, 'data', a.data, 'updated_at', a.updated_at);
end $$;

-- upload progress. p_base is the online time this device last saw; if someone else saved since then
-- it refuses (kz_conflict) unless p_force is true.
create or replace function public.kz_push(p_token text, p_profile jsonb, p_data jsonb, p_base timestamptz, p_force boolean default false)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare u text := kz_user_for(p_token); cur timestamptz; ts timestamptz;
begin
  if octet_length(p_data::text) > 8000000 then raise exception 'kz_too_big'; end if;
  select updated_at into cur from kz_accounts where username = u for update;
  if not p_force and p_base is not null and cur > p_base + interval '1 millisecond' then raise exception 'kz_conflict'; end if;
  update kz_accounts set profile = coalesce(p_profile,'{}'), data = coalesce(p_data,'{}'), updated_at = clock_timestamp()
    where username = u returning updated_at into ts;
  return json_build_object('updated_at', ts);
end $$;

-- log this device out
create or replace function public.kz_logout(p_token text) returns void
language sql security definer set search_path = public, extensions as $$
  delete from kz_sessions where token_hash = encode(extensions.digest(coalesce(p_token,''), 'sha256'), 'hex');
$$;

-- change password (logs out every other device)
create or replace function public.kz_change_pass(p_user text, p_old text, p_new text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare u text := lower(trim(p_user)); h text;
begin
  select pass_hash into h from kz_accounts where username = u;
  if h is null or h <> extensions.crypt(coalesce(p_old,''), h) then raise exception 'kz_wrong'; end if;
  if length(coalesce(p_new,'')) < 6 then raise exception 'kz_short_pass'; end if;
  update kz_accounts set pass_hash = extensions.crypt(p_new, extensions.gen_salt('bf', 8)) where username = u;
  delete from kz_sessions where username = u;
end $$;

revoke all on function public.kz_signup(text,text,jsonb,jsonb,text), public.kz_login(text,text,text), public.kz_meta(text), public.kz_pull(text),
  public.kz_push(text,jsonb,jsonb,timestamptz,boolean), public.kz_logout(text), public.kz_change_pass(text,text,text) from public;
grant execute on function public.kz_signup(text,text,jsonb,jsonb,text), public.kz_login(text,text,text), public.kz_meta(text), public.kz_pull(text),
  public.kz_push(text,jsonb,jsonb,timestamptz,boolean), public.kz_logout(text), public.kz_change_pass(text,text,text) to anon, authenticated;

-- ================= FRIENDS =================
-- a = who sent the invite, b = who got it. status: 'pending' or 'friends'.
create table if not exists public.kz_friends(
  a text not null references public.kz_accounts(username) on delete cascade,
  b text not null references public.kz_accounts(username) on delete cascade,
  status text not null default 'pending' check (status in ('pending','friends')),
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a <> b));
create unique index if not exists kz_friends_pair on public.kz_friends(least(a,b), greatest(a,b));
alter table public.kz_friends enable row level security;
revoke all on public.kz_friends from anon, authenticated;

-- everyone with an account (name, avatar, colour, online or not) and how they relate to me
create or replace function public.kz_people(p_token text, p_search text default '')
returns json language plpgsql security definer set search_path = public, extensions as $$
declare me text := kz_user_for(p_token); q text := lower(trim(coalesce(p_search,'')));
begin
  return coalesce((select json_agg(x order by x.rel_order, x.online desc, x.username) from (
    select acc.username,
           coalesce(acc.profile->>'name', acc.username) as name,
           coalesce(acc.profile->>'avatar', '🦊') as avatar,
           coalesce(acc.profile->>'color', '#3ef0ff') as color,
           coalesce((select max(s.used_at) from kz_sessions s where s.username = acc.username) > now() - interval '3 minutes', false) as online,
           case when f.status = 'friends' then 'friend' when f.a = me then 'sent' when f.b = me then 'received' else 'none' end as rel,
           case when f.status = 'friends' then 1 when f.b = me then 0 when f.a = me then 2 else 3 end as rel_order
      from kz_accounts acc
      left join kz_friends f on (f.a = me and f.b = acc.username) or (f.b = me and f.a = acc.username)
     where acc.username <> me
       and (q = '' or acc.username like '%' || q || '%' or lower(coalesce(acc.profile->>'name','')) like '%' || q || '%')
     order by rel_order, acc.username
     limit 300) x), '[]'::json);
end $$;

-- send an invite (if they already invited me, we just become friends)
create or replace function public.kz_friend_invite(p_token text, p_to text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare me text := kz_user_for(p_token); them text := lower(trim(p_to)); f kz_friends;
begin
  if them = me or not exists(select 1 from kz_accounts where username = them) then raise exception 'kz_no_user'; end if;
  select * into f from kz_friends where (a = me and b = them) or (a = them and b = me);
  if f.a is not null then
    if f.status = 'friends' then return 'friend'; end if;
    if f.b = me then update kz_friends set status = 'friends' where a = them and b = me; return 'friend'; end if;
    return 'sent';
  end if;
  if (select count(*) from kz_friends where a = me and status = 'pending') >= 50 then raise exception 'kz_too_many'; end if;
  insert into kz_friends(a, b) values (me, them);
  return 'sent';
end $$;

-- accept or say no to an invite
create or replace function public.kz_friend_answer(p_token text, p_from text, p_accept boolean) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare me text := kz_user_for(p_token); them text := lower(trim(p_from));
begin
  if p_accept then
    update kz_friends set status = 'friends' where a = them and b = me and status = 'pending';
    return 'friend';
  end if;
  delete from kz_friends where a = them and b = me and status = 'pending';
  return 'none';
end $$;

-- cancel my invite, or stop being friends
create or replace function public.kz_friend_remove(p_token text, p_other text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare me text := kz_user_for(p_token); them text := lower(trim(p_other));
begin
  delete from kz_friends where (a = me and b = them) or (a = them and b = me);
  return 'none';
end $$;

-- how many invites are waiting for me (for the red badge)
create or replace function public.kz_friend_count(p_token text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare me text := kz_user_for(p_token);
begin
  return json_build_object('requests', (select count(*) from kz_friends where b = me and status = 'pending'),
                           'friends', (select count(*) from kz_friends where (a = me or b = me) and status = 'friends'));
end $$;

revoke all on function public.kz_people(text,text), public.kz_friend_invite(text,text), public.kz_friend_answer(text,text,boolean),
  public.kz_friend_remove(text,text), public.kz_friend_count(text) from public;
grant execute on function public.kz_people(text,text), public.kz_friend_invite(text,text), public.kz_friend_answer(text,text,boolean),
  public.kz_friend_remove(text,text), public.kz_friend_count(text) to anon, authenticated;
