namespace vp.workflow;

using { cuid, managed } from '@sap/cds/common';

// --- Status Enum --------------------------------------------------------------

type WorkflowStatus : String(20) enum {
  NOT_STARTED = 'NOT_STARTED';
  IN_PROGRESS = 'IN_PROGRESS';
  BLOCKED     = 'BLOCKED';
  COMPLETED   = 'COMPLETED';
  CANCELLED   = 'CANCELLED';
}

// --- Workflow Aspect ----------------------------------------------------------

aspect WorkflowAspect {
  workflowStatus      : WorkflowStatus default 'NOT_STARTED' @assert.range;
  workflowSubstatus   : String(120);
  workflowInitiatedBy : String(255);
  workflowInitiatedAt : Timestamp;
  workflowOwner       : String(255);
  workflowDueDate     : Timestamp;
}

// --- Core Runtime Entities ----------------------------------------------------

entity WorkflowInstance : cuid, managed {
  workflowType  : String(100) not null;
  businessKey   : String(255) not null;
  correlationId : String(255);
  state         : String(50)  not null default 'CREATED';
  payload       : LargeString;
  completedAt   : Timestamp;
}

entity WorkflowStateHistory : cuid {
  workflow    : Association to WorkflowInstance not null;
  fromState   : String(50);
  toState     : String(50)  not null;
  event       : String(100) not null;
  triggeredBy : String(255);
  payload     : LargeString;
  occurredAt  : Timestamp   not null default $now;
}

entity WorkflowTask : cuid, managed {
  workflow    : Association to WorkflowInstance not null;
  taskType    : String(100) not null;
  assignee    : String(255);
  status      : String(50)  not null default 'OPEN';
  dueAt       : Timestamp;
  completedAt : Timestamp;
  result      : LargeString;
}
