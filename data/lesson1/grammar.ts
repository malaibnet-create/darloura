export type GrammarAudio = { id: string; path: string; label: string };
export type GrammarQuestion = { prompt: string; choices: string[]; answer: string; explanation: string };
export type GrammarExample = { text: string; audioId?: string; english?: string };

const base = '/audio/lesson-01/grammar/';
const makeFiles = (prefix: string, folder: string, names: string[]) => Object.fromEntries(names.map((name, i) => [`${prefix}-${String(i + 1).padStart(2,'0')}`, `${folder}/${prefix}-${String(i + 1).padStart(2,'0')}-${name}.mp3`]));
const files: Record<string, string> = {
  ...makeFiles('g1', 'grammar-01', ['talib','taliba','mudarris','mudarrisa','jadid','jadida','maghribi','maghribiyya','hadha-talib','hadhihi-taliba','huwa-mudarris','hiya-mudarrisa','huwa-talib-jadid','hiya-taliba-jadida','ana-min-almaghrib','ana-maghribi','ana-maghribiyya','huwa-amriki','hiya-amrikiyya','huwa-faransi','hiya-faransiyya','hal-anta-talib','naam-ana-talib','hal-anti-taliba','naam-ana-taliba','ma-ismuka','ismi-yusuf','man-hadha','hadha-yusuf','ayna-albayt','albayt-huna','min-ayna-anta','kayfa-haluka','ana-bikhayr-shukran']),
  ...makeFiles('g2', 'grammar-02', ['kitab-alkitab','bayt-albayt','talib-attalib','mudarris-almudarris','madrasa-almadrasa','maghrib-almaghrib','bayt-jadid','albayt-aljadid','talib-jadid','attalib-aljadid','taliba-jadida','attaliba-aljadida','mudarris-maghribi','almudarris-almaghribi','pronunciation-contrast']),
};
export const grammarAudio: GrammarAudio[] = Object.entries(files).map(([id, path]) => ({ id, path: base + path, label: id }));
export const audio = (id: string) => grammarAudio.find(item => item.id === id)?.path;

export const grammarRules = [
  { id:'grammar-01', title:'التذكير والتأنيث، النسبة، والسؤال', english:'Masculine, Feminine, Nisba, and Questions', duration:'12–15 دقيقة', description:'تعلّم الفرق بين المذكر والمؤنث، وكيف تقول من أين أنت وتسأل أسئلة بسيطة.' },
  { id:'grammar-02', title:'أداة التعريف «الـ»', english:'The Arabic Definite Article الـ', duration:'8–10 دقائق', description:'تعلّم كيف نحول الاسم من نكرة إلى معرفة، وكيف نطابق الاسم والصفة.' },
] as const;

