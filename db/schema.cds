namespace fs.workflow;

using { cuid, managed } from '@sap/cds/common';
using { vp.workflow.WorkflowAspect } from '@vp/workflow-node';

@workflow
@workflow.title: 'Workflow Test'
entity Test: managed, WorkflowAspect {
  key ID : UUID;
  test:String;
}



@workflow
@workflow.title: 'Workflow 1'
entity Workflow1: managed, WorkflowAspect {
  key ID : UUID;
  test:String;
}

@workflow
@workflow.title: 'Workflow 2'
entity Workflow2: managed, WorkflowAspect {
  key ID : UUID;
  test:String;
}

@workflow
@workflow.title: 'Workflow 3'
entity Workflow3: managed, WorkflowAspect {
  key ID : UUID;
  test:String;
}
