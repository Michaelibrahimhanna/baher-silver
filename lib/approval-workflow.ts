import { ApprovalRole, WorkflowState, ProductApprovalWorkflow, WorkflowHistoryEntry } from '@/types/catalog';

/**
 * Approval Workflow Architecture
 * Defines roles, state machine matrix, transition rules, and audit history generators.
 */

export const WORKFLOW_ROLE_PERMISSIONS: Record<ApprovalRole, WorkflowState[]> = {
  editor: ['draft', 'pending_review'],
  reviewer: ['pending_review', 'changes_requested', 'approved', 'rejected'],
  publisher: ['approved', 'published', 'draft', 'rejected'],
};

export const WORKFLOW_TRANSITION_MATRIX: Record<WorkflowState, WorkflowState[]> = {
  draft: ['pending_review'],
  pending_review: ['approved', 'changes_requested', 'rejected', 'draft'],
  changes_requested: ['pending_review', 'draft'],
  approved: ['published', 'draft'],
  published: ['draft'],
  rejected: ['draft'],
};

export function canRoleTransition(
  role: ApprovalRole,
  currentState: WorkflowState,
  targetState: WorkflowState
): boolean {
  const allowedTargetStates = WORKFLOW_TRANSITION_MATRIX[currentState] || [];
  if (!allowedTargetStates.includes(targetState)) {
    return false;
  }

  const roleCapabilities = WORKFLOW_ROLE_PERMISSIONS[role] || [];
  return roleCapabilities.includes(targetState) || roleCapabilities.includes(currentState);
}

export function createInitialWorkflow(editorId?: string): ProductApprovalWorkflow {
  return {
    current_state: 'draft',
    assigned_editor_id: editorId || 'editor-default',
    history: [
      {
        id: `wf-hist-${Date.now()}`,
        from_state: 'draft',
        to_state: 'draft',
        actor_role: 'editor',
        actor_id: editorId || 'editor-default',
        actor_name: 'Editor',
        comments: 'Initial draft created in workflow architecture.',
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export function transitionWorkflowState(
  workflow: ProductApprovalWorkflow,
  actorRole: ApprovalRole,
  actorId: string,
  actorName: string,
  targetState: WorkflowState,
  comments?: string
): ProductApprovalWorkflow {
  const currentState = workflow.current_state;

  if (!canRoleTransition(actorRole, currentState, targetState)) {
    throw new Error(
      `Role [${actorRole}] cannot transition workflow from [${currentState}] to [${targetState}]`
    );
  }

  const newHistoryEntry: WorkflowHistoryEntry = {
    id: `wf-hist-${Date.now()}`,
    from_state: currentState,
    to_state: targetState,
    actor_role: actorRole,
    actor_id: actorId,
    actor_name: actorName,
    comments,
    timestamp: new Date().toISOString(),
  };

  return {
    ...workflow,
    current_state: targetState,
    history: [newHistoryEntry, ...workflow.history],
  };
}
