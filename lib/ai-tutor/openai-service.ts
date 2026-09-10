import 'server-only';

import type { CurriculumItem, StudentLearningSnapshot, TutorActivity, TutorCorrection, TutorSessionSummary, TutorTranscriptEntry } from './types';

type OpenAIResponsePayload = {
  output_text?: unknown;
  output?: Array<{ content?: Array<{ type?: unknown; text?: unknown }> }>;
};

function responseText(data: unknown) {
  if (!data || typeof data !== 'object') return '';
  const payload = data as OpenAIResponsePayload;
  if (typeof payload.output_text === 'string') return payload.output_text;
  for (const item of payload.output || []) for (const content of item.content || []) if (content.type === 'output_text' && typeof content.text === 'string') return content.text;
  return '';
}

async function createResponse(body: Record<string, unknown>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_NOT_CONFIGURED');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: process.env.OPENAI_TUTOR_MODEL || 'gpt-4o-mini', ...body }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status === 429 ? 'OPENAI_LIMIT_REACHED' : 'OPENAI_REQUEST_FAILED');
  return responseText(data);
}

export async function runTutorTextTurn(input: { instructions: string; message: string; history: Array<{ role: 'user' | 'assistant'; content: string }> }) {
  return createResponse({
    instructions: input.instructions,
    input: [...input.history.slice(-12), { role: 'user', content: input.message.slice(0, 2000) }],
    max_output_tokens: 500,
  });
}

export async function tutorMessageAssist(action: 'translate' | 'correct', text: string, language: 'ar' | 'en' | 'both') {
  const instructions = action === 'translate'
    ? 'ترجم النص التالي ترجمة تعليمية دقيقة ومختصرة. إن كان عربيًا فترجمه إلى الإنجليزية، وإن كان إنجليزيًا فترجمه إلى العربية. أعد الترجمة فقط.'
    : `صحح أهم خطأ لغوي في جملة طالب العربية. أعد JSON فقط بالمفاتيح original وcorrected وexplanation. لغة الشرح: ${language}. إذا لم يوجد خطأ، اجعل corrected مساويًا للأصل واشرح أنه صحيح.`;
  const output = await createResponse({ instructions, input: text.slice(0, 2000), max_output_tokens: 300 });
  if (action === 'translate') return { translation: output.trim() };
  try {
    const parsed = JSON.parse(output.replace(/^```json\s*|\s*```$/g, ''));
    const correction: TutorCorrection = { original: String(parsed.original || text), corrected: String(parsed.corrected || text), explanation: String(parsed.explanation || '') };
    return { correction };
  } catch {
    return { correction: { original: text, corrected: text, explanation: output.trim() } };
  }
}

function mentionedItems(transcript: TutorTranscriptEntry[], curriculum: CurriculumItem[], kind: 'vocabulary' | 'grammar' | 'phrase') {
  const learnerText = transcript.filter((turn) => turn.role === 'learner').map((turn) => turn.text).join(' ');
  return curriculum.filter((item) => (item.kind === kind || (kind === 'vocabulary' && item.kind === 'phrase')) && item.titleAr.length > 1 && learnerText.includes(item.titleAr.replace(/[ًٌٍَُِّْـ]/gu, ''))).slice(0, 12);
}

