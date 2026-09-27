// dagrun.js：按处理预算处理并留账，收尾不限预算清账
import { complete } from "./dag.js";

function badEvent() {
  const error = new Error("bad event");
  error.code = "E_BAD_EVENT";
  return error;
}

function validEvent(event) {
  return !!event && typeof event === "object" && typeof event.task === "string";
}

export function step(spec) {
  const state = spec.state;
  const events = spec.events || [];
  let budget = typeof spec.budget === "number" ? spec.budget : 0;
  for (const event of events) {
    if (!validEvent(event)) throw badEvent();
  }
  const applied = (state.applied || []).slice();
  const backlog = (state.ledger || []).map(function (row) {
    return { kind: row[0], task: row[1] };
  });
  const queue = backlog.concat(events);
  let current = Object.assign({}, state, { applied });
  const pending = [];
  let served = 0;
  let judged = 0;
  for (const item of queue) {
    if (applied.indexOf(item.task) >= 0) continue;
    if (budget <= 0) { pending.push([item.kind, item.task]); continue; }
    current = complete(current, item.task);
    applied.push(item.task);
    budget -= 1;
    served += 1;
    judged += 1;
  }
  current = Object.assign({}, current, { ledger: pending });
  const judged_bound = events.length + (state.ledger || []).length;
  return { state: current, served: served, ledger_before: pending.length,
           ledger: pending, judged: judged, judged_bound: judged_bound };
}

export function close(spec) {
  const applied = (spec.state.applied || []).slice();
  let current = Object.assign({}, spec.state, { applied });
  let catchup = 0;
  for (const row of spec.state.ledger || []) {
    const task = row[1];
    if (applied.indexOf(task) >= 0) continue;
    current = complete(current, task);
    applied.push(task);
    catchup += 1;
  }
  current = Object.assign({}, current, { ledger: [] });
  return { state: current, catchup: catchup };
}
