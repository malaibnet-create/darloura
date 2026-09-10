import type { LearningLevel, LearningSection } from './learning-progress';

export type CurriculumSectionDefinition = {
  key: LearningSection;
  icon: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
};

export type CurriculumLesson = {
  number: number;
  title: string;
  implemented: boolean;
  sections: readonly LearningSection[];
};

export type CurriculumLevel = {
  code: LearningLevel;
  nameAr: string;
  nameEn: string;
  className: string;
  description: string;
  cardDescription: string;
  lessons: readonly CurriculumLesson[];
};

export const CURRICULUM_SECTIONS: readonly CurriculumSectionDefinition[];
export const CURRICULUM_LEVELS: Readonly<Record<LearningLevel, CurriculumLevel>>;
export function parseLevelCode(value: unknown): LearningLevel | null;
export function getLevelConfig(level: unknown): CurriculumLevel | null;
export function getLessonConfig(level: unknown, lesson: unknown): CurriculumLesson | null;
export function isImplementedLesson(level: unknown, lesson: unknown): boolean;
export function isLessonSectionAvailable(level: unknown, lesson: unknown, section: LearningSection): boolean;
export function lessonSectionHref(level: LearningLevel, lesson: number, section: LearningSection): string | null;
export function curriculumExamHref(level: LearningLevel, lesson: number): string | null;

