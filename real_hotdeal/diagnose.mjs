// Source diagnostics are report-only: never interpret a reachable feed as a verified deal.
import { collectFeeds } from './collect.mjs';
import { triageLeads } from './triage.mjs';
export async function diagnoseSources(sources,{fetcher=fetch,now=Date.now()}={}) {
  const reports=[];
  for (const source of sources) {
    if (!source?.enabled || !source?.feedUrl) {
      reports.push({id:source?.id??'unknown',status:'disabled',leads:0,review:0,hold:0,errors:[]});
      continue;
    }
    if (source.adapter !== 'rss') {
      reports.push({id:source.id,status:'unsupported_adapter',leads:0,review:0,hold:0,errors:['unsupported_adapter']});
      continue;
    }
    const result=await collectFeeds([source.feedUrl],{fetcher});
    const triaged=triageLeads(result.leads,{now});
    const review=triaged.filter(x=>x.triageStatus==='review').length;
    reports.push({id:source.id,status:result.errors.length?'error':result.leads.length?'reachable_with_items':'reachable_empty',leads:result.leads.length,review,hold:triaged.length-review,errors:result.errors.map(x=>x.error)});
  }
  return {generatedAt:new Date(now).toISOString(),sources:reports,totalLeads:reports.reduce((sum,x)=>sum+x.leads,0),verifiedDeals:0};
}
