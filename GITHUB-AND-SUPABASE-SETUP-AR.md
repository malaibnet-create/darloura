# دليل رفع «دار اللغة» إلى GitHub وإعداد Supabase

هذا الدليل مخصّص للنسخة الجاهزة للنقل. لا ترفع إلى GitHub ملف `.env.local` أو أي مفتاح حقيقي لـ Supabase أو OpenAI أو Resend أو SMTP.

## أولًا: محتويات النسخة الجاهزة لـ GitHub

النسخة تحتوي على كود التطبيق، الدروس، الصور، الأصوات، ملفات Supabase، ملفات الاختبار، `package.json` و`package-lock.json`.

لا تحتوي على المجلدات المولَّدة محليًا مثل `node_modules` و`.next` و`.npm-cache`؛ هذه ليست جزءًا من كود المشروع، ويمكن إنشاؤها مجددًا بأمر `npm install` ثم `npm run build`. كما لا تحتوي على `.env.local` لأنه ملف أسرار خاص بجهازك وخادم Vercel.

## ثانيًا: رفع النسخة إلى GitHub بأمان

الأفضل إنشاء مستودع GitHub جديد وفارغ، ومن شاشة الإنشاء لا تضف README ولا `.gitignore` ولا License لأن هذه الملفات موجودة في المشروع.

افتح PowerShell داخل مجلد النسخة، ثم نفّذ الأوامر واحدًا بعد الآخر:

```powershell
git init
git add .
git commit -m "Upload complete Dar Lugha platform"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

استبدل `USERNAME` باسم حسابك و`REPOSITORY` باسم المستودع الجديد.

إذا أردت استخدام مستودع قديم بدل إنشاء مستودع جديد، لا تستعمل `--force`. ارفع النسخة أولًا إلى فرع جديد:

```powershell
git init
git checkout -b complete-platform
git add .
git commit -m "Upload complete Dar Lugha platform"
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin complete-platform
```

بعد ذلك راجع الفرع على GitHub وادمجه في `main` من خلال Pull Request. بهذه الطريقة لا تخسر تاريخ المستودع القديم.

## ثالثًا: الحصول على قيم Supabase الصحيحة

1. افتح مشروعك في Supabase.
2. اضغط **Connect** في أعلى لوحة المشروع، ثم اختر قسم مفاتيح التطبيق، أو افتح **Project Settings → API**.
3. انسخ **Project URL**.
4. انسخ **Publishable key**. يمكن أن يبدأ بـ `sb_publishable_`، وفي المشاريع القديمة قد يظهر مفتاح `anon` بدلًا منه.
5. لا تستخدم ولا تنشر مفتاح `service_role` أو أي مفتاح Secret داخل التطبيق أو GitHub.

## رابعًا: إنشاء ملف البيئة المحلي

داخل جذر المشروع، انسخ `.env.example` إلى ملف جديد اسمه بالضبط `.env.local`، ثم املأه هكذا:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY

OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_EVALUATION_MODEL=gpt-4o-mini
OPENAI_TUTOR_MODEL=gpt-4o-mini
OPENAI_SAFETY_SALT=PUT_A_LONG_RANDOM_PRIVATE_VALUE_HERE
OPENAI_REALTIME_MODEL=gpt-realtime
OPENAI_REALTIME_VOICE=marin
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
AI_TUTOR_MAX_SESSION_MINUTES=30
AI_TUTOR_DAILY_SESSION_LIMIT=20

RESEND_API_KEY=YOUR_RESEND_API_KEY
BOOKING_FROM_EMAIL=Dar Al Lugha <bookings@YOUR_VERIFIED_DOMAIN.com>
```

ملاحظات مهمة:

- متغيرا Supabase اللذان يبدأ اسمهما بـ `NEXT_PUBLIC_` يستخدمهما المتصفح، لذلك استعمل معهما **Publishable key** فقط.
- `OPENAI_API_KEY` و`OPENAI_SAFETY_SALT` و`RESEND_API_KEY` أسرار خادمية، ولا يجوز وضعها داخل كود الواجهة أو رفعها إلى GitHub.
- `RESEND_API_KEY` و`BOOKING_FROM_EMAIL` مطلوبان لإرسال إشعار الحجز إلى بريد الأستاذ. يجب أن يكون نطاق المرسل موثقًا في Resend.
- لا يوجد بريد ليسرى بنورة حاليًا في بيانات الترحيل. حدّثه بعد الحصول عليه بالأمر الموجود في قسم المدرسين أدناه.

بعد تعديل `.env.local` أوقف خادم التطوير ثم شغله من جديد:

```powershell
npm install
npm run dev -- --webpack
```

## خامسًا: تنفيذ ملفات قاعدة البيانات بالترتيب

### إذا كان مشروع Supabase جديدًا وفارغًا

1. افتح **SQL Editor** في Supabase.
2. اضغط **New query**.
3. افتح محليًا `supabase/schema.sql`، وانسخ محتواه كاملًا إلى المحرر ثم اضغط **Run** مرة واحدة.
4. نفّذ ملفات الترحيل التالية واحدًا بعد الآخر، بالترتيب نفسه. افتح كل ملف، انسخ محتواه كاملًا إلى استعلام جديد، واضغط **Run**، ثم انتقل إلى الملف التالي:

