export const lessonTwoMeaningQuestions = [
  { id: 'meaning-01', wordId: 1, correct: 'He speaks', choices: ['He speaks', 'He works', 'He lives'] },
  { id: 'meaning-04', wordId: 4, correct: 'Language', choices: ['Language', 'Family', 'Center'] },
  { id: 'meaning-12', wordId: 12, correct: 'Family', choices: ['People', 'Family', 'Maternal aunt'] },
  { id: 'meaning-17', wordId: 17, correct: 'Translator', choices: ['Employee', 'Translator', 'Student'] },
  { id: 'meaning-20', wordId: 20, correct: 'Always', choices: ['Tomorrow', 'Always', 'Today'] },
  { id: 'meaning-27', wordId: 27, correct: 'Acceptance / admission', choices: ['Address', 'Translation', 'Acceptance / admission'] },
] as const;

export const lessonTwoMatchingGroups = [
  { id: 'match-time', wordIds: [5, 6, 7, 10, 25] },
  { id: 'match-work', wordIds: [9, 17, 18, 21, 24] },
] as const;

export const lessonTwoListeningQuestions = [
  { id: 'listen-06', wordId: 6, choices: ['اللَّيْلُ', 'النَّهَارُ', 'الْمَسَاءُ'] },
  { id: 'listen-12', wordId: 12, choices: ['أُسْرَةٌ', 'خَالَةٌ', 'لُغَةٌ'] },
  { id: 'listen-17', wordId: 17, choices: ['مُوَظَّفٌ', 'مُتَرْجِمٌ', 'مُتَخَصِّصٌ'] },
  { id: 'listen-25', wordId: 25, choices: ['دَائِمًا', 'الْيَوْمَ', 'غَدًا'] },
] as const;

export const lessonTwoSentenceQuestions = [
  { id: 'sentence-01', sentence: 'يُوسُفُ _____ الْعَرَبِيَّةَ.', answer: 'يَتَكَلَّمُ', choices: ['يَتَكَلَّمُ', 'يَعْمَلُ', 'يَسْكُنُ'] },
  { id: 'sentence-02', sentence: 'سَلْمَى تَتَكَلَّمُ _____ أُسْرَتِهَا.', answer: 'عَنْ', choices: ['عَنْ', 'فِي', 'إِلَى'] },
  { id: 'sentence-03', sentence: 'أَدْرُسُ فِي _____.', answer: 'الْمَسَاءِ', choices: ['الْمَسَاءِ', 'مُتَرْجِمٍ', 'أُسْرَةٍ'] },
  { id: 'sentence-04', sentence: 'خَالَتِي _____.', answer: 'مُتَرْجِمَةٌ', choices: ['مُتَرْجِمٌ', 'مُتَرْجِمَةٌ', 'مَشْغُولٌ'] },
  { id: 'sentence-05', sentence: 'أَنَا مَشْغُولٌ _____ الْعَمَلِ.', answer: 'بِـ', choices: ['بِـ', 'عَنْ', 'إِلَى'] },
  { id: 'sentence-06', sentence: 'الدَّرْسُ _____.', answer: 'غَدًا', choices: ['غَدًا', 'أُسْرَةٌ', 'مَرْكَزٌ'] },
] as const;

export const lessonTwoFormQuestions = [
  { id: 'form-01', prompt: 'هِيَ', answer: 'مُوَظَّفَةٌ', choices: ['مُوَظَّفٌ', 'مُوَظَّفَةٌ'] },
  { id: 'form-02', prompt: 'هُوَ', answer: 'مُتَرْجِمٌ', choices: ['مُتَرْجِمٌ', 'مُتَرْجِمَةٌ'] },
  { id: 'form-03', prompt: 'هِيَ', answer: 'مُتَخَصِّصَةٌ فِي', choices: ['مُتَخَصِّصٌ فِي', 'مُتَخَصِّصَةٌ فِي'] },
  { id: 'form-04', prompt: 'سَلْمَى تَسْكُنُ', answer: 'وَحْدَهَا', choices: ['وَحْدَهُ', 'وَحْدَهَا'] },
] as const;
