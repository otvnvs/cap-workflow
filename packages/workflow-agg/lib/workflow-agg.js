"use strict";
const path = require("node:path");
const cdsLib = require("@sap/cds");
async function initWorkflowAgg(options = {}) {
	const cds = options.cds || cdsLib;
	const logger = options.logger || cds.log?.("workflow-agg") || console;
	const urls = options.urls || [];
	const workflowCds = path.join(__dirname, "../cds/workflow-agg-service.cds");
	if (!cds._workflowAggPatched) {
		const _originalServer = cds.server;
		cds.server = function (opts = {}, ...args) {
			opts.from = opts.from || ["*"];
			const from = Array.isArray(opts.from) ? opts.from : [opts.from];
			
			if (!from.includes(workflowCds)) {
				from.push(workflowCds);
				opts.from = from;
				logger.info(`[workflow-agg] added model: ${workflowCds}`);
			}
			return _originalServer.call(this, opts, ...args);
		};
		cds._workflowAggPatched = true;
	}
	cds.on("served", async (services) => {
		const svc = services["vp.workflowAgg.WorkflowAggService"];
		if (svc?.setUrls) {
			svc.setUrls(urls);
			logger.info(`[workflow-agg] injected ${urls.length} source(s) into WorkflowAggService`);
		}
		try {
			const db = await cds.connect.to("db");
			if (db.kind !== "sqlite") return;
			const viewSql = `CREATE VIEW IF NOT EXISTS vp_workflowAgg_WorkflowCatalog AS SELECT * FROM vp_workflowAgg_Services`; 
			await db.run(viewSql);
			logger.info("[workflow-agg] SQLite views verified");
		} catch (err) {
			logger.warn(`[workflow-agg] SQLite view setup skipped: ${err.message}`);
		}
	});
	if (urls.length === 0) {
		logger.warn("[workflow-agg] no source URLs configured");
	}
}
module.exports = { initWorkflowAgg };
