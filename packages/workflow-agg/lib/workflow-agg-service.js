'use strict';

const cds    = require('@sap/cds');
const { SELECT, INSERT, UPDATE, DELETE } = cds.ql
const crypto = require('node:crypto');

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Deterministic UUID from a string — stable across restarts
function deterministicId(input) {
  const hash = crypto.createHash('sha1').update(input).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '5' + hash.slice(13, 16),
    ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join('-');
}

// Fetch WorkflowCatalog from a single source service URL
async function fetchCatalog(url) {
  const endpoint = `${url.replace(/\/$/, '')}/workflow/WorkflowCatalog`;
  const response = await fetch(endpoint, {
    headers: { Accept: 'application/json' },
    signal:  AbortSignal.timeout(5000),   // 5s timeout per source
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${endpoint}`);
  }

  const json = await response.json();
  return json?.value ?? [];
}

// ─── Service ──────────────────────────────────────────────────────────────────

module.exports = class WorkflowAggService extends cds.ApplicationService {


  async init() {
    const WorkflowCatalog = cds.entities['vp.workflowAgg.WorkflowAggService.WorkflowCatalog'];
    // ── Services ───────────────────────────────────────────────────────────────
    // Returns connectivity status for each configured source URL.
    // Attempts a live fetch to determine current status.
    this.on('READ', 'Services', async () => {
      const urls = this._urls ?? [];
      const now  = new Date().toISOString();

      const results = await Promise.allSettled(
        urls.map((url) => fetchCatalog(url))
      );

      return urls.map((url, i) => {
        const result = results[i];
        const ok     = result.status === 'fulfilled';
        return {
          ID:            deterministicId(url),
          url,
          status:        ok ? 'OK' : 'ERROR',
          lastCheckedAt: now,
          errorMessage:  ok ? null : result.reason?.message ?? 'Unknown error',
        };
      });
    });

    // ── WorkflowCatalog ────────────────────────────────────────────────────────
    // Fetches live from all source services and merges results.
    // Unreachable services are skipped — their entries are omitted.
    this.on('READ', 'WorkflowCatalog', async () => {
      const urls = this._urls ?? [];

      const results = await Promise.allSettled(
        urls.map((url) => fetchCatalog(url))
      );

      const entries = [];

      for (let i = 0; i < urls.length; i++) {
        const url    = urls[i];
        const result = results[i];

        if (result.status === 'rejected') {
          cds.log('workflow-agg').warn(`[workflow-agg] skipping ${url}: ${result.reason?.message}`);
          continue;
        }

        for (const item of result.value) {
          entries.push({
            ID:            deterministicId(`${url}::${item.entityName}`),
            serviceUrl:    url,
            entityName:    item.entityName,
            entitySetName: item.entitySetName,
            title:         item.title,
            keyFieldsJson: item.keyFieldsJson,
          });
        }
      }

      return entries;
    });
    this.on('start', async (req) => {
      console.log("workflow-agg:stub:start");
      const { entityName, keyJson, initiatedBy } = req.data
      const keys = JSON.parse(keyJson)
      //--------------------------------------------------------------------------------
      const catalog = await this.run(SELECT.from('WorkflowCatalog'))
      const entry = catalog.find(item => item.entityName === entityName);
      if (entry) {
          const workflowSrv = await cds.connect.to({
         kind: 'rest', 
         credentials: { url: `${entry.serviceUrl}/workflow` }
          })
          try {
         const response = await workflowSrv.post('/start', {
        entityName: entityName,
        keyJson: keyJson,
        initiatedBy: 'alice'
         })
         console.log('Workflow started:', response)
         return response;
          } catch (e) {
         return req.error(400, e.toString())
          }
      } else {
          console.log('Entity not found in catalog, skipping workflow start.')
          return req.error(400, "Entity not found in catalog");
      }
      //--------------------------------------------------------------------------------
    })

    this.on('setDueDate', async (req) => {
      console.log("workflow-agg:stub:setDueDate");
      const { entityName, keyJson, dueDate } = req.data
      const keys = JSON.parse(keyJson)
      //--------------------------------------------------------------------------------
      const catalog = await this.run(SELECT.from('WorkflowCatalog'))
      const entry = catalog.find(item => item.entityName === entityName);
      if (entry) {
          const workflowSrv = await cds.connect.to({
         kind: 'rest', 
         credentials: { url: `${entry.serviceUrl}/workflow` }
          })
          try {
         const response = await workflowSrv.post('/setDueDate', {
        entityName: entityName,
        keyJson: keyJson,
        dueDate: dueDate 
         })
         console.log('Workflow started:', response)
         return response;
          } catch (e) {
         return req.error(400, e.toString())
          }
      } else {
          console.log('Entity not found in catalog, skipping workflow start.')
          return req.error(400, "Entity not found in catalog");
      }
      //--------------------------------------------------------------------------------
    })

    this.on('assignOwner', async (req) => {
      console.log("workflow-agg:stub:assignOwner");
      const { entityName, keyJson, ownerId } = req.data
      const keys = JSON.parse(keyJson)
      //--------------------------------------------------------------------------------
      const catalog = await this.run(SELECT.from('WorkflowCatalog'))
      const entry = catalog.find(item => item.entityName === entityName);
      if (entry) {
          const workflowSrv = await cds.connect.to({
         kind: 'rest', 
         credentials: { url: `${entry.serviceUrl}/workflow` }
          })
          try {
         const response = await workflowSrv.post('/assignOwner', {
        entityName: entityName,
        keyJson: keyJson,
        ownerId: ownerId
         })
         console.log('Workflow started:', response)
         return response;
          } catch (e) {
         return req.error(400, e.toString())
          }
      } else {
          console.log('Entity not found in catalog, skipping workflow start.')
          return req.error(400, "Entity not found in catalog");
      }
      //--------------------------------------------------------------------------------
    })

    this.on('transition', async (req) => {
      console.log("workflow-agg:stub:transition");
      const { entityName, keyJson, status, substatus } = req.data
      const keys = JSON.parse(keyJson)
      //--------------------------------------------------------------------------------
      const catalog = await this.run(SELECT.from('WorkflowCatalog'))
      const entry = catalog.find(item => item.entityName === entityName);
      if (entry) {
          const workflowSrv = await cds.connect.to({
         kind: 'rest', 
         credentials: { url: `${entry.serviceUrl}/workflow` }
          })
          try {
         const response = await workflowSrv.post('/transition', {
        entityName: entityName,
        keyJson: keyJson,
        status: status,
        substatus: substatus
         })
         console.log('Workflow started:', response)
         return response;
          } catch (e) {
         return req.error(400, e.toString())
          }
      } else {
          console.log('Entity not found in catalog, skipping workflow start.')
          return req.error(400, "Entity not found in catalog");
      }
      //--------------------------------------------------------------------------------
    })

    await super.init();
  }

  // Called by initWorkflowAgg() to inject the configured URLs
  setUrls(urls) {
    this._urls = urls;
  }
};
