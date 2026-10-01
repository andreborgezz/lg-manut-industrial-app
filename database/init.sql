create table empresas (
  id serial primary key,
  nome text not null,
  cnpj text,
  email text,
  created_at timestamptz not null default now()
);

create table solicitantes (
  id serial primary key,
  empresa_id int not null references empresas(id),
  nome text not null,
  email text,
  telefone text
);

create table mecanicos (
  id serial primary key,
  nome text not null,
  ativo boolean not null default true
);

-- numeração do orçamento, continua do 184
create sequence orcamento_numero_seq start 185;

create table orcamentos (
  id serial primary key,
  numero int not null unique default nextval('orcamento_numero_seq'),
  empresa_id int not null references empresas(id),
  solicitante_id int references solicitantes(id),
  mecanico_id int references mecanicos(id),
  maquina text,
  titulo text,
  escopo text,
  valor numeric(12,2),
  prazo_dias int,
  fim_de_semana boolean not null default false,
  status text not null default 'ABERTO'
    check (status in ('ABERTO', 'APROVADO', 'RECUSADO', 'ENTREGUE')),
  entrada_em date not null default current_date,
  numero_pedido text,
  inicio_em date,
  entrega_em date,
  pdf_path text, -- caminho do PDF no bucket
  created_at timestamptz not null default now()
);

alter sequence orcamento_numero_seq owned by orcamentos.numero;

create index idx_solicitantes_empresa on solicitantes(empresa_id);
create index idx_orcamentos_empresa on orcamentos(empresa_id);
create index idx_orcamentos_status on orcamentos(status);