```text
supabase/migrations/002_placement_and_demo_lessons.sql
supabase/migrations/003_profile_preferences.sql
supabase/migrations/004_cefr_placement_assessment.sql
supabase/migrations/005_placement_storage_policies.sql
supabase/migrations/006_arabic_track.sql
supabase/migrations/007_profiles_auth_and_password_reset.sql
supabase/migrations/008_teacher_booking.sql
supabase/migrations/009_conversation_room_attempts.sql
supabase/migrations/010_level3_final_exam.sql
supabase/migrations/011_level2_final_exam.sql
supabase/migrations/012_learning_progress_and_review_sync.sql
supabase/migrations/013_ai_tutor_sessions.sql
supabase/migrations/014_legacy_catalog_rls.sql
```

لا تنفذ الملفات بالتوازي، ولا تقفز فوق رقم. ظهور `Success. No rows returned` عند تنفيذ أوامر الإنشاء والسياسات نتيجة طبيعية وناجحة.

### إذا كان مشروع Supabase الحالي يحتوي على الطلاب أو الجداول

لا تحذف المشروع ولا تشغّل `schema.sql` من جديد. اتبع الآتي:

1. خذ نسخة احتياطية من Supabase قبل أي تغيير مهم.
2. شغّل `supabase/VERIFY-SETUP.sql` أولًا؛ هو ملف قراءة فقط ولا يعدّل البيانات.
3. من **Table Editor** تأكد من وجود جداول `profiles` و`levels` و`lessons`.
4. نفّذ الترحيلات من `002` إلى `014` بالترتيب. أغلب أوامرها مصممة لتكون قابلة لإعادة التشغيل باستخدام `if not exists` أو `on conflict`.
5. إذا ظهر خطأ بأن كائنًا موجود مسبقًا، لا تحذف الجدول. انسخ رسالة الخطأ كاملة وراجع السطر قبل متابعة الترحيل التالي.
6. شغّل `supabase/VERIFY-SETUP.sql` مرة ثانية بعد الانتهاء.

## سادسًا: ضبط Storage وملفات اختبار تحديد المستوى

الترحيل `005_placement_storage_policies.sql` ينشئ دلوين ويضبط سياساتهما:

- `placement-audio`: عام، لأصوات أسئلة تحديد المستوى.
- `placement-recordings`: خاص، لتسجيلات الطلاب. يستطيع كل طالب رفع وقراءة ملفاته فقط داخل مجلد يبدأ بمعرّف حسابه.

افتح **Storage → placement-audio** وارفع الملفات التسعة التالية في جذر الدلو وبالأسماء نفسها تمامًا:

```text
listening-01.mp3
listening-02.mp3
listening-03.mp3
listening-04.mp3
listening-05.mp3
listening-06.mp3
listening-07.mp3
speaking-20.mp3
speaking-21.mp3
```

مهم: يجب أن يكون الامتداد مرة واحدة فقط. الاسم `listening-01.mp3.mp3` خاطئ وسينتج عنه مسار مفقود. لا ترفع تسجيلات الطلاب يدويًا؛ التطبيق يرفعها إلى الدلو الخاص `placement-recordings` بعد منح المتصفح إذن الميكروفون.

## سابعًا: إعداد تسجيل الحساب برمز رقمي OTP

1. افتح **Authentication → Sign In / Providers → Email**.
2. فعّل تسجيل الدخول بالبريد وكلمة المرور.
3. فعّل تأكيد البريد الإلكتروني للمستخدمين الجدد.
4. افتح **Authentication → Emails → Confirm signup**.
5. ضع عنوان الرسالة: `رمز تأكيد حسابك في دار اللغة`.
6. انسخ محتوى `supabase/email-templates/confirm-signup.html` كاملًا إلى **Body** ثم احفظ.
7. يجب أن يحتوي القالب على `{{ .Token }}` حتى يصل رقم مكوّن من ستة أرقام. لا تستبدله بـ `{{ .ConfirmationURL }}` ما دامت واجهة المنصة تطلب إدخال الرمز.

## ثامنًا: إعداد استعادة كلمة المرور برمز رقمي

1. افتح **Authentication → Emails → Reset password**.
2. ضع عنوان الرسالة: `رمز استعادة كلمة المرور في دار اللغة`.
3. انسخ محتوى `supabase/email-templates/reset-password.html` كاملًا إلى **Body** ثم احفظ.
4. تأكد من وجود `{{ .Token }}` في القالب.
5. اختبر الطلب مرة واحدة ثم انتظر مهلة إعادة الإرسال الظاهرة في التطبيق. الضغط المتكرر قد يسبب خطأ `429 Too Many Requests`.

## تاسعًا: ضبط روابط الموقع وإعادة التوجيه

افتح **Authentication → URL Configuration**:

1. في **Site URL** ضع رابط الإنتاج الثابت فقط، مثل:

