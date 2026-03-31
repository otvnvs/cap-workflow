/*
//bootstrapping option 1
const cds = require('@sap/cds')
const { initWorkflow } = require('@vp/workflow-node')
module.exports = async function (options) {
  await initWorkflow({ cds, cwd: __dirname })
  return cds.server(options)
}
*/
//bootstrapping option 2
const{initWorkflow}=require("@vp/workflow-node");
const{initDummy}=require("@vp/dummy-node");
const{initWorkflowAgg}=require("@vp/workflow-agg");
const cds=require("@sap/cds")
module.exports=async function (options){
	await initWorkflow({cds,cwd:__dirname});
	await initDummy({cds,cwd:__dirname});
	await initWorkflowAgg({
		cds,
		urls:[
			"http://localhost:4008",
			"http://localhost:4005",
		]
	});
	cds.on('served', (services) => {
		  console.log('served services:', Object.keys(services));
	})
	return cds.server.bind(cds)(options);
}

