/**
 * WorkflowManager class for managing 6-phase workflow state
 */

import type { Logger } from '../logger/index.js';
import type { 
  WorkflowState, 
  PhaseResult, 
  PhaseInstruction, 
  WorkflowPhaseType 
} from '../types/workflow.js';
import { WorkflowPhase, WorkflowStateSchema, PhaseResultSchema } from '../types/workflow.js';
import { phaseDefinitions, isValidPhaseTransition } from './phases.js';

export class WorkflowManager {
  private currentWorkflow: WorkflowState | null = null;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Start a new workflow for the specified issue
   */
  startWorkflow(issueNumber: string): WorkflowState {
    this.logger.info('Starting new workflow', { issueNumber });

    if (this.currentWorkflow) {
      throw new Error(`Workflow already in progress for issue ${this.currentWorkflow.issueNumber}. Complete or reset current workflow first.`);
    }

    const now = new Date().toISOString();
    const workflow: WorkflowState = {
      issueNumber,
      currentPhase: WorkflowPhase.ISSUE_START,
      workingFiles: [],
      phaseHistory: [],
      startedAt: now,
      updatedAt: now,
    };

    // Validate the workflow state
    const validated = WorkflowStateSchema.parse(workflow);
    this.currentWorkflow = validated;

    this.logger.info('Workflow started successfully', {
      issueNumber,
      currentPhase: workflow.currentPhase,
    });

    return validated;
  }

  /**
   * Get the current workflow state
   */
  getCurrentWorkflow(): WorkflowState | null {
    return this.currentWorkflow;
  }

  /**
   * Get the instruction for the current phase
   */
  getCurrentPhaseInstruction(): PhaseInstruction | null {
    if (!this.currentWorkflow) {
      return null;
    }

    const instruction = phaseDefinitions[this.currentWorkflow.currentPhase];
    if (!instruction) {
      this.logger.error('Phase definition not found', {
        phase: this.currentWorkflow.currentPhase,
      });
      return null;
    }

    return instruction;
  }

  /**
   * Complete the current phase and transition to next phase
   */
  completePhase(phaseResult: PhaseResult): WorkflowState {
    if (!this.currentWorkflow) {
      throw new Error('No active workflow to complete phase for');
    }

    // Validate the phase result
    const validatedResult = PhaseResultSchema.parse(phaseResult);

    // Verify the phase being completed matches current phase
    if (validatedResult.phaseName !== this.currentWorkflow.currentPhase) {
      throw new Error(
        `Phase mismatch: attempting to complete ${validatedResult.phaseName} but current phase is ${this.currentWorkflow.currentPhase}`
      );
    }

    this.logger.info('Completing phase', {
      issueNumber: this.currentWorkflow.issueNumber,
      phaseName: validatedResult.phaseName,
      status: validatedResult.status,
      workingFiles: validatedResult.workingFiles,
    });

    // Update working files with files from completed phase
    const updatedWorkingFiles = Array.from(new Set([
      ...this.currentWorkflow.workingFiles,
      ...validatedResult.workingFiles,
    ]));

    // Add phase result to history
    const updatedHistory = [...this.currentWorkflow.phaseHistory, validatedResult];

    // Determine next phase based on result
    const nextPhase = this.determineNextPhase(validatedResult);

    // Update workflow state
    const now = new Date().toISOString();
    const updatedWorkflow: WorkflowState = {
      ...this.currentWorkflow,
      currentPhase: nextPhase,
      workingFiles: updatedWorkingFiles,
      phaseHistory: updatedHistory,
      updatedAt: now,
    };
    
    this.currentWorkflow = updatedWorkflow;

    this.logger.info('Phase completed successfully', {
      issueNumber: updatedWorkflow.issueNumber,
      completedPhase: validatedResult.phaseName,
      nextPhase,
      totalWorkingFiles: updatedWorkingFiles.length,
    });

    return updatedWorkflow;
  }

  /**
   * Get workflow status summary
   */
  getWorkflowStatus(): {
    hasActiveWorkflow: boolean;
    issueNumber?: string;
    currentPhase?: WorkflowPhaseType;
    totalPhases: number;
    completedPhases: number;
    workingFilesCount: number;
  } {
    if (!this.currentWorkflow) {
      return {
        hasActiveWorkflow: false,
        totalPhases: 6,
        completedPhases: 0,
        workingFilesCount: 0,
      };
    }

    return {
      hasActiveWorkflow: true,
      issueNumber: this.currentWorkflow.issueNumber,
      currentPhase: this.currentWorkflow.currentPhase,
      totalPhases: 6,
      completedPhases: this.currentWorkflow.phaseHistory.length,
      workingFilesCount: this.currentWorkflow.workingFiles.length,
    };
  }

  /**
   * Reset current workflow (for testing or error recovery)
   */
  resetWorkflow(): void {
    this.logger.info('Resetting workflow', {
      previousWorkflow: this.currentWorkflow?.issueNumber ?? 'none',
    });
    this.currentWorkflow = null;
  }

  /**
   * Validate if a phase transition is allowed
   */
  canTransitionTo(targetPhase: WorkflowPhaseType): boolean {
    if (!this.currentWorkflow) {
      return targetPhase === WorkflowPhase.ISSUE_START;
    }

    return isValidPhaseTransition(this.currentWorkflow.currentPhase, targetPhase);
  }

  /**
   * Determine the next phase based on completed phase result
   */
  private determineNextPhase(phaseResult: PhaseResult): WorkflowPhaseType {
    // If a specific next phase is provided and it's valid, use it
    if (phaseResult.nextPhase && this.canTransitionTo(phaseResult.nextPhase)) {
      return phaseResult.nextPhase;
    }

    // Default phase progression logic
    switch (phaseResult.phaseName) {
      case WorkflowPhase.ISSUE_START:
        return WorkflowPhase.IMPLEMENTATION;
      
      case WorkflowPhase.IMPLEMENTATION:
        return WorkflowPhase.QUALITY_CHECK;
      
      case WorkflowPhase.QUALITY_CHECK:
        return WorkflowPhase.PR_CREATION;
      
      case WorkflowPhase.PR_CREATION:
        // PR creation can lead to completion (if CI passes) or fix (if CI fails)
        // Default to completion, tools can override with specific nextPhase
        return phaseResult.nextPhase ?? WorkflowPhase.COMPLETION;
      
      case WorkflowPhase.FIX:
        // After fixing, go back to quality check
        return WorkflowPhase.QUALITY_CHECK;
      
      case WorkflowPhase.COMPLETION:
        // Completion is terminal - stay in completion phase
        return WorkflowPhase.COMPLETION;
      
      default:
        throw new Error(`Unknown phase: ${String(phaseResult.phaseName)}`);
    }
  }
}