#!/bin/bash
# one-time seed of the kestrel database
[ -f /var/lib/postgresql/.seeded ] && exit 0
for i in $(seq 30); do sudo -u postgres psql -qc 'select 1' >/dev/null 2>&1 && break; sleep 1; done
sudo -u postgres psql -q <<'SQL'
CREATE ROLE kestrel LOGIN PASSWORD 'kestrel-lab';
CREATE DATABASE kestrel OWNER kestrel;
\c kestrel
CREATE TABLE customers (id serial primary key, name text, email text, created_at timestamptz default now());
CREATE TABLE orders (id serial primary key, customer_id int references customers(id), total numeric(10,2), status text, created_at timestamptz default now());
INSERT INTO customers (name,email) SELECT 'customer'||g, 'c'||g||'@example.com' FROM generate_series(1,200) g;
INSERT INTO orders (customer_id,total,status) SELECT 1+(random()*199)::int, round((random()*500)::numeric,2), (ARRAY['paid','pending','refunded'])[1+(random()*2)::int] FROM generate_series(1,2000);
ALTER TABLE customers OWNER TO kestrel; ALTER TABLE orders OWNER TO kestrel;
SQL
touch /var/lib/postgresql/.seeded
