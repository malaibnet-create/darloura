import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase/server';

const allowedTimes = ['09:00', '10:00', '11:00', '12:00'];
type BookingSlot = { weekday: number; time: string };

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] ?? character);
}

function getSessionDate(startDate: string, weekday: number, week: number) {
  const date = new Date(`${startDate}T12:00:00`); const current = (date.getDay() + 6) % 7; const offset = (weekday - current + 7) % 7; date.setDate(date.getDate() + offset + week * 7); return date.toISOString().slice(0, 10);
}

async function getClient() { return createServerSupabaseClient(); }

export async function GET() {
  const supabase = await getClient(); const { data, error } = await supabase.from('teachers').select('id,slug,full_name,email,bio,photo_url,skills,tracks').eq('active', true).order('full_name');
  if (error) return NextResponse.json({ error: 'تعذر تحميل قائمة المدرسين.' }, { status: 500 }); return NextResponse.json({ teachers: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await getClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول قبل الحجز.' }, { status: 401 });
  const body = await request.json().catch(() => ({})); const teacherId = typeof body.teacherId === 'string' ? body.teacherId : ''; const lessonType = body.lessonType === 'group' ? 'group' : 'individual'; const skill = typeof body.skill === 'string' ? body.skill : ''; const startDate = typeof body.startDate === 'string' ? body.startDate : ''; const timezone = typeof body.timezone === 'string' ? body.timezone.slice(0, 80) : 'Africa/Casablanca'; const frequency = Number(body.weeklyFrequency); const weeks = Number(body.weeksCount); const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 1200) : ''; const slots: unknown[] = Array.isArray(body.slots) ? body.slots : [];
  if (!teacherId || !skill || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || ![1,2,3].includes(frequency) || ![1,4,8,12].includes(weeks) || slots.length !== frequency) return NextResponse.json({ error: 'أكمل بيانات الحجز واختيار الأوقات.' }, { status: 400 });
  const cleanSlots = slots.flatMap((slot): BookingSlot[] => {
    if (!slot || typeof slot !== 'object') return [];
    const record = slot as Record<string, unknown>;
    const parsed = { weekday: Number(record.weekday), time: String(record.time ?? '') };
    return Number.isInteger(parsed.weekday) && parsed.weekday >= 0 && parsed.weekday <= 6 && allowedTimes.includes(parsed.time) ? [parsed] : [];
  }); if (cleanSlots.length !== frequency) return NextResponse.json({ error: 'تأكد من صحة الأيام والساعات.' }, { status: 400 });
  const { data: teacher } = await supabase.from('teachers').select('id,full_name,email').eq('id', teacherId).eq('active', true).maybeSingle(); if (!teacher) return NextResponse.json({ error: 'الأستاذ غير متاح.' }, { status: 400 });
  const { data: booking, error: bookingError } = await supabase.from('bookings').insert({ student_id: user.id, teacher_id: teacher.id, lesson_type: lessonType, skill, start_date: startDate, timezone, weekly_frequency: frequency, weeks_count: weeks, notes }).select('id').single(); if (bookingError) return NextResponse.json({ error: 'تعذر حفظ طلب الحجز.' }, { status: 500 });
  const sessions = Array.from({ length: weeks }).flatMap((_, week) => cleanSlots.map((slot) => ({ booking_id: booking.id, scheduled_date: getSessionDate(startDate, slot.weekday, week), start_time: slot.time, end_time: `${String(Number(slot.time.slice(0,2)) + 1).padStart(2,'0')}:00` })));
  const { error: sessionsError } = await supabase.from('booking_sessions').insert(sessions); if (sessionsError) return NextResponse.json({ error: 'حُفظ الطلب لكن تعذر إنشاء مواعيده.' }, { status: 500 });
  let emailSent = false;
  if (teacher.email && process.env.RESEND_API_KEY && process.env.BOOKING_FROM_EMAIL) {
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
    const studentName = escapeHtml(profile?.full_name || user.email || 'طالب مسجل');
    const safeSkill = escapeHtml(skill);
    const safeStartDate = escapeHtml(startDate);
    const safeNotes = escapeHtml(notes || 'لا توجد ملاحظات');
    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: process.env.BOOKING_FROM_EMAIL,
          to: [teacher.email],
          subject: 'طلب حجز جديد معك في DarLugha',
          html: `<h2>طلب حجز جديد</h2><p>قام الطالب <strong>${studentName}</strong> بإرسال طلب حجز معك.</p><p>المهارة: ${safeSkill}<br>نوع الدرس: ${lessonType === 'group' ? 'جماعي' : 'فردي'}<br>البداية: ${safeStartDate}<br>عدد الدروس أسبوعيًا: ${frequency}<br>المدة: ${weeks} أسبوعًا</p><p>ملاحظات الطالب: ${safeNotes}</p>`,
        }),
      });
      emailSent = emailResponse.ok;
    } catch {
      // The booking remains valid even if the optional notification provider is unavailable.
      emailSent = false;
    }
  }
  return NextResponse.json({ bookingId: booking.id, emailSent, message: emailSent ? 'تم إرسال طلب الحجز وإشعار الأستاذ.' : 'تم حفظ طلب الحجز، وسيتم تفعيل إشعار البريد بعد إعداد خدمة البريد.' });
}
