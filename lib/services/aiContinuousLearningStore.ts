import { HumanFeedbackLog, AIProductDraft } from '@/types/aiProductMachine';

class AIContinuousLearningStore {
  private feedbackLogs: HumanFeedbackLog[] = [];

  recordHumanCorrection(
    productId: string,
    originalAiDraft: Partial<AIProductDraft>,
    finalApprovedData: Partial<AIProductDraft>,
    reviewerId: string = 'admin-user-1'
  ): HumanFeedbackLog {
    const editedFields: string[] = [];

    if (originalAiDraft.name_ar !== finalApprovedData.name_ar) editedFields.push('name_ar');
    if (originalAiDraft.name_en !== finalApprovedData.name_en) editedFields.push('name_en');
    if (originalAiDraft.category !== finalApprovedData.category) editedFields.push('category');

    const log: HumanFeedbackLog = {
      id: `train-log-${Date.now()}`,
      productId,
      originalAiDraft,
      finalApprovedData,
      editedFields,
      timestamp: new Date().toISOString(),
      reviewerId,
    };

    this.feedbackLogs.push(log);
    return log;
  }

  getTrainingDatasetLogs(): HumanFeedbackLog[] {
    return this.feedbackLogs;
  }
}

export const aiContinuousLearningStore = new AIContinuousLearningStore();
