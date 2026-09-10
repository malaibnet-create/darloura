import { redirect } from 'next/navigation';
import LevelThreeFinalExam from '../../../../../../components/level3/LevelThreeFinalExam';
import ExamAccessNotice from '../../../../../../components/learning/ExamAccessNotice';
import { getExamAccess } from '../../../../../../lib/exam-access';

export default async function LevelThreeLessonOneFinalExamPage() {
  const access = await getExamAccess('B1', 1);
  if (!access.allowed) {
    if (access.reason === 'auth-required') redirect('/login?next=/levels/B1/lessons/1/exam');
    return <ExamAccessNotice level="B1" lesson={1} access={access} />;
  }

  return <LevelThreeFinalExam />;
}
