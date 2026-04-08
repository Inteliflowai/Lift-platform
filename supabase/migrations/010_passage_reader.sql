-- Passage reader (TTS) support
alter table response_text add column if not exists audio_storage_path text;
alter table tenant_settings add column if not exists passage_reader_enabled boolean default true;
alter table help_events add column if not exists payload jsonb default '{}'::jsonb;
