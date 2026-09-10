import { randomUUID } from 'node:crypto';
import { examAccessResponse, getExamAccess } from '../../../../lib/exam-access';
import { createPublicExam, finalExamPrivate, listeningPlayMayCount } from '../../../../lib/level2-exam-server';

export const runtime = 'nodejs';

const sectionIds = ['vocabulary', 'reading', 'listening', 'grammar', 'writing', 'speaking'] as const;
type ExamSectionId = (typeof sectionIds)[number];
type ExamAttemptRow = {
  id: string;
  started_at: string;
  expires_at: string;
  attempt_number: number;
  best_score: number;
  listening_plays: number;
  submitted_sections: ExamSectionId[];
  answers: Record<string, string>;
  writing_text: string;
  speaking_transcript: unknown[];
  current_section: ExamSectionId;
};

function isExamSectionId(value: unknown): value is ExamSectionId {
  return typeof value === 'string' && (sectionIds as readonly string[]).includes(value);
}
const objectiveIds = new Set(finalExamPrivate.exam.sections.slice(0, 4).map((section) => section.id));
const publicQuestions = createPublicExam('validation').questions;
const questionById: ReadonlyMap<string, (typeof publicQuestions)[number]> = new Map(
  publicQuestions.map((question) => [question.id, question]),
);

function cleanAnswers(value: unknown) {
  if (!value || typeof value !== 'object') return {} as Record<string, string>;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).flatMap(([id, answer]) => {
    const question = questionById.get(id);
    if (!question || typeof answer !== 'string' || !(question.options as readonly string[]).includes(answer)) return [];
    return [[id, answer.slice(0, 500)]];
  }));
}

function cleanTranscript(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(-80).flatMap((entry) => {
    if (!entry || (entry.role !== 'learner' && entry.role !== 'examiner') || typeof entry.text !== 'string') return [];
    const text = entry.text.trim().slice(0, 3000);
    return text ? [{ role: entry.role, text }] : [];
  });
}

