'use strict';

const cds = require('@sap/cds');
const { start, setDueDate, assignOwner, transition } = require('@vp/workflow-node');

const ENTITY_NAME = 'fs.workflow.Test';

module.exports = class TestService extends cds.ApplicationService {

  async init() {

/*
### Workflow Identity

Each source entity row is the workflow instance. There is no separate workflow UUID in v1.

Canonical workflow identity is:

- `serviceId + entityName + primaryKey`
*/

    this.on('startWorkflow', async (req) => {
      const { id, initiatedBy } = req.data;
      return start(
        { entityName: ENTITY_NAME, keys: { ID: id } },
        { initiatedBy: initiatedBy ?? req.user?.id }
      );
    });

    this.on('setDueDate', async (req) => {
      const { id, dueDate } = req.data;
      return setDueDate(
        { entityName: ENTITY_NAME, keys: { ID: id } },
        dueDate
      );
    });

    this.on('assignOwner', async (req) => {
      const { id, ownerId } = req.data;
      return assignOwner(
        { entityName: ENTITY_NAME, keys: { ID: id } },
        ownerId
      );
    });

    this.on('transition', async (req) => {
      const { id, status, substatus } = req.data;
      return transition(
        { entityName: ENTITY_NAME, keys: { ID: id } },
        status,
        substatus
      );
    });

    await super.init();
  }

};
