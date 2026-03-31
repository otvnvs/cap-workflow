namespace fs.workflow;

using { cuid, managed } from '@sap/cds/common';
using { vp.workflow.WorkflowAspect } from '@vp/workflow-node';
using { vp.dummy.DummyAspect } from '@vp/dummy-node';


//--------------------------------------------------------------------------------
//Dummy
//--------------------------------------------------------------------------------

@dummy
@dummy.title: 'My Dummy Entity'
entity Dummy1: managed, DummyAspect {
  key ID : UUID;
  name   : String;
}

@dummy
@dummy.title: 'My Dummy Entity'
entity Dummy2: managed, DummyAspect {
  key ID : UUID;
  name   : String;
}

//--------------------------------------------------------------------------------
//Workflow
//--------------------------------------------------------------------------------

@workflow
@workflow.title: 'Workflow Test Title'
@workflow.description : 'Workflow Test Description Test'
entity Test: managed, WorkflowAspect {
  key ID : UUID;
  test:String;
}

@workflow
@workflow.title: 'Workflow 1'
@workflow.description : 'Workflow Test Description 1'
entity Workflow1: managed, WorkflowAspect {
  key ID : UUID;
  test:String;
}

@workflow
@workflow.title: 'Workflow 2'
@workflow.description : 'Workflow Test Description 2'
entity Workflow2: managed, WorkflowAspect {
  key ID : UUID;
  test:String;
}

@workflow
@workflow.title: 'Workflow 3'
@workflow.description : 'Workflow Test Description 3'
entity Workflow3: managed, WorkflowAspect {
  key ID : UUID;
  test:String;
}


//----------------------

@workflow
@workflow.title: 'Workflow 4'
@workflow.description : 'Workflow Test Description 4'
entity Workflow4: managed, WorkflowAspect {
  key ID : UUID;
  test:String;
  foo:String;
}

@workflow
@workflow.title: 'Workflow 5'
@workflow.description : 'Workflow Test Description 5'
entity Workflow5: managed, WorkflowAspect {
  key ID : UUID;
  test:String;
  bar:String;
  baz:String;
}

@workflow
@workflow.title: 'Workflow 6'
@workflow.description : 'Workflow Test Description 6'
entity Workflow6: managed, WorkflowAspect {
  key ID : UUID;
  test:String;
  qux:String;
}

@workflow
@workflow.title: 'Workflow 7'
@workflow.description : 'Workflow Test Description 7'
entity Workflow7: managed, WorkflowAspect {
  key ID : UUID;
  test:String;
  klutz:String;
}

