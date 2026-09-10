export type MeaningQuestion = { id: string; wordId: number; word: string; visual: string; correct: string; choices: string[] };
export type ListeningQuestion = { id: string; wordId: number; word: string; meaning: string; choices: string[]; audioUrl?: string };
export type SentenceQuestion = { id: string; wordId: number; sentence: string; translation: string; answer: string; choices: string[]; audioUrl?: string };
export type VerbQuestion = { id: string; sentence: string; answer: string; choices: string[]; audioUrl?: string };

export const meaningQuestions: MeaningQuestion[] = [
  { id: 'meaning-6', wordId: 6, word: 'أَسْكُنُ', visual: '🏠', correct: 'I live', choices: ['I live', 'I work', 'I study'] },
  { id: 'meaning-5', wordId: 5, word: 'أَدْرُسُ', visual: '📖', correct: 'I study', choices: ['I work', 'I study', 'I live'] },
  { id: 'meaning-15', wordId: 15, word: 'أَعْمَلُ', visual: '💼', correct: 'I work', choices: ['I study', 'I live', 'I work'] },
  { id: 'meaning-3', wordId: 3, word: 'جِنْسِيَّةٌ', visual: '🪪', correct: 'Nationality', choices: ['Address', 'Nationality', 'Age'] },
];

export const matchingGroups = [
  { id: 'match-a', pairs: [{ wordId: 3, word: 'جِنْسِيَّةٌ', meaning: 'Nationality' }, { wordId: 9, word: 'عُنْوَانٌ', meaning: 'Address' }, { wordId: 11, word: 'وَالِدٌ', meaning: 'Father' }, { wordId: 10, word: 'مِنْطَقَةٌ', meaning: 'Area / Region' }] },
  { id: 'match-b', pairs: [{ wordId: 6, word: 'أَسْكُنُ', meaning: 'I live' }, { wordId: 7, word: 'سَنَةٌ', meaning: 'Year' }, { wordId: 8, word: 'عُمْرٌ', meaning: 'Age' }, { wordId: 15, word: 'أَعْمَلُ', meaning: 'I work' }] },
];

export const listeningQuestions: ListeningQuestion[] = [
  { id: 'listen-12', wordId: 12, word: 'وَالِدِي', meaning: 'My father', choices: ['وَالِدِي', 'وَالِدَتِي', 'وَالِدَةٌ'], audioUrl: '/audio/lesson1/practice/listening/listen-12.mp3' },
  { id: 'listen-14', wordId: 14, word: 'وَالِدَتِي', meaning: 'My mother', choices: ['وَالِدٌ', 'وَالِدَتِي', 'وَالِدِي'], audioUrl: '/audio/lesson1/practice/listening/listen-14.mp3' },
  { id: 'listen-18', wordId: 18, word: 'مَنْ؟', meaning: 'Who?', choices: ['نَفْسُ', 'أَيُّ؟', 'مَنْ؟'], audioUrl: '/audio/lesson1/practice/listening/listen-18.mp3' },
];

export const sentenceQuestions: SentenceQuestion[] = [
  { id: 'sentence-1', wordId: 5, sentence: 'أَنَا _____ اللُّغَةَ العَرَبِيَّةَ.', translation: 'I study the Arabic language.', answer: 'أَدْرُسُ', choices: ['أَدْرُسُ', 'أَسْكُنُ', 'أَعْمَلُ'] },
  { id: 'sentence-2', wordId: 6, sentence: 'أَنَا _____ فِي مَدِينَةِ مَكْنَاسَ.', translation: 'I live in the city of Meknes.', answer: 'أَسْكُنُ', choices: ['أَسْكُنُ', 'أَدْرُسُ', 'يَعْمَلُ'] },
  { id: 'sentence-3', wordId: 3, sentence: 'مَا _____؟', translation: 'What is your nationality?', answer: 'جِنْسِيَّتُكَ', choices: ['جِنْسِيَّتُكَ', 'وَالِدُكَ', 'مِنْطَقَتُكَ'] },
  { id: 'sentence-4', wordId: 8, sentence: 'كَمْ _____؟', translation: 'How old are you?', answer: 'عُمْرُكَ', choices: ['عُمْرُكَ', 'عُنْوَانُكَ', 'وَالِدُكَ'] },
  { id: 'sentence-5', wordId: 16, sentence: 'وَالِدِي _____ فِي جَامِعَةٍ.', translation: 'My father works at a university.', answer: 'يَعْمَلُ', choices: ['يَعْمَلُ', 'تَعْمَلُ', 'أَعْمَلُ'] },
  { id: 'sentence-6', wordId: 17, sentence: 'وَالِدَتِي _____ فِي مَدْرَسَةٍ.', translation: 'My mother works at a school.', answer: 'تَعْمَلُ', choices: ['تَعْمَلُ', 'يَعْمَلُ', 'أَعْمَلُ'] },
  { id: 'sentence-7', wordId: 18, sentence: '_____ هَذَا؟', translation: 'Who is this?', answer: 'مَنْ', choices: ['مَنْ', 'أَيُّ', 'نَفْسُ'] },
  { id: 'sentence-8', wordId: 22, sentence: 'نَحْنُ فِي _____ الجَامِعَةِ.', translation: 'We are at the same university.', answer: 'نَفْسِ', choices: ['نَفْسِ', 'عُمْرِ', 'عُنْوَانِ'] },
  { id: 'sentence-9', wordId: 4, sentence: 'أَنَا طَالِبَةٌ _____.', translation: 'I am an Egyptian student.', answer: 'مِصْرِيَّةٌ', choices: ['مِصْرِيَّةٌ', 'مِصْرِيٌّ', 'مِصْرَ'] },
];

export const verbQuestions: VerbQuestion[] = [
  { id: 'verb-1', sentence: 'هُوَ _____ فِي مُسْتَشْفًى.', answer: 'يَعْمَلُ', choices: ['يَعْمَلُ', 'تَعْمَلُ', 'أَعْمَلُ'] },
  { id: 'verb-2', sentence: 'هِيَ _____ فِي جَامِعَةٍ.', answer: 'تَعْمَلُ', choices: ['أَعْمَلُ', 'تَعْمَلُ', 'تَعْمَلِينَ'] },
  { id: 'verb-3', sentence: 'أَنَا _____ فِي مَكْتَبٍ.', answer: 'أَعْمَلُ', choices: ['تَعْمَلُ', 'يَعْمَلُ', 'أَعْمَلُ'] },
];

sentenceQuestions.forEach((question, index) => {
  question.audioUrl = `/audio/lesson1/practice/sentences/practice-sentence-${String(index + 1).padStart(2, '0')}.mp3`;
});

verbQuestions.forEach((question, index) => {
  question.audioUrl = `/audio/lesson1/practice/verbs/practice-verb-${String(index + 1).padStart(2, '0')}.mp3`;
});
