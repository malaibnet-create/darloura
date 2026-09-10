export type ExamTask = {
  id: number;
  section: 'المفردات' | 'القراءة' | 'الاستماع' | 'القواعد' | 'الكتابة' | 'المحادثة والنطق';
  prompt: string;
  choices?: string[];
  answer?: string;
  points: number;
  audioId?: string;
  kind?: 'choice' | 'order' | 'shortText' | 'longText' | 'record' | 'guided';
  placeholder?: string;
};

export const examAudio: Record<string, string> = {
  'exam-01':'/audio/lesson-01/exam/exam-audio/exam-01-listening-instruction.mp3',
  'exam-02':'/audio/lesson-01/exam/exam-audio/exam-02-listening-salma.mp3',
  'exam-03':'/audio/lesson-01/exam/exam-audio/exam-03-pronunciation-model.mp3',
  'exam-04':'/audio/lesson-01/exam/exam-audio/exam-04-ma-ismuka.mp3',
  'exam-05':'/audio/lesson-01/exam/exam-audio/exam-05-min-ayna-anta.mp3',
  'exam-06':'/audio/lesson-01/exam/exam-audio/exam-06-ayna-taskun.mp3',
  'exam-07':'/audio/lesson-01/exam/exam-audio/exam-07-kayfa-haluka.mp3',
};
export const audioText: Record<string, string> = {
  'exam-01':'اِسْتَمِعْ إِلَى النَّصِّ، ثُمَّ أَجِبْ عَنِ الْأَسْئِلَةِ.',
  'exam-02':'السَّلَامُ عَلَيْكُمْ. اسْمِي سَلْمَى. أَنَا مِنَ الْمَغْرِبِ، وَأَنَا مَغْرِبِيَّةٌ. أَسْكُنُ فِي مَكْنَاسَ. أَنَا طَالِبَةٌ جَدِيدَةٌ فِي دَارِ اللُّغَةِ. أَدْرُسُ اللُّغَةَ الْعَرَبِيَّةَ. وَالِدِي مُدَرِّسٌ، وَوَالِدَتِي تَعْمَلُ فِي الْأُمَمِ الْمُتَّحِدَةِ. أَنَا بِخَيْرٍ، شُكْرًا.',
};
const c = (id:number, section:ExamTask['section'], prompt:string, choices:string[], answer:string):ExamTask => ({id,section,prompt,choices,answer,points:1,kind:'choice'});
export const examTasks: ExamTask[] = [
 c(1,'المفردات','What does أَسْكُنُ mean?',['I study','I live','I work'],'I live'), c(2,'المفردات','أَنَا ______ اللُّغَةَ الْعَرَبِيَّةَ.',['أَدْرُسُ','أَسْكُنُ','يَعْمَلُ'],'أَدْرُسُ'), c(3,'المفردات','What does وَالِدَتِي mean?',['My father','My mother','My teacher'],'My mother'), c(4,'المفردات','Which word means “nationality”?',['جِنْسِيَّةٌ','عُنْوَانٌ','مِنْطَقَةٌ'],'جِنْسِيَّةٌ'), c(5,'المفردات','What does عُمْرٌ mean?',['Age','Year','Address'],'Age'), c(6,'المفردات','هُوَ ______ فِي مَكْنَاسَ.',['تَعْمَلُ','يَعْمَلُ','أَدْرُسُ'],'يَعْمَلُ'),
 {id:7,section:'القراءة',prompt:'مَا اسْمُهَا؟',choices:['سَلْمَى','يُوسُفُ','آدَمُ'],answer:'سَلْمَى',points:1,kind:'choice'}, {id:8,section:'القراءة',prompt:'أَيْنَ تَسْكُنُ سَلْمَى؟',choices:['فِي فَرَنْسَا','فِي مَكْنَاسَ','فِي أَمْرِيكَا'],answer:'فِي مَكْنَاسَ',points:1,kind:'choice'}, {id:9,section:'القراءة',prompt:'هَلْ سَلْمَى طَالِبَةٌ جَدِيدَةٌ؟',choices:['نَعَمْ','لَا'],answer:'نَعَمْ',points:1,kind:'choice'}, {id:10,section:'القراءة',prompt:'أَيْنَ تَعْمَلُ وَالِدَةُ سَلْمَى؟',choices:['فِي دَارِ اللُّغَةِ','فِي الْأُمَمِ الْمُتَّحِدَةِ','فِي الْبَيْتِ'],answer:'فِي الْأُمَمِ الْمُتَّحِدَةِ',points:1,kind:'choice'},
 {id:11,section:'الاستماع',prompt:'مِنْ أَيْنَ سَلْمَى؟',choices:['مِنَ الْمَغْرِبِ','مِنْ أَمْرِيكَا','مِنْ فَرَنْسَا'],answer:'مِنَ الْمَغْرِبِ',points:1,audioId:'exam-02',kind:'choice'}, {id:12,section:'الاستماع',prompt:'أَيْنَ تَسْكُنُ؟',choices:['فِي مَكْنَاسَ','فِي الرِّبَاطِ','فِي فَاسَ'],answer:'فِي مَكْنَاسَ',points:1,audioId:'exam-02',kind:'choice'}, {id:13,section:'الاستماع',prompt:'مَاذَا تَدْرُسُ؟',choices:['اللُّغَةَ الْعَرَبِيَّةَ','الْأَدَبَ الْفَرَنْسِيَّ','اللُّغَةَ الْإِنْجِلِيزِيَّةَ'],answer:'اللُّغَةَ الْعَرَبِيَّةَ',points:1,audioId:'exam-02',kind:'choice'}, {id:14,section:'الاستماع',prompt:'مَا عَمَلُ وَالِدِهَا؟',choices:['طَالِبٌ','مُدَرِّسٌ','طَبِيبٌ'],answer:'مُدَرِّسٌ',points:1,audioId:'exam-02',kind:'choice'},
 c(15,'القواعد','هِيَ ______.',['مُدَرِّسٌ','مُدَرِّسَةٌ'],'مُدَرِّسَةٌ'), c(16,'القواعد','هِيَ طَالِبَةٌ ______.',['جَدِيدٌ','جَدِيدَةٌ'],'جَدِيدَةٌ'), c(17,'القواعد','هِيَ مِنَ الْمَغْرِبِ. هِيَ ______.',['مَغْرِبِيٌّ','مَغْرِبِيَّةٌ'],'مَغْرِبِيَّةٌ'), c(18,'القواعد','______ اسْمُكَ؟',['مَا','أَيْنَ','هَلْ'],'مَا'), {id:19,section:'القواعد',prompt:'رتّب الكلمات: أَنْتَ / مِنْ / أَيْنَ',choices:['مِنْ أَيْنَ أَنْتَ؟','أَيْنَ مِنْ أَنْتَ؟'],answer:'مِنْ أَيْنَ أَنْتَ؟',points:1,kind:'order'}, c(20,'القواعد','Which word means “the book”?',['كِتَابٌ','الْكِتَابُ'],'الْكِتَابُ'), c(21,'القواعد','Which phrase means “the new student”?',['الطَّالِبُ جَدِيدٌ','الطَّالِبُ الْجَدِيدُ'],'الطَّالِبُ الْجَدِيدُ'),
 {id:22,section:'الكتابة',prompt:'أكمل: أَسْكُنُ فِي ______. أَنَا ______.',points:1,kind:'shortText',answer:'مَكْنَاسَ|مَغْرِبِيٌّ|مَغْرِبِيَّةٌ',placeholder:'مَكْنَاسَ، مَغْرِبِيٌّ'}, {id:23,section:'الكتابة',prompt:'Write three short Arabic sentences: your name, where you are from, and where you live.',points:3,kind:'longText',placeholder:'اسْمِي ...\nأَنَا مِنْ ...\nأَسْكُنُ فِي ...'},
 {id:24,section:'المحادثة والنطق',prompt:'استمع إلى النموذج ثم قل: أَنَا مِنَ الْمَغْرِبِ. أَسْكُنُ فِي مَكْنَاسَ.',points:2,audioId:'exam-03',kind:'record',placeholder:'إذا تعذر الميكروفون، اكتب الجملة هنا.'}, {id:25,section:'المحادثة والنطق',prompt:'أجب عن الأسئلة الثلاثة صوتيًا أو كتابيًا.',points:3,audioId:'exam-04',kind:'guided',placeholder:'اسْمِي ...\nأَنَا مِنْ ...\nأَسْكُنُ فِي ...'},
];
export const readingPassage = 'اسْمِي سَلْمَى. أَنَا مَغْرِبِيَّةٌ. أَسْكُنُ فِي مَكْنَاسَ. أَنَا طَالِبَةٌ جَدِيدَةٌ فِي دَارِ اللُّغَةِ. أَدْرُسُ اللُّغَةَ الْعَرَبِيَّةَ. وَالِدِي مُدَرِّسٌ، وَوَالِدَتِي تَعْمَلُ فِي الْأُمَمِ الْمُتَّحِدَةِ.';
export const sections = ['المفردات','القراءة','الاستماع','القواعد','الكتابة','المحادثة والنطق'] as const;
