namespace fs.workflow;

using { fs.workflow.Test } from '../db/schema';

@path: '/test'
service TestService {

  action startWorkflow(
    id          : UUID,
    initiatedBy : String(255)
  ) returns {
    entityName          : String(255);
    workflowStatus      : String(20);
    workflowInitiatedBy : String(255);
    workflowInitiatedAt : Timestamp;
  };

  action setDueDate(
    id      : UUID,
    dueDate : Timestamp
  ) returns {
    entityName     : String(255);
    workflowDueDate: Timestamp;
  };

  action assignOwner(
    id      : UUID,
    ownerId : String(255)
  ) returns {
    entityName    : String(255);
    workflowOwner : String(255);
  };

  action transition(
    id        : UUID,
    status    : String(20),
    substatus : String(120)
  ) returns {
    entityName        : String(255);
    workflowStatus    : String(20);
    workflowSubstatus : String(120);
  };

}