export async function createTutorSummary(input: {
  sessionId: string;
  student: StudentLearningSnapshot;
  activity: TutorActivity;
  lessonIds: string[];
  durationSeconds: number;
  transcript: TutorTranscriptEntry[];
  curriculum: CurriculumItem[];
}): Promise<TutorSessionSummary> {
  const vocabulary = mentionedItems(input.transcript, input.curriculum, 'vocabulary');
  const grammar = mentionedItems(input.transcript, input.curriculum, 'grammar');
  const fallback: TutorSessionSummary = {
    sessionId: input.sessionId,
    learningTrack: input.student.track,
    levelId: input.student.level,
    activityType: input.activity,
    lessonIds: input.lessonIds,
    practicedVocabularyIds: vocabulary.map((item) => item.id),
    practicedVocabulary: vocabulary.map((item) => item.titleAr),
    newVocabularyIds: [],
    newVocabulary: [],
    practicedGrammarIds: grammar.map((item) => item.id),
    practicedGrammar: grammar.map((item) => item.titleAr),
    importantCorrections: input.transcript.flatMap((turn) => turn.correction ? [turn.correction] : []).slice(0, 2),
    strengths: input.transcript.some((turn) => turn.role === 'learner') ? ['شاركت في المحادثة وأكملت أدوارًا باللغة العربية.'] : [],
    reviewNeeds: [],
    nextRecommendation: 'واصل جلسة قصيرة أخرى مرتبطة بآخر درس درستَه.',
    durationSeconds: Math.max(0, Math.min(3600, Math.floor(input.durationSeconds))),
    createdAt: new Date().toISOString(),
  };
  if (!process.env.OPENAI_API_KEY || input.transcript.length < 2) return fallback;
  try {
    const prompt = JSON.stringify({
      activity: input.activity,
      level: input.student.level,
      track: input.student.track,
      allowedCurriculum: input.curriculum.map((item) => ({ id: item.id, kind: item.kind, ar: item.titleAr })),
      transcript: input.transcript.map((turn) => ({ role: turn.role, text: turn.text })),
    });
    const output = await createResponse({
      instructions: 'حلل جلسة تعلم عربية اعتمادًا على النص فقط. لا تخترع كلمة أو قاعدة. أعد JSON فقط: practicedVocabularyIds, newVocabularyIds, practicedGrammarIds, importantCorrections (original,corrected,explanation), strengths, reviewNeeds, nextRecommendation. استخدم معرفات allowedCurriculum فقط. أعط نقطتي قوة وحاجتين للمراجعة كحد أقصى.',
      input: prompt,
      max_output_tokens: 900,
    });
    const parsed = JSON.parse(output.replace(/^```json\s*|\s*```$/g, ''));
    const byId = new Map(input.curriculum.map((item) => [item.id, item]));
    const practicedVocabularyIds = Array.isArray(parsed.practicedVocabularyIds) ? parsed.practicedVocabularyIds.map(String).filter((id: string) => byId.has(id)).slice(0, 20) : fallback.practicedVocabularyIds;
    const newVocabularyIds = Array.isArray(parsed.newVocabularyIds) ? parsed.newVocabularyIds.map(String).filter((id: string) => byId.has(id)).slice(0, 10) : [];
    const practicedGrammarIds = Array.isArray(parsed.practicedGrammarIds) ? parsed.practicedGrammarIds.map(String).filter((id: string) => byId.has(id)).slice(0, 10) : fallback.practicedGrammarIds;
    return {
      ...fallback,
      practicedVocabularyIds,
      practicedVocabulary: practicedVocabularyIds.map((id: string) => byId.get(id)?.titleAr || id),
      newVocabularyIds,
      newVocabulary: newVocabularyIds.map((id: string) => byId.get(id)?.titleAr || id),
      practicedGrammarIds,
      practicedGrammar: practicedGrammarIds.map((id: string) => byId.get(id)?.titleAr || id),
      importantCorrections: Array.isArray(parsed.importantCorrections) ? parsed.importantCorrections.slice(0, 2) : fallback.importantCorrections,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String).slice(0, 3) : fallback.strengths,
      reviewNeeds: Array.isArray(parsed.reviewNeeds) ? parsed.reviewNeeds.map(String).slice(0, 2) : fallback.reviewNeeds,
      nextRecommendation: typeof parsed.nextRecommendation === 'string' ? parsed.nextRecommendation.slice(0, 1000) : fallback.nextRecommendation,
    };
  } catch {
    return fallback;
  }
}