export async function POST(request: Request) {
  try {
    const access = await getExamAccess('A2', 1);
    if (!access.allowed) return examAccessResponse(access);
    const supabase = access.supabase;
    const user = { id: access.userId };
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : 'start';

    if (action === 'start') {
      let active: ExamAttemptRow | null = null;
      if (typeof body.resumeAttemptId === 'string') {
        const { data } = await supabase.from('level2_exam_attempts').select('*').eq('id', body.resumeAttemptId).eq('user_id', user.id).maybeSingle();
        active = data;
      }
      if (!active) {
        const { data } = await supabase.from('level2_exam_attempts').select('*').eq('user_id', user.id).eq('exam_id', finalExamPrivate.exam.id).in('status', ['in_progress', 'evaluation_pending']).order('started_at', { ascending: false }).limit(1).maybeSingle();
        active = data;
      }
      if (active && new Date(active.expires_at).getTime() <= Date.now()) {
        await supabase.from('level2_exam_attempts').update({ status: 'expired', ended_at: new Date().toISOString() }).eq('id', active.id).eq('user_id', user.id);
        active = null;
      }
      if (!active) {
        const { data: previous } = await supabase.from('level2_exam_attempts').select('best_score,attempt_number').eq('user_id', user.id).eq('exam_id', finalExamPrivate.exam.id).order('attempt_number', { ascending: false }).limit(1).maybeSingle();
        const attemptId = randomUUID();
        const startedAt = new Date();
        const row = {
          id: attemptId, user_id: user.id, exam_id: finalExamPrivate.exam.id,
          started_at: startedAt.toISOString(), expires_at: new Date(startedAt.getTime() + 60 * 60_000).toISOString(),
          best_score: Number(previous?.best_score || 0), attempt_number: Number(previous?.attempt_number || 0) + 1,
        };
        const { data, error } = await supabase.from('level2_exam_attempts').insert(row).select('*').single();
        if (error) return Response.json({ error: 'EXAM_DATABASE_NOT_READY' }, { status: 503 });
        active = data;
      }
      if (!active) return Response.json({ error: 'EXAM_DATABASE_NOT_READY' }, { status: 503 });
      return Response.json({
        attemptId: active.id, startedAt: active.started_at, expiresAt: active.expires_at,
        attemptNumber: active.attempt_number, bestScore: active.best_score, listeningPlays: active.listening_plays,
        submittedSections: active.submitted_sections || [], answers: active.answers || {}, writingText: active.writing_text || '',
        speakingTranscript: active.speaking_transcript || [], currentSection: active.current_section,
        publicExam: createPublicExam(active.id), preview: false,
      });
    }

    const attemptId = typeof body.attemptId === 'string' ? body.attemptId : '';
    if (!attemptId) return Response.json({ error: 'ATTEMPT_REQUIRED' }, { status: 400 });
    const { data: attempt } = await supabase.from('level2_exam_attempts').select('*').eq('id', attemptId).eq('user_id', user.id).maybeSingle();
    if (!attempt) return Response.json({ error: 'ATTEMPT_NOT_FOUND' }, { status: 404 });
    if (new Date(attempt.expires_at).getTime() <= Date.now()) return Response.json({ error: 'ATTEMPT_EXPIRED' }, { status: 409 });

    if (action === 'listening-start') {
      if (Number(attempt.listening_plays) >= 2 || (attempt.submitted_sections || []).includes('listening')) return Response.json({ error: 'LISTENING_LIMIT_REACHED' }, { status: 409 });
      const now = new Date().toISOString();
      await supabase.from('level2_exam_attempts').update({ listening_started_at: now, updated_at: now }).eq('id', attemptId).eq('user_id', user.id);
      return Response.json({ allowed: true, plays: attempt.listening_plays });
    }
    if (action === 'listening-complete') {
      const counted = listeningPlayMayCount(attempt.listening_started_at);
      const plays = counted ? Math.min(2, Number(attempt.listening_plays) + 1) : Number(attempt.listening_plays);
      await supabase.from('level2_exam_attempts').update({ listening_plays: plays, listening_started_at: null, updated_at: new Date().toISOString() }).eq('id', attemptId).eq('user_id', user.id);
      return Response.json({ counted, plays });
    }
    if (action === 'listening-cancel') {
      await supabase.from('level2_exam_attempts').update({ listening_started_at: null, updated_at: new Date().toISOString() }).eq('id', attemptId).eq('user_id', user.id);
      return Response.json({ saved: true });
    }
    if (action === 'retake-production') {
      const section = body.section === 'writing' || body.section === 'speaking' ? body.section : null;
      if (!section || attempt.status !== 'production_retake') return Response.json({ error: 'RETAKE_NOT_ALLOWED' }, { status: 409 });
      const previousEvaluation = section === 'writing' ? attempt.writing_evaluation : attempt.speaking_evaluation;
      if (Number(previousEvaluation?.score || 0) >= 5) return Response.json({ error: 'SECTION_ALREADY_PASSED' }, { status: 409 });
      const submitted = (attempt.submitted_sections || []).filter((item: string) => item !== section);
      const changes: Record<string, unknown> = {
        status: 'in_progress', ended_at: null, current_section: section, submitted_sections: submitted,
        expires_at: new Date(Date.now() + 30 * 60_000).toISOString(), updated_at: new Date().toISOString(),
      };
      if (section === 'writing') { changes.writing_text = ''; changes.writing_evaluation = null; }
      else { changes.speaking_transcript = []; changes.speaking_evaluation = null; }
      await supabase.from('level2_exam_attempts').update(changes).eq('id', attemptId).eq('user_id', user.id);
      return Response.json({ saved: true, submittedSections: submitted, expiresAt: changes.expires_at });
    }

    const answers = { ...(attempt.answers || {}), ...cleanAnswers(body.answers) };
    const writingText = typeof body.writingText === 'string' ? body.writingText.slice(0, 20_000) : attempt.writing_text;
    const speakingTranscript = body.speakingTranscript ? cleanTranscript(body.speakingTranscript) : attempt.speaking_transcript;
    const currentSection = isExamSectionId(body.currentSection) ? body.currentSection : attempt.current_section;
    let submittedSections = Array.isArray(attempt.submitted_sections) ? attempt.submitted_sections.filter(isExamSectionId) : [];

    if (action === 'submit-section') {
      const section = isExamSectionId(body.section) ? body.section : null;
      if (!section) return Response.json({ error: 'INVALID_SECTION' }, { status: 400 });
      if (objectiveIds.has(section)) {
        const required = createPublicExam(attemptId).questions.filter((question) => question.section === section);
        if (!required.every((question) => typeof answers[question.id] === 'string')) return Response.json({ error: 'SECTION_INCOMPLETE' }, { status: 409 });
      }
      if (section === 'listening' && Number(attempt.listening_plays) < 1) return Response.json({ error: 'LISTENING_REQUIRED' }, { status: 409 });
      if (section === 'writing' && !String(writingText || '').trim()) return Response.json({ error: 'SECTION_INCOMPLETE' }, { status: 409 });
      if (section === 'speaking' && cleanTranscript(speakingTranscript).filter((entry) => entry.role === 'learner').length < 6) {
        return Response.json({ error: 'PRODUCTION_SECTIONS_INCOMPLETE' }, { status: 409 });
      }
      if (!submittedSections.includes(section)) submittedSections = [...submittedSections, section];
    }

    const navigationEvents = Array.isArray(attempt.navigation_events) ? attempt.navigation_events.slice(-99) : [];
    if (body.navigationEvent && typeof body.navigationEvent.type === 'string') {
      navigationEvents.push({ type: body.navigationEvent.type.slice(0, 40), at: new Date().toISOString() });
    }
    const { error } = await supabase.from('level2_exam_attempts').update({
      answers, writing_text: writingText, speaking_transcript: speakingTranscript,
      current_section: currentSection, submitted_sections: submittedSections,
      navigation_events: navigationEvents, updated_at: new Date().toISOString(),
    }).eq('id', attemptId).eq('user_id', user.id);
    if (error) return Response.json({ error: 'AUTOSAVE_FAILED' }, { status: 500 });
    return Response.json({ saved: true, submittedSections });
  } catch (error) {
    console.error('Level 2 exam attempt error', error instanceof Error ? error.message : 'unknown');
    return Response.json({ error: 'EXAM_REQUEST_FAILED' }, { status: 500 });
  }
}
