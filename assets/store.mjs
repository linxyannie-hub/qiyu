import { seed, syncTasks, transition, normalizeState } from "./domain.mjs";
const KEY = "qiyu.care.workspace";
let state;
function readSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved?.schema === 1 &&
      Array.isArray(saved.pets) &&
      Array.isArray(saved.plans)
      ? normalizeState(saved)
      : null;
  } catch {
    return null;
  }
}
state = readSaved() || seed();
syncTasks(state);
try {
  localStorage.setItem(KEY, JSON.stringify(state));
} catch {}
export const getState = () => syncTasks(state);
export function dispatch(action, role, actor) {
  const latest = readSaved();
  if (latest?.revision > state.revision) state = latest;
  const result = transition(state, action, role, actor);
  try {
    localStorage.setItem(KEY, JSON.stringify(result.state));
  } catch {
    throw new Error("本次操作尚未保存，请减少附件大小后重试。");
  }
  state = result.state;
  window.dispatchEvent(new CustomEvent("qiyu:update", { detail: { action } }));
  return result;
}
export function refresh() {
  const next = readSaved();
  if (next) {
    state = syncTasks(next);
    window.dispatchEvent(
      new CustomEvent("qiyu:update", { detail: { external: true } }),
    );
  }
}
window.addEventListener("storage", (e) => {
  if (e.key === KEY) refresh();
});
export function exportState() {
  return JSON.stringify(state, null, 2);
}
