import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const bundle = readFileSync(process.argv[2], "utf8");
const start = "t.failed>0){tpV16Feedback.current.pending=!1";
const end = "Me.current=setTimeout(()=>{se(``)},3e3)";
assert.equal(bundle.split(start).length - 1, 1);
const branch = `if(${bundle.slice(bundle.indexOf(start), bundle.indexOf(end, bundle.indexOf(start)) + end.length)}`;
const complete = new Function("t", "se", "Me", "tpV16Feedback", "setTimeout", branch);
const queueResult = new Function("t", "tpV16Feedback", "if(Number(t.failed||0)===0&&Number(t.downloaded||0)>0)tpV16Feedback.current.pending=!0");

function scenario(result, queued = null) {
  let state = "downloading";
  let scheduled;
  const feedback = { current: { pending: false } };
  const timer = { current: null };
  if (queued) queueResult(queued, feedback);
  complete(result, (value) => { state = value; }, timer, feedback, (fn, ms) => { scheduled = { fn, ms }; return 1; });
  return { state: () => state, scheduled, feedback };
}

// A: warm cache, B/C: actual completed download, D: a later independent cycle,
// E: failed or interrupted cycle. A queued result models an effect replacement.
assert.equal(scenario({ downloaded: 0, failed: 0 }).state(), "");
for (let i = 0; i < 2; i += 1) {
  const s = scenario({ downloaded: 1, failed: 0 });
  assert.equal(s.state(), "ready");
  assert.equal(s.scheduled.ms, 3000);
  s.scheduled.fn();
  assert.equal(s.state(), "");
}
assert.equal(scenario({ downloaded: 0, failed: 0 }, { downloaded: 1, failed: 0 }).state(), "ready");
assert.equal(scenario({ downloaded: 0, failed: 1 }, { downloaded: 1, failed: 0 }).state(), "partial");
assert.equal(scenario({ downloaded: 0, failed: 0 }, { downloaded: 1, failed: 1 }).state(), "");
console.log("V16 feedback A-E: OK");
