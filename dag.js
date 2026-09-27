// dag.js：依赖推进（基线：一律原样返回）
export function complete(state, task) {
  return state;
}

export function readyOf(state) {
  return [];
}
