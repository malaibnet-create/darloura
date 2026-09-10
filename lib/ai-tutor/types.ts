export type TutorLevel = 'A1' | 'A2' | 'B1';
export type TutorTrack = 'msa' | 'moroccan_darija';
export type TutorActivity =
  | 'lesson_review'
  | 'vocabulary'
  | 'free_conversation'
  | 'role_play'
  | 'grammar'
  | 'pronunciation';

export type TutorCorrection = {
  original: string;
  corrected: string;
  explanation?: string;
};

export type TutorTranscriptEntry = {
  id: string;
  role: 'learner' | 'facilitator';
  text: string;
  createdAt: string;
  translation?: string;
  correction?: TutorCorrection;
};

export type TutorSessionSummary = {
  sessionId: string;
  learningTrack: TutorTrack;
  levelId: TutorLevel;
  activityType: TutorActivity;
  lessonIds: string[];
  practicedVocabularyIds: string[];
  practicedVocabulary: string[];
  newVocabularyIds: string[];
  newVocabulary: string[];
  practicedGrammarIds: string[];
  practicedGrammar: string[];
  importantCorrections: TutorCorrection[];
  strengths: string[];
  reviewNeeds: string[];
  nextRecommendation?: string;
  durationSeconds: number;
  createdAt: string;
};

export type TutorPreferences = {
  voice: string;
  speed: 'slow' | 'normal';
  explanationLanguage: 'ar' | 'en' | 'both';
  transcriptAuto: boolean;
  correctionLevel: 'important' | 'balanced' | 'detailed';
  saveSummaries: boolean;
  allowAudioStorage: false;
};

export type CurriculumKind =
  | 'objective'
  | 'vocabulary'
  | 'reading'
  | 'listening'
  | 'grammar'
  | 'phrase'
  | 'conversation'
  | 'writing'
  | 'exercise';

export type CurriculumItem = {
  id: string;
  lessonId: string;
  level: TutorLevel;
  kind: CurriculumKind;
  titleAr: string;
  titleEn?: string;
  arabic: string;
  english?: string;
  audioUrl?: string;
  difficulty: TutorLevel;
  source: string;
};

export type StudentLearningSnapshot = {
  userId: string;
  name: string;
  level: TutorLevel;
  track: TutorTrack;
  trackLabel: string;
  goal: string;
  interests: string[];
  completedLessons: string[];
  completedSections: Array<{ level: TutorLevel; lesson: number; section: string; updatedAt?: string }>;
  currentLesson?: string;
  currentSection?: string;
  learnedVocabulary: Array<{ id: string; arabic: string; english?: string; lessonId: string }>;
  reviewNeeds: Array<{ id: string; arabic: string; english?: string; lessonId: string }>;
  assessmentResults: Array<{ assessment: string; score: number; createdAt?: string }>;
  lastActivity?: { label: string; href?: string; createdAt?: string };
  previousTutorSummaries: TutorSessionSummary[];
};

export type TutorPageContext = Omit<StudentLearningSnapshot, 'userId'> & {
  availableLessons: Array<{ id: string; level: TutorLevel; lesson: number; titleAr: string; titleEn: string }>;
  suggestions: Array<{ activity: TutorActivity; titleAr: string; titleEn: string; reasonAr: string }>;
  preferences: TutorPreferences;
  limits: { maxDurationMinutes: number; sessionsRemainingToday: number };
};

export const DEFAULT_TUTOR_PREFERENCES: TutorPreferences = {
  voice: 'marin',
  speed: 'normal',
  explanationLanguage: 'both',
  transcriptAuto: true,
  correctionLevel: 'balanced',
  saveSummaries: true,
  allowAudioStorage: false,
};
