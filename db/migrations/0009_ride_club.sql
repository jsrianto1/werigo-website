-- Werigo Ride Club. No env changes. Enable via db:migrate or super-admin setup.
create table ride_members (
  user_id text primary key references "user"(id) on delete cascade,
  joined_at timestamptz not null default now()
);
create table ride_credits (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references ride_members(user_id) on delete cascade,
  source_key text not null unique,
  booking_id uuid references bookings(id) on delete restrict,
  points integer not null check(points > 0),
  rental_idr integer not null default 0 check(rental_idr >= 0),
  note text not null,
  actor text not null default 'system',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '12 months'),
  revoked boolean not null default false
);
create index ride_credits_user on ride_credits(user_id, expires_at);
create table ride_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references ride_members(user_id) on delete cascade,
  request_id uuid not null unique,
  points integer not null check(points <> 0 and abs(points) <= 10000),
  reason text not null check(char_length(reason) between 5 and 300),
  actor text not null,
  created_at timestamptz not null default now()
);
create table ride_allocations (
  id uuid primary key default gen_random_uuid(),
  credit_id uuid not null references ride_credits(id) on delete restrict,
  booking_id uuid references bookings(id) on delete restrict,
  adjustment_id uuid references ride_adjustments(id) on delete restrict,
  points integer not null check(points > 0),
  created_at timestamptz not null default now(),
  check((booking_id is null) <> (adjustment_id is null))
);
create index ride_allocations_credit on ride_allocations(credit_id);
create index ride_allocations_booking on ride_allocations(booking_id);
alter table bookings add column ride_points integer not null default 0 check(ride_points >= 0),
  add column ride_tier text check(ride_tier in ('Silver','Gold','Platinum'));
alter table bookings drop constraint bookings_discount_kind_check;
alter table bookings add constraint bookings_discount_kind_check
  check(discount_kind is null or discount_kind in ('promotion','referral','points'));

-- Reservations release on cancellation/refund/expiry; original credit expiry stays unchanged.
create view ride_credit_balances as
select c.*, coalesce((select sum(a.points) from ride_allocations a
  left join bookings b on b.id=a.booking_id
  where a.credit_id=c.id and (a.adjustment_id is not null or (
    b.status not in ('cancelled','no_response') and (b.payment_status='paid' or
    (b.payment_status='pending' and b.status='pending_payment' and b.payment_expires_at>now()))
  ))),0)::integer as used_points
from ride_credits c;

create function ride_balance(uid text) returns integer language sql volatile as $$
  select coalesce(sum(case when revoked then -used_points
    when expires_at>now() then points-used_points
    else least(points-used_points,0) end),0)::integer
  from ride_credit_balances where user_id=uid
$$;
create function ride_spend(uid text) returns bigint language sql volatile as $$
  select coalesce(sum(rental_idr),0)::bigint from ride_credits
  where user_id=uid and not revoked and booking_id is not null
    and created_at>now()-interval '12 months'
$$;
create function ride_tier_for(uid text) returns text language sql volatile as $$
  select case when ride_spend(uid)>=8000000 then 'Platinum'
    when ride_spend(uid)>=3000000 then 'Gold' else 'Silver' end
$$;

create function ride_allocate(uid text, amount integer, bid uuid, aid uuid)
returns void language plpgsql as $$
declare lot record; remaining integer := amount; take integer;
begin
  perform 1 from ride_members where user_id=uid for update;
  if amount<=0 or ride_balance(uid)<amount then
    raise exception 'Ride Points no longer available' using errcode='P0001';
  end if;
  for lot in select * from ride_credit_balances where user_id=uid and not revoked
    and expires_at>now() and points>used_points order by expires_at,created_at,id
  loop
    take:=least(remaining,lot.points-lot.used_points);
    insert into ride_allocations(credit_id,booking_id,adjustment_id,points)
      values(lot.id,bid,aid,take);
    remaining:=remaining-take;
    exit when remaining=0;
  end loop;
  if remaining<>0 then raise exception 'Ride Points allocation failed'; end if;
end $$;

create function ride_join_user() returns trigger language plpgsql as $$
begin
  if coalesce(new.role,'customer')='customer' then
    insert into ride_members(user_id) values(new.id) on conflict do nothing;
  end if;
  return new;
end $$;
create trigger ride_join after insert on "user" for each row execute function ride_join_user();
insert into ride_members(user_id) select id from "user" where coalesce(role,'customer')='customer';

create function ride_verified_welcome() returns trigger language plpgsql as $$
begin
  if new."emailVerified" and coalesce(new.role,'customer')='customer' then
    perform 1 from ride_members where user_id=new.id for update;
    if exists(select 1 from ride_credits where user_id=new.id and booking_id is not null and not revoked) then
      insert into ride_credits(user_id,source_key,points,note)
        values(new.id,'welcome:'||new.id,50,'Welcome bonus')
        on conflict(source_key) do update set revoked=false;
    end if;
  end if;
  return new;
