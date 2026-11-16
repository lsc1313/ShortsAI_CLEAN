import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { isScheduledNow } from "../automation/schedulerTiming.js";

const job = {hour:12,minute:0,id:"shopping-recommendation"};
const dt = (hour,minute,seconds=0) => new Date(2026,10,16,hour,minute,seconds);

test("starting PC after a scheduled slot does not replay old tasks",()=>{
    assert.equal(isScheduledNow(job,dt(21,15)),false);
    assert.equal(isScheduledNow(job,dt(12,2)),false);
    assert.equal(isScheduledNow(job,dt(11,59,59)),false);
});
test("scheduled tasks still launch during normal slot",()=>{
    assert.equal(isScheduledNow(job,dt(12,0)),true);
    assert.equal(isScheduledNow(job,dt(12,0,59)),true);
    assert.equal(isScheduledNow(job,dt(12,1,29)),true);
    assert.equal(isScheduledNow(job,dt(12,1,30)),false);
});
test("scheduler durably claims before generation and never clears claim on failure",()=>{
    const s=fs.readFileSync(new URL("../automation/masterScheduler.js",import.meta.url),"utf8");
    const h=fs.readFileSync(new URL("../automation/schedulerHistory.js",import.meta.url),"utf8");
    assert.ok(s.indexOf("claimSchedulerJob(key)") < s.indexOf("executionResult = await runShoppingRecommendationJob()"));
    assert.ok(!s.includes("removeCompletedJob(key)"));
    assert.match(s,/finishSchedulerJob\(key, failure\)/);
    assert.match(h,/fs\.renameSync\(temp, HISTORY_FILE\)/);
    assert.match(h,/if \(data\.attempts\[key\] \|\| data\.completed\.includes\(key\)\) return false/);
});
