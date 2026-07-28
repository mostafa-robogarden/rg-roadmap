export type UserRole =
  | 'LEARNER'
  | 'ADMIN';

export type SkillLevel =
  | 'BEGINNER'
  | 'TINKERER'
  | 'COMPETENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export interface Track {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  isTrending: boolean;
  isPublished: boolean;
}

export interface QuestionOption {
  id: string;
  label: string;

  /*
   * Present on the original database question
   * API but not required for AI questions.
   */
  value?: string;

  sortOrder: number;
  score?: number;
}

export interface Question {
  id: string;
  trackId?: string | null;
  prompt: string;
  topic?: string;
  sortOrder: number;
  isActive?: boolean;
  options: QuestionOption[];
  track?: Track | null;
}

export interface Assessment {
  id: string;

  status:
    | 'IN_PROGRESS'
    | 'COMPLETED';

  computedLevel:
    | SkillLevel
    | null;

  track: Track;

  learnerGoal: string;
  weeklyHours: number;
  targetMonths: number;

  startedAt: string;
  completedAt: string | null;

  answers: Array<{
    questionId: string;
    optionId: string;
  }>;
}

export interface StartAssessmentInput {
  trackSlug: string;
  learnerGoal: string;
  weeklyHours: number;
  targetMonths: number;
}

export interface ResourceLink {
  label: string;
  url: string;
}

export interface RoadmapMilestone {
  id: string;
  sortOrder: number;
  title: string;
  description: string;
  estimatedHours: number | null;
  resources: ResourceLink[];
  completedAt?: string | null;
}

export interface GeneratedRoadmap {
  templateId: string;
  track: Track;
  level: SkillLevel;
  title: string;
  description: string;
  milestones: RoadmapMilestone[];
}

export interface SavedRoadmapSummary {
  id: string;
  title: string;
  level: SkillLevel;
  track: Track;
  createdAt: string;
  milestoneCount: number;
  completedCount: number;
}

export interface SavedRoadmap {
  id: string;
  title: string;
  level: SkillLevel;
  track: Track;
  createdAt: string;
  milestones: RoadmapMilestone[];
}

export interface RoadmapTemplate {
  id: string;
  trackId: string;
  level: SkillLevel;
  title: string;
  description: string;
  isActive: boolean;
  track: Track;
  milestones: RoadmapMilestone[];
}

export interface AnalyticsSummary {
  users: number;
  publishedTracks: number;
  quizStarted: number;
  quizCompleted: number;
  roadmapGenerated: number;
  roadmapsSaved: number;
  milestonesCompleted: number;
  quizCompletionRate: number;
}

export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    fields?: unknown;
  };
}
