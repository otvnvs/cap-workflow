# Workflow Example Project

```
see ./doc/spec
```

## Installing

```bash
npm install
```

## Running

First deploy

```bash
cds deploy
```

```bash
npm run start
```

## Testing

```
http://localhost:4004
```

Should render dynamically created service endpoint


```
/workflow/ $metadata
 * Test
 * Workflow1
 * Workflow2
 * Workflow3
 * WorkflowCatalog
```

## WorkflowCatalog

Renders dynamically based on entities annotated with `@workflow` (see `db/schema.cds`)

```json
{
  "@odata.context": "$metadata#WorkflowCatalog",
  "value": [
    {
      "entityName": "fs.workflow.Test",
      "entitySetName": "Test",
      "title": "Workflow Test",
      "description": "",
      "keyFieldsJson": "[\"ID\"]"
    },
    {
      "entityName": "fs.workflow.Workflow1",
      "entitySetName": "Workflow1",
      "title": "Workflow 1",
      "description": "",
      "keyFieldsJson": "[\"ID\"]"
    },
    {
      "entityName": "fs.workflow.Workflow2",
      "entitySetName": "Workflow2",
      "title": "Workflow 2",
      "description": "",
      "keyFieldsJson": "[\"ID\"]"
    },
    {
      "entityName": "fs.workflow.Workflow3",
      "entitySetName": "Workflow3",
      "title": "Workflow 3",
      "description": "",
      "keyFieldsJson": "[\"ID\"]"
    }
  ]
}
```

## Workflow Monorepo

This is responsible for dynamically creating the WorkflowCatalog service. It exists at

```
packages/workflow-node
```

It creates the following cds file dynamically

```
/tmp/cap-workflow/core-service/workflow-service.cds
```

This will have content similar to the following

```
using {
  core.db.notificationtemplate.WorkflowTest as __WorkflowEntity_1,
  core.db.notificationtemplate.WorkflowOtherTest as __WorkflowEntity_2
} from '../../../mnt/c/Users/Ockert/src/vmglabs/dischem/dischem-vp/dischem-vp/services/core-service/db/schemas/workflows.cds';

@path: '/workflow'
@impl: '/mnt/c/Users/Ockert/src/vmglabs/dischem/dischem-vp/dischem-vp/packages/workflow-node/lib/workflow-service.js'
service WorkflowProjectionService {
  @readonly entity WorkflowTest as projection on __WorkflowEntity_1;
  @readonly entity WorkflowOtherTest as projection on __WorkflowEntity_2;

  @readonly entity WorkflowCatalog {
    key entityName    : String(255);
        entitySetName : String(255);
        title         : String(255);
        description   : String(1000);
        keyFieldsJson : LargeString;
  }
}
```

This file is bootstrapped in `server.js` as follows

```js
const cds = require('@sap/cds')
const { initWorkflow } = require('@vp/workflow-node')
module.exports = async function (options) {
  await initWorkflow({ cds, cwd: __dirname })
  return cds.server(options)
}
```

## Testing

```bash
./scripts/test.sh
```

## Issues

Failure to get projections tables initialized (resolved now):

```bash
curl "http://localhost:4004/workflow/Workflow1"
```

Response

```json
{
  "error": {
    "message": "no such table: WorkflowProjectionService_Workflow1 in:\nSELECT json_insert('{}','$.\"createdAt\"',createdAt,'$.\"createdBy\"',createdBy,'$.\"modifiedAt\"',modifiedAt,'$.\"modifiedBy\"',modifiedBy,'$.\"workflowStatus\"',workflowStatus,'$.\"workflowSubstatus\"',workflowSubstatus,'$.\"workflowInitiatedBy\"',workflowInitiatedBy,'$.\"workflowInitiatedAt\"',workflowInitiatedAt,'$.\"workflowOwner\"',workflowOwner,'$.\"workflowDueDate\"',workflowDueDate,'$.\"ID\"',ID,'$.\"test\"',test) as _json_ FROM (SELECT \"$W\".createdAt,\"$W\".createdBy,\"$W\".modifiedAt,\"$W\".modifiedBy,\"$W\".workflowStatus,\"$W\".workflowSubstatus,\"$W\".workflowInitiatedBy,\"$W\".workflowInitiatedAt,\"$W\".workflowOwner,\"$W\".workflowDueDate,\"$W\".ID,\"$W\".test FROM WorkflowProjectionService_Workflow1 as \"$W\" ORDER BY \"$W\".ID ASC LIMIT ?)",
    "code": "SQLITE_ERROR",
    "@Common.numericSeverity": 4
  }
}
```
