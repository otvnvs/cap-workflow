# FS-Workflows

## Summary

This feature standardizes workflow state across services using the same overall pattern as the settings mechanism:

- Source services mark CDS entities with `@workflow`
- A client package discovers those entities and generates a local workflow service
- A shared workflow aspect provides the common workflow fields
- A central workflow aggregator service collects workflow definitions and workflow instance state from all configured source services

In v1, the aggregator supports reads plus proxy updates for `workflowOwner` and `workflowDueDate`. Workflow status changes remain owned by source services and are performed through shared helper APIs, not through metadata-declared aggregator actions.

## In Scope

- A new package `@vp/workflow-node`, parallel to `@vp/settings-node`
- A shared CDS aspect `WorkflowAspect` with the platform workflow fields
- Discovery of CDS entities annotated with `@workflow`
- Generation of a local `WorkflowProjectionService` at `@(path: '/workflow')`
- A central `WorkflowAggregatorService` at `@(path: '/workflow-agg')`
- Aggregation of workflow definitions and workflow instance state from multiple services
- Aggregator PATCH support for `workflowOwner` and `workflowDueDate`
- Shared helper APIs for common workflow mutations in source services
- Platform-level workflow status enum enforcement
- Service-defined freeform `workflowSubstatus`

## Out of Scope

- Annotation-defined workflow actions
- Generic aggregator-driven workflow transitions
- Separate workflow UUIDs stored on source entities
- User display-name enrichment
- Central validation of service-specific substatus values

## Source Model

A source entity is workflow-enabled when it:

- Includes `WorkflowAspect`
- Is marked with `@workflow`

Example:

```cds
using { managed } from '@sap/cds/common';
using { WorkflowAspect } from '@vp/workflow-node';

@workflow
@title: 'Purchase Order Approval'
@description: 'Vendor approval workflow for purchase orders'
entity PurchaseOrders : managed, WorkflowAspect {
  key ID : UUID;
  ...
}
```

### WorkflowAspect

The shared aspect contains these fields:

- `workflowStatus : WorkflowStatus default #NOT_STARTED`
- `workflowSubstatus : String(120)`
- `workflowInitiatedBy : String(255)`
- `workflowInitiatedAt : Timestamp`
- `workflowOwner : String(255)`
- `workflowDueDate : Timestamp`

`managed` remains the source of standard audit fields where already used. The workflow aspect does not duplicate those fields.

### WorkflowStatus

The platform workflow enum is fixed in v1:

- `NOT_STARTED`
- `IN_PROGRESS`
- `BLOCKED`
- `COMPLETED`
- `CANCELLED`

`workflowSubstatus` is freeform and service-defined.

### Annotation Contract

`@workflow` supports these v1 terms:

- `@workflow`
- `@workflow.title`
- `@workflow.description`

The annotation does not declare actions in v1.

## Workflow Client Package

Create `@vp/workflow-node` as the workflow equivalent of `@vp/settings-node`.

Responsibilities:

- Discover all CDS entities marked with `@workflow`
- Validate that each discovered entity includes `WorkflowAspect`
- Generate a deterministic local `WorkflowProjectionService`
- Expose that service at `@(path: '/workflow')`
- Expose metadata needed by the central aggregator
- Provide shared helper APIs for workflow field mutation

### Local Service Contract

The generated local workflow service must expose:

- `WorkflowCatalog` as a read-only metadata entity for discovered workflow-enabled entities
- One projection per workflow-enabled source entity

Each generated projection must expose:

- All source primary key fields
- All fields from `WorkflowAspect`
- Existing `managed` audit fields when present on the source entity

`WorkflowCatalog` must expose at minimum:

- `entityName`
- `entitySetName`
- `title`
- `description`
- `keyFieldsJson`

### Workflow Identity

Each source entity row is the workflow instance. There is no separate workflow UUID in v1.

Canonical workflow identity is:

- `serviceId + entityName + primaryKey`

## Workflow Helper APIs

The workflow package provides shared helper APIs for source services:

- `start(entityRef, options)`
- `assignOwner(entityRef, ownerId)`
- `setDueDate(entityRef, dueDate)`
- `transition(entityRef, status, substatus?)`

Expected behavior:

- `start` sets `workflowStatus = IN_PROGRESS`, `workflowInitiatedBy`, and `workflowInitiatedAt`
- `assignOwner` updates only `workflowOwner`
- `setDueDate` updates only `workflowDueDate`
- `transition` validates the platform enum and may update `workflowSubstatus`

Existing domain services may wrap these helpers with service-specific business rules.

## Workflow Aggregator

Create a central `WorkflowAggregatorService` at `@(path: '/workflow-agg')`.

The service follows the same operational shape as the settings aggregator:

- Uses a static service catalog for source-service discovery
- Connects to each configured source service’s `/workflow` endpoint
- Caches metadata and runtime data per source service
- Surfaces source connectivity/authorization status without breaking aggregation for other services

### Aggregator Entities

The aggregator exposes:

- `Services`
- `WorkflowDefinitions`
- `WorkflowInstances`

### Services

Contains source-service metadata and health state, including:

- `ID`
- `title`
- `appName`
- `description`
- `baseUrl`
- `status`
- `statusCriticality`
- `lastCheckedAt`

### WorkflowDefinitions

Contains one row per workflow-enabled entity:

- `ID`
- `serviceId`
- `entityName`
- `entitySetName`
- `title`
- `description`
- `keyFieldsJson`

### WorkflowInstances

Contains one row per workflow-enabled entity instance:

- `ID`
- `serviceId`
- `definition_ID`
- `entityName`
- `entityKeyJson`
- `workflowStatus`
- `workflowSubstatus`
- `workflowInitiatedBy`
- `workflowInitiatedAt`
- `workflowOwner`
- `workflowDueDate`
- `lastChangedAt`
- `lastChangedBy`

`entityKeyJson` is the canonical serialized primary-key object with key names sorted lexicographically. `ID` is a deterministic UUID derived from `serviceId`, `entityName`, and `entityKeyJson`.

## Aggregator Write Rules

The aggregator is writable only for assignment fields in v1.

Allowed PATCH fields:

- `workflowOwner`
- `workflowDueDate`

Rejected PATCH fields:

- `workflowStatus`
- `workflowSubstatus`
- `workflowInitiatedBy`
- `workflowInitiatedAt`

PATCH flow:

1. Resolve the owning source service and workflow definition
2. Rebuild the source entity key from `entityKeyJson`
3. Proxy the PATCH to the source service’s `/workflow` projection
4. Refresh the source row and return the updated aggregator row

The aggregator does not expose workflow-transition actions in v1.

## Security

Define platform roles parallel to settings:

- `WorkflowViewer` for read access
- `WorkflowAdmin` for owner and due-date updates

Source services and the aggregator must enforce the same role names.

## Acceptance Criteria

- Entities annotated with `@workflow` are discovered automatically by `@vp/workflow-node`
- Invalid `@workflow` usage fails generation with a clear validation error
- Each source service exposes a deterministic `/workflow` endpoint
- The aggregator discovers workflow definitions and instances from multiple services
- Aggregated identity is stable across refreshes
- The aggregator can update `workflowOwner`
- The aggregator can update `workflowDueDate`
- The aggregator rejects direct status changes
- The platform status enum is enforced in source helpers and generated services
- `workflowSubstatus` is returned unchanged and remains service-defined

