'use strict';
// Current evidence locations after user-requested removal of duplicate home prose.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),file=path.join(root,'docs/seo/content-expansion-2026-10-12/coverage.json');
const data=JSON.parse(fs.readFileSync(file,'utf8'));
const explanationDestinations={HM0231:'outdoor-posts-and-wall-fixtures',HM0285:'floor-edge-movement-and-moisture',HM0286:'floor-edge-movement-and-moisture',HM0351:'surface-cleaning-and-material-risk'};
for(const row of data.records){
  for(const field of ['bodyEvidence','decisionEvidence','scenarioEvidence']){
    const evidence=row[field];if(!evidence||evidence.path!=='/')continue;
    if(evidence.fragment==='local-repair-requests'){
      evidence.fragment='home-services';evidence.excerpt='The Ellis Perth office provides direct handyman services for home repairs and maintenance.';
    }
    if(evidence.fragment==='repair-quote-process'){
      evidence.path='/services/handyman-interiors-appliance-repairs/handymen/';evidence.fragment='quote-inclusions-and-business-checks';
      evidence.excerpt='A useful quote identifies the tasks, labour basis, materials, supply responsibility, access assumptions, removal, disposal and exclusions.';
    }
  }
  if(explanationDestinations[row.id]&&row.faqEvidence){
    row.educationalEvidence={path:row.faqEvidence.path,fragment:explanationDestinations[row.id],excerpt:row.faqEvidence.answerExcerpt};delete row.faqEvidence;
  }
}
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
