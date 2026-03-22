'use strict';
 
const cds = require('@sap/cds');
 
module.exports = class WorkflowProjectionService extends cds.ApplicationService {
 
  async init() {
    // Intercept READ for WorkflowCatalog — return in-memory data,
    // never fall through to the DB
    this.on('READ', 'WorkflowCatalog', (req) => {
      return (this._discovered ?? []).map((e) => ({
        entityName:    e.entityName,
        entitySetName: e.entitySetName,
        title:         e.title,
        description:   e.description,
        keyFieldsJson: e.keyFieldsJson,
      }))
    })
 
    await super.init()
  }
 
  // Called by initWorkflow() via the 'served' hook to inject discovered metadata
  setDiscovered(discovered) {
    this._discovered = discovered
  }
}
