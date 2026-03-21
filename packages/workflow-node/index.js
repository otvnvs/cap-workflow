'use strict';

const { initWorkflow, discoverWorkflowEntities, generateWorkflowServiceCds, WORKFLOW_ASPECT_FIELDS } = require('./lib/workflow-node')
const { start, setDueDate, assignOwner, transition, VALID_STATUSES } = require('./lib/workflow-helpers')

module.exports = {
  // Bootstrap
  initWorkflow,

  // Discovery
  discoverWorkflowEntities,
  generateWorkflowServiceCds,
  WORKFLOW_ASPECT_FIELDS,

  // Workflow helper APIs
  start,
  setDueDate,
  assignOwner,
  transition,

  // Constants
  VALID_STATUSES,
}
