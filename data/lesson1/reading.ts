export type ReadingWord = { word: string; meaning: string; audioUrl: string };
export type ReadingChoice = { prompt: string; choices: string[]; answer: string; explanation: string };
export type TrueFalseItem = { statement: string; answer: boolean; explanation: string };

export const readingTitle = 'طَالِبَانِ فِي الجَامِعَةِ';

export type ReadingSentence = { id: number; text: string; audioUrl: string };
export type ReadingSection = { id: 'salma' | 'ahmed'; title: string; audioUrl: string; sentences: ReadingSentence[] };
export type ReadingContent = { title: string; audioUrl: string; sections: ReadingSection[] };

const sentence = (id: number, text: string): ReadingSentence => ({ id, text, audioUrl: `/audio/lesson1/reading/sentences/reading-sentence-${String(id).padStart(2, '0')}.mp3` });
export const readingContent: ReadingContent = {
  title: readingTitle,
  audioUrl: '/audio/lesson1/reading/reading-full.mp3',
  sections: [
    { id: 'salma', title: 'سَلْمَى', audioUrl: '/audio/lesson1/reading/sections/reading-salma.mp3', sentences: [sentence(1, 'أَنَا سَلْمَى.'), sentence(2, 'أَنَا طَالِبَةٌ مِصْرِيَّةٌ.'), sentence(3, 'أَدْرُسُ الأَدَبَ العَرَبِيَّ فِي الجَامِعَةِ.'), sentence(4, 'عُمْرِي عِشْرُونَ سَنَةً.'), sentence(5, 'أَسْكُنُ فِي مِنْطَقَةٍ هَادِئَةٍ.'), sentence(6, 'وَالِدِي يَعْمَلُ فِي الأُمَمِ المُتَّحِدَةِ، وَوَالِدَتِي تَعْمَلُ فِي مَدْرَسَةٍ.')] },
    { id: 'ahmed', title: 'أَحْمَدُ', audioUrl: '/audio/lesson1/reading/sections/reading-ahmed.mp3', sentences: [sentence(7, 'أَنَا أَحْمَدُ.'), sentence(8, 'أَنَا طَالِبٌ مِصْرِيٌّ.'), sentence(9, 'أَدْرُسُ اللُّغَةَ العَرَبِيَّةَ.'), sentence(10, 'عُمْرِي إِحْدَى وَعِشْرُونَ سَنَةً.'), sentence(11, 'أَسْكُنُ فِي نَفْسِ مِنْطَقَةِ سَلْمَى.'), sentence(12, 'نَحْنُ فِي نَفْسِ الجَامِعَةِ.'), sentence(13, 'وَالِدِي مُدَرِّسٌ، وَوَالِدَتِي طَبِيبَةٌ.')] },
  ],
};

export const readingText = [
  { name: 'سَلْمَى', text: 'أَنَا سَلْمَى. أَنَا طَالِبَةٌ مِصْرِيَّةٌ. أَدْرُسُ الأَدَبَ العَرَبِيَّ فِي الجَامِعَةِ. عُمْرِي عِشْرُونَ سَنَةً. أَسْكُنُ فِي مِنْطَقَةٍ هَادِئَةٍ. وَالِدِي يَعْمَلُ فِي الأُمَمِ المُتَّحِدَةِ، وَوَالِدَتِي تَعْمَلُ فِي مَدْرَسَةٍ.' },
  { name: 'أَحْمَدُ', text: 'أَنَا أَحْمَدُ. أَنَا طَالِبٌ مِصْرِيٌّ. أَدْرُسُ اللُّغَةَ العَرَبِيَّةَ. عُمْرِي إِحْدَى وَعِشْرُونَ سَنَةً. أَسْكُنُ فِي نَفْسِ مِنْطَقَةِ سَلْمَى. نَحْنُ فِي نَفْسِ الجَامِعَةِ. وَالِدِي مُدَرِّسٌ، وَوَالِدَتِي طَبِيبَةٌ.' },
];

const audio = (id: number) => `/audio/lesson1/words/word-${String(id).padStart(2, '0')}.mp3`;
const interactiveWordRows: [string, string, number][] = [
  ['مِصْرِيٌّ', 'Egyptian', 4], ['مِصْرِيَّةٌ', 'Egyptian', 4], ['أَدْرُسُ', 'I study', 5], ['الأَدَبُ', 'Literature', 1], ['عُمْرٌ', 'Age', 8], ['سَنَةٌ', 'Year', 7], ['أَسْكُنُ', 'I live', 6], ['مِنْطَقَةٌ', 'Area / region', 10], ['وَالِدِي', 'My father', 12], ['وَالِدَتِي', 'My mother', 14], ['يَعْمَلُ', 'He works', 16], ['تَعْمَلُ', 'She works', 17], ['الأُمَمُ المُتَّحِدَةُ', 'The United Nations', 2], ['نَفْسُ', 'Same', 22],
];
export const interactiveWords: ReadingWord[] = interactiveWordRows.map(([word, meaning, id]) => ({ word, meaning, audioUrl: audio(id) }));

