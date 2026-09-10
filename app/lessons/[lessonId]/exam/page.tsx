import { redirect } from 'next/navigation';
import LessonOneExam from '../../../../components/lesson1/LessonOneExam';
import LessonTwoExam from '../../../../components/lesson2/LessonTwoExam';
import ExamAccessNotice from '../../../../components/learning/ExamAccessNotice';
import { getExamAccess } from '../../../../lib/exam-access';

export default async function LessonExamPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  if (lessonId !== '1' && lessonId !== '2') return <main className="shell"><section className="exam-panel"><h1>لا يوجد امتحان لهذا الدرس بعد.</h1><a className="button" href={`/lessons/${lessonId}`}>العودة إلى الدرس</a></section></main>;
  const lesson = Number(lessonId);
  const access = await getExamAccess('A1', lesson);
  if (!access.allowed) {
    if (access.reason === 'auth-required') redirect(`/login?next=/lessons/${lesson}/exam`);
    return <ExamAccessNotice level="A1" lesson={lesson} access={access} />;
  }
  return lesson === 1 ? <LessonOneExam /> : <LessonTwoExam />;
}
