import type { LearningLevel, LearningSection } from './learning-progress';

export const EXAM_REQUIRED_SECTIONS: Readonly<Record<LearningLevel, readonly LearningSection[]>>;
export function missingExamSections(
  level: LearningLevel,
  progressRows: readonly { section?: unknown; status?: unknown }[] | null | undefined,
): LearningSection[];

