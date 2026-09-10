export const lesson02Writing = {
  "id": "lesson-02-writing",
  "lessonId": "lesson-02",
  "section": "writing",
  "level": "A1",
  "estimatedMinutes": 14,
  "passingScore": 80,
  "title": {
    "ar": "بِطَاقَتِي فِي مَرْكَزِ اللُّغَةِ",
    "en": "My Language Center Profile"
  },
  "finalProduct": {
    "type": "structured-profile",
    "sentenceTarget": 5,
    "minimumSentences": 4
  },
  "objectives": [
    "write your name and country in Arabic",
    "write which language or languages you speak",
    "write where you study",
    "write lesson time with مِنْ … إِلَى …",
    "check a short Arabic profile before submitting it"
  ],
  "rules": {
    "diacriticsRequired": false,
    "freePersonalAnswers": true,
    "maxFeedbackItems": 3,
    "exactModelMatch": false
  },
  "model": {
    "fullAudioId": "w2-model-full",
    "sentences": [
      {
        "id": "w2-model-01",
        "file": "model-01.mp3",
        "text": "اِسْمِي آدَمُ.",
        "translation": "My name is Adam.",
        "audioId": "w2-model-01"
      },
      {
        "id": "w2-model-02",
        "file": "model-02.mp3",
        "text": "أَنَا مِنْ كَنَدَا.",
        "translation": "I am from Canada.",
        "audioId": "w2-model-02"
      },
      {
        "id": "w2-model-03",
        "file": "model-03.mp3",
        "text": "أَتَكَلَّمُ الْإِنْجِلِيزِيَّةَ، وَأَتَكَلَّمُ الْعَرَبِيَّةَ قَلِيلًا.",
        "translation": "I speak English, and I speak a little Arabic.",
        "audioId": "w2-model-03"
      },
      {
        "id": "w2-model-04",
        "file": "model-04.mp3",
        "text": "أَدْرُسُ الْفُصْحَى فِي مَرْكَزِ دَارِ اللُّغَةِ فِي مَكْنَاسَ.",
        "translation": "I study Modern Standard Arabic at Dar Al-Lugha Center in Meknes.",
        "audioId": "w2-model-04"
      },
      {
        "id": "w2-model-05",
        "file": "model-05.mp3",
        "text": "دَرْسِي الْيَوْمَ مِنَ الْخَامِسَةِ إِلَى السَّادِسَةِ مَسَاءً.",
        "translation": "My lesson today is from five to six in the evening.",
        "audioId": "w2-model-05"
      }
    ]
  },
  "discovery": [
    {
      "question": "مَا اسْمُكَ؟",
      "answer": "اِسْمِي آدَمُ."
    },
    {
      "question": "مِنْ أَيْنَ أَنْتَ؟",
      "answer": "أَنَا مِنْ كَنَدَا."
    },
    {
      "question": "مَا اللُّغَاتُ الَّتِي تَتَكَلَّمُهَا؟",
      "answer": "أَتَكَلَّمُ الْإِنْجِلِيزِيَّةَ وَالْعَرَبِيَّةَ."
    },
    {
      "question": "مَاذَا تَدْرُسُ؟",
      "answer": "أَدْرُسُ الْفُصْحَى."
    },
    {
      "question": "مَتَى دَرْسُكَ؟",
      "answer": "دَرْسِي مِنَ الْخَامِسَةِ إِلَى السَّادِسَةِ."
    }
  ],
  "guidedFields": [
    {
      "id": "name",
      "label": {
        "ar": "اِسْمِي",
        "en": "My name is"
      },
      "required": true,
      "input": "text",
      "placeholder": "آدَمُ"
    },
    {
      "id": "country",
      "label": {
        "ar": "أَنَا مِنْ",
        "en": "I am from"
      },
      "required": true,
      "input": "combobox-with-custom",
      "suggestions": [
        "الْمَغْرِبِ",
        "كَنَدَا",
        "فَرَنْسَا",
        "أَمْرِيكَا",
        "إِسْبَانْيَا"
      ]
    },
    {
      "id": "languages",
      "label": {
        "ar": "أَتَكَلَّمُ",
        "en": "I speak"
      },
      "required": true,
      "input": "multi-select-with-custom",
      "suggestions": [
        "الْعَرَبِيَّةَ",
        "الْإِنْجِلِيزِيَّةَ",
        "الْفَرَنْسِيَّةَ",
        "الْإِسْبَانِيَّةَ"
      ]
    },
    {
      "id": "studySubject",
      "label": {
        "ar": "أَدْرُسُ",
        "en": "I study"
      },
      "required": true,
      "input": "text-or-select",
      "suggestions": [
        "الْفُصْحَى",
        "الْعَرَبِيَّةَ"
      ]
    },
    {
      "id": "studyPlace",
      "label": {
        "ar": "فِي",
        "en": "at"
      },
      "required": true,
      "input": "text-or-select",
      "suggestions": [
        "مَرْكَزِ دَارِ اللُّغَةِ",
        "مَرْكَزِ لُغَاتٍ"
      ]
    },
    {
      "id": "day",
      "label": {
        "ar": "دَرْسِي",
        "en": "My lesson"
      },
      "required": false,
      "input": "select",
      "suggestions": [
        "الْيَوْمَ",
        "غَدًا"
      ]
    },
    {
      "id": "startTime",
      "label": {
        "ar": "مِنَ",
        "en": "from"
      },
      "required": true,
      "input": "select",
      "suggestions": [
        "الْخَامِسَةِ",
        "السَّادِسَةِ",
        "السَّابِعَةِ"
      ]
    },
    {
      "id": "endTime",
      "label": {
        "ar": "إِلَى",
        "en": "to"
      },
      "required": true,
      "input": "select",
      "suggestions": [
        "السَّادِسَةِ",
        "السَّابِعَةِ",
        "الثَّامِنَةِ"
      ]
    }
  ],
  "punctuationTips": [
    {
      "id": "spaces",
      "en": "Put a space between separate words.",
      "good": "أَنَا مِنْ كَنَدَا.",
      "bad": "أَنَامِنْكَنَدَا."
    },
    {
      "id": "period",
      "en": "End a statement with a period.",
      "good": "أَدْرُسُ الْفُصْحَى."
    },
    {
      "id": "wa",
      "en": "The letter وَ means “and” and joins directly to the following word.",
      "good": "الْإِنْجِلِيزِيَّةَ وَالْفَرَنْسِيَّةَ",
      "audioId": "w2-pattern-languages"
    },
    {
      "id": "range",
      "en": "Use مِنْ … إِلَى … for “from … to …”.",
      "good": "مِنَ الْخَامِسَةِ إِلَى السَّادِسَةِ",
      "audioId": "w2-pattern-time"
    }
  ],
  "selfCheck": [
    "I wrote my name.",
    "I wrote my country.",
    "I wrote at least one language.",
    "I wrote what and where I study.",
    "I used مِنْ … إِلَى … for the lesson time.",
    "I used spaces and periods."
  ]
} as const;
