-- Alta rápida de producto: categoría es opcional (se define en la ficha)
alter table public.products alter column categoria drop not null;