export const readingChoices: ReadingChoice[] = [
  { prompt: 'مَا الفِكْرَةُ العَامَّةُ لِلنَّصِّ؟', choices: ['مَعْلُومَاتٌ عَنْ طَالِبَيْنِ.', 'مَعْلُومَاتٌ عَنْ مُسْتَشْفًى.', 'مَعْلُومَاتٌ عَنْ مَدْرَسَةٍ.'], answer: 'مَعْلُومَاتٌ عَنْ طَالِبَيْنِ.', explanation: 'يتحدث النص عن سلمى وأحمد، وهما طالبان.' },
  { prompt: 'مَا جِنْسِيَّةُ سَلْمَى؟', choices: ['مِصْرِيَّةٌ.', 'مَغْرِبِيَّةٌ.', 'فَرَنْسِيَّةٌ.'], answer: 'مِصْرِيَّةٌ.', explanation: 'جاء في النص: أَنَا طَالِبَةٌ مِصْرِيَّةٌ.' },
  { prompt: 'مَاذَا تَدْرُسُ سَلْمَى؟', choices: ['الأَدَبَ العَرَبِيَّ.', 'الطِّبَّ.', 'اللُّغَةَ الإِنْجِلِيزِيَّةَ.'], answer: 'الأَدَبَ العَرَبِيَّ.', explanation: 'جاء في النص: أَدْرُسُ الأَدَبَ العَرَبِيَّ.' },
  { prompt: 'أَيْنَ يَعْمَلُ وَالِدُ سَلْمَى؟', choices: ['فِي الأُمَمِ المُتَّحِدَةِ.', 'فِي مَدْرَسَةٍ.', 'فِي مُسْتَشْفًى.'], answer: 'فِي الأُمَمِ المُتَّحِدَةِ.', explanation: 'ورد في النص أن والد سلمى يعمل في الأمم المتحدة.' },
  { prompt: 'أَيْنَ تَعْمَلُ وَالِدَةُ سَلْمَى؟', choices: ['فِي مَدْرَسَةٍ.', 'فِي جَامِعَةٍ.', 'فِي مَكْتَبٍ.'], answer: 'فِي مَدْرَسَةٍ.', explanation: 'جاء في النص: وَوَالِدَتِي تَعْمَلُ فِي مَدْرَسَةٍ.' },
  { prompt: 'مَاذَا يَدْرُسُ أَحْمَدُ؟', choices: ['اللُّغَةَ العَرَبِيَّةَ.', 'الأَدَبَ الإِنْجِلِيزِيَّ.', 'الطِّبَّ.'], answer: 'اللُّغَةَ العَرَبِيَّةَ.', explanation: 'جاء في النص: أَدْرُسُ اللُّغَةَ العَرَبِيَّةَ.' },
  { prompt: 'أَيْنَ يَسْكُنُ أَحْمَدُ؟', choices: ['فِي نَفْسِ مِنْطَقَةِ سَلْمَى.', 'فِي مَدِينَةٍ أُخْرَى.', 'فِي الجَامِعَةِ.'], answer: 'فِي نَفْسِ مِنْطَقَةِ سَلْمَى.', explanation: 'جاء في النص: أَسْكُنُ فِي نَفْسِ مِنْطَقَةِ سَلْمَى.' },
];

export const trueFalseItems: TrueFalseItem[] = [
  { statement: 'سَلْمَى طَالِبَةٌ مِصْرِيَّةٌ.', answer: true, explanation: 'ذكر النص أن سلمى طالبة مصرية.' },
  { statement: 'أَحْمَدُ يَدْرُسُ الطِّبَّ.', answer: false, explanation: 'أحمد يدرس اللغة العربية.' },
  { statement: 'سَلْمَى وَأَحْمَدُ فِي نَفْسِ الجَامِعَةِ.', answer: true, explanation: 'ذكر أحمد: نحن في نفس الجامعة.' },
  { statement: 'وَالِدَةُ أَحْمَدَ مُدَرِّسَةٌ.', answer: false, explanation: 'والدة أحمد طبيبة.' },
];

export const informationCards = [
  { name: 'سَلْمَى', fields: [['الجنسية', 'مِصْرِيَّةٌ'], ['العمر', 'عِشْرُونَ سَنَةً'], ['الدراسة', 'الأَدَبُ العَرَبِيُّ'], ['عمل الوالد', 'الأُمَمُ المُتَّحِدَةُ'], ['عمل الوالدة', 'مَدْرَسَةٌ']] },
  { name: 'أَحْمَدُ', fields: [['الجنسية', 'مِصْرِيٌّ'], ['العمر', 'إِحْدَى وَعِشْرُونَ سَنَةً'], ['الدراسة', 'اللُّغَةُ العَرَبِيَّةُ'], ['عمل الوالد', 'مُدَرِّسٌ'], ['عمل الوالدة', 'طَبِيبَةٌ']] },
] as const;
