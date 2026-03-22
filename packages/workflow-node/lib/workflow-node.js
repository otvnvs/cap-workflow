'use strict';

const cdsLib = require('@sap/cds')
const crypto = require('node:crypto')
const fs     = require('node:fs/promises')
const os     = require('node:os')
const path   = require('node:path')

const WORKFLOW_ASPECT_FIELDS = [
  'workflowStatus',
  'workflowSubstatus',
  'workflowInitiatedBy',
  'workflowInitiatedAt',
  'workflowOwner',
  'workflowDueDate',
]

const STATE = {
  initialized:   false,
  generatedDir:  null,
  discovered:    null,
  serverPatched: false,
  originalServer: null,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function entityLocalName(entityName) {
  const parts = String(entityName || '').split('.')
  return parts[parts.length - 1]
}

function resolveSourceFile(definition, cwd = process.cwd()) {
  const file = definition?.$location?.file
  if (!file) return null
  return path.isAbsolute(file) ? file : path.join(cwd, file)
}

function toImportPath(filePath) {
  // Always use absolute paths in generated using imports.
  // Relative paths from the OS temp dir to the project are fragile
  // across platforms and deploy contexts.
  return filePath.replaceAll('\\', '/')
}

function parseVcapAppName() {
  const raw = process.env.VCAP_APPLICATION
  if (!raw) return null
  try { return JSON.parse(raw)?.application_name || null } catch { return null }
}

function safeBasename(p) {
  return path.basename(p).replace(/[^A-Za-z0-9_-]/g, '-').replace(/^-+|-+$/g, '') || 'app'
}

async function resolvePackageName(cwd) {
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(cwd, 'package.json'), 'utf8'))
    return pkg?.name || null
  } catch { return null }
}

async function resolveAppId(cwd) {
  const vcap = parseVcapAppName()
  if (vcap) return safeBasename(vcap)
  const pkg = await resolvePackageName(cwd)
  if (pkg) return safeBasename(pkg)
  return safeBasename(cwd)
}

// ─── Discovery ────────────────────────────────────────────────────────────────

function discoverWorkflowEntities(csn, options = {}) {
  const log = options.logger || console
  const definitions = csn?.definitions || {}
  const cwd = options.cwd || process.cwd()

  log.info('[workflow-node] scanning CSN definitions for @workflow entities...')

  const allEntityNames = Object.entries(definitions)
    .filter(([, def]) => def.kind === 'entity')
    .map(([name]) => name)
  log.info(`[workflow-node] total entities in model: ${allEntityNames.length}`)
  log.info(`[workflow-node] entities: ${allEntityNames.join(', ')}`)

  const entities = Object.entries(definitions)
    .filter(([name, def]) => {
      const isEntity    = def.kind === 'entity'
      const hasMarker   = def['@workflow'] === true
      // Skip service projections — they have a 'query' property in CSN.
      // Only base db entities should be discovered.
      const isProjection = !!def.query
      log.info(`[workflow-node]   ${name}: kind=${def.kind}, @workflow=${def['@workflow']}, projection=${isProjection}`)
      return isEntity && hasMarker && !isProjection
    })
    .map(([entityName, def]) => {
      log.info(`[workflow-node] processing @workflow entity: ${entityName}`)

      const elements = def.elements || {}
      log.info(`[workflow-node]   elements: ${Object.keys(elements).join(', ')}`)

      const missing = WORKFLOW_ASPECT_FIELDS.filter((f) => !(f in elements))
      if (missing.length > 0) {
        log.info(`[workflow-node]   MISSING aspect fields: ${missing.join(', ')}`)
        throw new Error(
          `[workflow-node] Entity '${entityName}' is marked @workflow but is missing ` +
          `WorkflowAspect fields: ${missing.join(', ')}. Add WorkflowAspect to the entity.`
        )
      }
      log.info(`[workflow-node]   all WorkflowAspect fields present`)

      const keyFields = Object.entries(elements)
        .filter(([, el]) => el.key === true)
        .map(([name]) => name)
      log.info(`[workflow-node]   key fields: ${keyFields.join(', ')}`)

      const sourceFile = resolveSourceFile(def, cwd)
      log.info(`[workflow-node]   sourceFile: ${sourceFile}`)

      const entry = {
        entityName,
        entityLocalName:  entityLocalName(entityName),
        entitySetName:    entityLocalName(entityName),
        sourceFile,
        title:            def['@workflow.title']       ?? def['@title']       ?? entityLocalName(entityName),
        description:      def['@workflow.description'] ?? def['@description'] ?? '',
        keyFields,
        keyFieldsJson:    JSON.stringify(keyFields),
        elements,          // needed for field selection in CDS generation
      }
      log.info(`[workflow-node]   resolved: entitySetName=${entry.entitySetName}, title="${entry.title}"`)
      return entry
    })

  log.info(`[workflow-node] discovery complete — found ${entities.length} @workflow entities`)
  return entities
}

