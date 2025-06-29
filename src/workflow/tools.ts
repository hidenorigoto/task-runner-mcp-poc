/**
 * MCP workflow tools implementation
 * Implements the 4 required tools from requirements.md:87-98
 */

import type { ToolDefinition, ToolResult } from '../types/tools.js';
import type { Logger } from '../logger/index.js';
import type { PhaseInstruction, WorkflowState } from '../types/workflow.js';
import { WorkflowManager } from './WorkflowManager.js';
import { StartWorkflowSchema, CompletePhaseSchema } from '../types/workflow.js';

export class WorkflowTools {
  private workflowManager: WorkflowManager;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.workflowManager = new WorkflowManager(logger);
  }

  /**
   * 1. startIssueWorkflow(issueNumber: string)
   * Issue作業を開始し、最初のフェーズへ移行
   */
  private startIssueWorkflow: ToolDefinition = {
    name: 'start_issue_workflow',
    description: 'Start a new workflow for the specified GitHub Issue number and move to the first phase',
    inputSchema: {
      type: 'object',
      properties: {
        issueNumber: {
          type: 'string',
          description: 'GitHub Issue number to start workflow for',
        },
      },
      required: ['issueNumber'],
    },
    handler: (args): Promise<ToolResult> => {
      try {
        const { issueNumber } = StartWorkflowSchema.parse(args);
        
        this.logger.info('Starting issue workflow', { issueNumber });
        
        const workflow = this.workflowManager.startWorkflow(issueNumber);
        const currentInstruction = this.workflowManager.getCurrentPhaseInstruction();
        
        if (!currentInstruction) {
          throw new Error('Failed to get current phase instruction after starting workflow');
        }

        const response = this.formatPhaseInstructionResponse(workflow.issueNumber, currentInstruction);
        
        return Promise.resolve({
          content: [{
            type: 'text',
            text: response,
          }],
        });
      } catch (error) {
        this.logger.error('Failed to start issue workflow', { error: error instanceof Error ? error.message : String(error) });
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };

  /**
   * 2. completePhase(phaseResult: PhaseResult)
   * 現在のフェーズの完了を報告し、次のフェーズへの移行判定
   */
  private completePhase: ToolDefinition = {
    name: 'complete_phase',
    description: 'Complete the current phase and transition to the next phase in the workflow',
    inputSchema: {
      type: 'object',
      properties: {
        phaseResult: {
          type: 'object',
          properties: {
            phaseName: {
              type: 'string',
              enum: ['issue_start', 'implementation', 'quality_check', 'pr_creation', 'fix', 'completion'],
              description: 'Name of the phase being completed',
            },
            status: {
              type: 'string',
              enum: ['completed', 'failed', 'skipped'],
              description: 'Status of the completed phase',
            },
            workingFiles: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of files that were worked on during this phase',
            },
            completedTasks: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of tasks that were completed during this phase',
            },
            notes: {
              type: 'string',
              description: 'Optional notes about the phase completion',
            },
            nextPhase: {
              type: 'string',
              enum: ['issue_start', 'implementation', 'quality_check', 'pr_creation', 'fix', 'completion'],
              description: 'Optional specific next phase (if different from default progression)',
            },
            completedAt: {
              type: 'string',
              description: 'ISO 8601 timestamp when the phase was completed',
            },
          },
          required: ['phaseName', 'status', 'workingFiles', 'completedTasks', 'completedAt'],
        },
      },
      required: ['phaseResult'],
    },
    handler: (args): Promise<ToolResult> => {
      try {
        const { phaseResult } = CompletePhaseSchema.parse(args);
        
        this.logger.info('Completing phase', { 
          phaseName: phaseResult.phaseName,
          status: phaseResult.status,
        });
        
        const updatedWorkflow = this.workflowManager.completePhase(phaseResult);
        
        // Check if workflow is complete
        if (updatedWorkflow.currentPhase === 'completion' && phaseResult.status === 'completed') {
          return Promise.resolve({
            content: [{
              type: 'text',
              text: this.formatWorkflowCompletionResponse(updatedWorkflow),
            }],
          });
        }
        
        // Get next phase instruction
        const nextInstruction = this.workflowManager.getCurrentPhaseInstruction();
        if (!nextInstruction) {
          throw new Error('Failed to get next phase instruction after phase completion');
        }

        const response = this.formatPhaseTransitionResponse(
          updatedWorkflow,
          phaseResult.phaseName,
          nextInstruction
        );
        
        return Promise.resolve({
          content: [{
            type: 'text',
            text: response,
          }],
        });
      } catch (error) {
        this.logger.error('Failed to complete phase', { error: error instanceof Error ? error.message : String(error) });
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };

  /**
   * 3. getCurrentPhase()
   * 現在のフェーズと必要なアクションを返す
   */
  private getCurrentPhase: ToolDefinition = {
    name: 'get_current_phase',
    description: 'Get the current phase instruction and required actions for the active workflow',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: (): Promise<ToolResult> => {
      try {
        const workflow = this.workflowManager.getCurrentWorkflow();
        
        if (!workflow) {
          return Promise.resolve({
            content: [{
              type: 'text',
              text: 'No active workflow. Use start_issue_workflow to begin a new workflow.',
            }],
          });
        }
        
        const currentInstruction = this.workflowManager.getCurrentPhaseInstruction();
        if (!currentInstruction) {
          throw new Error('Failed to get current phase instruction');
        }

        const response = this.formatPhaseInstructionResponse(workflow.issueNumber, currentInstruction);
        
        return Promise.resolve({
          content: [{
            type: 'text',
            text: response,
          }],
        });
      } catch (error) {
        this.logger.error('Failed to get current phase', { error: error instanceof Error ? error.message : String(error) });
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };

  /**
   * 4. getWorkflowStatus()
   * 全体の進捗状況を取得
   */
  private getWorkflowStatus: ToolDefinition = {
    name: 'get_workflow_status',
    description: 'Get the overall progress and status of the current workflow',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: (): Promise<ToolResult> => {
      try {
        const status = this.workflowManager.getWorkflowStatus();
        const workflow = this.workflowManager.getCurrentWorkflow();
        
        const response = this.formatWorkflowStatusResponse(status, workflow);
        
        return Promise.resolve({
          content: [{
            type: 'text',
            text: response,
          }],
        });
      } catch (error) {
        this.logger.error('Failed to get workflow status', { error: error instanceof Error ? error.message : String(error) });
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };

  /**
   * Format phase instruction for display
   */
  private formatPhaseInstructionResponse(issueNumber: string, instruction: PhaseInstruction): string {
    const lines = [
      `🎯 **Current Phase: ${instruction.phaseName}**`,
      `📋 **Issue**: #${issueNumber}`,
      '',
      '## 📝 Preconditions',
      ...instruction.preconditions.map((p: string) => `- ${p}`),
      '',
      '## ✅ Acceptance Criteria',
      ...instruction.acceptanceCriteria.map((a: string) => `- ${a}`),
      '',
      '## 🔧 Tasks to Complete',
      ...instruction.tasks.map((t: string, i: number) => `${i + 1}. ${t}`),
      '',
      '**Next Step**: Complete the tasks above, then use `complete_phase` to report completion and move to the next phase.',
    ];
    
    return lines.join('\n');
  }

  /**
   * Format phase transition response
   */
  private formatPhaseTransitionResponse(workflow: WorkflowState, completedPhase: string, nextInstruction: PhaseInstruction): string {
    const lines = [
      `✅ **Phase Completed**: ${completedPhase}`,
      `🎯 **Now Moving to**: ${nextInstruction.phaseName}`,
      `📋 **Issue**: #${workflow.issueNumber}`,
      `📊 **Progress**: ${workflow.phaseHistory.length}/${6} phases completed`,
      `📁 **Working Files**: ${workflow.workingFiles.length} files tracked`,
      '',
      '---',
      '',
      this.formatPhaseInstructionResponse(workflow.issueNumber, nextInstruction),
    ];
    
    return lines.join('\n');
  }

  /**
   * Format workflow completion response
   */
  private formatWorkflowCompletionResponse(workflow: WorkflowState): string {
    const lines = [
      '🎉 **Workflow Completed Successfully!**',
      `📋 **Issue**: #${workflow.issueNumber}`,
      `⏰ **Duration**: ${workflow.startedAt} → ${workflow.updatedAt}`,
      `📁 **Total Files Worked**: ${workflow.workingFiles.length}`,
      `📊 **Phases Completed**: ${workflow.phaseHistory.length}`,
      '',
      '## 📈 Phase History',
      ...workflow.phaseHistory.map((phase) => 
        `- ✅ ${phase.phaseName} (${phase.status}) - ${phase.completedTasks.length} tasks`
      ),
      '',
      '**Workflow is now complete.** Use `start_issue_workflow` to begin work on a new issue.',
    ];
    
    return lines.join('\n');
  }

  /**
   * Format workflow status response
   */
  private formatWorkflowStatusResponse(status: ReturnType<WorkflowManager['getWorkflowStatus']>, workflow: WorkflowState | null): string {
    if (!status.hasActiveWorkflow) {
      return '📋 **No Active Workflow**\n\nUse `start_issue_workflow` to begin working on an issue.';
    }
    
    const lines = [
      '📊 **Workflow Status**',
      `📋 **Issue**: #${status.issueNumber}`,
      `🎯 **Current Phase**: ${status.currentPhase}`,
      `📈 **Progress**: ${status.completedPhases}/${status.totalPhases} phases completed`,
      `📁 **Working Files**: ${status.workingFilesCount} files being tracked`,
      '',
    ];
    
    if (workflow?.phaseHistory.length && workflow.phaseHistory.length > 0) {
      lines.push('## 📋 Completed Phases');
      lines.push(...workflow.phaseHistory.map((phase) => 
        `- ✅ ${phase.phaseName} (${phase.status}) - ${phase.completedAt}`
      ));
      lines.push('');
    }
    
    lines.push('Use `get_current_phase` to see current phase details and required actions.');
    
    return lines.join('\n');
  }

  /**
   * Get all workflow tools for MCP server registration
   */
  getTools(): ToolDefinition[] {
    return [
      this.startIssueWorkflow,
      this.completePhase,
      this.getCurrentPhase,
      this.getWorkflowStatus,
    ];
  }

  /**
   * Reset workflow (for testing and error recovery)
   */
  resetWorkflow(): void {
    this.workflowManager.resetWorkflow();
  }
}