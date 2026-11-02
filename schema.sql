-- À exécuter une fois dans Supabase > SQL Editor
create table people (
  id smallint generated always as identity primary key,
  name varchar(50) not null,
  color char(7) not null
);

insert into people (name, color) values
  ('Sylvie', '#ffadad'), ('Evelyne', '#9bf6ff'), ('Françoise', '#caffbf'),
  ('Marie-Claire', '#ffd6a5'), ('Nathalie', '#bdb2ff');

create table allocations (
  day date primary key,
  person_id smallint not null references people
);

create table comments (
  id integer generated always as identity primary key,
  day date not null,
  person_id smallint not null references people,
  message varchar(1000) not null,
  created_at timestamptz not null default now()
);
create index on comments (day);

-- Ferme les tables à la clé publique (anon) : seul server.js, avec la clé secrète, y accède
alter table people enable row level security;
alter table allocations enable row level security;
alter table comments enable row level security;
