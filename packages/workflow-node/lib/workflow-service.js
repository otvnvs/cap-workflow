'use strict';

const cds = require('@sap/cds');
const { start, setDueDate, assignOwner, transition } = require('./workflow-helpers');

module.exports = class WorkflowProjectionService extends cds.ApplicationService {

  async init() {

    // WorkflowCatalog — served from memory, no DB table
    this.on('READ', 'WorkflowCatalog', () => {
      return (this._discovered ?? []).map((e) => ({
        entityName:    e.entityName,
        entitySetName: e.entitySetName,
        title:         e.title,
        description:   e.description,
        keyFieldsJson: e.keyFieldsJson,
      }))
    })

    // ── Workflow helper actions ────────────────────────────────────────────────
    // keyJson is a JSON string of the entity key object e.g. '{"ID":"abc-123"}'

    this.on('start', async (req) => {
      const { entityName, keyJson, initiatedBy } = req.data
      const keys = JSON.parse(keyJson)
      return start(
        { entityName, keys },
        { initiatedBy: initiatedBy ?? req.user?.id }
      )
    })

    this.on('setDueDate', async (req) => {
      const { entityName, keyJson, dueDate } = req.data
      const keys = JSON.parse(keyJson)
      return setDueDate({ entityName, keys }, dueDate)
    })

    this.on('assignOwner', async (req) => {
      const { entityName, keyJson, ownerId } = req.data
      const keys = JSON.parse(keyJson)
      return assignOwner({ entityName, keys }, ownerId)
    })

    this.on('transition', async (req) => {
      const { entityName, keyJson, status, substatus } = req.data
      const keys = JSON.parse(keyJson)
      return transition({ entityName, keys }, status, substatus)
    })

    await super.init()
  }

  setDiscovered(discovered) {
    this._discovered = discovered
  }
}
