export const lesson02WritingPractice = {
  "lessonId": "lesson-02-writing",
  "passingScore": 80,
  "ordering": [
    {
      "id": "o1",
      "tokens": [
        "آدَمُ",
        "اِسْمِي"
      ],
      "answer": [
        "اِسْمِي",
        "آدَمُ"
      ],
      "feedbackEn": "Start with اِسْمِي."
    },
    {
      "id": "o2",
      "tokens": [
        "مِنْ",
        "أَنَا",
        "كَنَدَا"
      ],
      "answer": [
        "أَنَا",
        "مِنْ",
        "كَنَدَا"
      ],
      "feedbackEn": "Use أَنَا مِنْ before the country."
    },
    {
      "id": "o3",
      "tokens": [
        "الْفُصْحَى",
        "أَدْرُسُ",
        "أَنَا"
      ],
      "answer": [
        "أَنَا",
        "أَدْرُسُ",
        "الْفُصْحَى"
      ],
      "feedbackEn": "Put the subject before the verb in this model sentence."
    },
    {
      "id": "o4",
      "tokens": [
        "إِلَى",
        "الدَّرْسُ",
        "السَّادِسَةِ",
        "مِنَ",
        "الْخَامِسَةِ"
      ],
      "answer": [
        "الدَّرْسُ",
        "مِنَ",
        "الْخَامِسَةِ",
        "إِلَى",
        "السَّادِسَةِ"
      ],
      "feedbackEn": "Use مِنَ before the start and إِلَى before the end."
    }
  ],
  "editing": [
    {
      "id": "e1",
      "options": [
        "أَنَا مِنَ الْمَغْرِبِ.",
        "أَنَامِنَالْمَغْرِبِ."
      ],
      "correctIndex": 0,
      "feedbackEn": "Arabic words need spaces."
    },
    {
      "id": "e2",
      "options": [
        "أَتَكَلَّمُ الْإِنْجِلِيزِيَّةَ وَالْفَرَنْسِيَّةَ.",
        "أَتَكَلَّمُ الْإِنْجِلِيزِيَّةَ الْفَرَنْسِيَّةَ."
      ],
      "correctIndex": 0,
      "feedbackEn": "Use وَ between the two languages."
    },
    {
      "id": "e3",
      "options": [
        "دَرْسِي مِنَ الْخَامِسَةِ إِلَى السَّادِسَةِ.",
        "دَرْسِي الْخَامِسَةِ السَّادِسَةِ."
      ],
      "correctIndex": 0,
      "feedbackEn": "Use مِنْ … إِلَى … for a time range."
    }
  ],
  "rubric": [
    {
      "id": "name",
      "points": 1,
      "labelEn": "Name sentence is understandable"
    },
    {
      "id": "country",
      "points": 1,
      "labelEn": "Country sentence is understandable"
    },
    {
      "id": "languages",
      "points": 1,
      "labelEn": "Language sentence is understandable"
    },
    {
      "id": "study",
      "points": 1,
      "labelEn": "Study sentence is understandable"
    },
    {
      "id": "time",
      "points": 1,
      "labelEn": "Time sentence uses from … to …"
    }
  ],
  "completion": {
    "minimumRubricPoints": 4,
    "totalRubricPoints": 5,
    "requireOrdering": true,
    "requireSelfCheck": true,
    "requireSubmission": true
  }
} as const;
