-- Gender field on candidates
alter table candidates add column if not exists gender text check (gender in ('male','female','lgbtq+','prefer_not_to_say'));
