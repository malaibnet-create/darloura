-- فحص آمن للتهيئة: هذا الملف يقرأ الحالة فقط ولا يغيّر أي بيانات.
-- شغّله كاملًا من Supabase SQL Editor بعد إنهاء الترحيلات.

-- 1) يجب أن تظهر كل الجداول بحالة present.
with expected_tables(table_name) as (
  values
    ('profiles'),
    ('levels'),
    ('lessons'),
    ('lesson_progress'),
    ('placement_attempts'),
    ('placement_skill_results'),
    ('teachers'),
    ('bookings'),
    ('booking_sessions'),
    ('conversation_room_attempts'),
    ('level3_exam_attempts'),
    ('level2_exam_attempts'),
    ('learning_section_progress'),
    ('learning_review_items'),
    ('ai_tutor_preferences'),
    ('ai_tutor_sessions'),
    ('ai_tutor_reports')
)
select
  expected_tables.table_name,
  case when information_schema.tables.table_name is null then 'MISSING' else 'present' end as status
from expected_tables
left join information_schema.tables
  on information_schema.tables.table_schema = 'public'
 and information_schema.tables.table_name = expected_tables.table_name
order by expected_tables.table_name;

-- 2) يجب أن تكون row_level_security = true لكل جداول بيانات الطلاب.
select
  namespace.nspname as schema_name,
  class.relname as table_name,
  class.relrowsecurity as row_level_security
from pg_class as class
join pg_namespace as namespace on namespace.oid = class.relnamespace
where namespace.nspname = 'public'
  and class.relkind = 'r'
  and class.relname in (
    'profiles',
    'levels',
    'lessons',
    'lesson_progress',
    'placement_attempts',
    'placement_skill_results',
    'teachers',
    'bookings',
    'booking_sessions',
    'conversation_room_attempts',
    'level3_exam_attempts',
    'level2_exam_attempts',
    'learning_section_progress',
    'learning_review_items',
    'ai_tutor_preferences',
    'ai_tutor_sessions',
    'ai_tutor_reports'
  )
order by class.relname;

-- 3) راجع سياسات RLS المسجلة لكل جدول.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname in ('public', 'storage')
  and (
    tablename in (
      'profiles',
      'levels',
      'lessons',
      'lesson_progress',
      'placement_attempts',
      'placement_skill_results',
      'teachers',
      'bookings',
      'booking_sessions',
      'conversation_room_attempts',
      'level3_exam_attempts',
      'level2_exam_attempts',
      'learning_section_progress',
      'learning_review_items',
      'ai_tutor_preferences',
      'ai_tutor_sessions',
      'ai_tutor_reports'
    )
    or (schemaname = 'storage' and tablename = 'objects')
  )
order by schemaname, tablename, policyname;

-- 4) يجب أن يكون placement-audio عامًا وplacement-recordings خاصًا.
select id, name, public
from storage.buckets
where id in ('placement-audio', 'placement-recordings')
order by id;

-- 5) يجب أن يظهر on_auth_user_created حتى يُنشأ ملف الطالب تلقائيًا.
select
  trigger_name,
  event_object_schema,
  event_object_table,
  action_timing,
  event_manipulation
from information_schema.triggers
where trigger_name = 'on_auth_user_created';

-- 6) فحص آمن لجدول المدرسين حتى قبل تنفيذ migration 008.
select
  'teachers table' as check_name,
  case
    when to_regclass('public.teachers') is null then 'MISSING - run migration 008'
    else 'present - verify Othman and Yousra in Table Editor'
  end as status;
