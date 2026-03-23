/*
const cds = require('@sap/cds')
const { initWorkflow } = require('@vp/workflow-node')
module.exports = async function (options) {
  await initWorkflow({ cds, cwd: __dirname })
  return cds.server(options)
}
*/
const cds = require('@sap/cds')
const { bootstrapCoreService } = require('./srv/lib/bootstrap-core-service')

module.exports = async function (options) {
  return bootstrapCoreService({
    cds,
    cwd: __dirname,
    serverOptions: options
  })
}

