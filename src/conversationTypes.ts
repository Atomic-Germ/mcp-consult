// Extended conversation types for advanced consultation patterns
import { MemoryData } from './types/executor.types';

export interface ConsultantConfig {
  id: string;
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface ConversationMessage {
  consultantId: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    model: string;
    temperature?: number;
    tokensUsed?: number;
    duration: number;
  };
}

export interface ConversationState {
  id: string;
  type: 'sequential_chain' | 'debate_loop' | 'iterative_refinement' | 'role_coordination';
  createdAt: Date;
  updatedAt: Date;
  status: 'running' | 'completed' | 'failed' | 'paused';
  currentStep: number;
  messages: ConversationMessage[];
  error?: {
    step: number;
    consultantId: string;
    message: string;
    retryCount: number;
  };
}

// Sequential Chain Types
export interface SequentialChainParams {
  consultants: ConsultantConfig[];
  context?: {
    systemPrompt?: string;
    variables?: Record<string, any>;
    passThrough?: boolean; // Whether each consultant sees all previous responses
  };
  flowControl?: {
    continueOnError?: boolean;
    maxRetries?: number;
    retryDelayMs?: number;
  };
  memory?: {
    storeConversation?: boolean;
    memoryKey?: string;
  };
}

export interface ChainStep {
  step: number;
  consultantId: string;
  model: string;
  prompt: string;
  response: string;
  duration: number;
  error?: string;
  retryCount?: number;
}

export interface SequentialChainResult {
  conversationId: string;
  status: 'completed' | 'partial' | 'failed';
  completedSteps: number;
  totalSteps: number;
  duration: number;
  steps: ChainStep[];
  summary?: {
    keyPoints: string[];
    finalConclusion?: string;
    actionItems?: string[];
  };
}

// Debate Loop Types
export interface DebateParticipant {
  id: string;
  model: string;
  role?: 'proposer' | 'critic' | 'synthesizer' | 'moderator';
  position?: string;
  personality?: string;
}

export interface DebateRules {
  maxIterations: number;
  consensusThreshold: number; // 0-1
  turnOrder: 'sequential' | 'random' | 'round-robin';
  minResponseLength?: number;
  maxResponseLength?: number;
}

export interface DebateStoppingConditions {
  consensusReached: boolean;
  maxIterationsReached: boolean;
  timeoutMinutes?: number;
}

export interface DebateParams {
  topic: string;
  participants: DebateParticipant[];
  rules: DebateRules;
  stoppingConditions: DebateStoppingConditions;
  memory?: {
    storeDebate?: boolean;
    memoryKey?: string;
  };
}

export interface DebateTurn {
  participantId: string;
  role: string;
  content: string;
  timestamp: Date;
  agreementScores?: Record<string, number>; // How much each participant agrees
  relevanceScore?: number;
}

export interface DebateRound {
  iteration: number;
  turns: DebateTurn[];
  consensusScore: number;
  moderatorNotes?: string;
}

export interface DebateResult {
  debateId: string;
  topic: string;
  status: string;
  finalConsensus: {
    reached: boolean;
    score: number;
    summary: string;
    keyArguments: {
      position: string;
      support: number;
      participantIds: string[];
    }[];
  };
  rounds: DebateRound[];
  analytics: {
    participantContributions: Record<
      string,
      {
        messageCount: number;
        averageLength: number;
        influence: number;
      }
    >;
    evolutionTrends: {
      consensusScore: number[];
    };
  };
}

// Iterative Refinement Types
export interface RefinementParams {
  baseModel: string;
  initialContent: string;
  refinementPrompt: string;
  maxIterations?: number;
  qualityMetrics?: string[];
  improvementThreshold?: number; // 0-1
  systemPrompt?: string;
  memory?: {
    storeRefinement?: boolean;
    memoryKey?: string;
  };
}

export interface RefinementIteration {
  iteration: number;
  content: string;
  feedback: string;
  qualityScore?: number;
  improvements: string[];
  timestamp: Date;
}

export interface RefinementResult {
  refinementId: string;
  status: 'completed' | 'threshold_reached' | 'max_iterations' | 'failed';
  iterations: RefinementIteration[];
  finalContent: string;
  totalImprovements: string[];
  qualityProgression: number[];
}

// Role Coordination Types
export interface RoleExpert {
  role: string;
  model: string;
  focus: string;
  systemPrompt?: string;
  weight?: number; // For weighted aggregation
}

export interface RoleCoordinationParams {
  problemStatement: string;
  roles: Record<string, RoleExpert>;
  aggregationStrategy: 'consensus' | 'weighted' | 'debate' | 'synthesis';
  synthesisModel?: string; // Model to use for final synthesis
  memory?: {
    storeCoordination?: boolean;
    memoryKey?: string;
  };
}

export interface RoleResponse {
  role: string;
  model: string;
  response: string;
  confidence?: number;
  keyPoints: string[];
  timestamp: Date;
}

export interface RoleCoordinationResult {
  coordinationId: string;
  problemStatement: string;
  roleResponses: RoleResponse[];
  synthesis: {
    method: string;
    finalRecommendation: string;
    consensusLevel: number;
    conflictingViewpoints?: string[];
  };
  summary: {
    keyInsights: string[];
    actionItems: string[];
    risks: string[];
    recommendations: string[];
  };
}

// Extended Memory Types for Conversations
export interface ConversationMemory extends MemoryData {
  conversationId: string;
  type: string;
  participants: string[];
  summary: string;
  keyOutcomes: string[];
  createdAt: Date;
  tags?: string[];
}