// ─── CDS Generation ───────────────────────────────────────────────────────────

function generateWorkflowServiceCds(discovered, options = {}) {
  const log      = options.logger || console
  const baseDir  = options.baseDir || null
  const implPath = options.implPath

  log.info(`[workflow-node] generating WorkflowProjectionService CDS`)
  log.info(`[workflow-node]   baseDir : ${baseDir}`)
  log.info(`[workflow-node]   implPath: ${implPath}`)

  const aliasByKey = new Map()
  const grouped    = new Map()

  for (const entry of discovered) {
    if (!entry.sourceFile) {
      log.info(`[workflow-node]   skipping ${entry.entityName} — no sourceFile`)
      continue
    }
    const fileKey = entry.sourceFile.replaceAll('\\', '/')
    if (!grouped.has(fileKey)) grouped.set(fileKey, [])
    const alias = `__WorkflowEntity_${aliasByKey.size + 1}`
    aliasByKey.set(entry.entityName, alias)
    grouped.get(fileKey).push({ full: entry.entityName, alias })
    log.info(`[workflow-node]   alias ${entry.entityName} → ${alias}`)
  }

  const usingLines = []
  for (const [filePath, imports] of grouped.entries()) {
    const importPath = toImportPath(filePath)
    log.info(`[workflow-node]   using import: ${importPath}`)
    usingLines.push(
      `using {\n  ${imports.map((i) => `${i.full} as ${i.alias}`).join(',\n  ')}\n} from '${importPath}';`
    )
  }

  const MANAGED_FIELDS    = new Set(['createdAt', 'createdBy', 'modifiedAt', 'modifiedBy'])
  const ASPECT_FIELDS_SET = new Set([
    'workflowStatus', 'workflowSubstatus', 'workflowInitiatedBy',
    'workflowInitiatedAt', 'workflowOwner', 'workflowDueDate',
  ])
  const KEY_FIELD = 'ID'

  const projections = discovered.map((entry) => {
    const alias    = aliasByKey.get(entry.entityName) || entry.entityName
    const elements = entry.elements || {}

    // Exclude non-workflow, non-key, non-managed fields using 'excluding'
    // This keeps the projection on the original entity — no new table created
    const excludedFields = Object.keys(elements).filter((f) => {
      if (entry.keyFields.includes(f)) return false
      if (MANAGED_FIELDS.has(f))       return false
      if (ASPECT_FIELDS_SET.has(f))    return false
      return true
    })

    const excludingClause = excludedFields.length > 0
      ? `
    excluding { ${excludedFields.join(', ')} }`
      : ''

    log.info(`[workflow-node]   projection: ${entry.entitySetName} → ${alias} (excluding: ${excludedFields.join(', ') || 'nothing'})`)
    //return `  @readonly entity ${entry.entitySetName} as projection on ${alias}${excludingClause};`
    return `  entity ${entry.entitySetName} as projection on ${alias}${excludingClause};`
  })

  const catalog = `  @readonly entity WorkflowCatalog {
    key entityName    : String(255);
        entitySetName : String(255);
        title         : String(255);
        description   : String(1000);
        keyFieldsJson : LargeString;
  }

  action start(
    entityName  : String(255),
    keyJson     : LargeString,
    initiatedBy : String(255)
  ) returns {
    entityName          : String(255);
    workflowStatus      : String(20);
    workflowInitiatedBy : String(255);
    workflowInitiatedAt : Timestamp;
  };

  action setDueDate(
    entityName : String(255),
    keyJson    : LargeString,
    dueDate    : Timestamp
  ) returns {
    entityName      : String(255);
    workflowDueDate : Timestamp;
  };

  action assignOwner(
    entityName : String(255),
    keyJson    : LargeString,
    ownerId    : String(255)
  ) returns {
    entityName    : String(255);
    workflowOwner : String(255);
  };

  action transition(
    entityName : String(255),
    keyJson    : LargeString,
    status     : String(20),
    substatus  : String(120)
  ) returns {
    entityName        : String(255);
    workflowStatus    : String(20);
    workflowSubstatus : String(120);
  };`

  const preface   = usingLines.length > 0 ? `${usingLines.join('\n\n')}\n\n` : ''
  const implAnnot = implPath ? `@impl: '${implPath.replaceAll('\\', '/')}'\n` : ''

  const cdsContent = [
    preface,
    `@path: '/workflow'\n`,
    implAnnot,
    `service WorkflowProjectionService {\n`,
    projections.join('\n'),
    '\n\n',
    catalog,
    '\n}\n',
  ].join('')

  log.info(`[workflow-node] generated CDS content:\n${cdsContent}`)
  return cdsContent
}

