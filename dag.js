// dag.js：依赖推进（完成就绪任务、查就绪名额）
function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

export function complete(state, task) {
  const indeg = state.indeg || [];
  const done = state.done || [];
  const row = indeg.find(function (entry) { return entry[0] === task; });
  if (!row) fail("E_NO_TASK", "task not registered: " + task);
  if (done.indexOf(task) >= 0) fail("E_DUP_DONE", "task already done: " + task);
  if (row[1] !== 0) fail("E_NOT_READY", "task not ready: " + task);
  const dependents = state.dependents || [];
  const depRow = dependents.find(function (entry) { return entry[0] === task; });
  const next = depRow ? depRow[1] : [];
  const nextIndeg = indeg.map(function (entry) {
    return [entry[0], next.indexOf(entry[0]) >= 0 ? entry[1] - 1 : entry[1]];
  });
  return Object.assign({}, state, { indeg: nextIndeg, done: done.concat([task]) });
}

export function readyOf(state) {
  const done = state.done || [];
  return (state.indeg || [])
    .filter(function (entry) { return entry[1] === 0 && done.indexOf(entry[0]) < 0; })
    .map(function (entry) { return entry[0]; })
    .sort();
}
