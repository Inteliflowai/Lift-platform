-- Voice response mode
alter table task_instances add column if not exists response_mode text default 'typed' check (response_mode in ('typed','voice'));
alter table response_text add column if not exists transcription_confidence numeric(4,3);
alter table tenant_settings add column if not exists voice_mode_enabled boolean default true;
alter table tenant_settings add column if not exists delete_audio_after_transcription boolean default true;