// ─── Server patching ──────────────────────────────────────────────────────────

function patchServerModelLoading(cds, generatedDir, log) {
  if (STATE.serverPatched) {
    log.info('[workflow-node] server already patched — skipping')
    return
  }
  STATE.serverPatched  = true
  STATE.originalServer = cds.server
  log.info(`[workflow-node] patching cds.server to include: ${generatedDir}`)

  cds.server = function patchedServer(options = {}, ...rest) {
    const merged = { ...options }
    const from   = merged.from
    log.info(`[workflow-node] patchedServer called, from=${JSON.stringify(from)}`)
    if (!from) {
      merged.from = ['*', generatedDir]
    } else if (Array.isArray(from)) {
      if (!from.includes(generatedDir)) merged.from = [...from, generatedDir]
    } else if (typeof from === 'string') {
      merged.from = from.includes(generatedDir) ? from : [from, generatedDir]
    }
    log.info(`[workflow-node] patchedServer merged.from=${JSON.stringify(merged.from)}`)
    return STATE.originalServer.call(this, merged, ...rest)
  }
}

function appendTempSrvFolder(cds, tempDir, log) {
  log.info(`[workflow-node] appendTempSrvFolder: ${tempDir}`)

  const folders = cds.env.folders || (cds.env.folders = {})
  log.info(`[workflow-node]   folders.srv before: ${JSON.stringify(folders.srv)}`)

  if (!folders.srv) {
    folders.srv = ['srv', tempDir]
  } else if (Array.isArray(folders.srv)) {
    if (!folders.srv.includes(tempDir)) folders.srv.push(tempDir)
  } else if (typeof folders.srv === 'string') {
    if (folders.srv !== tempDir) folders.srv = [folders.srv, tempDir]
  }
  log.info(`[workflow-node]   folders.srv after : ${JSON.stringify(folders.srv)}`)

  const roots = cds.env.roots
  log.info(`[workflow-node]   roots before: ${JSON.stringify(roots)}`)
  if (Array.isArray(roots)) {
    if (!roots.includes(tempDir)) roots.push(tempDir)
  } else if (typeof roots === 'string') {
    if (roots !== tempDir) cds.env.roots = [roots, tempDir]
  } else {
    cds.env.roots = ['db', 'srv', tempDir]
  }
  log.info(`[workflow-node]   roots after : ${JSON.stringify(cds.env.roots)}`)

  const envModels = (process.env.CDS_MODEL || '').split(',').map((s) => s.trim()).filter(Boolean)
  log.info(`[workflow-node]   CDS_MODEL before: ${process.env.CDS_MODEL}`)
  if (envModels.length === 0) {
    process.env.CDS_MODEL = `*,${tempDir}`
  } else if (!envModels.includes(tempDir)) {
    envModels.push(tempDir)
    process.env.CDS_MODEL = envModels.join(',')
  }
  log.info(`[workflow-node]   CDS_MODEL after : ${process.env.CDS_MODEL}`)
}

// ─── Main entry point ─────────────────────────────────────────────────────────

