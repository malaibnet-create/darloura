export type VocabularyItem = {
  id: number;
  word: string;
  meaning: string;
  example: string;
  translation: string;
  visual: string;
  visualType: 'icon' | 'symbol' | 'none';
  wordAudioUrl: string;
  exampleAudioUrl: string;
  note?: string;
};

export const lessonTwoVocabulary: VocabularyItem[] = [
  {
    "id": 1,
    "word": "يَتَكَلَّمُ",
    "meaning": "He speaks",
    "example": "يَتَكَلَّمُ يُوسُفُ الْعَرَبِيَّةَ.",
    "translation": "Yusuf speaks Arabic.",
    "visual": "🗣️",
    "visualType": "icon",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-01-yatakallam.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-01-yatakallam.mp3"
  },
  {
    "id": 2,
    "word": "يَتَكَلَّمُ عَنْ",
    "meaning": "He talks about",
    "example": "تَتَكَلَّمُ سَلْمَى عَنْ أُسْرَتِهَا.",
    "translation": "Salma talks about her family.",
    "visual": "💬",
    "visualType": "icon",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-02-yatakallam-an.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-02-yatakallam-an.mp3"
  },
  {
    "id": 3,
    "word": "لِي / عِنْدِي",
    "meaning": "I have",
    "example": "لِي أُسْرَةٌ صَغِيرَةٌ، وَعِنْدِي كِتَابٌ عَرَبِيٌّ.",
    "translation": "I have a small family, and I have an Arabic book.",
    "visual": "✋",
    "visualType": "symbol",
    "note": "لِي and عِنْدِي can both express “I have” at this level.",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-03-li-indi.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-03-li-indi.mp3"
  },
  {
    "id": 4,
    "word": "لُغَةٌ",
    "meaning": "Language",
    "example": "أَدْرُسُ لُغَةً جَدِيدَةً.",
    "translation": "I study a new language.",
    "visual": "🔤",
    "visualType": "icon",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-04-lugha.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-04-lugha.mp3"
  },
  {
    "id": 5,
    "word": "الْمَسَاءُ",
    "meaning": "Evening",
    "example": "أَدْرُسُ فِي الْمَسَاءِ.",
    "translation": "I study in the evening.",
    "visual": "🌆",
    "visualType": "icon",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-05-almasaa.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-05-almasaa.mp3"
  },
  {
    "id": 6,
    "word": "اللَّيْلُ",
    "meaning": "Night",
    "example": "اللَّيْلُ هَادِئٌ.",
    "translation": "The night is quiet.",
    "visual": "🌙",
    "visualType": "icon",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-06-allayl.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-06-allayl.mp3"
  },
  {
    "id": 7,
    "word": "النَّهَارُ",
    "meaning": "Daytime",
    "example": "أَعْمَلُ فِي النَّهَارِ.",
    "translation": "I work during the day.",
    "visual": "☀️",
    "visualType": "icon",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-07-annahar.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-07-annahar.mp3"
  },
  {
    "id": 8,
    "word": "وَحْدَهُ / وَحْدَهَا",
    "meaning": "Alone — masculine / feminine",
    "example": "يَسْكُنُ يُوسُفُ وَحْدَهُ.",
    "translation": "Yusuf lives alone.",
    "visual": "👤",
    "visualType": "icon",
    "note": "Use وَحْدَهُ for a male and وَحْدَهَا for a female.",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-08-wahdahu-wahdaha.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-08-wahdahu-wahdaha.mp3"
  },
  {
    "id": 9,
    "word": "مُوَظَّفٌ / مُوَظَّفَةٌ",
    "meaning": "Employee — masculine / feminine",
    "example": "وَالِدَتِي مُوَظَّفَةٌ فِي مَرْكَزٍ.",
    "translation": "My mother is an employee at a center.",
    "visual": "💼",
    "visualType": "icon",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-09-muwazzaf-muwazzafa.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-09-muwazzaf-muwazzafa.mp3"
  },
  {
    "id": 10,
    "word": "الْيَوْمَ",
    "meaning": "Today",
    "example": "أَدْرُسُ الْفُصْحَى الْيَوْمَ.",
    "translation": "I study Modern Standard Arabic today.",
    "visual": "📅",
    "visualType": "icon",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-10-alyawm.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-10-alyawm.mp3"
  },
  {
    "id": 11,
    "word": "الْفُصْحَى",
    "meaning": "Modern Standard Arabic",
    "example": "أَتَكَلَّمُ الْعَرَبِيَّةَ الْفُصْحَى.",
    "translation": "I speak Modern Standard Arabic.",
    "visual": "📖",
    "visualType": "icon",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-11-alfusha.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-11-alfusha.mp3"
  },
  {
    "id": 12,
    "word": "أُسْرَةٌ",
    "meaning": "Family",
    "example": "هٰذِهِ أُسْرَتِي.",
    "translation": "This is my family.",
    "visual": "👨‍👩‍👧",
    "visualType": "icon",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-12-usra.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-12-usra.mp3"
  },
  {
    "id": 13,
    "word": "النَّاسُ",
    "meaning": "People",
    "example": "النَّاسُ فِي مَكْنَاسَ لُطَفَاءُ.",
    "translation": "The people in Meknes are kind.",
    "visual": "👥",
    "visualType": "icon",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-13-annas.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-13-annas.mp3"
  },
  {
    "id": 14,
    "word": "أَيْضًا",
    "meaning": "Also / too",
    "example": "أَدْرُسُ الْعَرَبِيَّةَ وَالْإِنْجِلِيزِيَّةَ أَيْضًا.",
    "translation": "I study Arabic and English too.",
    "visual": "➕",
    "visualType": "symbol",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-14-aydan.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-14-aydan.mp3"
  },
  {
    "id": 15,
    "word": "تَأَكَّدْ",
    "meaning": "Make sure / check",
    "example": "تَأَكَّدْ مِنَ الْعُنْوَانِ.",
    "translation": "Check the address.",
    "visual": "✓",
    "visualType": "symbol",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-15-taakkad.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-15-taakkad.mp3"
  },
  {
    "id": 16,
    "word": "التَّرْجَمَةُ مِنْ ... إِلَى ...",
    "meaning": "Translation from … into …",
    "example": "أَعْمَلُ فِي التَّرْجَمَةِ مِنَ الْعَرَبِيَّةِ إِلَى الْإِنْجِلِيزِيَّةِ.",
    "translation": "I work in translation from Arabic into English.",
    "visual": "🔁",
    "visualType": "symbol",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-16-attarjama.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-16-attarjama.mp3"
  },
  {
    "id": 17,
    "word": "مُتَرْجِمٌ / مُتَرْجِمَةٌ",
    "meaning": "Translator — masculine / feminine",
    "example": "خَالَتِي مُتَرْجِمَةٌ.",
    "translation": "My maternal aunt is a translator.",
    "visual": "🗣️",
    "visualType": "icon",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-17-mutarjim-mutarjima.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-17-mutarjim-mutarjima.mp3"
  },
  {
    "id": 18,
    "word": "مُتَخَصِّصٌ / مُتَخَصِّصَةٌ فِي",
    "meaning": "Specialized in — masculine / feminine",
    "example": "وَالِدِي مُتَخَصِّصٌ فِي اللُّغَةِ الْعَرَبِيَّةِ.",
    "translation": "My father specializes in the Arabic language.",
    "visual": "🎓",
    "visualType": "icon",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-18-mutakhassis.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-18-mutakhassis.mp3"
  },
  {
    "id": 19,
    "word": "خَالَةٌ",
    "meaning": "Maternal aunt",
    "example": "خَالَتِي تَسْكُنُ فِي الرِّبَاطِ.",
    "translation": "My maternal aunt lives in Rabat.",
    "visual": "👩",
    "visualType": "icon",
    "note": "خَالَةٌ means your mother’s sister.",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-19-khala.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-19-khala.mp3"
  },
  {
    "id": 20,
    "word": "دَائِمًا",
    "meaning": "Always",
    "example": "أَدْرُسُ الْعَرَبِيَّةَ دَائِمًا.",
    "translation": "I always study Arabic.",
    "visual": "🔄",
    "visualType": "symbol",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-20-daiman.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-20-daiman.mp3"
  },
  {
    "id": 21,
    "word": "مَرْكَزٌ",
    "meaning": "Center",
    "example": "هٰذَا مَرْكَزُ دَارِ اللُّغَةِ.",
    "translation": "This is the Dar al-Lugha center.",
    "visual": "🏫",
    "visualType": "icon",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-21-markaz.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-21-markaz.mp3"
  },
  {
    "id": 22,
    "word": "الشَّرْقُ الْأَوْسَطُ",
    "meaning": "The Middle East",
    "example": "يَتَكَلَّمُ النَّاسُ الْعَرَبِيَّةَ فِي الشَّرْقِ الْأَوْسَطِ.",
    "translation": "People speak Arabic in the Middle East.",
    "visual": "🌍",
    "visualType": "icon",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-22-asharq-alawsat.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-22-asharq-alawsat.mp3"
  },
  {
    "id": 23,
    "word": "مَشْغُولٌ / مَشْغُولَةٌ بِـ",
    "meaning": "Busy with — masculine / feminine",
    "example": "أَنَا مَشْغُولٌ بِالْعَمَلِ الْيَوْمَ.",
    "translation": "I am busy with work today.",
    "visual": "⏳",
    "visualType": "icon",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-23-mashghul.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-23-mashghul.mp3"
  },
  {
    "id": 24,
    "word": "الْعَمَلُ / الشُّغْلُ",
    "meaning": "Work",
    "example": "عِنْدِي عَمَلٌ فِي الْمَرْكَزِ الْيَوْمَ.",
    "translation": "I have work at the center today.",
    "visual": "💼",
    "visualType": "icon",
    "note": "الْعَمَلُ is neutral MSA. الشُّغْلُ is common in everyday speech.",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-24-alamal-ashughl.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-24-alamal-ashughl.mp3"
  },
  {
    "id": 25,
    "word": "غَدًا",
    "meaning": "Tomorrow",
    "example": "الدَّرْسُ غَدًا.",
    "translation": "The lesson is tomorrow.",
    "visual": "📆",
    "visualType": "icon",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-25-ghadan.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-25-ghadan.mp3"
  },
  {
    "id": 26,
    "word": "فِعْلًا",
    "meaning": "Really / indeed",
    "example": "هُوَ مُتَرْجِمٌ فِعْلًا.",
    "translation": "He really is a translator.",
    "visual": "❗",
    "visualType": "symbol",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-26-filan.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-26-filan.mp3"
  },
  {
    "id": 27,
    "word": "الْقَبُولُ",
    "meaning": "Acceptance / admission",
    "example": "الْقَبُولُ فِي الْمَرْكَزِ مُهِمٌّ.",
    "translation": "Admission to the center is important.",
    "visual": "✅",
    "visualType": "symbol",
    "wordAudioUrl": "/audio/lesson-02/vocabulary/word-27-alqabul.mp3",
    "exampleAudioUrl": "/audio/lesson-02/vocabulary/example-27-alqabul.mp3"
  }
];