export const grammarContent = {
  one: {
    objectives: ['recognize simple masculine and feminine words;', 'say where a person is from using a Nisba adjective;', 'ask and answer simple questions in Arabic.'],
    sections: [
      { title:'المذكّر والمؤنّث · Masculine and Feminine', explanation:'Arabic nouns and adjectives can be masculine or feminine. A masculine word usually has no special ending. Many feminine words end with ة. This letter is called tāʾ marbūṭa. Look for ة at the end of the word. It often tells you that the word is feminine.', table:[['Masculine','Feminine'],['طَالِبٌ','طَالِبَةٌ'],['مُدَرِّسٌ','مُدَرِّسَةٌ'],['جَدِيدٌ','جَدِيدَةٌ'],['مَغْرِبِيٌّ','مَغْرِبِيَّةٌ']], examples:[['هٰذَا طَالِبٌ.','g1-09'],['هٰذِهِ طَالِبَةٌ.','g1-10'],['هُوَ مُدَرِّسٌ.','g1-11'],['هِيَ مُدَرِّسَةٌ.','g1-12'],['هُوَ طَالِبٌ جَدِيدٌ.','g1-13'],['هِيَ طَالِبَةٌ جَدِيدَةٌ.','g1-14']], tip:'The adjective changes with the person or noun: جَدِيدٌ is masculine. جَدِيدَةٌ is feminine. Beginner tip: Many feminine words end with ة, but not every feminine word follows this pattern.'},
      { title:'النسبة · Nisba: Saying Where You Are From', explanation:'A Nisba adjective tells us that a person or thing is connected to a country, city, or place. In this lesson, use the Nisba adjective to say where a person is from. The masculine form often ends with ـِيٌّ. The feminine form often ends with ـِيَّةٌ.', table:[['Place','Masculine','Feminine'],['الْمَغْرِبُ','مَغْرِبِيٌّ','مَغْرِبِيَّةٌ'],['أَمْرِيكَا','أَمْرِيكِيٌّ','أَمْرِيكِيَّةٌ'],['فَرَنْسَا','فَرَنْسِيٌّ','فَرَنْسِيَّةٌ']], examples:[['أَنَا مِنَ الْمَغْرِبِ.','g1-15'],['أَنَا مَغْرِبِيٌّ.','g1-16'],['أَنَا مَغْرِبِيَّةٌ.','g1-17'],['هُوَ أَمْرِيكِيٌّ.','g1-18'],['هِيَ أَمْرِيكِيَّةٌ.','g1-19'],['هُوَ فَرَنْسِيٌّ.','g1-20'],['هِيَ فَرَنْسِيَّةٌ.','g1-21']], tip:'Use the masculine form when speaking about a male. Use the feminine form when speaking about a female.'},
      { title:'السؤال في اللغة العربية · Asking Simple Questions', explanation:'Arabic uses question words to ask for information. Arabic also uses هَلْ to ask a question with a “yes” or “no” answer. Arabic questions end with this question mark: ؟', table:[['Question word','Meaning','Example'],['هَلْ','Do / Is / Are','هَلْ أَنْتَ طَالِبٌ؟'],['مَا','What','مَا اسْمُكَ؟'],['مَنْ','Who','مَنْ هٰذَا؟'],['أَيْنَ','Where','أَيْنَ الْبَيْتُ؟'],['مِنْ أَيْنَ','From where','مِنْ أَيْنَ أَنْتَ؟'],['كَيْفَ','How','كَيْفَ حَالُكَ؟']], examples:[['هَلْ أَنْتَ طَالِبٌ؟','g1-22'],['نَعَمْ، أَنَا طَالِبٌ.','g1-23'],['هَلْ أَنْتِ طَالِبَةٌ؟','g1-24'],['نَعَمْ، أَنَا طَالِبَةٌ.','g1-25'],['مَا اسْمُكَ؟','g1-26'],['اسْمِي يُوسُفُ.','g1-27'],['مَنْ هٰذَا؟','g1-28'],['هٰذَا يُوسُفُ.','g1-29'],['أَيْنَ الْبَيْتُ؟','g1-30'],['الْبَيْتُ هُنَا.','g1-31'],['مِنْ أَيْنَ أَنْتَ؟','g1-32'],['كَيْفَ حَالُكَ؟','g1-33'],['أَنَا بِخَيْرٍ، شُكْرًا.','g1-34']], tip:'أَنْتَ is used when speaking to a male. أَنْتِ is used when speaking to a female.'},
    ],
  },
  two: {
    objectives: ['recognize the Arabic definite article الـ;', 'change a simple indefinite noun into a definite noun;', 'use الـ with a noun and its adjective.'],
    sections: [
      { title:'ما معنى «الـ»؟ · What Does الـ Mean?', explanation:'Arabic uses الـ before a noun to make it definite. It is similar to “the” in English. Without الـ, the noun usually refers to a general or unspecified person or thing. With الـ, it refers to a specific person or thing.', table:[['Without الـ','With الـ'],['كِتَابٌ','الْكِتَابُ'],['بَيْتٌ','الْبَيْتُ'],['طَالِبٌ','الطَّالِبُ'],['مُدَرِّسٌ','الْمُدَرِّسُ'],['مَدْرَسَةٌ','الْمَدْرَسَةُ'],['مَغْرِبٌ','الْمَغْرِبُ']], examples:[['كِتَابٌ / الْكِتَابُ','g2-01'],['بَيْتٌ / الْبَيْتُ','g2-02'],['طَالِبٌ / الطَّالِبُ','g2-03'],['مُدَرِّسٌ / الْمُدَرِّسُ','g2-04'],['مَدْرَسَةٌ / الْمَدْرَسَةُ','g2-05'],['مَغْرِبٌ / الْمَغْرِبُ','g2-06']], tip:'كِتَابٌ means “a book”. الْكِتَابُ means “the book”.'},
      { title:'كيف نضيف «الـ»؟ · How to Add الـ', explanation:'Add الـ directly to the beginning of the noun. Do not put a space between الـ and the noun. When الـ is added, the final ـٌ sound usually changes. At this beginner stage, focus on recognizing and using الـ.', table:[['التحويل','النتيجة'],['الـ + كِتَابٌ','الْكِتَابُ'],['الـ + بَيْتٌ','الْبَيْتُ'],['الـ + مَدْرَسَةٌ','الْمَدْرَسَةُ'],['الـ + مُدَرِّسٌ','الْمُدَرِّسُ']], examples:[]},
      { title:'الاسم والصفة · The Noun and Its Adjective', explanation:'When a definite noun has an adjective, add الـ to both the noun and the adjective.', table:[['Indefinite','Definite'],['بَيْتٌ جَدِيدٌ','الْبَيْتُ الْجَدِيدُ'],['طَالِبٌ جَدِيدٌ','الطَّالِبُ الْجَدِيدُ'],['طَالِبَةٌ جَدِيدَةٌ','الطَّالِبَةُ الْجَدِيدَةُ'],['مُدَرِّسٌ مَغْرِبِيٌّ','الْمُدَرِّسُ الْمَغْرِبِيُّ']], examples:[['بَيْتٌ جَدِيدٌ','g2-07'],['الْبَيْتُ الْجَدِيدُ','g2-08'],['طَالِبٌ جَدِيدٌ','g2-09'],['الطَّالِبُ الْجَدِيدُ','g2-10'],['طَالِبَةٌ جَدِيدَةٌ','g2-11'],['الطَّالِبَةُ الْجَدِيدَةُ','g2-12'],['مُدَرِّسٌ مَغْرِبِيٌّ','g2-13'],['الْمُدَرِّسُ الْمَغْرِبِيُّ','g2-14']], tip:'Definite noun + definite adjective: الْبَيْتُ + الْجَدِيدُ = الْبَيْتُ الْجَدِيدُ.'},
      { title:'ملاحظة بسيطة عن النطق · A Simple Pronunciation Note', explanation:'الـ is always written in the same way, but its pronunciation may change with some letters. Listen to the examples. You do not need to memorize the full rule now.', table:[], examples:[['الْبَيْتُ','g2-15'],['الطَّالِبُ','g2-15']], tip:'استمع إلى المثالين ولا تحاول حفظ جميع الحروف الشمسية والقمرية الآن.'},
    ],
  },
} as const;

