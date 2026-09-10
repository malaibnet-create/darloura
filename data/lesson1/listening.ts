export type ListeningAudio = { id: string; title: string; audioUrl?: string; available?: boolean; transcript: string; translation: string };
export type ListeningQuestion = { id: string; prompt: string; choices: string[]; correctAnswer: string; explanation: string };

export const listeningContent = {
  title: 'تَعَارُفٌ فِي الجَامِعَةِ',
  englishTitle: 'Meeting at the University',
  description: 'اِسْتَمِعْ إِلَى طُلَّابٍ مَغَارِبَةٍ يَتَحَدَّثُونَ عَنْ أَنْفُسِهِمْ وَدِرَاسَتِهِمْ وَمَدِينَتِهِمْ.',
  heroImage: '/images/lesson1/listening-hero.png',
  audios: [
    { id: 'listening-01', title: 'رِسَالَةٌ مِنْ أَمَلَ', audioUrl: '/audio/lesson1/listening/listening-01-full.mp3', transcript: 'مَرْحَبًا، أَنَا أَمَلُ. أَنَا طَالِبَةٌ مَغْرِبِيَّةٌ. عُمْرِي عِشْرُونَ سَنَةً. أَدْرُسُ الأَدَبَ العَرَبِيَّ فِي جَامِعَةٍ فِي مَكْنَاسَ. أَسْكُنُ فِي مَدِينَةِ مَكْنَاسَ، فِي مِنْطَقَةٍ هَادِئَةٍ. وَالِدِي يَعْمَلُ فِي جَامِعَةٍ، وَوَالِدَتِي تَعْمَلُ فِي مَدْرَسَةٍ.', translation: 'Hello, I am Amal. I am a Moroccan student. I am twenty years old. I study Arabic literature at a university in Meknes. I live in Meknes, in a quiet area. My father works at a university, and my mother works at a school.' },
    { id: 'listening-02', title: 'تَعَارُفٌ فِي الجَامِعَةِ', audioUrl: '/audio/lesson1/listening/listening-02-dialogue.mp3', transcript: 'سَلْمَى: السَّلَامُ عَلَيْكُمْ. أَنَا سَلْمَى. مَا اسْمُكَ؟ يَاسِينُ: وَعَلَيْكُمُ السَّلَامُ. أَنَا يَاسِينُ. مَا جِنْسِيَّتُكَ؟ أَنَا مَغْرِبِيٌّ. أَسْكُنُ فِي مَدِينَةِ الرِّبَاطِ. أَدْرُسُ اللُّغَةَ العَرَبِيَّةَ فِي الجَامِعَةِ.', translation: 'Salma and Yassine meet at university and talk about their names, nationality, cities, studies, and age.' },
  ] as ListeningAudio[],
};

listeningContent.audios.forEach(audio => { audio.available = true; });

export const amalQuestions: ListeningQuestion[] = [
  { id: 'amal-idea', prompt: 'عَنْ مَاذَا تَتَحَدَّثُ أَمَلُ؟', choices: ['عَنْ نَفْسِهَا وَدِرَاسَتِهَا وَأُسْرَتِهَا.', 'عَنْ صَدِيقَتِهَا فَقَطْ.', 'عَنْ رِحْلَةٍ إِلَى الرِّبَاطِ.'], correctAnswer: 'عَنْ نَفْسِهَا وَدِرَاسَتِهَا وَأُسْرَتِهَا.', explanation: 'ذكرت أمل جنسيتها وعمرها ودراستها ومكان سكنها وعمل والديها.' },
  { id: 'amal-city', prompt: 'فِي أَيِّ مَدِينَةٍ تَسْكُنُ أَمَلُ؟', choices: ['مَكْنَاسُ.', 'الرِّبَاطُ.', 'فَاسُ.'], correctAnswer: 'مَكْنَاسُ.', explanation: 'قالت أمل: أَسْكُنُ فِي مَدِينَةِ مَكْنَاسَ.' },
  { id: 'amal-study', prompt: 'مَاذَا تَدْرُسُ أَمَلُ؟', choices: ['الأَدَبَ العَرَبِيَّ.', 'الطِّبَّ.', 'اللُّغَةَ الإِنْجِلِيزِيَّةَ.'], correctAnswer: 'الأَدَبَ العَرَبِيَّ.', explanation: 'قالت أمل: أَدْرُسُ الأَدَبَ العَرَبِيَّ.' },
];

