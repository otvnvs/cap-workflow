# Template Monorepo

Package layout:

```
packages/dummy-node/
├── package.json
├── index.js
├── index.cds
├── cds/
│   └── dummy-aspect.cds
└── lib/
    ├── dummy-node.js     ← initDummy, discovery, CDS generation
    └── dummy-service.js  ← ApplicationService handler
```

To use it, add to the consuming service's `package.json`:

```json
{
    "dependencies": {
        "@vp/dummy-node": "file:../../packages/dummy-node"
    }
}
```

Add to `server.js`:

```js
const { initDummy } = require('@vp/dummy-node')

module.exports = async function (options) {
  await initDummy({ cds, cwd: __dirname })
  return cds.server(options)
}
```

And annotate an entity in `db/schema.cds`:

```cds
using { DummyAspect } from '@vp/dummy-node';

@dummy
@dummy.title: 'My Dummy Entity'
entity MyThing : managed, DummyAspect {
  key ID : UUID;
  name   : String;
}
```

The service will be available at /dummy with DummyCatalog and a projection per annotated entity.

Now you can deploy using the following

```bash
cds deploy
```

You can inspect the database

```bash
echo '.tables'|sqlite3 ./db.sqlite
```

You should find listed the following

```
TestService_Dummy1_
TestService_Dummy2_
fs_workflow_Dummy1
fs_workflow_Dummy2

```

Inspect the schema as follows

```bash
echo '.tables'|sqlite3 ./db.sqlite
```

You should find tha aspect applied:

```
CREATE TABLE fs_workflow_Dummy1 (
  createdAt TIMESTAMP_TEXT,
  createdBy NVARCHAR(255),
  modifiedAt TIMESTAMP_TEXT,
  modifiedBy NVARCHAR(255),
  dummyTag NVARCHAR(100),
  dummyActive BOOLEAN DEFAULT TRUE,
  ID NVARCHAR(36) NOT NULL,
  name NVARCHAR(255),
  PRIMARY KEY(ID)
);
```

You can now run the project using the following

```bash
npm run start
```

Log lines should indicate the dummy module has been loaded

```
  packages/dummy-node/index.cds
  packages/dummy-node/cds/dummy-aspect.cds
[workflow-node] - [workflow-node]   vp.dummy.DummyAspect: kind=aspect, @workflow=undefined, projection=false
  packages/dummy-node/index.cds
  packages/dummy-node/cds/dummy-aspect.cds
[dummy-node] - [dummy-node] initDummy starting
[dummy-node] - [dummy-node] discovered 2 @dummy entities
[dummy-node] - [dummy-node] discovered: fs.workflow.Dummy1 — "My Dummy Entity"
[dummy-node] - [dummy-node] discovered: fs.workflow.Dummy2 — "My Dummy Entity"
[dummy-node] - [dummy-node] generated: /tmp/cap-dummy/workflow-demo/dummy-service.cds
  ../../../../../../../../tmp/cap-dummy/workflow-demo/dummy-service.cds
  packages/dummy-node/index.cds
  packages/dummy-node/cds/dummy-aspect.cds
[dummy-node] - [dummy-node] initDummy complete
[workflow-node] - [workflow-node] patchedServer called, from=["*","/tmp/cap-dummy/workflow-demo"]
[workflow-node] - [workflow-node] patchedServer merged.from=["*","/tmp/cap-dummy/workflow-demo","/tmp/cap-workflow/workflow-demo"]
  ../../../../../../../../tmp/cap-dummy/workflow-demo/dummy-service.cds
  packages/dummy-node/index.cds
  packages/dummy-node/cds/dummy-aspect.cds
  at: [ '/dummy' ],
  decl: '../../../../../../../../tmp/cap-dummy/workflow-demo/dummy-service.cds:8',
  impl: 'packages/dummy-node/lib/dummy-service.js'
[dummy-node] - [dummy-node] creating view: DummyProjectionService_Dummy1
[dummy-node] - [dummy-node] creating view: DummyProjectionService_Dummy2
[odata] - GET /dummy/$metadata
```

A new service should be generated at `http://localhost:4004/dummy/DummyCatalog` and two projects at `http://localhost:4004/dummy/Dummy1` and `http://localhost:4004/dummy/Dummy2`
