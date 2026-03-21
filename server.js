const cds = require('@sap/cds')
const { initWorkflow } = require('@vp/workflow-node')
module.exports = async function (options) {
  await initWorkflow({ cds, cwd: __dirname })
  return cds.server(options)
}
