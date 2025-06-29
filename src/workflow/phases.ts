/**
 * Phase definitions for the 6-phase workflow
 * Based on requirements.md sections 2.1.1 (lines 22-53)
 */

import type { PhaseInstruction } from '../types/workflow.js';
import { WorkflowPhase } from '../types/workflow.js';

// 1. Issue作業開始フェーズ (Issue Work Start Phase)
export const issueStartPhase: PhaseInstruction = {
  phaseName: WorkflowPhase.ISSUE_START,
  preconditions: [
    'Issue number has been specified',
    'User has development environment ready',
    'Repository is accessible',
  ],
  acceptanceCriteria: [
    'Issue content has been retrieved and displayed',
    'Work content has been critically reviewed',
    'Work branch has been created if needed',
    'Initial working files list has been established',
  ],
  tasks: [
    'Retrieve Issue content from GitHub',
    'Display Issue details to user',
    'Perform critical review of work requirements',
    'Create or switch to appropriate work branch',
    'Initialize working files list',
    'Confirm readiness to proceed with implementation',
  ],
};

// 2. 実装フェーズ (Implementation Phase)
export const implementationPhase: PhaseInstruction = {
  phaseName: WorkflowPhase.IMPLEMENTATION,
  preconditions: [
    'Issue work has been started',
    'Work requirements are understood',
    'Development environment is ready',
  ],
  acceptanceCriteria: [
    'All required code changes have been implemented',
    'Working files list has been updated with modifications',
    'Code follows project conventions and standards',
    'Implementation is ready for quality checks',
  ],
  tasks: [
    'Implement required code changes',
    'Update working files list as modifications are made',
    'Follow existing code patterns and conventions',
    'Add or update comments where necessary',
    'Ensure implementation meets Issue requirements',
    'Prepare code for quality validation',
  ],
};

// 3. 品質チェックフェーズ (Quality Check Phase)
export const qualityCheckPhase: PhaseInstruction = {
  phaseName: WorkflowPhase.QUALITY_CHECK,
  preconditions: [
    'Implementation has been completed',
    'Working files are ready for validation',
    'Project has quality check scripts available',
  ],
  acceptanceCriteria: [
    'Lint checks pass without errors',
    'TypeScript type checking passes',
    'Unit tests pass successfully',
    'E2E tests pass (if available)',
    'All quality gates are satisfied',
  ],
  tasks: [
    'Run npm run lint to check code style',
    'Run npm run typecheck for TypeScript validation',
    'Run npm test for unit test execution',
    'Run E2E tests if they exist',
    'Fix any quality issues found',
    'Verify all checks pass before proceeding',
  ],
};

// 4. PR作成フェーズ (PR Creation Phase)  
export const prCreationPhase: PhaseInstruction = {
  phaseName: WorkflowPhase.PR_CREATION,
  preconditions: [
    'Quality checks have passed',
    'Code is ready for review',
    'Work branch exists with commits',
  ],
  acceptanceCriteria: [
    'Work branch has been confirmed',
    'Pull Request has been created successfully',
    'CI/CD pipeline has been triggered',
    'CI results are being monitored',
  ],
  tasks: [
    'Verify current branch and commit status',
    'Push changes to remote repository',
    'Create Pull Request with proper description',
    'Link PR to original Issue',
    'Monitor CI/CD pipeline execution',
    'Check for any CI failures',
  ],
};

// 5. 修正フェーズ (Fix Phase) - Conditional based on CI results
export const fixPhase: PhaseInstruction = {
  phaseName: WorkflowPhase.FIX,
  preconditions: [
    'CI/CD pipeline has failed',
    'Error details are available',
    'Fixes are required before merge',
  ],
  acceptanceCriteria: [
    'CI failure causes have been identified',
    'Necessary fixes have been implemented',
    'Quality checks pass again after fixes',
    'CI/CD pipeline succeeds',
  ],
  tasks: [
    'Analyze CI/CD failure details',
    'Identify root causes of failures',
    'Implement necessary fixes',
    'Re-run quality checks locally',
    'Push fixes and monitor CI again',
    'Repeat until CI passes',
  ],
};

// 6. 完了フェーズ (Completion Phase)
export const completionPhase: PhaseInstruction = {
  phaseName: WorkflowPhase.COMPLETION,
  preconditions: [
    'Pull Request is ready for merge',
    'All CI checks have passed',
    'Code review is approved (if required)',
  ],
  acceptanceCriteria: [
    'Pull Request has been merged successfully',
    'Retrospective comment has been created',
    'Issue has been updated with completion details',
    'Work branch has been cleaned up',
  ],
  tasks: [
    'Merge Pull Request to main branch',
    'Create retrospective comment about the work',
    'Post completion comment to original Issue',
    'Clean up work branch if appropriate',
    'Update Issue status to closed',
    'Document any lessons learned',
  ],
};

// Phase map for easy lookup
export const phaseDefinitions: Record<string, PhaseInstruction> = {
  [WorkflowPhase.ISSUE_START]: issueStartPhase,
  [WorkflowPhase.IMPLEMENTATION]: implementationPhase,
  [WorkflowPhase.QUALITY_CHECK]: qualityCheckPhase,
  [WorkflowPhase.PR_CREATION]: prCreationPhase,
  [WorkflowPhase.FIX]: fixPhase,
  [WorkflowPhase.COMPLETION]: completionPhase,
};

// Phase transition logic - defines valid next phases
export const phaseTransitions: Record<string, string[]> = {
  [WorkflowPhase.ISSUE_START]: [WorkflowPhase.IMPLEMENTATION],
  [WorkflowPhase.IMPLEMENTATION]: [WorkflowPhase.QUALITY_CHECK],
  [WorkflowPhase.QUALITY_CHECK]: [WorkflowPhase.PR_CREATION],
  [WorkflowPhase.PR_CREATION]: [WorkflowPhase.FIX, WorkflowPhase.COMPLETION],
  [WorkflowPhase.FIX]: [WorkflowPhase.QUALITY_CHECK], // Re-run quality checks after fixes
  [WorkflowPhase.COMPLETION]: [], // Terminal phase
};

// Helper function to get next valid phases
export function getValidNextPhases(currentPhase: string): string[] {
  return phaseTransitions[currentPhase] ?? [];
}

// Helper function to validate phase transition
export function isValidPhaseTransition(from: string, to: string): boolean {
  const validNextPhases = getValidNextPhases(from);
  return validNextPhases.includes(to);
}