using { fs.workflow as db } from '../db/schema';
service TestService {
  entity Workflow1_ as projection on db.Workflow1 ;
  entity Workflow2_ as projection on db.Workflow2 ;
  entity Workflow3_ as projection on db.Workflow3 ;
  entity Workflow4_ as projection on db.Workflow4 ;
  entity Workflow5_ as projection on db.Workflow5 ;
  entity Workflow6_ as projection on db.Workflow6 ;
  entity Workflow7_ as projection on db.Workflow7 ;
  entity Dummy1_ as projection on db.Dummy1 ;
  entity Dummy2_ as projection on db.Dummy2 ;
}