```text
https://YOUR-PRODUCTION-DOMAIN.vercel.app
```

2. التطبيق الحالي يعيد توجيه استعادة كلمة المرور إلى `/reset-password`. في **Redirect URLs** أضف المسارين الدقيقين التاليين، مع استبدال نطاق الإنتاج بنطاقك الحقيقي:

```text
http://localhost:3000/reset-password
https://YOUR-PRODUCTION-DOMAIN.vercel.app/reset-password
```

إذا أضفت نطاقًا خاصًا لاحقًا، أضف أيضًا `https://YOUR-DOMAIN.com/reset-password` واجعله **Site URL** بعد التأكد من عمله. يمكنك إضافة نمط Vercel Preview منفصلًا عند اختبار فروع المعاينة، لكن أبقِ رابط الإنتاج الدائم محددًا بدقة.

## عاشرًا: إعداد SMTP قبل دعوة الطلاب

خدمة البريد التجريبية الافتراضية في Supabase محدودة، وقد تسبب عدم وصول الرسائل أو الخطأ 429. للاستخدام الحقيقي:

1. جهّز حسابًا عند مزود SMTP مثل Resend أو Brevo أو SendGrid أو مزود بريدك.
2. وثّق نطاق الإرسال عند المزود.
3. في Supabase افتح إعداد SMTP المخصص من إعدادات Authentication.
4. فعّل **Custom SMTP**.
5. أدخل بيانات المزود: Host وPort وUsername وPassword وSender email وSender name.
6. لا تضع كلمة مرور SMTP في GitHub أو داخل ملفات المشروع.
7. افتح **Authentication → Rate Limits** واضبط حدود البريد بما يناسب خطتك بعد تفعيل SMTP.
8. جرّب إنشاء حساب ببريد جديد، ثم جرّب استعادة كلمة المرور مرة واحدة.

## الحادي عشر: تعديل بريد الأستاذة يسرى

بعد الحصول على بريدها الحقيقي، افتح SQL Editor وشغّل هذا الأمر بعد استبدال القيمة:

```sql
update public.teachers
set email = 'YOUSRA_REAL_EMAIL@example.com'
where slug = 'yousra-benoura';
```

## الثاني عشر: إضافة متغيرات البيئة إلى Vercel

1. افتح مشروع المنصة في Vercel.
2. افتح **Settings → Environment Variables**.
3. أضف كل متغير من `.env.local` بوصفه **Key** وقيمته بوصفها **Value**.
4. طبّق متغيرات Supabase وOpenAI وResend على **Production** و**Preview**. أضفها إلى Development أيضًا إذا كنت تستخدم Vercel CLI محليًا.
5. لا تكتب في خانة Key السطر كاملًا؛ مثال صحيح: Key هو `NEXT_PUBLIC_SUPABASE_URL` وValue هو رابط Supabase فقط.
6. احفظ المتغيرات، ثم افتح **Deployments** واضغط قائمة النقاط بجانب آخر نشر واختر **Redeploy**. التغييرات في متغيرات البيئة لا تدخل النشر القديم تلقائيًا.

## الثالث عشر: التحقق النهائي من قاعدة البيانات والمنصة

1. شغّل `supabase/VERIFY-SETUP.sql` كاملًا.
2. في النتيجة الأولى يجب أن تكون الجداول السبعة عشر بحالة `present`.
3. راجع نتيجة RLS؛ جداول بيانات الطلاب يجب أن تعرض `true`.
4. تأكد أن `placement-audio` يعرض `public = true` وأن `placement-recordings` يعرض `public = false`.
5. تأكد من ظهور المشغّل `on_auth_user_created`.
6. أنشئ حساب طالب جديد وأدخل رمز التأكيد.
7. من **Authentication → Users** تأكد من وجود الحساب، ومن **Table Editor → profiles** تأكد من إنشاء صف له تلقائيًا.
8. أكمل عنصرًا تعليميًا، حدّث الصفحة، وسجّل الخروج ثم الدخول؛ يجب أن يبقى التقدم محفوظًا.
9. أضف مفردة إلى المراجعة وتأكد من ظهورها في صفحة المراجعة بعد تحديث الصفحة.
10. جرّب اختبار تحديد المستوى، وتحقق من `placement_attempts` و`placement_skill_results` ومن رفع التسجيل داخل مجلد الطالب في `placement-recordings`.
11. جرّب حجز درس وتحقق من `bookings` و`booking_sessions` ووصول البريد إلى الأستاذ.
12. جرّب الأستاذ الآلي وتحقق من وجود جلسة في `ai_tutor_sessions`. لا يحفظ التصميم الحالي التسجيل الصوتي الخام للأستاذ الآلي في قاعدة البيانات.

## أوامر فحص المشروع قبل النشر

نفّذ من جذر المشروع:

```powershell
npm install
npm run typecheck
npm run lint
npm run build
```

إذا نجح `npm run build`، ارفع التغييرات إلى GitHub. بعد ذلك سيبدأ Vercel نشرًا جديدًا تلقائيًا إذا كان المشروع مرتبطًا بالمستودع والفرع الصحيحين.