export const dialogueQuestions: ListeningQuestion[] = [
  { id: 'dialogue-city-yassine', prompt: 'أَيْنَ يَسْكُنُ يَاسِينُ؟', choices: ['فِي مَدِينَةِ الرِّبَاطِ.', 'فِي مَدِينَةِ مَكْنَاسَ.', 'فِي مَدِينَةِ فَاسَ.'], correctAnswer: 'فِي مَدِينَةِ الرِّبَاطِ.', explanation: 'قال ياسين: أَسْكُنُ فِي مَدِينَةِ الرِّبَاطِ.' },
  { id: 'dialogue-city-salma', prompt: 'أَيْنَ تَسْكُنُ سَلْمَى؟', choices: ['فِي مَدِينَةِ مَكْنَاسَ.', 'فِي مَدِينَةِ الرِّبَاطِ.', 'فِي مَدِينَةِ مَرَّاكُشَ.'], correctAnswer: 'فِي مَدِينَةِ مَكْنَاسَ.', explanation: 'قالت سلمى: أَسْكُنُ فِي مَدِينَةِ مَكْنَاسَ.' },
  { id: 'dialogue-study', prompt: 'مَاذَا يَدْرُسُ يَاسِينُ؟', choices: ['اللُّغَةَ العَرَبِيَّةَ.', 'الأَدَبَ الفَرَنْسِيَّ.', 'الطِّبَّ.'], correctAnswer: 'اللُّغَةَ العَرَبِيَّةَ.', explanation: 'قال ياسين: أَدْرُسُ اللُّغَةَ العَرَبِيَّةَ فِي الجَامِعَةِ.' },
  { id: 'dialogue-age', prompt: 'كَمْ عُمْرُ يَاسِين؟', choices: ['إِحْدَى وَعِشْرُونَ سَنَةً.', 'عِشْرُونَ سَنَةً.', 'تِسْعَ عَشْرَةَ سَنَةً.'], correctAnswer: 'إِحْدَى وَعِشْرُونَ سَنَةً.', explanation: 'قال ياسين: عُمْرِي إِحْدَى وَعِشْرُونَ سَنَةً.' },
];

export const dialogueLines = [
  ['سَلْمَى', '/audio/lesson1/listening/dialogue/dialogue-line-01.mp3', 'السَّلَامُ عَلَيْكُمْ. أَنَا سَلْمَى. مَا اسْمُكَ؟'],
  ['يَاسِين', '/audio/lesson1/listening/dialogue/dialogue-line-02.mp3', 'وَعَلَيْكُمُ السَّلَامُ. أَنَا يَاسِينُ.'],
  ['سَلْمَى', '/audio/lesson1/listening/dialogue/dialogue-line-03.mp3', 'مَا جِنْسِيَّتُكَ؟'],
  ['يَاسِين', '/audio/lesson1/listening/dialogue/dialogue-line-04.mp3', 'أَنَا مَغْرِبِيٌّ. وَأَنْتِ؟'],
  ['سَلْمَى', '/audio/lesson1/listening/dialogue/dialogue-line-05.mp3', 'أَنَا مَغْرِبِيَّةٌ. أَيْنَ تَسْكُنُ؟'],
  ['يَاسِين', '/audio/lesson1/listening/dialogue/dialogue-line-06.mp3', 'أَسْكُنُ فِي مَدِينَةِ الرِّبَاطِ. وَأَنْتِ؟'],
  ['سَلْمَى', '/audio/lesson1/listening/dialogue/dialogue-line-07.mp3', 'أَسْكُنُ فِي مَدِينَةِ مَكْنَاسَ. مَاذَا تَدْرُسُ؟'],
  ['يَاسِين', '/audio/lesson1/listening/dialogue/dialogue-line-08.mp3', 'أَدْرُسُ اللُّغَةَ العَرَبِيَّةَ فِي الجَامِعَةِ.'],
  ['سَلْمَى', '/audio/lesson1/listening/dialogue/dialogue-line-09.mp3', 'كَمْ عُمْرُكَ؟'],
  ['يَاسِين', '/audio/lesson1/listening/dialogue/dialogue-line-10.mp3', 'عُمْرِي إِحْدَى وَعِشْرُونَ سَنَةً.'],
] as const;
