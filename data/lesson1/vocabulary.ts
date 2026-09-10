export type VocabularyItem = {
  id: number;
  word: string;
  meaning: string;
  example: string;
  translation: string;
  visual: string;
  visualType: 'icon' | 'symbol' | 'none';
  audioUrl?: string;
  exampleAudioUrl?: string;
  note?: string;
};

export const lessonOneVocabulary: VocabularyItem[] = [
  [1, 'الأَدَبُ', 'Literature', 'أَدْرُسُ الأَدَبَ العَرَبِيَّ.', 'I study Arabic literature.', '📚', 'icon'],
  [2, 'الأُمَمُ المُتَّحِدَةُ', 'The United Nations', 'يَعْمَلُ وَالِدِي فِي الأُمَمِ المُتَّحِدَةِ.', 'My father works at the United Nations.', '🌍', 'icon'],
  [3, 'جِنْسِيَّةٌ', 'Nationality', 'مَا جِنْسِيَّتُكَ؟', 'What is your nationality?', '🪪', 'icon'],
  [4, 'مِصْرِيٌّ / مِصْرِيَّةٌ', 'Egyptian', 'أَنَا طَالِبَةٌ مِصْرِيَّةٌ.', 'I am an Egyptian student.', '🇪🇬', 'icon'],
  [5, 'أَدْرُسُ', 'I study', 'أَدْرُسُ اللُّغَةَ العَرَبِيَّةَ.', 'I study the Arabic language.', '📖', 'icon'],
  [6, 'أَسْكُنُ', 'I live / I reside', 'أَسْكُنُ فِي مَدِينَةِ مَكْنَاسَ.', 'I live in the city of Meknes.', '🏠', 'icon'],
  [7, 'سَنَةٌ', 'Year', 'أَدْرُسُ العَرَبِيَّةَ مُنْذُ سَنَةٍ.', 'I have been studying Arabic for a year.', '📅', 'icon'],
  [8, 'عُمْرٌ', 'Age', 'كَمْ عُمْرُكَ؟', 'How old are you?', '🎂', 'icon'],
  [9, 'عُنْوَانٌ', 'Address', 'مَا عُنْوَانُكَ؟', 'What is your address?', '📍', 'icon'],
  [10, 'مِنْطَقَةٌ', 'Area / Region', 'أَسْكُنُ فِي مِنْطَقَةٍ هَادِئَةٍ.', 'I live in a quiet area.', '🗺️', 'icon'],
  [11, 'وَالِدٌ', 'Father', 'وَالِدُ أَحْمَدَ مُدَرِّسٌ.', 'Ahmed’s father is a teacher.', '👨‍👩‍👧', 'icon'],
  [12, 'وَالِدِي', 'My father', 'وَالِدِي يَعْمَلُ فِي جَامِعَةٍ.', 'My father works at a university.', '👨‍👩‍👧', 'icon'],
  [13, 'وَالِدَةٌ', 'Mother', 'وَالِدَةُ سَارَةَ طَبِيبَةٌ.', 'Sara’s mother is a doctor.', '👩‍👧', 'icon'],
  [14, 'وَالِدَتِي', 'My mother', 'وَالِدَتِي تَعْمَلُ فِي مَدْرَسَةٍ.', 'My mother works at a school.', '👩‍👧', 'icon'],
  [15, 'أَعْمَلُ', 'I work', 'أَعْمَلُ فِي مَكْتَبٍ.', 'I work in an office.', '💼', 'icon'],
  [16, 'يَعْمَلُ', 'He works', 'هُوَ يَعْمَلُ فِي مُسْتَشْفًى.', 'He works in a hospital.', '💼', 'icon'],
  [17, 'تَعْمَلُ', 'She works', 'هِيَ تَعْمَلُ فِي جَامِعَةٍ.', 'She works at a university.', '💼', 'icon'],
  [18, 'مَنْ؟', 'Who?', 'مَنْ هَذَا؟', 'Who is this?', '؟', 'symbol'],
  [19, 'أَيُّ؟ / أَيَّةُ؟', 'Which?', 'أَيُّ كِتَابٍ تُرِيدُ؟', 'Which book do you want?', '', 'none'],
  [20, 'صَحِيحٌ؟', 'Correct? / Really?', 'أَنْتَ مِنَ المَغْرِبِ، صَحِيحٌ؟', 'You are from Morocco, correct?', '✓؟', 'symbol'],
  [21, 'وَاللهِ؟', 'Really? / Is that true?', 'أَنْتَ تَتَكَلَّمُ العَرَبِيَّةَ، وَاللهِ؟', 'You speak Arabic, really?', '❗؟', 'symbol'],
  [22, 'نَفْسُ', 'Same', 'نَحْنُ فِي نَفْسِ الجَامِعَةِ.', 'We are at the same university.', '◎', 'symbol'],
].map(([id, word, meaning, example, translation, visual, visualType]) => ({ id, word, meaning, example, translation, visual, visualType, audioUrl: id === 8 ? undefined : `/audio/lesson1/words/word-${String(id).padStart(2, '0')}.mp3`, exampleAudioUrl: `/audio/lesson1/sentences/sentence-${String(id).padStart(2, '0')}.mp3`, note: id === 21 ? 'عبارة شائعة في المحادثة، ويتغير معناها بحسب السياق ونبرة الصوت.' : undefined } as VocabularyItem));

export const workedConjugation = [
  ['أَنَا', 'أَعْمَلُ', 'I work'],
  ['أَنْتَ', 'تَعْمَلُ', 'You work — masculine'],
  ['أَنْتِ', 'تَعْمَلِينَ', 'You work — feminine'],
  ['هُوَ', 'يَعْمَلُ', 'He works'],
  ['هِيَ', 'تَعْمَلُ', 'She works'],
] as const;
