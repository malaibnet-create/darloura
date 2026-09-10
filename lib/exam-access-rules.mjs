export const EXAM_REQUIRED_SECTIONS = Object.freeze({
  A1: Object.freeze(['vocabulary', 'reading', 'listening', 'grammar', 'conversation']),
  A2: Object.freeze(['vocabulary', 'reading', 'listening', 'grammar', 'conversation']),
  B1: Object.freeze(['vocabulary', 'reading', 'listening', 'grammar', 'conversation', 'phrases']),
});

export function missingExamSections(level, progressRows) {
  const required = EXAM_REQUIRED_SECTIONS[level] || [];
  const completed = new Set(
    (Array.isArray(progressRows) ? progressRows : [])
      .filter((row) => row?.status === 'completed' && typeof row.section === 'string')
      .map((row) => row.section),
  );
  return required.filter((section) => !completed.has(section));
}

