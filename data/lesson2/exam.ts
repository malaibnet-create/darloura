export type Skill = 'vocabulary' | 'reading' | 'grammar' | 'listening' | 'conversation' | 'writing' | 'speaking';

export type ChoiceQuestion = {
  id: string;
  number: number;
  skill: Skill;
  type: 'multiple-choice' | 'true-false';
  promptAr?: string;
  promptEn?: string;
  options: readonly string[];
  answer: number;
  feedbackEn: string;
  audioId?: string;
};

export const lesson02Exam = {
  id: 'lesson-02-exam',
  lessonId: 'lesson-02',
  level: 'A1',
  title: { ar: 'اِخْتِبَارُ الدَّرْسِ الثَّانِي', en: 'Lesson 2 Test' },
  estimatedMinutes: 25,
  totalQuestions: 20,
  totalPoints: 20,
  passingPoints: 16,
  passingPercent: 80,
  unlockOnPass: null,
  attempts: { unlimited: true, retainHighestScore: true },
  audio: { maxPlaysPerClipPerAttempt: 2, replayPenalty: false, autoplay: false },
  readingPassage: {
    id: 'l2-exam-reading',
    ar: 'اسْمِي أَمِينٌ. أَسْكُنُ فِي مَكْنَاسَ مَعَ أُسْرَتِي. أَدْرُسُ الْفُصْحَى فِي مَرْكَزِ دَارِ اللُّغَةِ. خَالَتِي هُدَى مُتَرْجِمَةٌ، وَهِيَ تَعْمَلُ فِي النَّهَارِ. أَنَا أَدْرُسُ فِي الْمَسَاءِ. دَرْسِي غَدًا.',
    showTranslationDuringExam: false,
  },
  choiceQuestions: [
    { id: 'l2e-q01', number: 1, skill: 'vocabulary', type: 'multiple-choice', promptEn: 'What does مُتَرْجِمَةٌ mean?', options: ['A female translator', 'A female student', 'A female teacher'], answer: 0, feedbackEn: 'مُتَرْجِمَةٌ means “a female translator.”' },
    { id: 'l2e-q02', number: 2, skill: 'vocabulary', type: 'multiple-choice', promptAr: 'خَالَتِي ______ فِي التَّرْجَمَةِ.', options: ['مُتَخَصِّصَةٌ', 'مَشْغُولٌ', 'لُغَةٌ'], answer: 0, feedbackEn: 'Use the feminine form مُتَخَصِّصَةٌ with خَالَتِي.' },
    { id: 'l2e-q03', number: 3, skill: 'vocabulary', type: 'multiple-choice', promptEn: 'Which word means “tomorrow”?', options: ['الْيَوْمَ', 'غَدًا', 'دَائِمًا'], answer: 1, feedbackEn: 'غَدًا means “tomorrow.”' },
    { id: 'l2e-q04', number: 4, skill: 'vocabulary', type: 'multiple-choice', promptAr: 'أَنَا مَشْغُولٌ ______ الْعَمَلِ الْيَوْمَ.', options: ['بِـ', 'عَنْ', 'إِلَى'], answer: 0, feedbackEn: 'Say مَشْغُولٌ بِالْعَمَلِ — busy with work.' },
    { id: 'l2e-q05', number: 5, skill: 'reading', type: 'multiple-choice', promptAr: 'عَمَّ يَتَكَلَّمُ أَمِينٌ؟', options: ['عَنْ دِرَاسَتِهِ وَأُسْرَتِهِ', 'عَنْ رِحْلَةٍ', 'عَنْ مَطْعَمٍ'], answer: 0, feedbackEn: 'Amin talks about his studies and family.' },
    { id: 'l2e-q06', number: 6, skill: 'reading', type: 'multiple-choice', promptAr: 'أَيْنَ يَدْرُسُ أَمِينٌ؟', options: ['فِي مَرْكَزِ دَارِ اللُّغَةِ', 'فِي الْبَيْتِ', 'فِي مَرْكَزِ التَّرْجَمَةِ'], answer: 0, feedbackEn: 'The text says that he studies at Dar Al-Lugha Center.' },
    { id: 'l2e-q07', number: 7, skill: 'reading', type: 'multiple-choice', promptAr: 'مَا عَمَلُ هُدَى؟', options: ['مُتَرْجِمَةٌ', 'مُدَرِّسَةٌ', 'طَالِبَةٌ'], answer: 0, feedbackEn: 'Huda is a translator.' },
    { id: 'l2e-q08', number: 8, skill: 'reading', type: 'true-false', promptAr: 'أَمِينٌ يَدْرُسُ فِي النَّهَارِ.', options: ['صَحِيحٌ', 'خَطَأٌ'], answer: 1, feedbackEn: 'The text says: أَنَا أَدْرُسُ فِي الْمَسَاءِ.' },
    { id: 'l2e-q09', number: 9, skill: 'grammar', type: 'multiple-choice', promptAr: '______ طُلَّابٌ جُدُدٌ.', options: ['نَحْنُ', 'أَنَا', 'هُوَ'], answer: 0, feedbackEn: 'Use نَحْنُ for “we.”' },
    { id: 'l2e-q10', number: 10, skill: 'grammar', type: 'multiple-choice', promptAr: 'أَنْتُمْ ______ الْعَرَبِيَّةَ.', options: ['تَتَكَلَّمُونَ', 'نَتَكَلَّمُ', 'يَتَكَلَّمُ'], answer: 0, feedbackEn: 'With أَنْتُمْ, use تَتَكَلَّمُونَ.' },
    { id: 'l2e-q11', number: 11, skill: 'grammar', type: 'multiple-choice', promptAr: 'هُمْ ______ فِي الْمَرْكَزِ.', options: ['يَعْمَلُونَ', 'تَعْمَلُونَ', 'نَعْمَلُ'], answer: 0, feedbackEn: 'With هُمْ, use يَعْمَلُونَ.' },
    { id: 'l2e-q12', number: 12, skill: 'grammar', type: 'multiple-choice', promptEn: 'Choose the plural of كِتَابٌ.', options: ['كُتُبٌ', 'كُتَّابٌ', 'كِتَابَةٌ'], answer: 0, feedbackEn: 'The plural of كِتَابٌ is كُتُبٌ.' },
    { id: 'l2e-q13', number: 13, skill: 'grammar', type: 'multiple-choice', promptAr: 'الْكُتُبُ ______.', options: ['جَدِيدَةٌ', 'جَدِيدُونَ', 'جَدِيدٌ'], answer: 0, feedbackEn: 'A nonhuman plural normally takes a feminine singular adjective.' },
    { id: 'l2e-q14', number: 14, skill: 'listening', type: 'multiple-choice', promptAr: 'مَا عَمَلُ مَرْيَمَ؟', options: ['مُتَرْجِمَةٌ', 'مُدَرِّسَةٌ', 'طَالِبَةٌ'], answer: 0, feedbackEn: 'Maryam is a translator.', audioId: 'l2-exam-listening-01' },
    { id: 'l2e-q15', number: 15, skill: 'listening', type: 'multiple-choice', promptAr: 'مَتَى تَعْمَلُ مَرْيَمُ؟', options: ['فِي النَّهَارِ', 'فِي اللَّيْلِ', 'غَدًا فِي الْمَسَاءِ'], answer: 0, feedbackEn: 'Maryam works during the day.', audioId: 'l2-exam-listening-01' },
    { id: 'l2e-q16', number: 16, skill: 'listening', type: 'multiple-choice', promptAr: 'مَاذَا يَدْرُسُ الطُّلَّابُ؟', options: ['الْفُصْحَى', 'التَّرْجَمَةَ', 'الْفَرَنْسِيَّةَ'], answer: 0, feedbackEn: 'The students study Modern Standard Arabic.', audioId: 'l2-exam-listening-02' },
    { id: 'l2e-q17', number: 17, skill: 'listening', type: 'multiple-choice', promptAr: 'مَتَى دَرْسُهُمْ؟', options: ['غَدًا فِي الْمَسَاءِ', 'الْيَوْمَ فِي النَّهَارِ', 'غَدًا فِي النَّهَارِ'], answer: 0, feedbackEn: 'Their lesson is tomorrow evening.', audioId: 'l2-exam-listening-02' },
    { id: 'l2e-q18', number: 18, skill: 'conversation', type: 'multiple-choice', promptAr: 'مَا اللُّغَاتُ الَّتِي تَتَكَلَّمُونَهَا؟', options: ['نَتَكَلَّمُ الْعَرَبِيَّةَ وَالْإِنْجِلِيزِيَّةَ.', 'نَحْنُ فِي الْمَرْكَزِ غَدًا.', 'هِيَ مُتَرْجِمَةٌ.'], answer: 0, feedbackEn: 'The question asks which languages “you all” speak, so the answer uses نَتَكَلَّمُ.' },
  ] satisfies readonly ChoiceQuestion[],
  writingQuestion: {
    id: 'l2e-q19', number: 19, skill: 'writing', type: 'structured-writing',
    promptEn: 'Write four short sentences about yourself. Diacritics are optional.',
    fields: ['name', 'country', 'languages', 'studyOrTime'],
    pointRule: 'Award one point when at least three of the four criteria are met.',
  },
  speakingQuestion: {
    id: 'l2e-q20', number: 20, skill: 'speaking', type: 'recording',
    promptAr: 'تَكَلَّمْ عَنْ نَفْسِكَ فِي جُمْلَتَيْنِ. قُلْ مَا اللُّغَةُ الَّتِي تَتَكَلَّمُهَا، وَمَتَى دَرْسُكَ.',
    promptEn: 'Speak about yourself in two short sentences. Say which language you speak and when your lesson is.',
    modelAudioId: 'l2-exam-speaking-model',
    pointRule: 'Award one point when the recording is intelligible and includes a language and lesson time.',
    typedFallback: true,
  },
  skillTotals: { vocabulary: 4, reading: 4, grammar: 5, listening: 4, conversation: 1, writing: 1, speaking: 1 },
} as const;
