//const { initSettings } = require('@vp/settings-node')
const { initWorkflow } = require('@vp/workflow-node')
//const { reconcileInternalRolesOnStartup } = require('./internal-role-reconciliation')

async function bootstrapCoreService(options = {}) {
  const cds = options.cds
  if (!cds) {
    throw new Error('bootstrapCoreService requires cds')
  }

  const cwd = options.cwd
  await initWorkflow({ cds, cwd: __dirname })//vs at top//right position
  const serverImpl = options.serverImpl || cds.server.bind(cds)
  const initWorkflowImpl = options.initWorkflowImpl || initWorkflow
  //const initSettingsImpl = options.initSettingsImpl || initSettings
  //const reconcileImpl = options.reconcileImpl || reconcileInternalRolesOnStartup

  cds.on('bootstrap', (app) => {
    app.use((req, res, next) => {
      res.header(
        'Access-Control-Allow-Origin',
        'https://afsug-hackathon.launchpad.cfapps.eu20.hana.ondemand.com'
      )
      res.header(
        'Access-Control-Allow-Methods',
        'GET,POST,PUT,PATCH,DELETE,OPTIONS'
      )
      res.header(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, Accept, Origin, X-Requested-With'
      )

      if (req.method === 'OPTIONS') {
        return res.sendStatus(204)
      }
      next()
    })
  })

  //await initSettingsImpl({ cds, cwd })
  //await initWorkflowImpl({ cds, cwd })
  //await reconcileImpl({ cds })
  return serverImpl(options.serverOptions)
}

module.exports = {
  bootstrapCoreService
}

