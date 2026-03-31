'use strict';

const cdsLib = require('@sap/cds')
const fs     = require('node:fs/promises')
const os     = require('node:os')
const path   = require('node:path')

// ─── The annotation that marks an entity as dummy-enabled ─────────────────────
const DUMMY_MARKER      = '@dummy'
const DUMMY_ASPECT_FIELDS = ['dummyTag', 'dummyActive']

const STATE = {
  initialized:   false,
  generatedDir:  null,
  discovered:    null,
  serverPatched: false,
  originalServer: null,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function entityLocalName(entityName) {
  return String(entityName || '').split('.').pop()
}

function resolveSourceFile(definition, cwd = process.cwd()) {
  const file = definition?.$location?.file
  if (!file) return null
  return path.isAbsolute(file) ? file : path.join(cwd, file)
}

function toImportPath(filePath) {
  return filePath.replaceAll('\\', '/')
}

async function resolveAppId(cwd) {
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(cwd, 'package.json'), 'utf8'))
    return path.basename(pkg?.name || cwd).replace(/[^A-Za-z0-9_-]/g, '-')
  } catch {
    return path.basename(cwd)
  }
}

// ─── Discovery ────────────────────────────────────────────────────────────────

function discoverDummyEntities(csn, options = {}) {
  const log         = options.logger || console
  const definitions = csn?.definitions || {}
  const cwd         = options.cwd || process.cwd()

  const entities = Object.entries(definitions)
    .filter(([, def]) => {
      return def.kind === 'entity'
        && def[DUMMY_MARKER] === true
        && !def.query                    // skip service projections
    })
    .map(([entityName, def]) => {
      const elements = def.elements || {}

      // Validate aspect fields present
      const missing = DUMMY_ASPECT_FIELDS.filter((f) => !(f in elements))
      if (missing.length > 0) {
        throw new Error(
          `[dummy-node] Entity '${entityName}' is marked @dummy but is missing ` +
          `DummyAspect fields: ${missing.join(', ')}. Add DummyAspect to the entity.`
        )
      }

      const keyFields = Object.entries(elements)
        .filter(([, el]) => el.key === true)
        .map(([name]) => name)

      return {
        entityName,
        entitySetName: entityLocalName(entityName),
        sourceFile:    resolveSourceFile(def, cwd),
        title:         def['@dummy.title'] ?? def['@title'] ?? entityLocalName(entityName),
        keyFields,
        elements,
      }
    })

  log.info(`[dummy-node] discovered ${entities.length} @dummy entities`)
  return entities
}

// ─── CDS Generation ───────────────────────────────────────────────────────────

function generateDummyServiceCds(discovered, options = {}) {
  const implPath = options.implPath

  // Group by source file for using imports
  const aliasByKey = new Map()
  const grouped    = new Map()

  for (const entry of discovered) {
    if (!entry.sourceFile) continue
    const fileKey = entry.sourceFile.replaceAll('\\', '/')
    if (!grouped.has(fileKey)) grouped.set(fileKey, [])
    const alias = `__DummyEntity_${aliasByKey.size + 1}`
    aliasByKey.set(entry.entityName, alias)
    grouped.get(fileKey).push({ full: entry.entityName, alias })
  }

  const usingLines = []
  for (const [filePath, imports] of grouped.entries()) {
    usingLines.push(
      `using {\n  ${imports.map((i) => `${i.full} as ${i.alias}`).join(',\n  ')}\n} from '${toImportPath(filePath)}';`
    )
  }

  // One projection per discovered entity — key + aspect fields only
  const ASPECT_SET   = new Set(DUMMY_ASPECT_FIELDS)
  const MANAGED_SET  = new Set(['createdAt', 'createdBy', 'modifiedAt', 'modifiedBy'])

  const projections = discovered.map((entry) => {
    const alias    = aliasByKey.get(entry.entityName) || entry.entityName
    const elements = entry.elements || {}

    const excluded = Object.keys(elements).filter((f) => {
      if (entry.keyFields.includes(f)) return false
      if (MANAGED_SET.has(f))         return false
      if (ASPECT_SET.has(f))          return false
      return true
    })

    const excludingClause = excluded.length > 0
      ? `\n    excluding { ${excluded.join(', ')} }`
      : ''

    return `  @readonly entity ${entry.entitySetName} as projection on ${alias}${excludingClause};`
  })

  // DummyCatalog — in-memory metadata entity
  const catalog = `  @readonly entity DummyCatalog {
    key entityName    : String(255);
        entitySetName : String(255);
        title         : String(255);
        keyFieldsJson : LargeString;
  }`

  const preface   = usingLines.length > 0 ? `${usingLines.join('\n\n')}\n\n` : ''
  const implAnnot = implPath ? `@impl: '${implPath.replaceAll('\\', '/')}'\n` : ''

  return [
    preface,
    `@path: '/dummy'\n`,
    implAnnot,
    `service DummyProjectionService {\n`,
    projections.join('\n'),
    '\n\n',
    catalog,
    '\n}\n',
  ].join('')
}

// ─── Server patching (same pattern as workflow-node / settings-node) ──────────

