import { redirect } from 'next/navigation';
import LevelTwoFinalExam from '../../../../../../components/level2/LevelTwoFinalExam';
import ExamAccessNotice from '../../../../../../components/learning/ExamAccessNotice';
import { getExamAccess } from '../../../../../../lib/exam-access';

export default async function LevelTwoLessonOneFinalExamPage() {
  const access = await getExamAccess('A2', 1);
  if (!access.allowed) {
    if (access.reason === 'auth-required') redirect('/login?next=/levels/A2/lessons/1/exam');
    return <ExamAccessNotice level="A2" lesson={1} access={access} />;
  }

  return <LevelTwoFinalExam />;
}
