import {seed,syncTasks,transition} from './domain.mjs';
const KEY='qiyu.care.workspace';
let state;
try {const saved=JSON.parse(localStorage.getItem(KEY));state=saved?.schema===1&&Array.isArray(saved.pets)?saved:seed();}catch{state=seed();}
syncTasks(state);
export const getState=()=>syncTasks(state);
export function dispatch(action,role,actor){
 const saved=localStorage.getItem(KEY);if(saved){const latest=JSON.parse(saved);if(latest.revision>state.revision)state=latest;}
 const result=transition(state,action,role,actor);
 try{localStorage.setItem(KEY,JSON.stringify(result.state));}catch{throw new Error('浏览器存储空间不足，未保存本次操作。请减少附件大小后重试。');}
 state=result.state;window.dispatchEvent(new CustomEvent('qiyu:update'));return result;
}
export function refresh(){const raw=localStorage.getItem(KEY);if(raw){try{const next=JSON.parse(raw);if(next.schema===1){state=syncTasks(next);window.dispatchEvent(new CustomEvent('qiyu:update'));}}catch{}}}
window.addEventListener('storage',e=>{if(e.key===KEY)refresh();});
export function exportState(){return JSON.stringify(state,null,2);}
