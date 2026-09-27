import assert from "node:assert";
import { complete, readyOf } from "../dag.js";
import { step, close } from "../dagrun.js";
import { render } from "../app.js";

const base = {
  budget: 1,
  state: { indeg: [["t1", 0]], dependents: [["t1", []]], done: [], ledger: [], applied: [] },
  events: [{ id: 1, kind: "finish", task: "t1" }],
  task_error_code: "E_NO_TASK", done_error_code: "E_DUP_DONE",
  ready_error_code: "E_NOT_READY", event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("complete returns a state", () => {
  const got = complete({ indeg: [["z", 0]], dependents: [], done: [] }, "z");
  assert.strictEqual(typeof got, "object");
});

check("readyOf returns a list", () => {
  assert.ok(Array.isArray(readyOf({ indeg: [["z", 0]], done: [] })));
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
