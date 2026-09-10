export type ListeningSpeakerId = 'huda' | 'omar';

export const lesson02Listening = {
  "id": "lesson-02-listening",
  "lessonId": "lesson-02",
  "section": "listening",
  "level": "A1",
  "estimatedMinutes": 15,
  "title": {
    "ar": "فِي مَرْكَزِ التَّرْجَمَةِ",
    "en": "At the Translation Center"
  },
  "setting": {
    "city": "Meknes",
    "country": "Morocco"
  },
  "predictionImage": "images/listening-prediction-translation-center.png",
  "speakers": {
    "huda": {
      "ar": "هُدَى",
      "en": "Huda",
      "role": "center employee",
      "voice": "Razan – Academic & Cultural Narration"
    },
    "omar": {
      "ar": "عُمَر",
      "en": "Omar",
      "role": "visitor",
      "voice": "Rachid - Bold and Magnetic"
    }
  },
  "objectives": [
    "understand the main idea of a short workplace conversation",
    "identify a person’s job, specialization, languages, and schedule",
    "understand the time words الْيَوْمَ and غَدًا"
  ],
  "fullAudio": "audio/dialogue-full.mp3",
  "learningAudio": "audio/dialogue-learning-pauses.mp3",
  "dialogue": [
    {
      "id": "l2-line-01",
      "order": 1,
      "speaker": "omar",
      "ar": "السَّلَامُ عَلَيْكُمْ.",
      "en": "Peace be upon you.",
      "audio": "audio/line-01-omar.mp3"
    },
    {
      "id": "l2-line-02",
      "order": 2,
      "speaker": "huda",
      "ar": "وَعَلَيْكُمُ السَّلَامُ. أَهْلًا وَسَهْلًا.",
      "en": "And peace be upon you. Welcome.",
      "audio": "audio/line-02-huda.mp3"
    },
    {
      "id": "l2-line-03",
      "order": 3,
      "speaker": "omar",
      "ar": "هَلْ تَعْمَلُ الْأُسْتَاذَةُ مَرْيَمُ هُنَا؟",
      "en": "Does Ms. Maryam work here?",
      "audio": "audio/line-03-omar.mp3"
    },
    {
      "id": "l2-line-04",
      "order": 4,
      "speaker": "huda",
      "ar": "نَعَمْ، هِيَ مُتَرْجِمَةٌ فِي هٰذَا الْمَرْكَزِ.",
      "en": "Yes, she is a translator at this center.",
      "audio": "audio/line-04-huda.mp3"
    },
    {
      "id": "l2-line-05",
      "order": 5,
      "speaker": "omar",
      "ar": "هَلْ هِيَ مُتَخَصِّصَةٌ فِي التَّرْجَمَةِ مِنَ الْعَرَبِيَّةِ إِلَى الْإِنْجِلِيزِيَّةِ؟",
      "en": "Does she specialize in translation from Arabic into English?",
      "audio": "audio/line-05-omar.mp3"
    },
    {
      "id": "l2-line-06",
      "order": 6,
      "speaker": "huda",
      "ar": "نَعَمْ، وَهِيَ تَتَكَلَّمُ الْإِنْجِلِيزِيَّةَ وَالْعَرَبِيَّةَ الْفُصْحَى أَيْضًا.",
      "en": "Yes, and she also speaks English and Modern Standard Arabic.",
      "audio": "audio/line-06-huda.mp3"
    },
    {
      "id": "l2-line-07",
      "order": 7,
      "speaker": "omar",
      "ar": "هَلْ هِيَ مَشْغُولَةٌ الْيَوْمَ؟",
      "en": "Is she busy today?",
      "audio": "audio/line-07-omar.mp3"
    },
    {
      "id": "l2-line-08",
      "order": 8,
      "speaker": "huda",
      "ar": "نَعَمْ، هِيَ مَشْغُولَةٌ بِالْعَمَلِ فِي النَّهَارِ.",
      "en": "Yes, she is busy with work during the day.",
      "audio": "audio/line-08-huda.mp3"
    },
    {
      "id": "l2-line-09",
      "order": 9,
      "speaker": "omar",
      "ar": "مَتَى أَتَكَلَّمُ مَعَهَا؟",
      "en": "When can I speak with her?",
      "audio": "audio/line-09-omar.mp3"
    },
    {
      "id": "l2-line-10",
      "order": 10,
      "speaker": "huda",
      "ar": "تَعَالَ غَدًا فِي الْمَسَاءِ.",
      "en": "Come tomorrow evening.",
      "audio": "audio/line-10-huda.mp3"
    },
    {
      "id": "l2-line-11",
      "order": 11,
      "speaker": "omar",
      "ar": "حَسَنًا، شُكْرًا.",
      "en": "Okay, thank you.",
      "audio": "audio/line-11-omar.mp3"
    },
    {
      "id": "l2-line-12",
      "order": 12,
      "speaker": "huda",
      "ar": "عَفْوًا.",
      "en": "You’re welcome.",
      "audio": "audio/line-12-huda.mp3"
    }
  ],
  "stages": [
    "prediction",
    "gist",
    "details",
    "speaker-identification",
    "event-order",
    "listen-and-read",
    "shadowing",
    "result"
  ],
  "passingScore": 70,
  "display": {
    "direction": "rtl",
    "englishDirection": "ltr",
    "transcriptInitiallyHidden": true,
    "translationsInitiallyHidden": true
  }
} as const;
