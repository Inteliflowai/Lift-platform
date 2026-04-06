-- Add quantitative_reasoning and pattern_logic task types
alter table task_templates drop constraint task_templates_task_type_check;
alter table task_templates add constraint task_templates_task_type_check
  check (task_type in (
    'reading_passage','short_response','extended_writing',
    'reflection','scenario','planning',
    'quantitative_reasoning','pattern_logic'
  ));
