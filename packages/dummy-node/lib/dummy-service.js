'use strict';
const cds = require('@sap/cds');
module.exports = class DummyProjectionService extends cds.ApplicationService {
  async init() {
    // DummyCatalog served from memory — no DB table
    this.on('READ', 'DummyCatalog', () => {
      return (this._discovered ?? []).map((e) => ({
        entityName:    e.entityName,
        entitySetName: e.entitySetName,
        title:         e.title,
        keyFieldsJson: JSON.stringify(e.keyFields),
      }))
    })

    await super.init()
  }
  setDiscovered(discovered) {
    this._discovered = discovered
  }
}
