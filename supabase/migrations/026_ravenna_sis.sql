-- Add Ravenna to SIS provider options
ALTER TABLE sis_integrations DROP CONSTRAINT IF EXISTS sis_integrations_provider_check;
ALTER TABLE sis_integrations ADD CONSTRAINT sis_integrations_provider_check
  CHECK (provider IN ('veracross','blackbaud','powerschool','ravenna','webhook','csv_manual'));
