namespace fs.workflow;

using { cuid, managed } from '@sap/cds/common';
using { vp.workflow.WorkflowAspect } from '@vp/workflow-node';

@workflow
@workflow.title: 'Workflow Test Title'
@workflow.description : 'Workflow Test Description'
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


//----------------------

@workflow
@workflow.title: 'Workflow 4'
entity Workflow4: managed, WorkflowAspect {
  key ID : UUID;
  test:String;
  foo:String;
}

@workflow
@workflow.title: 'Workflow 5'
entity Workflow5: managed, WorkflowAspect {
  key ID : UUID;
  test:String;
  bar:String;
  baz:String;
}@workflow
@workflow.title: 'Workflow 6'
entity Workflow6: managed, WorkflowAspect {
  key ID : UUID;
  test:String;
  qux:String;
}@workflow
@workflow.title: 'Workflow 7'
entity Workflow7: managed, WorkflowAspect {
  key ID : UUID;
  test:String;
  klutz:String;
}
