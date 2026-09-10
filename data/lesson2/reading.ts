type ReadingLesson = {
  id: string;
  titleArabic: string;
  titleEnglish: string;
  estimatedMinutes: number;
  predictionImageUrl: string;
  fullAudioUrl: string;
  fullText: string;
  fullTranslation: string;
  paragraphs: Array<{ id: string; arabic: string; english: string; sentenceIds: readonly string[]; audioUrl: string }>;
  sentences: Array<{ id: string; arabic: string; english: string; audioUrl: string }>;
  glossary: Array<{ word: string; meaning: string }>;
};

export const lessonTwoReading: ReadingLesson = {
  "id": "lesson-02-reading",
  "titleArabic": "أُسْرَتِي وَالْعَمَلُ فِي مَرْكَزِ التَّرْجَمَةِ",
  "titleEnglish": "My Family and Work at a Translation Center",
  "estimatedMinutes": 12,
  "predictionImageUrl": "/images/lesson-02/reading-prediction-translation-center.png",
  "fullAudioUrl": "/audio/lesson-02/reading/full-reading.mp3",
  "fullText": "اسْمِي سَلْمَى. أَنَا مَغْرِبِيَّةٌ، وَأَسْكُنُ فِي مَكْنَاسَ مَعَ أُسْرَتِي. أَدْرُسُ الْعَرَبِيَّةَ الْفُصْحَى فِي مَرْكَزِ دَارِ اللُّغَةِ. أَتَكَلَّمُ الْعَرَبِيَّةَ وَالْإِنْجِلِيزِيَّةَ أَيْضًا.\n\nخَالَتِي مَرْيَمُ مُتَرْجِمَةٌ فِي مَرْكَزٍ لِلتَّرْجَمَةِ. هِيَ مُتَخَصِّصَةٌ فِي التَّرْجَمَةِ مِنَ الْعَرَبِيَّةِ إِلَى الْإِنْجِلِيزِيَّةِ. تَعْمَلُ فِي النَّهَارِ. تَتَكَلَّمُ مَعَ النَّاسِ دَائِمًا.\n\nخَالَتِي مَشْغُولَةٌ بِالْعَمَلِ الْيَوْمَ. الدَّرْسُ فِي الْمَرْكَزِ غَدًا. تَسْكُنُ خَالَتِي وَحْدَهَا فِي مَكْنَاسَ. أَنَا أَدْرُسُ فِي الْمَسَاءِ. أَنَا أُحِبُّ أُسْرَتِي، وَأُحِبُّ التَّرْجَمَةَ أَيْضًا.",
  "fullTranslation": "My name is Salma. I am Moroccan, and I live in Meknes with my family. I study Modern Standard Arabic at the Dar al-Lugha center. I speak Arabic and English too.\n\nMy maternal aunt Maryam is a translator at a translation center. She specializes in translation from Arabic into English. She works during the day. She always speaks with people.\n\nMy aunt is busy with work today. The lesson at the center is tomorrow. My aunt lives alone in Meknes. I study in the evening. I love my family, and I also like translation.",
  "paragraphs": [
    {
      "id": "r2-p01",
      "arabic": "اسْمِي سَلْمَى. أَنَا مَغْرِبِيَّةٌ، وَأَسْكُنُ فِي مَكْنَاسَ مَعَ أُسْرَتِي. أَدْرُسُ الْعَرَبِيَّةَ الْفُصْحَى فِي مَرْكَزِ دَارِ اللُّغَةِ. أَتَكَلَّمُ الْعَرَبِيَّةَ وَالْإِنْجِلِيزِيَّةَ أَيْضًا.",
      "english": "My name is Salma. I am Moroccan, and I live in Meknes with my family. I study Modern Standard Arabic at the Dar al-Lugha center. I speak Arabic and English too.",
      "sentenceIds": [
        "r2-s01",
        "r2-s02",
        "r2-s03",
        "r2-s04"
      ],
      "audioUrl": "/audio/lesson-02/reading/paragraph-01.mp3"
    },
    {
      "id": "r2-p02",
      "arabic": "خَالَتِي مَرْيَمُ مُتَرْجِمَةٌ فِي مَرْكَزٍ لِلتَّرْجَمَةِ. هِيَ مُتَخَصِّصَةٌ فِي التَّرْجَمَةِ مِنَ الْعَرَبِيَّةِ إِلَى الْإِنْجِلِيزِيَّةِ. تَعْمَلُ فِي النَّهَارِ. تَتَكَلَّمُ مَعَ النَّاسِ دَائِمًا.",
      "english": "My maternal aunt Maryam is a translator at a translation center. She specializes in translation from Arabic into English. She works during the day. She always speaks with people.",
      "sentenceIds": [
        "r2-s05",
        "r2-s06",
        "r2-s07",
        "r2-s08"
      ],
      "audioUrl": "/audio/lesson-02/reading/paragraph-02.mp3"
    },
    {
      "id": "r2-p03",
      "arabic": "خَالَتِي مَشْغُولَةٌ بِالْعَمَلِ الْيَوْمَ. الدَّرْسُ فِي الْمَرْكَزِ غَدًا. تَسْكُنُ خَالَتِي وَحْدَهَا فِي مَكْنَاسَ. أَنَا أَدْرُسُ فِي الْمَسَاءِ. أَنَا أُحِبُّ أُسْرَتِي، وَأُحِبُّ التَّرْجَمَةَ أَيْضًا.",
      "english": "My aunt is busy with work today. The lesson at the center is tomorrow. My aunt lives alone in Meknes. I study in the evening. I love my family, and I also like translation.",
      "sentenceIds": [
        "r2-s09",
        "r2-s10",
        "r2-s11",
        "r2-s12",
        "r2-s13"
      ],
      "audioUrl": "/audio/lesson-02/reading/paragraph-03.mp3"
    }
  ],
  "sentences": [
    {
      "id": "r2-s01",
      "arabic": "اسْمِي سَلْمَى.",
      "english": "My name is Salma.",
      "audioUrl": "/audio/lesson-02/reading/sentence-01.mp3"
    },
    {
      "id": "r2-s02",
      "arabic": "أَنَا مَغْرِبِيَّةٌ، وَأَسْكُنُ فِي مَكْنَاسَ مَعَ أُسْرَتِي.",
      "english": "I am Moroccan, and I live in Meknes with my family.",
      "audioUrl": "/audio/lesson-02/reading/sentence-02.mp3"
    },
    {
      "id": "r2-s03",
      "arabic": "أَدْرُسُ الْعَرَبِيَّةَ الْفُصْحَى فِي مَرْكَزِ دَارِ اللُّغَةِ.",
      "english": "I study Modern Standard Arabic at the Dar al-Lugha center.",
      "audioUrl": "/audio/lesson-02/reading/sentence-03.mp3"
    },
    {
      "id": "r2-s04",
      "arabic": "أَتَكَلَّمُ الْعَرَبِيَّةَ وَالْإِنْجِلِيزِيَّةَ أَيْضًا.",
      "english": "I speak Arabic and English too.",
      "audioUrl": "/audio/lesson-02/reading/sentence-04.mp3"
    },
    {
      "id": "r2-s05",
      "arabic": "خَالَتِي مَرْيَمُ مُتَرْجِمَةٌ فِي مَرْكَزٍ لِلتَّرْجَمَةِ.",
      "english": "My maternal aunt Maryam is a translator at a translation center.",
      "audioUrl": "/audio/lesson-02/reading/sentence-05.mp3"
    },
    {
      "id": "r2-s06",
      "arabic": "هِيَ مُتَخَصِّصَةٌ فِي التَّرْجَمَةِ مِنَ الْعَرَبِيَّةِ إِلَى الْإِنْجِلِيزِيَّةِ.",
      "english": "She specializes in translation from Arabic into English.",
      "audioUrl": "/audio/lesson-02/reading/sentence-06.mp3"
    },
    {
      "id": "r2-s07",
      "arabic": "تَعْمَلُ فِي النَّهَارِ.",
      "english": "She works during the day.",
      "audioUrl": "/audio/lesson-02/reading/sentence-07.mp3"
    },
    {
      "id": "r2-s08",
      "arabic": "تَتَكَلَّمُ مَعَ النَّاسِ دَائِمًا.",
      "english": "She always speaks with people.",
      "audioUrl": "/audio/lesson-02/reading/sentence-08.mp3"
    },
    {
      "id": "r2-s09",
      "arabic": "خَالَتِي مَشْغُولَةٌ بِالْعَمَلِ الْيَوْمَ.",
      "english": "My aunt is busy with work today.",
      "audioUrl": "/audio/lesson-02/reading/sentence-09.mp3"
    },
    {
      "id": "r2-s10",
      "arabic": "الدَّرْسُ فِي الْمَرْكَزِ غَدًا.",
      "english": "The lesson at the center is tomorrow.",
      "audioUrl": "/audio/lesson-02/reading/sentence-10.mp3"
    },
    {
      "id": "r2-s11",
      "arabic": "تَسْكُنُ خَالَتِي وَحْدَهَا فِي مَكْنَاسَ.",
      "english": "My aunt lives alone in Meknes.",
      "audioUrl": "/audio/lesson-02/reading/sentence-11.mp3"
    },
    {
      "id": "r2-s12",
      "arabic": "أَنَا أَدْرُسُ فِي الْمَسَاءِ.",
      "english": "I study in the evening.",
      "audioUrl": "/audio/lesson-02/reading/sentence-12.mp3"
    },
    {
      "id": "r2-s13",
      "arabic": "أَنَا أُحِبُّ أُسْرَتِي، وَأُحِبُّ التَّرْجَمَةَ أَيْضًا.",
      "english": "I love my family, and I also like translation.",
      "audioUrl": "/audio/lesson-02/reading/sentence-13.mp3"
    }
  ],
  "glossary": [
    {
      "word": "مَعَ",
      "meaning": "with"
    },
    {
      "word": "أُحِبُّ",
      "meaning": "I love / I like"
    }
  ]
};
