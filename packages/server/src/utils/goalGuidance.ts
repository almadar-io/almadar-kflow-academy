/**
 * Utility function to generate goal type-specific guidance for concept generation prompts
 */

import type { LearningGoal } from '../types/goal';

/**
 * Generates goal type-specific guidance for concept generation prompts
 * @param learningGoal - The learning goal to generate guidance for
 * @returns Formatted guidance string for the specific goal type
 */
export function getGoalTypeGuidance(learningGoal: LearningGoal | undefined): string {
  if (!learningGoal) return '';
  
  switch (learningGoal.type) {
    case 'certification':
      return `- **Certification Focus**: This learning path is designed to help the learner achieve "${learningGoal.target}".
- Focus on concepts that are directly relevant to the certification exam.
- Prioritize exam-relevant topics and practical application.
${learningGoal.customMetadata?.examDate ? `- **Exam Date**: ${learningGoal.customMetadata.examDate} - ensure concepts are sequenced to allow adequate preparation time.` : ''}
${learningGoal.customMetadata?.targetScore ? `- **Target Score**: ${learningGoal.customMetadata.targetScore} - tailor difficulty to match this target.` : ''}`;
      
    case 'skill_mastery':
      return `- **Skill Mastery Goal**: The learner aims to master "${learningGoal.target}".
- Focus on building practical skills and hands-on application.
- Sequence concepts to build from fundamentals to advanced techniques.
${learningGoal.customMetadata?.applications ? `- **Target Applications**: ${learningGoal.customMetadata.applications.join(', ')} - ensure concepts support these use cases.` : ''}`;
      
    case 'language_level':
      return `- **Language Learning Goal**: Target level "${learningGoal.target}".
- Tailor concepts to support the specific language learning focus indicated in the goal.
${learningGoal.customMetadata?.targetLanguage ? `- **Language**: ${learningGoal.customMetadata.targetLanguage}` : ''}
${learningGoal.customMetadata?.focusAreas ? `- **Focus Areas**: ${learningGoal.customMetadata.focusAreas.join(', ')} - prioritize concepts that support these areas.` : ''}
${learningGoal.customMetadata ? `- **Goal Context**: Use the goal's custom metadata to guide concept selection and focus.` : ''}`;
      
    case 'project_completion':
      return `- **Project Goal**: Complete "${learningGoal.target}".
- Focus on project-relevant concepts that directly contribute to completion.
- Prioritize practical, applicable knowledge over theoretical depth.
${learningGoal.customMetadata?.projectType ? `- **Project Type**: ${learningGoal.customMetadata.projectType}` : ''}`;
      
    default:
      // Custom goal type - use generic guidance with goal context
      return `- **Learning Goal**: ${learningGoal.title} - ${learningGoal.description}
- Target: ${learningGoal.target}
- Ensure all concepts contribute directly to achieving this goal.
${learningGoal.customMetadata ? `- **Goal-Specific Context**: ${JSON.stringify(learningGoal.customMetadata)}` : ''}`;
  }
}

