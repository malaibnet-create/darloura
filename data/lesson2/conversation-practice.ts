export const lesson02ConversationPractice = {
  "lessonId": "lesson-02-conversation",
  "passingScore": 80,
  "comprehension": [
    {
      "id": "c1",
      "prompt": "أَيْنَ مَرْيَمُ وَآدَمُ وَسَارَةُ؟",
      "options": [
        "فِي مَرْكَزِ دَارِ اللُّغَةِ.",
        "فِي الْبَيْتِ.",
        "فِي الْعَمَلِ."
      ],
      "correctIndex": 0,
      "evidenceAudioId": "c2-dialogue-01",
      "feedbackEn": "They are at Dar Al-Lugha Center."
    },
    {
      "id": "c2",
      "prompt": "مَاذَا يَدْرُسُ آدَمُ وَسَارَةُ؟",
      "options": [
        "الْفُصْحَى.",
        "الْفَرَنْسِيَّةَ.",
        "التَّارِيخَ."
      ],
      "correctIndex": 0,
      "evidenceAudioId": "c2-dialogue-09",
      "feedbackEn": "They study Modern Standard Arabic at the center."
    },
    {
      "id": "c3",
      "prompt": "مَا عَمَلُ مَرْيَمَ؟",
      "options": [
        "مُوَظَّفَةٌ وَمُتَرْجِمَةٌ.",
        "طَالِبَةٌ.",
        "طَبِيبَةٌ."
      ],
      "correctIndex": 0,
      "evidenceAudioId": "c2-dialogue-11",
      "feedbackEn": "Maryam is an employee and a translator."
    },
    {
      "id": "c4",
      "prompt": "مَتَى دَرْسُ الْيَوْمِ؟",
      "options": [
        "مِنَ الْخَامِسَةِ إِلَى السَّادِسَةِ مَسَاءً.",
        "فِي الصَّبَاحِ.",
        "فِي اللَّيْلِ."
      ],
      "correctIndex": 0,
      "evidenceAudioId": "c2-dialogue-13",
      "feedbackEn": "The lesson is from five to six in the evening."
    },
    {
      "id": "c5",
      "prompt": "هَلْ عِنْدَهُمْ دَرْسٌ غَدًا؟",
      "options": [
        "نَعَمْ.",
        "لَا."
      ],
      "correctIndex": 0,
      "evidenceAudioId": "c2-dialogue-15",
      "feedbackEn": "Yes, they also have a lesson tomorrow."
    }
  ],
  "buildDialogue": [
    {
      "id": "b1",
      "prompt": "مَرْيَمُ: هَلْ أَنْتُمْ طُلَّابٌ جُدُدٌ؟",
      "options": [
        "نَعَمْ، نَحْنُ طُلَّابٌ جُدُدٌ.",
        "أَنَا مُتَرْجِمَةٌ.",
        "الدَّرْسُ مَسَاءً."
      ],
      "correctIndex": 0,
      "feedbackEn": "The question asks the group whether they are new students."
    },
    {
      "id": "b2",
      "prompt": "مَرْيَمُ: مَا اللُّغَاتُ الَّتِي تَتَكَلَّمُونَهَا؟",
      "options": [
        "نَتَكَلَّمُ الْإِنْجِلِيزِيَّةَ وَالْفَرَنْسِيَّةَ.",
        "نَحْنُ طُلَّابٌ جُدُدٌ.",
        "عِنْدَنَا دَرْسٌ غَدًا."
      ],
      "correctIndex": 0,
      "feedbackEn": "Answer with the languages you speak."
    },
    {
      "id": "b3",
      "prompt": "آدَمُ: مَتَى الدَّرْسُ؟",
      "options": [
        "مِنَ الْخَامِسَةِ إِلَى السَّادِسَةِ.",
        "فِي مَرْكَزِ دَارِ اللُّغَةِ.",
        "أَنَا مُوَظَّفَةٌ."
      ],
      "correctIndex": 0,
      "feedbackEn": "مَتَى asks about time."
    }
  ],
  "ordering": {
    "id": "order-1",
    "tokens": [
      "تَتَكَلَّمُونَهَا",
      "مَا",
      "اللُّغَاتُ",
      "الَّتِي"
    ],
    "answer": [
      "مَا",
      "اللُّغَاتُ",
      "الَّتِي",
      "تَتَكَلَّمُونَهَا"
    ],
    "feedbackEn": "Start with the question word مَا."
  },
  "roleplay": {
    "student": [
      "greet",
      "say you are a new student",
      "name one language",
      "ask lesson time",
      "ask about tomorrow"
    ],
    "employee": [
      "welcome students",
      "ask whether they are new",
      "ask about languages",
      "give lesson time",
      "answer about tomorrow"
    ],
    "hints": [
      "قُلْ: نَحْنُ طُلَّابٌ جُدُدٌ.",
      "اِسْأَلْ: مَتَى الدَّرْسُ؟",
      "اِسْأَلْ عَنْ غَدٍ."
    ]
  },
  "completion": {
    "minimumComprehensionCorrect": 4,
    "requireBuildDialogue": true,
    "requireRoleplayOrAI": true,
    "requireReportViewed": true
  }
} as const;