export const ruleOneQuestions: GrammarQuestion[] = [
  {prompt:'هِيَ ________.',choices:['مُدَرِّسٌ','مُدَرِّسَةٌ'],answer:'مُدَرِّسَةٌ',explanation:'هِيَ refers to a female, so we use the feminine word مُدَرِّسَةٌ.'},
  {prompt:'حوّل: طَالِبٌ إلى المؤنث.',choices:['طَالِبٌ','طَالِبَةٌ'],answer:'طَالِبَةٌ',explanation:'Many feminine forms end with ة.'},
  {prompt:'حوّل: مُدَرِّسٌ إلى المؤنث.',choices:['مُدَرِّسٌ','مُدَرِّسَةٌ'],answer:'مُدَرِّسَةٌ',explanation:'The feminine form is مُدَرِّسَةٌ.'},
  {prompt:'حوّل: جَدِيدٌ إلى المؤنث.',choices:['جَدِيدَةٌ','جَدِيدٌ'],answer:'جَدِيدَةٌ',explanation:'The adjective changes with the feminine noun.'},
  {prompt:'حوّل: مَغْرِبِيٌّ إلى المؤنث.',choices:['مَغْرِبِيٌّ','مَغْرِبِيَّةٌ'],answer:'مَغْرِبِيَّةٌ',explanation:'The feminine Nisba form ends with ـِيَّةٌ.'},
  {prompt:'هِيَ مِنَ الْمَغْرِبِ. هِيَ ________.',choices:['مَغْرِبِيٌّ','مَغْرِبِيَّةٌ'],answer:'مَغْرِبِيَّةٌ',explanation:'Use the feminine Nisba form for a female.'},
  {prompt:'________ اسْمُكَ؟',choices:['مَا','أَيْنَ','هَلْ'],answer:'مَا',explanation:'مَا means “what”.'},
  {prompt:'رتّب السؤال: أَنْتَ / مِنْ / أَيْنَ',choices:['مِنْ أَيْنَ أَنْتَ؟','أَيْنَ مِنْ أَنْتَ؟'],answer:'مِنْ أَيْنَ أَنْتَ؟',explanation:'This is the natural Arabic question order.'},
  {prompt:'أكمل: ________ اسْمُكَ؟ اسْمِي آدَمُ. مِنْ أَيْنَ ________؟ هَلْ أَنْتَ ________؟',choices:['مَا / أَنْتَ / مَغْرِبِيٌّ','هَلْ / هُوَ / مَغْرِبِيَّةٌ'],answer:'مَا / أَنْتَ / مَغْرِبِيٌّ',explanation:'The dialogue needs the question word, the male pronoun, and the masculine Nisba form.'},
];
export const ruleTwoQuestions: GrammarQuestion[] = [
  {prompt:'Which word means “the book”?',choices:['كِتَابٌ','الْكِتَابُ'],answer:'الْكِتَابُ',explanation:'الـ makes the noun definite.'},
  {prompt:'أضف الـ: كِتَابٌ',choices:['الْكِتَابُ','كِتَابٌ الْ'],answer:'الْكِتَابُ',explanation:'Add الـ directly to the beginning.'},
  {prompt:'أضف الـ: بَيْتٌ',choices:['الْبَيْتُ','بَيْتٌ الْ'],answer:'الْبَيْتُ',explanation:'Add الـ directly to the beginning.'},
  {prompt:'أضف الـ: مَدْرَسَةٌ',choices:['الْمَدْرَسَةُ','مَدْرَسَةٌ الْ'],answer:'الْمَدْرَسَةُ',explanation:'Add الـ directly to the beginning.'},
  {prompt:'أضف الـ: مُدَرِّسٌ',choices:['الْمُدَرِّسُ','مُدَرِّسٌ الْ'],answer:'الْمُدَرِّسُ',explanation:'Add الـ directly to the beginning.'},
  {prompt:'The new student',choices:['الطَّالِبُ جَدِيدٌ','الطَّالِبُ الْجَدِيدُ'],answer:'الطَّالِبُ الْجَدِيدُ',explanation:'A definite noun and its adjective both take الـ.'},
  {prompt:'طابق: بَيْتٌ',choices:['الْبَيْتُ','الْمَدْرَسَةُ'],answer:'الْبَيْتُ',explanation:'The definite pair is بَيْتٌ ↔ الْبَيْتُ.'},
  {prompt:'طابق: كِتَابٌ',choices:['الْكِتَابُ','الطَّالِبَةُ'],answer:'الْكِتَابُ',explanation:'The definite pair is كِتَابٌ ↔ الْكِتَابُ.'},
  {prompt:'طابق: طَالِبَةٌ',choices:['الطَّالِبَةُ','الْبَيْتُ'],answer:'الطَّالِبَةُ',explanation:'The definite pair is طَالِبَةٌ ↔ الطَّالِبَةُ.'},
  {prompt:'طابق: مَدْرَسَةٌ',choices:['الْمَدْرَسَةُ','الْكِتَابُ'],answer:'الْمَدْرَسَةُ',explanation:'The definite pair is مَدْرَسَةٌ ↔ الْمَدْرَسَةُ.'},
  {prompt:'حوّل: طَالِبَةٌ جَدِيدَةٌ',choices:['الطَّالِبَةُ الْجَدِيدَةُ','الطَّالِبَةُ جَدِيدَةٌ'],answer:'الطَّالِبَةُ الْجَدِيدَةُ',explanation:'Both the noun and adjective become definite.'},
  {prompt:'حوّل: بَيْتٌ جَدِيدٌ',choices:['الْبَيْتُ الْجَدِيدُ','الْبَيْتُ جَدِيدٌ'],answer:'الْبَيْتُ الْجَدِيدُ',explanation:'Both the noun and adjective take الـ.'},
  {prompt:'حوّل: طَالِبٌ مَغْرِبِيٌّ',choices:['الطَّالِبُ الْمَغْرِبِيُّ','الطَّالِبُ مَغْرِبِيٌّ'],answer:'الطَّالِبُ الْمَغْرِبِيُّ',explanation:'Both parts become definite.'},
];
