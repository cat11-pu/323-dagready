// dagrun.js：按处理预算处理事件，用尽后连着载压账；收尾不限预算清账。
import { complete, ERROR_CODES } from "./dag.js";

function cloneState(state0) {
  const state = state0 || {};
  return {
    indeg: (state.indeg || []).map((row) => [row[0], row[1]]),
    dependents: (state.dependents || []).map((row) => [row[0], (row[1] || []).slice()]),
    done: (state.done || []).slice(),
    ledger: (state.ledger || []).map((row) => [row[0], row[1]]),
    applied: (state.applied || []).map((row) => [row[0], row[1]])
  };
}

// 结构校验：非空对象、kind 为 finish、task 为非空字符串。与预算无关，先做。
function assertValidFinish(event) {
  if (!event || typeof event !== "object"
      || event.kind !== "finish"
      || typeof event.task !== "string" || event.task === "") {
    throw codeError(ERROR_CODES.event, "事件结构不合法");
  }
}

function codeError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function samePair(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

function isApplied(state, pair) {
  return state.applied.some((seen) => samePair(seen, pair));
}

// 在工作副本上推进一个 finish；错误码允许被 spec 覆盖。
function applyFinish(work, pair, spec) {
  try {
    return complete(work, pair[1]);
  } catch (error) {
    let code = error && error.code;
    if (code === ERROR_CODES.task) code = spec.task_error_code || code;
    else if (code === ERROR_CODES.done) code = spec.done_error_code || code;
    else if (code === ERROR_CODES.ready) code = spec.ready_error_code || code;
    throw codeError(code, error && error.message ? error.message : String(error));
  }
}

// 按处理预算处理：账上遗留优先，再处理新事件。
// served：本次真正完成的条数；judged：本次工作计数；judged_bound：事件条数上界。
export function step(spec) {
  const events = Array.isArray(spec.events) ? spec.events : [];
  for (const event of events) assertValidFinish(event);

  const work = cloneState(spec.state);
  const budget = spec.budget == null ? 0 : spec.budget;

  // 队列：先账上遗留（FIFO），再处理本轮新事件。
  const queue = work.ledger.map((pair) => [pair[0], pair[1]]);
  for (const event of events) queue.push([event.kind, event.task]);

  const ledger = [];
  let served = 0;
  let capacity = budget;

  for (const pair of queue) {
    // 重放或同一身份已处理过：直接跳过，不占预算、不压账。
    if (isApplied(work, pair)) continue;
    if (capacity <= 0) {
      ledger.push(pair);
      continue;
    }
    capacity -= 1;
    const next = applyFinish(work, pair, spec);
    work.indeg = next.indeg;
    work.done = next.done;
    work.applied.push(pair);
    served += 1;
  }

  work.ledger = ledger;

  return {
    state: work,
    served,
    ledger_before: ledger.length,
    ledger: ledger.map((pair) => [pair[0], pair[1]]),
    judged: events.length,
    judged_bound: events.length
  };
}

// 收尾：不限预算把账上的事件处理完，返回补齐条数。
export function close(spec) {
  const work = cloneState(spec.state);
  let catchup = 0;

  while (work.ledger.length > 0) {
    const pair = work.ledger.shift();
    if (isApplied(work, pair)) continue;
    const next = applyFinish(work, pair, spec || {});
    work.indeg = next.indeg;
    work.done = next.done;
    work.applied.push(pair);
    catchup += 1;
  }

  return { state: work, catchup };
}
