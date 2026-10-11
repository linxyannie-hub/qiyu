export const iso = () => new Date().toISOString();
export const day = (offset=0) => {const d=new Date();d.setDate(d.getDate()+offset);return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);};
export const uid = (prefix='item') => `${prefix}-${globalThis.crypto.randomUUID()}`;
export const roles = {clinic:{name:'院方协同',person:'林晓',title:'随访协调员'},doctor:{name:'医生工作台',person:'陈予安',title:'主治兽医'},family:{name:'家庭照护',person:'周女士',title:'宠物主人'},ops:{name:'平台运营',person:'许宁',title:'机构运营'}};
export function seed(){
 const today=day(), tomorrow=day(1), future=day(3), now=iso();
 const pets=[
 {id:'pet-1',name:'团团',species:'犬',breed:'比熊',age:'6岁',sex:'公 · 已绝育',weight:'6.8 kg',owner:'周女士',phone:'138 0000 0621',color:'#D4AF78',scene:'眼科术后',start:day(-3),review:future,status:'active',accepted:true,member:'周女士',members:[{id:'owner',name:'周女士',role:'主人',active:true},{id:'member',name:'周先生',role:'家人',active:true}],handoff:null},
 {id:'pet-2',name:'栗子',species:'猫',breed:'英短',age:'3岁',sex:'母 · 已绝育',weight:'4.2 kg',owner:'李女士',phone:'139 0000 1832',color:'#A3AAA4',scene:'外科术后',start:day(-2),review:tomorrow,status:'active',accepted:true,member:'李女士',members:[{id:'owner',name:'李女士',role:'主人',active:true}],handoff:null},
 {id:'pet-3',name:'可乐',species:'犬',breed:'柯基',age:'5岁',sex:'公 · 已绝育',weight:'11.6 kg',owner:'张先生',phone:'137 0000 5908',color:'#D59A63',scene:'骨科术后',start:day(-6),review:today,status:'active',accepted:true,member:'张先生',members:[{id:'owner',name:'张先生',role:'主人',active:true}],handoff:null},
 {id:'pet-4',name:'年糕',species:'猫',breed:'布偶',age:'2岁',sex:'公 · 已绝育',weight:'5.1 kg',owner:'王女士',phone:'136 0000 2219',color:'#C4B9A9',scene:'外科术后',start:today,review:future,status:'pending',accepted:false,member:'王女士',members:[{id:'owner',name:'王女士',role:'主人',active:true}],handoff:null}
 ];
 const plans=pets.map((p,i)=>({id:`plan-${i+1}`,petId:p.id,status:i===3?'review':'published',createdAt:now,effectiveAt:new Date(Date.now()-86400000).toISOString(),publishedAt:i===3?null:now,author:i===3?'林晓':'陈予安',reason:'出院照护安排',source:'本院出院指导单',note:'本轮照护以医院交付的出院指导单为依据。如实际执行遇到困难，请及时联系本院。',items:[{id:`i-${i}-1`,title:'眼部护理',type:'护理',time:'09:00',detail:'核对出院指导单中的护理对象与操作要求，按本院交付的安排执行。',active:true},{id:`i-${i}-2`,title:'佩戴防护圈',type:'护理',time:'14:00',detail:'依照出院指导单确认防护圈佩戴情况，记录遇到的困难。',active:true},{id:`i-${i}-3`,title:'晚间状态观察',type:'观察',time:'20:00',detail:'记录精神、食欲及本次医院要求关注的变化；不确定的情况可以直接报告。',active:true}].map(x=>({...x,title:x.title==='眼部护理'&&i!==0?'日常护理':x.title}))}));
 const tasks=plans.filter(p=>p.status==='published').flatMap(pl=>pl.items.map((it,j)=>({id:`task-${pl.petId}-${j}`,petId:pl.petId,planId:pl.id,itemId:it.id,date:today,time:it.time,title:it.title,detail:it.detail,type:it.type,cancelled:false})));
 return {schema:1,revision:0,clinic:{name:'禾伴动物医院',city:'杭州 · 滨江',hours:'09:00—18:00',phone:'0571-8600-0120',contact:'林晓',backup:'王雨',target:120},pets,plans,tasks,events:[{id:'event-first',taskId:'task-pet-1-0',petId:'pet-1',planId:'plan-1',result:'uncertain',note:'护理时团团有些抗拒，不确定这次是否完成。',actor:'周先生',occurredAt:now,createdAt:now}],concerns:[{id:'concern-1',petId:'pet-1',taskId:'task-pet-1-0',planId:'plan-1',title:'护理尝试后不确定是否完成',category:'执行困难',body:'护理时团团有些抗拒，不确定这次是否完成，想请医院协助确认下一步。',status:'clinical',assignee:'陈予安',createdAt:new Date(Date.now()-3600000).toISOString(),acceptedAt:new Date(Date.now()-2400000).toISOString(),messages:[{actor:'周先生',role:'family',text:'护理时团团有些抗拒，不确定这次是否完成。',at:now},{actor:'林晓',role:'clinic',text:'已收到您的记录，已转交主治医生进一步确认。',at:now}],nextAction:''},{id:'concern-2',petId:'pet-2',taskId:null,planId:'plan-2',title:'希望调整复查时间',category:'预约与资料',body:'原复查时间与工作安排冲突，希望调整到下午。',status:'new',assignee:null,createdAt:new Date(Date.now()-1800000).toISOString(),messages:[{actor:'李女士',role:'family',text:'希望调整到下午，麻烦协助确认。',at:now}],nextAction:''}],appointments:[{id:'appt-1',petId:'pet-1',date:future,time:'10:00',status:'confirmed',note:'眼科术后复查'},{id:'appt-2',petId:'pet-3',date:today,time:'14:30',status:'confirmed',note:'骨科术后复查'}],activations:[{id:'act-1',petId:'pet-1',at:now,status:'valid',amount:8},{id:'act-2',petId:'pet-2',at:now,status:'valid',amount:8},{id:'act-3',petId:'pet-3',at:now,status:'valid',amount:8}],audit:[{id:'audit-first',at:now,actor:'林晓',text:'完成今日随访交接'}],settings:{plan:'按有效服务计费',unitPrice:8},tickets:[],institutions:[{id:'clinic-1',name:'禾伴动物医院',city:'杭州',contact:'林晓',status:'active'}],templates:[{id:'template-1',name:'眼科术后照护',scene:'眼科术后',status:'approved',count:3},{id:'template-2',name:'骨科术后照护',scene:'骨科术后',status:'approved',count:3},{id:'template-3',name:'外科术后照护',scene:'外科术后',status:'approved',count:3}],payments:[],renewal:null};
}
export const currentPlan=(s,id,at=iso())=>s.plans.filter(p=>p.petId===id&&p.status==='published'&&p.effectiveAt<=at).sort((a,b)=>b.effectiveAt.localeCompare(a.effectiveAt)||b.createdAt.localeCompare(a.createdAt))[0];
export const latestPlan=(s,id)=>s.plans.filter(p=>p.petId===id).at(-1);
export const petById=(s,id)=>s.pets.find(p=>p.id===id);
export const resultLabels={done:'已按安排执行',attempted:'尝试未完成',missed:'本次未执行',uncertain:'不确定是否完成'};
export const concernLabels={new:'待接收',accepted:'已接手',supplement:'待家庭补充',clinical:'待专业判断',answered:'已答复',action:'待后续行动',resolved:'已解决'};
export const appointmentLabels={requested:'待院方确认',confirmed:'已确认',completed:'已完成',cancelled:'已取消'};
export function syncTasks(s,at=iso()){
 for(const pet of s.pets){const plan=currentPlan(s,pet.id,at);if(!plan)continue;
  for(const t of s.tasks.filter(t=>t.petId===pet.id&&t.date>=day()&&t.planId!==plan.id)) t.cancelled=true;
  for(const item of plan.items.filter(i=>i.active!==false)){if(!s.tasks.some(t=>t.petId===pet.id&&t.planId===plan.id&&t.itemId===item.id&&t.date===day()))s.tasks.push({id:uid('task'),petId:pet.id,planId:plan.id,itemId:item.id,date:day(),time:item.time,title:item.title,type:item.type,detail:item.detail,cancelled:false});}
 }
 return s;
}
function requireRole(role,allowed){if(!allowed.includes(role))throw new Error('当前工作空间没有执行此操作的权限。');}
function required(v,msg){if(!String(v??'').trim())throw new Error(msg);return String(v).trim();}
function createConcern(s,petId,title,body,actor,taskId=null,category='执行困难'){
 const c={id:uid('concern'),petId,taskId,planId:currentPlan(s,petId)?.id||null,title,body,category,status:'new',assignee:null,createdAt:iso(),messages:[{actor,role:'family',text:body,at:iso()}],nextAction:''};s.concerns.unshift(c);return c;
}
export function transition(original,action,role,actor=roles[role]?.person){
 const s=structuredClone(original);syncTasks(s);const p=action.petId?petById(s,action.petId):null;let message='已保存';let entity=null;
 const concern=()=>{const c=s.concerns.find(c=>c.id===action.id);if(!c)throw new Error('未找到该问题，请刷新后重试。');return c;};
 switch(action.type){
 case 'acceptService': requireRole(role,['family']);if(!p)throw new Error('未找到服务');if(!currentPlan(s,p.id))throw new Error('医院尚未发布正式安排。');p.accepted=true;p.status='active';message='已接收本轮照护服务';break;
 case 'report': {
  requireRole(role,['family']);if(!p?.accepted||p.status!=='active')throw new Error('请先接收正在进行的照护服务。');if(!p.members.some(m=>m.active&&(!m.expires||m.expires>=day())&&m.name===actor))throw new Error('当前照护者的授权已失效。');
  if(s.events.some(e=>e.operationId===action.operationId)&&action.operationId)return {state:original,message:'此记录已保存'};
  const task=s.tasks.find(t=>t.id===action.taskId&&t.petId===p.id);if(!task)throw new Error('未找到本次事项。');
  if(!Object.hasOwn(resultLabels,action.result))throw new Error('请选择实际执行结果。');
  const at=action.occurredAt||iso();if(Number.isNaN(Date.parse(at))||Date.parse(at)>Date.now()+60000)throw new Error('发生时间不能晚于当前时间。');
  const event={id:uid('event'),operationId:action.operationId||uid('operation'),taskId:task.id,petId:p.id,planId:task.planId,result:action.result,note:action.note||'',actor,occurredAt:at,createdAt:iso(),attachment:action.attachment||null};
  const prior=s.events.filter(e=>e.taskId===task.id&&!e.corrects);s.events.push(event);
  if(prior.some(e=>e.actor!==actor)&&action.result==='done')createConcern(s,p.id,'收到两份执行报告，请协助核实','家庭成员分别报告了本次执行，请院方协助核对事实。',actor,task.id,'记录核实');
  if(task.cancelled)createConcern(s,p.id,'历史安排下的执行记录待核实',action.note||'本次记录关联此前安排，请协助核实。',actor,task.id,'记录核实');
  if(action.help)createConcern(s,p.id,`${task.title}遇到困难`,required(action.note,'请说明需要医院协助的情况。'),actor,task.id);
  if(!s.activations.some(a=>a.petId===p.id))s.activations.push({id:uid('act'),petId:p.id,at:iso(),status:'valid',amount:s.settings.unitPrice});
  message=action.help?'已记录，并提交医院协助':'实际执行情况已记录';entity=event.id;break;
 }
 case 'correct':requireRole(role,['family']);{const e=s.events.find(e=>e.id===action.id);if(!e||e.actor!==actor)throw new Error('只能更正自己提交的记录。');if(!resultLabels[action.result])throw new Error('请选择更正结果');s.events.push({...e,id:uid('event'),operationId:uid('operation'),result:action.result,note:required(action.note,'请填写更正原因'),corrects:e.id,createdAt:iso()});message='已追加更正，原记录保留';}break;
 case 'concern':requireRole(role,['family']);if(!p?.accepted||p.status!=='active')throw new Error('当前服务不可提交新问题。');if(!p.members.some(m=>m.active&&(!m.expires||m.expires>=day())&&m.name===actor))throw new Error('照护授权已失效。');entity=createConcern(s,p.id,required(action.title,'请填写问题标题。'),required(action.body,'请描述需要协助的情况。'),actor,action.taskId,action.category).id;message='已提交，等待医院接收';break;
 case 'claim':requireRole(role,['clinic','doctor']);{const c=concern();if(c.status!=='new')throw new Error('该问题已被接手，请查看最新状态。');c.status='accepted';c.assignee=actor;c.acceptedAt=iso();c.messages.push({actor,role,text:'已接手，会继续跟进此问题。',at:iso()});message='已接手问题';}break;
 case 'escalate':requireRole(role,['clinic']);{const c=concern();if(!['accepted','supplement'].includes(c.status))throw new Error('请先接手问题再转交医生。');c.status='clinical';c.assignee='陈予安';c.messages.push({actor,role,text:action.note||'已转交主治医生处理专业判断。',at:iso()});message='已交由陈医生处理';}break;
 case 'supplement':requireRole(role,['clinic','doctor']);{const c=concern();if(['resolved','new'].includes(c.status))throw new Error('当前状态不可请求补充。');c.status='supplement';c.messages.push({actor,role,text:required(action.text,'请说明需要补充什么。'),at:iso()});message='已向家庭请求补充';}break;
 case 'reply': {
  const c=concern();if(c.status==='resolved')throw new Error('问题已解决，请先重新打开。');
  const text=required(action.text,'请填写内容。');
  if(role==='ops')throw new Error('平台运营不能交付临床答复。');
  if(role==='family'){const cp=petById(s,c.petId);if(!cp.members.some(m=>m.active&&(!m.expires||m.expires>=day())&&m.name===actor))throw new Error('照护授权已失效。');if(c.status==='supplement')c.status=c.assignee==='陈予安'?'clinical':'accepted';}
  else {requireRole(role,['clinic','doctor']);if(c.status==='new')throw new Error('请先接手问题。');if(role==='clinic'&&c.category!=='预约与资料')throw new Error('此问题需要兽医专业答复，请转交医生。');c.status='answered';c.nextAction=required(action.nextAction,'请填写明确的后续动作。');}
  c.messages.push({actor,role,text,at:iso()});message=role==='family'?'补充信息已发送':'答复与后续安排已交付';break;
 }
 case 'resolve': requireRole(role,['family','clinic','doctor']);{const c=concern();if(!['answered','action'].includes(c.status))throw new Error('问题须有答复或后续行动后才能解决。');c.status='resolved';c.closedAt=iso();c.closeReason=action.reason||'已确认处理结果';message='问题已解决';}break;
 case 'reopen':requireRole(role,['family','clinic','doctor']);{const c=concern();if(c.status!=='resolved')throw new Error('此问题尚未关闭。');c.status=c.assignee?'accepted':'new';c.messages.push({actor,role,text:action.reason||'需要继续跟进，重新打开问题。',at:iso()});message='已重新打开问题';}break;
 case 'createPlan': {
  requireRole(role,['clinic']);const name=required(action.name,'请填写宠物姓名。');const owner=required(action.owner,'请填写主人称呼。');
  const pet={id:uid('pet'),name,owner,species:action.species||'犬',breed:action.breed||'待补充',age:action.age||'待补充',weight:action.weight||'待补充',sex:'待补充',phone:action.phone||'',scene:action.scene||'外科术后',color:'#D4AF78',start:day(),review:action.review||day(3),status:'pending',accepted:false,member:owner,members:[{id:'owner',name:owner,role:'主人',active:true}],handoff:null};s.pets.push(pet);
  const plan={id:uid('plan'),petId:pet.id,status:'draft',createdAt:iso(),author:actor,source:required(action.source,'请填写材料来源。'),note:action.note||'',reason:'出院照护安排',effectiveAt:iso(),items:action.items};validateItems(plan.items);s.plans.push(plan);message='出院草稿已建立';entity=pet.id;break;
 }
 case 'savePlan':requireRole(role,['clinic']);{const plan=s.plans.find(pl=>pl.id===action.id);if(!plan||!['draft','returned'].includes(plan.status))throw new Error('只有草稿可以编辑。');validateItems(action.items);plan.items=action.items;plan.source=required(action.source,'请填写来源');plan.note=action.note||'';plan.status='draft';message='草稿已保存';}break;
 case 'submitPlan':requireRole(role,['clinic']);{const plan=s.plans.find(pl=>pl.id===action.id);if(!plan||!['draft','returned'].includes(plan.status))throw new Error('当前计划不能提交审核。');validateItems(plan.items);plan.status='review';message='已提交医生审核';}break;
 case 'returnPlan':requireRole(role,['doctor']);{const plan=s.plans.find(pl=>pl.id===action.id);if(plan?.status!=='review')throw new Error('当前计划不在审核队列。');plan.status='returned';plan.returnReason=required(action.reason,'请填写退回原因。');message='已退回护理人员补充';}break;
 case 'publish':requireRole(role,['doctor']);{const plan=s.plans.find(pl=>pl.id===action.id);if(plan?.status!=='review')throw new Error('只有待审核的计划可以发布。');validateItems(plan.items);plan.status='published';plan.publishedAt=iso();plan.effectiveAt=action.effectiveAt||iso();plan.author=actor;message='正式照护安排已发布';}break;
 case 'revise':requireRole(role,['doctor']);{if(!p||p.status==='ended')throw new Error('当前服务不可调整。');const old=currentPlan(s,p.id);if(!old||old.id!==action.expectedPlanId)throw new Error('安排已更新，请重新查看后调整。');validateItems(action.items);const effectiveAt=action.effectiveAt||iso();if(Number.isNaN(Date.parse(effectiveAt)))throw new Error('请填写有效生效时间');const plan={...old,id:uid('plan'),previousId:old.id,status:'published',createdAt:iso(),publishedAt:iso(),effectiveAt,author:actor,reason:required(action.reason,'请填写调整原因。'),items:action.items,note:action.note??old.note};s.plans.push(plan);message='照护安排已更新';entity=plan.id;}break;
 case 'invite':requireRole(role,['family']);if(p&&actor!==p.owner)throw new Error('只有主人可以管理照护成员。');if(action.expires&&action.expires<day())throw new Error('授权到期日期不能早于今天。');if(!p)throw new Error('未找到宠物');{const name=required(action.name,'请填写家人称呼。');if(p.members.some(m=>m.name===name&&m.active))throw new Error('该成员已有照护授权');p.members.push({id:uid('member'),name,role:'家人',active:true,expires:action.expires||null});message='照护成员已加入';}break;
 case 'revoke':requireRole(role,['family']);if(p&&actor!==p.owner)throw new Error('只有主人可以撤销成员授权。');{const m=p?.members.find(m=>m.id===action.id);if(!m||m.role==='主人')throw new Error('不能撤销主人权限');m.active=false;if(p.member===m.name)p.member=p.owner;if(p.handoff?.to===m.name)p.handoff=null;message='该成员照护授权已撤销';}break;
 case 'handoff':requireRole(role,['family']);if(!p?.members.some(m=>m.active&&(!m.expires||m.expires>=day())&&m.name===action.to))throw new Error('请选择已授权家人');p.handoff={from:p.member,to:action.to,status:'pending',at:iso()};message='已发起交接，等待接班确认';break;
 case 'acceptHandoff':requireRole(role,['family']);if(!p?.members.some(m=>m.active&&(!m.expires||m.expires>=day())&&m.name===actor))throw new Error('照护授权已失效。');if(!p?.handoff||p.handoff.to!==actor)throw new Error('请由指定接班人确认。');p.member=actor;p.handoff.status='accepted';message='已确认接班';break;
 case 'appointment':requireRole(role,['family','clinic']);if(!p||p.status==='ended')throw new Error('当前服务不可申请复查');if(!action.date||action.date<day())throw new Error('请选择今天或之后的日期');s.appointments.push({id:uid('appt'),petId:p.id,date:action.date,time:action.time||'10:00',status:role==='clinic'?'confirmed':'requested',note:action.note||'复查申请'});message=role==='clinic'?'复查时间已确认':'已提交复查申请，等待医院确认';break;
 case 'appointmentStatus':requireRole(role,['clinic','family']);{const a=s.appointments.find(a=>a.id===action.id);if(!a)throw new Error('未找到预约');if(role==='family'&&action.status!=='cancelled')throw new Error('预约需要医院确认');if(!['confirmed','completed','cancelled'].includes(action.status))throw new Error('预约状态无效');if(action.status==='completed'&&a.status!=='confirmed')throw new Error('需先确认复查');if(a.status==='completed'||a.status==='cancelled')throw new Error('当前预约已结束');a.status=action.status;message='复查状态已更新';}break;
 case 'end':requireRole(role,['clinic','doctor']);if(!p||p.status==='ended')throw new Error('服务已经结束');if(s.concerns.some(c=>c.petId===p.id&&c.status!=='resolved'))throw new Error('请先处理未结问题或完成明确转交。');p.status='ended';p.endedAt=iso();p.endReason=required(action.reason,'请填写服务结束原因及下一步。');message='本轮服务已结束，资料可继续获取';break;
 case 'settings':requireRole(role,['clinic']);s.clinic={...s.clinic,...action.values};message='服务设置已保存';break;
 case 'institution':requireRole(role,['ops']);s.institutions.push({id:uid('clinic'),name:required(action.name,'请填写机构名称'),city:required(action.city,'请填写城市'),contact:required(action.contact,'请填写负责人'),status:'onboarding'});message='机构已建立，进入实施流程';break;
 case 'activateInstitution':requireRole(role,['ops']);{const c=s.institutions.find(c=>c.id===action.id);if(!c||c.status!=='onboarding')throw new Error('机构已经开通或不存在');c.status='active';message='机构已开通';}break;
 case 'template':requireRole(role,['ops']);s.templates.push({id:uid('template'),name:required(action.name,'请填写模板名称'),scene:action.scene||'外科术后',status:'pending',count:0});message='模板已建立，待临床审核';break;
 case 'ticket':requireRole(role,['ops','clinic']);s.tickets.push({id:uid('ticket'),title:required(action.title,'请填写支持事项'),body:required(action.body,'请描述问题'),status:'open',at:iso(),actor});message='支持事项已登记';break;
 case 'closeTicket':requireRole(role,['ops']);{const t=s.tickets.find(t=>t.id===action.id);if(!t)throw new Error('未找到事项');t.status='closed';message='支持事项已完成';}break;
 case 'voidActivation':requireRole(role,['ops']);{const a=s.activations.find(a=>a.id===action.id);if(!a||a.status!=='valid')throw new Error('该条目已作废');if(s.payments.some(p=>p.activationIds.includes(a.id)))throw new Error('已结算条目请通过退款流程处理');a.status='void';a.reason=required(action.reason,'请填写作废原因');message='已作废计费条目';}break;
 case 'payment':requireRole(role,['ops']);{const outstanding=s.activations.filter(a=>a.status==='valid'&&!s.payments.some(p=>p.activationIds.includes(a.id)));if(!outstanding.length)throw new Error('当前没有待结算用量');s.payments.push({id:uid('payment'),at:iso(),amount:outstanding.reduce((x,a)=>x+a.amount,0),activationIds:outstanding.map(a=>a.id),reference:required(action.reference,'请填写收款凭证或流水号')});message='收款已登记';}break;
 case 'renewal':requireRole(role,['clinic']);s.renewal={at:iso(),status:'requested'};message='续订申请已提交';break;
 default:throw new Error('无法识别的操作。');
 }
 syncTasks(s);s.revision=(s.revision||0)+1;s.audit.unshift({id:uid('audit'),at:iso(),actor,text:message,petId:action.petId||entity});s.audit=s.audit.slice(0,150);return {state:s,message,entity};
}
export function validateItems(items){if(!Array.isArray(items)||!items.length)throw new Error('请至少保留一项照护安排');for(const i of items){required(i.title,'请填写事项名称');required(i.detail,'请填写操作说明');if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(i.time))throw new Error('请填写有效事项时间');}}
