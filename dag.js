// dag.js：依赖推进（入度放行）
export const ERROR_CODES = {
  task: "E_NO_TASK",
  done: "E_DUP_DONE",
  ready: "E_NOT_READY",
  event: "E_BAD_EVENT"
};

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function findRow(table, task) {
  for (const row of table) {
    if (row[0] === task) return row;
  }
  return null;
}

// 完成一个任务：要求登记过、没完成过、当前入度为零；完成后后继入度各减一。
// 返回新状态，不改入参。
export function complete(state, task) {
  const indeg0 = state.indeg || [];
  const done0 = state.done || [];
  const row = findRow(indeg0, task);
  if (!row) fail(ERROR_CODES.task, "任务没登记过：" + task);
  if (done0.indexOf(task) >= 0) fail(ERROR_CODES.done, "任务已经完成过：" + task);
  if (row[1] !== 0) fail(ERROR_CODES.ready, "任务还没就绪（入度 " + row[1] + "）：" + task);

  const indeg = indeg0.map((entry) => [entry[0], entry[1]]);
  const done = done0.slice();
  done.push(task);

  const table = state.dependents || [];
  for (const entry of table) {
    if (entry[0] !== task) continue;
    for (const child of entry[1]) {
      const childRow = findRow(indeg, child);
      if (childRow && childRow[1] > 0) childRow[1] -= 1;
    }
  }

  return {
    indeg,
    dependents: state.dependents,
    done,
    ledger: state.ledger,
    applied: state.applied
  };
}

// 入度为零且还没完成的任务，按名字升序。
export function readyOf(state) {
  const done = state.done || [];
  const ready = [];
  for (const row of state.indeg || []) {
    if (row[1] === 0 && done.indexOf(row[0]) < 0) ready.push(row[0]);
  }
  ready.sort();
  return ready;
}
