import { notFound, redirect } from 'next/navigation';

export default async function LegacyLessonExamPage({ params, searchParams }: {
  params: Promise<{ levelCode: string }>;
  searchParams: Promise<{ lesson?: string | string[] }>;
}) {
  const { levelCode } = await params;
  const query = await searchParams;
  const code = levelCode.toUpperCase();
  const lessonValue = Array.isArray(query.lesson) ? query.lesson[0] : query.lesson;
  const lesson = Number(lessonValue || '1');

  if (!Number.isInteger(lesson) || lesson < 1) notFound();
  if (code === 'A1' && (lesson === 1 || lesson === 2)) redirect(`/lessons/${lesson}/exam`);
  if (code === 'A2' && lesson === 1) redirect('/levels/A2/lessons/1/exam');
  if (code === 'B1' && lesson === 1) redirect('/levels/B1/lessons/1/exam');

  notFound();
}