end $$;
create trigger ride_verified after update of "emailVerified" on "user"
  for each row execute function ride_verified_welcome();

create function ride_booking_snapshot() returns trigger language plpgsql as $$
begin
  if new.user_id is null then return new; end if;
  perform 1 from ride_members where user_id=new.user_id for update;
  if not found then return new; end if;
  new.ride_tier:=ride_tier_for(new.user_id);
  if new.ride_points>0 then
    if new.discount_kind is distinct from 'points' or new.ride_points<100
      or new.discount_idr<>new.ride_points*200
      or new.discount_idr>floor(new.base_idr*0.10)
      or new.promotion_id is not null or new.referral_owner_id is not null
      or new.payment_status<>'pending' or new.base_idr is null
    then raise exception 'Invalid Ride Points discount'; end if;
    if ride_balance(new.user_id)<new.ride_points then
      raise exception 'Ride Points no longer available' using errcode='P0001';
    end if;
  elsif new.discount_kind='points' then raise exception 'Invalid Ride Points discount';
  end if;
  return new;
end $$;
create trigger ride_snapshot before insert on bookings for each row execute function ride_booking_snapshot();

-- A retry must not revive expired/reused credits; ask for a fresh booking instead.
create function ride_retry_guard() returns trigger language plpgsql as $$
begin
  if new.ride_points>0 and new.payment_status='pending' and
    (old.payment_status<>'pending' or old.payment_expires_at<=now()) then
    perform 1 from ride_members where user_id=new.user_id for update;
    if ride_balance(new.user_id)<new.ride_points or exists(
      select 1 from ride_allocations a join ride_credit_balances c on c.id=a.credit_id
      where a.booking_id=new.id and (c.revoked or c.expires_at<=now()
        or c.points-c.used_points<a.points)
    ) then raise exception 'Ride Points no longer available' using errcode='P0001'; end if;
  end if;
  return new;
end $$;
create trigger ride_retry before update of payment_status,payment_expires_at on bookings
  for each row execute function ride_retry_guard();

create function ride_booking_changed() returns trigger language plpgsql as $$
declare earned integer; net integer; joined timestamptz; verified boolean;
begin
  if new.user_id is null then return new; end if;
  select joined_at into joined from ride_members where user_id=new.user_id for update;
  if not found then return new; end if;
  if tg_op='INSERT' and new.ride_points>0 then
    perform ride_allocate(new.user_id,new.ride_points,new.id,null);
  end if;
  if new.created_at<joined then return new; end if;
  -- Award once, only for a completed and fully paid rental. Delivery earns no points.
  if new.status='completed' and new.payment_status='paid' and new.base_idr is not null then
    net:=greatest(0,new.base_idr-new.discount_idr);
    earned:=floor(net::numeric / 10000 * case new.ride_tier
      when 'Gold' then 1.25 when 'Platinum' then 1.5 else 1 end);
    if earned>0 then
      insert into ride_credits(user_id,source_key,booking_id,points,rental_idr,note)
        values(new.user_id,'booking:'||new.id,new.id,earned,net,'Rental '||new.booking_code)
        on conflict(source_key) do update set revoked=false;
    end if;
    select "emailVerified" into verified from "user" where id=new.user_id;
    if verified then
      insert into ride_credits(user_id,source_key,points,note)
        values(new.user_id,'welcome:'||new.user_id,50,'Welcome bonus')
        on conflict(source_key) do update set revoked=false;
    end if;
  elsif new.payment_status<>'paid' or new.status<>'completed' then
    update ride_credits set revoked=true where booking_id=new.id;
  end if;
  if not exists(select 1 from ride_credits where user_id=new.user_id
    and booking_id is not null and not revoked) then
    update ride_credits set revoked=true where source_key='welcome:'||new.user_id;
  end if;
  return new;
end $$;
create trigger ride_booking_ledger after insert or update of status,payment_status on bookings
  for each row execute function ride_booking_changed();

-- Admin corrections use the same expiry-first allocator and cannot overspend.
create function ride_adjust(uid text, amount integer, reason_text text, actor_text text, req uuid)
returns uuid language plpgsql as $$
declare aid uuid;
begin
  perform 1 from ride_members where user_id=uid for update;
  if not found then raise exception 'Member not found'; end if;
  insert into ride_adjustments(user_id,request_id,points,reason,actor)
    values(uid,req,amount,reason_text,actor_text) on conflict(request_id) do nothing returning id into aid;
  if aid is null then
    if not exists(select 1 from ride_adjustments where request_id=req and user_id=uid
      and points=amount and reason=reason_text and actor=actor_text) then
      raise exception 'Correction request does not match';
    end if;
    return (select id from ride_adjustments where request_id=req);
  end if;
  if amount>0 then
    insert into ride_credits(user_id,source_key,points,note,actor)
      values(uid,'adjustment:'||aid,amount,reason_text,actor_text);
  else perform ride_allocate(uid,-amount,null,aid); end if;
  return aid;
end $$;
