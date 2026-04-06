alter table insight_profiles add column if not exists tri_score numeric(5,2);
alter table insight_profiles add column if not exists tri_label text check (tri_label in ('emerging','developing','ready','thriving'));
alter table insight_profiles add column if not exists tri_confidence text check (tri_confidence in ('low','moderate','high'));
alter table insight_profiles add column if not exists tri_summary text;
