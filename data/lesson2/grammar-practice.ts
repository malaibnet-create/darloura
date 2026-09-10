export const lesson02GrammarPractice = {
  "cards": {
    "plural-pronouns": [
      {
        "id": "pp-1",
        "type": "multiple-choice",
        "prompt": "_____ نَتَكَلَّمُ الْعَرَبِيَّةَ.",
        "options": [
          "نَحْنُ",
          "هُمْ",
          "أَنْتُمْ"
        ],
        "answer": 0,
        "feedbackEn": "نَتَكَلَّمُ matches نَحْنُ."
      },
      {
        "id": "pp-2",
        "type": "multiple-choice",
        "prompt": "هُمْ _____ فِي الْمَرْكَزِ.",
        "options": [
          "يَعْمَلُ",
          "يَعْمَلُونَ",
          "نَعْمَلُ"
        ],
        "answer": 1,
        "feedbackEn": "هُمْ takes the plural verb يَعْمَلُونَ."
      },
      {
        "id": "pp-3",
        "type": "matching",
        "pairs": [
          [
            "نَحْنُ",
            "نَتَكَلَّمُ"
          ],
          [
            "أَنْتُمْ",
            "تَتَكَلَّمُونَ"
          ],
          [
            "هُمْ",
            "يَتَكَلَّمُونَ"
          ]
        ]
      },
      {
        "id": "pp-4",
        "type": "transform",
        "prompt": "هُوَ يَعْمَلُ فِي النَّهَارِ.",
        "answerText": "هُمْ يَعْمَلُونَ فِي النَّهَارِ."
      },
      {
        "id": "pp-5",
        "type": "ordering",
        "tokens": [
          "الْفُصْحَى",
          "نَحْنُ",
          "نَتَكَلَّمُ"
        ],
        "answer": [
          "نَحْنُ",
          "نَتَكَلَّمُ",
          "الْفُصْحَى"
        ]
      }
    ],
    "noun-plurals": [
      {
        "id": "np-1",
        "type": "classify",
        "items": [
          [
            "مُوَظَّفُونَ",
            "plural"
          ],
          [
            "كِتَابٌ",
            "singular"
          ],
          [
            "طُلَّابٌ",
            "plural"
          ],
          [
            "مَدِينَةٌ",
            "singular"
          ]
        ]
      },
      {
        "id": "np-2",
        "type": "matching",
        "pairs": [
          [
            "مُتَرْجِمٌ",
            "مُتَرْجِمُونَ"
          ],
          [
            "مُوَظَّفٌ",
            "مُوَظَّفُونَ"
          ],
          [
            "مُتَخَصِّصٌ",
            "مُتَخَصِّصُونَ"
          ],
          [
            "مَغْرِبِيٌّ",
            "مَغْرِبِيُّونَ"
          ],
          [
            "مَشْغُولٌ",
            "مَشْغُولُونَ"
          ]
        ]
      },
      {
        "id": "np-3",
        "type": "multiple-choice",
        "prompt": "جَمْعُ كِتَابٌ هُوَ:",
        "options": [
          "كِتَابُونَ",
          "كُتُبٌ",
          "كِتَابَاتٌ"
        ],
        "answer": 1,
        "feedbackEn": "كِتَابٌ has the broken plural كُتُبٌ."
      },
      {
        "id": "np-4",
        "type": "matching",
        "pairs": [
          [
            "بَابٌ",
            "أَبْوَابٌ"
          ],
          [
            "خَالٌ",
            "أَخْوَالٌ"
          ],
          [
            "طَالِبٌ",
            "طُلَّابٌ"
          ],
          [
            "رَجُلٌ",
            "رِجَالٌ"
          ],
          [
            "جَارٌ",
            "جِيرَانٌ"
          ],
          [
            "شَخْصٌ",
            "أَشْخَاصٌ"
          ]
        ]
      },
      {
        "id": "np-5",
        "type": "audio-choice",
        "promptEn": "Listen to the singular and choose its plural.",
        "source": [
          "g2-bp-kitab-singular",
          "g2-bp-madina-singular",
          "g2-bp-bab-singular",
          "g2-bp-khal-singular",
          "g2-bp-talib-singular",
          "g2-bp-rajul-singular",
          "g2-bp-jar-singular",
          "g2-bp-shakhs-singular"
        ]
      }
    ],
    "plural-agreement": [
      {
        "id": "pa-1",
        "type": "classify",
        "items": [
          [
            "مُوَظَّفُونَ",
            "human"
          ],
          [
            "كُتُبٌ",
            "nonhuman"
          ],
          [
            "طُلَّابٌ",
            "human"
          ],
          [
            "مُدُنٌ",
            "nonhuman"
          ]
        ]
      },
      {
        "id": "pa-2",
        "type": "multiple-choice",
        "prompt": "الْمُتَرْجِمُونَ _____.",
        "options": [
          "مَشْغُولُونَ",
          "مَشْغُولَةٌ"
        ],
        "answer": 0,
        "feedbackEn": "A masculine human plural takes a masculine plural adjective."
      },
      {
        "id": "pa-3",
        "type": "multiple-choice",
        "prompt": "الْكُتُبُ _____.",
        "options": [
          "جَدِيدُونَ",
          "جَدِيدَةٌ"
        ],
        "answer": 1,
        "feedbackEn": "A nonhuman plural normally takes a feminine singular adjective."
      },
      {
        "id": "pa-4",
        "type": "true-false-correct",
        "prompt": "الْمُدُنُ جَمِيلُونَ.",
        "answer": false,
        "correction": "الْمُدُنُ جَمِيلَةٌ."
      },
      {
        "id": "pa-5",
        "type": "fill-choice",
        "items": [
          [
            "الطُّلَّابُ _____.",
            "جَدِيدُونَ"
          ],
          [
            "الْأَبْوَابُ _____.",
            "كَبِيرَةٌ"
          ]
        ]
      }
    ]
  },
  "scoring": {
    "passingScore": 70,
    "discoveryUngraded": true,
    "audioReplayPenalty": false
  }
} as const;
