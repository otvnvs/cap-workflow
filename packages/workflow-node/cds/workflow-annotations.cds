namespace vp.workflow;

// @workflow Annotation Vocabulary
// Declares the flat annotation terms understood by the workflow plugin.
// All terms are optional. @workflow alone (no sub-term) marks the entity.
//
// Usage on a source entity:
//
//   @workflow
//   @workflow.title: 'Purchase Order Approval'
//   @workflow.description: 'Vendor approval workflow for purchase orders'
//   entity PurchaseOrders : managed, WorkflowAspect { ... }

// Marks an entity as workflow-enabled. No value required.
//annotation workflow;

// Human-readable display name for the workflow definition.
//annotation workflow.title       : String;

// Longer description shown in the workflow aggregator UI.
//annotation workflow.description : String;
// @workflow Annotation Vocabulary
// CDS annotations don't require formal declaration ÔÇö they are applied directly
// on entities and resolved by the plugin at runtime via CSN inspection.
//
// Supported flat terms:
//
//   @workflow
//   @workflow.title       : 'My Workflow'
//   @workflow.description : 'Longer description'
//
// Usage example:
//
//   @workflow
//   @workflow.title: 'Purchase Order Approval'
//   @workflow.description: 'Vendor approval workflow for purchase orders'
//   entity PurchaseOrders : managed, WorkflowAspect {
//     key ID : UUID;
//   }

