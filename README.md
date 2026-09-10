# ArabicPath — Next.js foundation

هذه هي بداية تحويل الواجهة التجريبية إلى تطبيق حقيقي.

## التشغيل

يتطلب المشروع Node.js 20 أو أحدث. بعد تثبيت Node.js:

```bash
npm install
npm run dev
```

ثم افتح `http://localhost:3000`.

## ما تم تجهيزه

- Next.js مع TypeScript وApp Router.
- واجهة عربية RTL.
- الشعار داخل `public/assets/arabicpath-logo.png`.
- صفحات أولية: الرئيسية، تسجيل الدخول، اختبار تحديد المستوى، لوحة الطالب، وصفحة الدرس.
- مخطط PostgreSQL/Supabase داخل `supabase/schema.sql`.
- تسجيل دخول بالبريد وكلمة المرور، مع رمز OTP رقمي لتأكيد الحساب واستعادة كلمة المرور عبر Supabase.
- تدفق واضح: إنشاء حساب، إدخال رمز التفعيل، إنشاء ملف الطالب تلقائيًا، ثم الترحيب واختيار اختبار المستوى.
- لوحة رئيسية بثلاثة مسارات: الدروس، حجز مدرس، والمدرس الآلي.
- هوية بصرية مغربية بنقوش زليج CSS متجاوبة.
- صفحة مستويات A1 وA2 وB1، وخمسة أقسام داخل كل مستوى، مع قفل امتحان المستوى حتى الإكمال.
- اختبار تحديد مستوى من 5 أسئلة وحفظ النتيجة في `placement_attempts`.
- لوحة الطالب تقرأ الدروس المنشورة من جدول `lessons`.

## إعداد Supabase

للتنفيذ الكامل خطوة بخطوة، بما في ذلك GitHub وStorage وOTP وSMTP وVercel وفحص RLS، استخدم الملف `GITHUB-AND-SUPABASE-SETUP-AR.md`.

1. أنشئ مشروعًا من [supabase.com](https://supabase.com/).
2. من إعدادات المشروع انسخ Project URL وPublishable key.
3. انسخ `.env.example` إلى ملف باسم `.env.local`.
4. ضع القيمتين في `.env.local`، ولا ترفع هذا الملف إلى GitHub.
5. من SQL Editor شغّل محتوى `supabase/schema.sql`.
6. في Authentication > URL Configuration أضف `http://localhost:3000` إلى Site URL.

بعد إنشاء الجداول الأساسية، شغّل ملفات `supabase/migrations/` بالترتيب من `002` حتى `014` في SQL Editor. لا تعِد تشغيل `schema.sql` كاملًا على مشروع يحتوي الجداول مسبقًا. بعد انتهاء الترحيلات، شغّل `supabase/VERIFY-SETUP.sql` للتأكد من وجود الجداول والسياسات والدلاء المطلوبة.

لتفعيل الرمز الرقمي، اتبع الملف `supabase/EMAIL-OTP-SETUP.md` والصق القالبين الموجودين داخل `supabase/email-templates/` في قسمي **Confirm signup** و**Reset password**. لا تستخدم `{{ .ConfirmationURL }}` في هذين القالبين ما دامت الواجهة تعتمد إدخال الرقم.

يستخدم إنشاء الحساب `signUp`، ويستخدم تأكيد البريد والاستعادة `verifyOtp`. مفاتيح البيئة المحلية لا تُضاف إلى GitHub. شغّل `supabase/migrations/007_profiles_auth_and_password_reset.sql` لإنشاء ملف الطالب تلقائيًا وسياسات الوصول الخاصة به.

## الخطوة التالية

إنشاء مشروع Supabase، تشغيل مخطط قاعدة البيانات، ثم ربط نموذج تسجيل الدخول بـ OTP.
