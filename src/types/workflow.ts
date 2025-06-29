/**
 * Workflow type definitions for 6-phase task management
 */

import { z } from 'zod';

// Phase enumeration for the 6-phase workflow
export const WorkflowPhase = {
  ISSUE_START: 'issue_start',
  IMPLEMENTATION: 'implementation', 
  QUALITY_CHECK: 'quality_check',
  PR_CREATION: 'pr_creation',
  FIX: 'fix',
  COMPLETION: 'completion',
} as const;

export type WorkflowPhaseType = typeof WorkflowPhase[keyof typeof WorkflowPhase];

// Phase instruction interface as defined in requirements.md:59-66
export interface PhaseInstruction {
  phaseName: string;
  preconditions: string[];
  acceptanceCriteria: string[];
  tasks: string[];
  context?: Record<string, unknown>;
}

// Phase result interface for completion reporting
export interface PhaseResult {
  phaseName: WorkflowPhaseType;
  status: 'completed' | 'failed' | 'skipped';
  workingFiles: string[];
  completedTasks: string[];
  notes?: string | undefined;
  nextPhase?: WorkflowPhaseType | undefined;
  completedAt: string;
}

// Workflow state interface as defined in requirements.md:73-78
export interface WorkflowState {
  issueNumber: string;
  currentPhase: WorkflowPhaseType;
  workingFiles: string[];
  phaseHistory: PhaseResult[];
  startedAt: string;
  updatedAt: string;
}

// Zod validation schemas
export const WorkflowPhaseSchema = z.enum([
  'issue_start',
  'implementation',
  'quality_check', 
  'pr_creation',
  'fix',
  'completion',
]);

export const PhaseResultSchema = z.object({
  phaseName: WorkflowPhaseSchema,
  status: z.enum(['completed', 'failed', 'skipped']),
  workingFiles: z.array(z.string()),
  completedTasks: z.array(z.string()),
  notes: z.string().optional(),
  nextPhase: WorkflowPhaseSchema.optional(),
  completedAt: z.string().datetime(),
});

export const WorkflowStateSchema = z.object({
  issueNumber: z.string().min(1, 'Issue number is required'),
  currentPhase: WorkflowPhaseSchema,
  workingFiles: z.array(z.string()),
  phaseHistory: z.array(PhaseResultSchema),
  startedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Input schemas for MCP tools
export const StartWorkflowSchema = z.object({
  issueNumber: z.string().min(1, 'Issue number is required'),
});

export const CompletePhaseSchema = z.object({
  phaseResult: PhaseResultSchema,
});

// Types are already exported above with their interfaces