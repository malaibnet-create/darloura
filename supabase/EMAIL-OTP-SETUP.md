# إعداد رسائل الرمز الرقمي في Supabase

الكود في التطبيق أصبح يستخدم رمز OTP لإنشاء الحساب واستعادة كلمة المرور. حتى يظهر الرقم داخل الرسالة بدل الرابط، غيّر القالبين من لوحة Supabase.

## 1. إنشاء الحساب

اذهب إلى **Authentication → Emails → Confirm signup**، ثم اجعل نص الرسالة يحتوي على:

انسخ محتوى الملف `supabase/email-templates/confirm-signup.html` كاملًا إلى خانة **Body**، واجعل العنوان: `Your DarLugha verification code`.

لا تستخدم `{{ .ConfirmationURL }}` في هذا القالب إذا كنت تريد الرقم فقط.

اضبط طول رمز البريد في إعدادات Auth على `8`، ثم أضف في Vercel المتغير `NEXT_PUBLIC_EMAIL_OTP_LENGTH=8`. المهم أن يكون طول الرمز في Supabase والواجهة متطابقًا؛ الكود يدعم من 6 إلى 10 أرقام ويستخدم 8 افتراضيًا.

## 2. استعادة كلمة المرور

اذهب إلى **Authentication → Emails → Reset password**، ثم اجعل نص الرسالة يحتوي على:

انسخ محتوى الملف `supabase/email-templates/reset-password.html` كاملًا إلى خانة **Body**، واجعل العنوان: `Your DarLugha password recovery code`.

## 3. منع الخطأ 429

- التطبيق يمنع الضغط المكرر ويطبّق مهلة 60 ثانية بين طلبات الإرسال، لكن حد Supabase نفسه يظل مطبقًا.
- للاستخدام الحقيقي، اربط SMTP مخصصًا من **Project Settings → Authentication → SMTP Settings** بدل خدمة البريد التجريبية الافتراضية.
- راجع **Authentication → Rate Limits** إذا استمر المنع بعد إعداد SMTP.

وفق توثيق Supabase، خادم SMTP الافتراضي مخصص للتجربة فقط، وقد يقتصر حاليًا على رسالتين في الساعة وإرسالها إلى عناوين أعضاء فريق المشروع. لذلك SMTP مخصص شرط عملي قبل دعوة الطلاب الحقيقيين.

## 4. اختبار المسارين

1. أنشئ حسابًا جديدًا ببريد لم يُستخدم من قبل، ثم أدخل رقم رسالة **Confirm signup** في صفحة `/verify`.
2. من صفحة `/forgot-password` اطلب الاستعادة، ثم أدخل رقم رسالة **Reset password** في صفحة `/reset-password` واختر كلمة مرور جديدة.