async function initWorkflow(options = {}) {
  if (STATE.initialized) {
    console.info('[workflow-node] already initialized — skipping')
    return { generatedDir: STATE.generatedDir, discovered: STATE.discovered }
  }

  const cds    = options.cds    || cdsLib
  const logger = options.logger || cds.log?.('workflow-node') || console
  const cwd    = options.cwd    || process.cwd()

  logger.info(`[workflow-node] initWorkflow starting`)
  logger.info(`[workflow-node]   cwd: ${cwd}`)
  logger.info(`[workflow-node]   node env: ${process.env.NODE_ENV}`)

  // Use cds.model if already loaded — avoids cds.load('*') resolving from the
  // wrong cwd in a monorepo. By the time server.js calls initWorkflow, CDS has
  // already compiled the full model and it's available in cds.model.
  const model = options.model || cds.model || await cds.load('*', { cwd })
  logger.info(`[workflow-node] model source: ${options.model ? 'options.model' : cds.model ? 'cds.model' : 'cds.load'}`)
  logger.info(`[workflow-node] model loaded — definitions: ${Object.keys(model?.definitions || {}).length}`)

  const discovered = discoverWorkflowEntities(model, { cwd, logger })

  if (discovered.length === 0) {
    logger.info('[workflow-node] no @workflow entities found — WorkflowProjectionService will not be generated')
    return { generatedDir: null, discovered }
  }

  const appId       = options.appId || await resolveAppId(cwd)
  const generatedDir = path.join(os.tmpdir(), 'cap-workflow', appId)
  const implPath    = path.join(__dirname, 'workflow-service.js')

  logger.info(`[workflow-node] appId       : ${appId}`)
  logger.info(`[workflow-node] generatedDir: ${generatedDir}`)
  logger.info(`[workflow-node] implPath    : ${implPath}`)

  await fs.mkdir(generatedDir, { recursive: true })
  logger.info(`[workflow-node] temp dir created`)

  const cdsContent = generateWorkflowServiceCds(discovered, { baseDir: generatedDir, implPath, logger })
  const cdsFile    = path.join(generatedDir, 'workflow-service.cds')
  await fs.writeFile(cdsFile, cdsContent, 'utf8')
  logger.info(`[workflow-node] wrote: ${cdsFile}`)

  appendTempSrvFolder(cds, generatedDir, logger)

  logger.info(`[workflow-node] reloading merged model...`)
  const mergedModel = await cds.load(['*', generatedDir])
  logger.info(`[workflow-node] merged model loaded — definitions: ${Object.keys(mergedModel?.definitions || {}).length}`)
  cds.model = cds.linked ? cds.linked(mergedModel) : mergedModel
  logger.info(`[workflow-node] cds.model updated`)

  patchServerModelLoading(cds, generatedDir, logger)

  // Once CAP has served all services and DB is connected:
  // 1. Pass discovered metadata to WorkflowProjectionService for WorkflowCatalog
  // 2. Create SQLite views for each projection so queries resolve correctly
  cds.on('served', async (services) => {
    const svc = services['WorkflowProjectionService']
    if (svc?.setDiscovered) {
      svc.setDiscovered(discovered)
      logger.info(`[workflow-node] WorkflowProjectionService.setDiscovered called`)
    }

    // Create projection views in SQLite so CAP can resolve them at query time.
    // On HANA this is handled automatically — only needed for SQLite.
    try {
      const db = await cds.connect.to('db')
      if (db.kind !== 'sqlite') return

      for (const entry of discovered) {
        const viewName  = `WorkflowProjectionService_${entry.entitySetName}`
        const tableName = entry.entityName.replaceAll('.', '_')
        const elements  = entry.elements || {}

        const MANAGED_FIELDS    = new Set(['createdAt', 'createdBy', 'modifiedAt', 'modifiedBy'])
        const ASPECT_FIELDS_SET = new Set([
          'workflowStatus', 'workflowSubstatus', 'workflowInitiatedBy',
          'workflowInitiatedAt', 'workflowOwner', 'workflowDueDate',
        ])

        const columns = Object.keys(elements).filter((f) => {
          if (entry.keyFields.includes(f)) return true
          if (MANAGED_FIELDS.has(f))       return true
          if (ASPECT_FIELDS_SET.has(f))    return true
          return false
        })

        const colList = columns.join(', ')
        const sql     = `CREATE VIEW IF NOT EXISTS "${viewName}" AS SELECT ${colList} FROM "${tableName}"`

        logger.info(`[workflow-node] creating view: ${viewName} → ${tableName}`)
        await db.run(sql)
      }
    } catch (err) {
      logger.warn(`[workflow-node] failed to create SQLite views: ${err.message}`)
    }
  })

  STATE.initialized  = true
  STATE.generatedDir = generatedDir
  STATE.discovered   = discovered

  logger.info(`[workflow-node] initWorkflow complete`)
  return { generatedDir, discovered }
}

// ─── Test reset ───────────────────────────────────────────────────────────────

function _resetForTests() {
  if (STATE.serverPatched && STATE.originalServer) {
    cdsLib.server = STATE.originalServer
  }
  STATE.initialized   = false
  STATE.generatedDir  = null
  STATE.discovered    = null
  STATE.serverPatched = false
  STATE.originalServer = null
}

module.exports = {
  discoverWorkflowEntities,
  generateWorkflowServiceCds,
  initWorkflow,
  _resetForTests,
  WORKFLOW_ASPECT_FIELDS,
}
