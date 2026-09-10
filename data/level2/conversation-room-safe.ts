import 'server-only';
import { conversationRoom } from './conversation-room-private';

export function getSafeConversationRoomConfig() {
  return {
    lessonId: conversationRoom.lessonId,
    titleAr: conversationRoom.titleAr,
    titleEn: conversationRoom.titleEn,
    estimatedMinutes: conversationRoom.estimatedMinutes,
    scenario: {
      settingAr: conversationRoom.scenario.settingAr,
      settingEn: conversationRoom.scenario.settingEn,
      learnerRoleAr: conversationRoom.scenario.learnerRoleAr,
    },
    learningObjectives: conversationRoom.learningObjectives,
    targetVocabulary: conversationRoom.targetVocabulary.map(({ id, family, meaningEn }) => ({ id, family, meaningEn })),
    grammarTargets: conversationRoom.grammarTargets,
    phases: conversationRoom.phases.map(({ id, order, titleAr, goalAr, minimumLearnerTurns }) => ({
      id, order, titleAr, goalAr, minimumLearnerTurns,
    })),
    activationRules: {
      minimumLearnerTurns: conversationRoom.activationRules.minimumLearnerTurns,
      minimumUniqueVocabularyFamilies: conversationRoom.activationRules.minimumUniqueVocabularyFamilies,
      minimumGrammarUses: conversationRoom.activationRules.minimumGrammarUses,
      requireChallengeResponse: conversationRoom.activationRules.requireChallengeResponse,
      requireFinalSummary: conversationRoom.activationRules.requireFinalSummary,
    },
    helpLevels: conversationRoom.helpLevels.map(({ id, labelAr, limit }) => ({ id, labelAr, limit })),
    rubric: conversationRoom.rubric,
    ui: {
      primaryActionAr: conversationRoom.ui.primaryActionAr,
      captionsDefault: conversationRoom.ui.captionsDefault,
      allowTextFallback: conversationRoom.ui.allowTextFallback,
    },
    maxSessionMinutes: conversationRoom.technical.maxSessionMinutes,
  };
}
