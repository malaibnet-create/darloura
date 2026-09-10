import { notFound } from 'next/navigation';
import { isImplementedLesson } from '../../../lib/curriculum.mjs';

export default async function BeginnerLessonLayout({ children, params }: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lessonId: string }>;
}>) {
  const { lessonId } = await params;
  if (!isImplementedLesson('A1', Number(lessonId))) notFound();
  return children;
}