function patchServerModelLoading(cds, generatedDir) {
  if (STATE.serverPatched) return
  STATE.serverPatched  = true
  STATE.originalServer = cds.server

  cds.server = function patchedServer(options = {}, ...rest) {
    const merged = { ...options }
    const from   = merged.from
    if (!from) {
      merged.from = ['*', generatedDir]
    } else if (Array.isArray(from)) {
      if (!from.includes(generatedDir)) merged.from = [...from, generatedDir]
    } else if (typeof from === 'string') {
      merged.from = from.includes(generatedDir) ? from : [from, generatedDir]
    }
    return STATE.originalServer.call(this, merged, ...rest)
  }
}

function appendTempSrvFolder(cds, tempDir) {
  const folders = cds.env.folders || (cds.env.folders = {})

  if (!folders.srv) {
    folders.srv = ['srv', tempDir]
  } else if (Array.isArray(folders.srv)) {
    if (!folders.srv.includes(tempDir)) folders.srv.push(tempDir)
  } else if (typeof folders.srv === 'string') {
    if (folders.srv !== tempDir) folders.srv = [folders.srv, tempDir]
  }

  const roots = cds.env.roots
  if (Array.isArray(roots)) {
    if (!roots.includes(tempDir)) roots.push(tempDir)
  } else if (typeof roots === 'string') {
    if (roots !== tempDir) cds.env.roots = [roots, tempDir]
  } else {
    cds.env.roots = ['db', 'srv', tempDir]
  }

  const envModels = (process.env.CDS_MODEL || '').split(',').map((s) => s.trim()).filter(Boolean)
  if (envModels.length === 0) {
    process.env.CDS_MODEL = `*,${tempDir}`
  } else if (!envModels.includes(tempDir)) {
    envModels.push(tempDir)
    process.env.CDS_MODEL = envModels.join(',')
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

async function initDummy(options = {}) {
  if (STATE.initialized) return { generatedDir: STATE.generatedDir, discovered: STATE.discovered }

  const cds    = options.cds    || cdsLib
  const logger = options.logger || cds.log?.('dummy-node') || console
  const cwd    = options.cwd    || process.cwd()
  const model  = options.model  || cds.model || await cds.load('*', { cwd })

  logger.info('[dummy-node] initDummy starting')

  const discovered = discoverDummyEntities(model, { cwd, logger })

  if (discovered.length === 0) {
    logger.info('[dummy-node] no @dummy entities found — DummyProjectionService will not be generated')
    return { generatedDir: null, discovered }
  }

  for (const e of discovered) logger.info(`[dummy-node] discovered: ${e.entityName} — "${e.title}"`)

  const appId       = await resolveAppId(cwd)
  const generatedDir = path.join(os.tmpdir(), 'cap-dummy', appId)
  const implPath    = path.join(__dirname, 'dummy-service.js')

  await fs.mkdir(generatedDir, { recursive: true })

  const cdsContent = generateDummyServiceCds(discovered, { implPath })
  await fs.writeFile(path.join(generatedDir, 'dummy-service.cds'), cdsContent, 'utf8')
  logger.info(`[dummy-node] generated: ${path.join(generatedDir, 'dummy-service.cds')}`)

  appendTempSrvFolder(cds, generatedDir)

  const mergedModel = await cds.load(['*', generatedDir])
  cds.model = cds.linked ? cds.linked(mergedModel) : mergedModel

  patchServerModelLoading(cds, generatedDir)

  // Create SQLite views for each projection in the served hook
  cds.on('served', async (services) => {
    // Pass discovered metadata to service for DummyCatalog reads
    const svc = services['DummyProjectionService']
    if (svc?.setDiscovered) svc.setDiscovered(discovered)

    // Create SQLite views so projections resolve to base tables
    try {
      const db = await cds.connect.to('db')
      if (db.kind !== 'sqlite') return

      for (const entry of discovered) {
        const viewName  = `DummyProjectionService_${entry.entitySetName}`
        const tableName = entry.entityName.replaceAll('.', '_')
        const cols      = Object.keys(entry.elements || {}).filter((f) => {
          if (entry.keyFields.includes(f))   return true
          if (MANAGED_SET_INNER.has(f))      return true
          if (ASPECT_SET_INNER.has(f))       return true
          return false
        })
        const sql = `CREATE VIEW IF NOT EXISTS "${viewName}" AS SELECT ${cols.join(', ')} FROM "${tableName}"`
        logger.info(`[dummy-node] creating view: ${viewName}`)
        await db.run(sql)
      }
    } catch (err) {
      logger.warn(`[dummy-node] failed to create SQLite views: ${err.message}`)
    }
  })

  STATE.initialized  = true
  STATE.generatedDir = generatedDir
  STATE.discovered   = discovered

  logger.info('[dummy-node] initDummy complete')
  return { generatedDir, discovered }
}

const MANAGED_SET_INNER = new Set(['createdAt', 'createdBy', 'modifiedAt', 'modifiedBy'])
const ASPECT_SET_INNER  = new Set(DUMMY_ASPECT_FIELDS)

function _resetForTests() {
  if (STATE.serverPatched && STATE.originalServer) cdsLib.server = STATE.originalServer
  STATE.initialized   = false
  STATE.generatedDir  = null
  STATE.discovered    = null
  STATE.serverPatched = false
  STATE.originalServer = null
}

module.exports = { initDummy, discoverDummyEntities, generateDummyServiceCds, _resetForTests, DUMMY_ASPECT_FIELDS }
