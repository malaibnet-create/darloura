export const CURRICULUM_SECTIONS = Object.freeze([
  Object.freeze({ key: 'vocabulary', icon: '🧠', titleAr: 'المفردات', titleEn: 'Vocabulary', descriptionAr: 'تعلّم الكلمات الجديدة وتدرّب عليها' }),
  Object.freeze({ key: 'reading', icon: '📖', titleAr: 'القراءة', titleEn: 'Reading', descriptionAr: 'اقرأ نصًا مناسبًا لمستواك' }),
  Object.freeze({ key: 'listening', icon: '🎧', titleAr: 'الاستماع', titleEn: 'Listening', descriptionAr: 'افهم العربية كما تُنطق' }),
  Object.freeze({ key: 'grammar', icon: '◈', titleAr: 'القواعد', titleEn: 'Grammar', descriptionAr: 'ابنِ جملًا صحيحة وواضحة' }),
  Object.freeze({ key: 'conversation', icon: '💬', titleAr: 'المحادثة', titleEn: 'Speaking', descriptionAr: 'تدرّب على مواقف الحياة اليومية' }),
  Object.freeze({ key: 'phrases', icon: '🧩', titleAr: 'العبارات والتراكيب', titleEn: 'Phrases & Structures', descriptionAr: 'افهم العبارات الوظيفية واستعملها بدقة' }),
]);

const comingSoonTitles = Array.from({ length: 9 }, (_, index) => `الدرس ${index + 2} · قريبًا`);

export const CURRICULUM_LEVELS = Object.freeze({
  A1: Object.freeze({
    code: 'A1', nameAr: 'المستوى المبتدئ', nameEn: 'Beginner', className: 'a1',
    description: 'درسان متكاملان لبناء أساسك في العربية خطوة بخطوة.',
    cardDescription: 'ابدأ من الأساس وتعلّم مفردات الحياة اليومية وبناء الجملة.',
    lessons: Object.freeze([
      Object.freeze({ number: 1, title: 'الدراسة والهوية', implemented: true, sections: Object.freeze(['vocabulary', 'reading', 'listening', 'grammar', 'conversation']) }),
      Object.freeze({ number: 2, title: 'الأسرة والعمل', implemented: true, sections: Object.freeze(['vocabulary', 'reading', 'listening', 'grammar', 'conversation']) }),
    ]),
  }),
  A2: Object.freeze({
    code: 'A2', nameAr: 'المستوى المتوسط', nameEn: 'Intermediate', className: 'a2',
    description: 'عشرة دروس متدرجة لتوسيع المفردات وتطوير الفهم والتعبير باللغة العربية.',
    cardDescription: 'وسّع لغتك وافهم نصوصًا ومحادثات أكثر تنوعًا.',
    lessons: Object.freeze([
      Object.freeze({ number: 1, title: 'الدراسة والعمل والتطور الشخصي', implemented: true, sections: Object.freeze(['vocabulary', 'reading', 'listening', 'grammar', 'conversation']) }),
      ...comingSoonTitles.map((title, index) => Object.freeze({ number: index + 2, title, implemented: false, sections: Object.freeze([]) })),
    ]),
  }),
  B1: Object.freeze({
    code: 'B1', nameAr: 'المستوى المتقدم', nameEn: 'Advanced', className: 'b1',
    description: 'لغة متقدمة للتفكير والنقاش واتخاذ القرار.',
    cardDescription: 'ناقش الأفكار العامة واستعمل لغة دقيقة في مواقف متقدمة.',
    lessons: Object.freeze([
      Object.freeze({ number: 1, title: 'الِاعْتِرَافُ بِالْخَطَإِ فَضِيلَةٌ', implemented: true, sections: Object.freeze(['vocabulary', 'reading', 'listening', 'grammar', 'conversation', 'phrases']) }),
    ]),
  }),
});

export function parseLevelCode(value) {
  const code = typeof value === 'string' ? value.toUpperCase() : '';
  return code === 'A1' || code === 'A2' || code === 'B1' ? code : null;
}

export function getLevelConfig(level) {
  const code = parseLevelCode(level);
  return code ? CURRICULUM_LEVELS[code] : null;
}

export function getLessonConfig(level, lesson) {
  const config = getLevelConfig(level);
  return config?.lessons.find((entry) => entry.number === Number(lesson)) || null;
}

export function isImplementedLesson(level, lesson) {
  return getLessonConfig(level, lesson)?.implemented === true;
}

export function isLessonSectionAvailable(level, lesson, section) {
  const config = getLessonConfig(level, lesson);
  return Boolean(config?.implemented && config.sections.includes(section));
}

export function lessonSectionHref(level, lesson, section) {
  if (!isLessonSectionAvailable(level, lesson, section)) return null;
  if (level === 'A1') return `/lessons/${lesson}/${section === 'conversation' ? 'speaking' : section}`;
  return `/levels/${level}/lessons/${lesson}/${section}`;
}

export function curriculumExamHref(level, lesson) {
  if (!isImplementedLesson(level, lesson)) return null;
  if (level === 'A1') return `/lessons/${lesson}/exam`;
  return `/levels/${level}/lessons/${lesson}/exam`;
}

