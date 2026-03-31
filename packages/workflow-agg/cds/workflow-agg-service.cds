namespace vp.workflowAgg;

@path: '/workflow-agg'
@impl: 'packages/workflow-agg/lib/workflow-agg-service.js'
//@impl: 'node_modules/@vp/workflow-agg/lib/workflow-agg-service.js'
service WorkflowAggService {

  @readonly entity Services {
    key ID           : UUID;
        url          : String(512);
        status       : String(20);
        lastCheckedAt: Timestamp;
        errorMessage : String(1000);
  }

  @readonly entity WorkflowCatalog {
    key ID           : UUID;
        serviceUrl   : String(512);
        entityName   : String(255);
        entitySetName: String(255);
        title        : String(255);
        keyFieldsJson: LargeString;
  }

  //new
  action start(
    entityName  : String(255),
    keyJson     : LargeString,
    initiatedBy : String(255)
  ) returns {
    entityName          : String(255);
    workflowStatus      : String(20);
    workflowInitiatedBy : String(255);
    workflowInitiatedAt : Timestamp;
  };

  action setDueDate(
    entityName : String(255),
    keyJson    : LargeString,
    dueDate    : Timestamp
  ) returns {
    entityName      : String(255);
    workflowDueDate : Timestamp;
  };

  action assignOwner(
    entityName : String(255),
    keyJson    : LargeString,
    ownerId    : String(255)
  ) returns {
    entityName    : String(255);
    workflowOwner : String(255);
  };

  action transition(
    entityName : String(255),
    keyJson    : LargeString,
    status     : String(20),
    substatus  : String(120)
  ) returns {
    entityName        : String(255);
    workflowStatus    : String(20);
    workflowSubstatus : String(120);
  };

}
