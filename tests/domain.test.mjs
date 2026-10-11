import test from "node:test";
import assert from "node:assert/strict";
import {
  seed,
  transition,
  currentPlan,
  effectiveTaskEvents,
  normalizeState,
  day,
  uid,
} from "../assets/domain.mjs";
const apply = (s, a, r = "clinic", actor) => transition(s, a, r, actor).state;
const items = () => [
  {
    id: uid("i"),
    title: "日常照护",
    time: "09:00",
    type: "护理",
    detail: "依照本院指导执行",
    active: true,
  },
];
test("家庭实际使用才成为有效启用，同轮修订不会新增费用", () => {
  let s = seed();
  s.activations = [];
  s = apply(
    s,
    {
      type: "report",
      petId: "pet-1",
      taskId: "task-pet-1-1",
      result: "done",
      operationId: "a",
    },
    "family",
    "周女士",
  );
  assert.equal(s.activations.length, 1);
  s = apply(
    s,
    {
      type: "revise",
      petId: "pet-1",
      expectedPlanId: "plan-1",
      items: items(),
      reason: "护理要求更新",
    },
    "doctor",
  );
  assert.equal(s.activations.length, 1);
});
test("相同操作标识的重试不会重复追加执行记录", () => {
  let s = seed();
  const a = {
    type: "report",
    petId: "pet-1",
    taskId: "task-pet-1-1",
    result: "done",
    operationId: "a",
  };
  s = apply(s, a, "family", "周女士");
  const count = s.events.length;
  s = apply(s, a, "family", "周女士");
  assert.equal(s.events.length, count);
});
test("不同家人独立报告保留两份事实并建立核实问题", () => {
  let s = seed();
  s = apply(
    s,
    { type: "report", petId: "pet-1", taskId: "task-pet-1-1", result: "done" },
    "family",
    "周女士",
  );
  s = apply(
    s,
    { type: "report", petId: "pet-1", taskId: "task-pet-1-1", result: "done" },
    "family",
    "周先生",
  );
  assert.equal(s.events.filter((e) => e.taskId === "task-pet-1-1").length, 2);
  assert.ok(s.concerns.some((c) => c.category === "记录核实"));
});
test("缺少困难说明的提交失败且原状态不发生部分写入", () => {
  const s = seed(),
    before = JSON.stringify(s);
  assert.throws(
    () =>
      apply(
        s,
        {
          type: "report",
          petId: "pet-1",
          taskId: "task-pet-1-1",
          result: "attempted",
          help: true,
        },
        "family",
        "周女士",
      ),
    /说明/,
  );
  assert.equal(JSON.stringify(s), before);
});
test("执行困难保留在事实与院方待办中，更正结果不会丢失困难上下文", () => {
  let s = apply(
    seed(),
    {
      type: "report",
      petId: "pet-1",
      taskId: "task-pet-1-1",
      result: "attempted",
      help: true,
      difficulty: "动物抗拒",
      note: "团团一直躲避，防护圈没能戴上",
    },
    "family",
    "周女士",
  );
  const eventId = s.events.at(-1).id;
  assert.equal(s.events.at(-1).difficulty, "动物抗拒");
  assert.equal(s.concerns[0].difficulty, "动物抗拒");
  s = apply(
    s,
    {
      type: "correct",
      id: eventId,
      result: "uncertain",
      note: "无法确认佩戴情况",
    },
    "family",
    "周女士",
  );
  assert.equal(
    effectiveTaskEvents(s, "task-pet-1-1")[0].difficulty,
    "动物抗拒",
  );
  s = apply(
    s,
    {
      type: "concern",
      petId: "pet-1",
      title: "请协助确认操作",
      body: "没有理解出院单上的步骤",
      difficulty: "不会操作",
    },
    "family",
    "周女士",
  );
  assert.equal(s.concerns[0].difficulty, "不会操作");
});
test("初始机构面向上海，仅旧默认资料迁移，用户填写的信息保留", () => {
  const fresh = seed();
  assert.equal(fresh.clinic.city, "上海");
  assert.equal(fresh.clinic.phone, "021-0000-0120");
  assert.equal(fresh.institutions[0].city, "上海");
  const legacy = seed();
  legacy.clinic.city = "杭州 · 滨江";
  legacy.clinic.phone = "0571-8600-0120";
  legacy.institutions[0].city = "杭州";
  normalizeState(legacy);
  assert.equal(legacy.clinic.city, "上海");
  assert.equal(legacy.clinic.phone, "021-0000-0120");
  assert.equal(legacy.institutions[0].city, "上海");
  const custom = seed();
  custom.clinic.city = "上海 · 徐汇";
  custom.clinic.phone = "021-6088-8899";
  custom.institutions[0].name = "用户设置的医院";
  custom.institutions[0].city = "杭州";
  const before = structuredClone([custom.clinic, custom.institutions]);
  normalizeState(custom);
  assert.deepEqual([custom.clinic, custom.institutions], before);
});
test("护理接单转交，医生答复，家庭确认形成闭环", () => {
  let s = seed();
  s = apply(
    s,
    { type: "concern", petId: "pet-1", title: "需要协助", body: "操作没做成" },
    "family",
    "周女士",
  );
  const id = s.concerns[0].id;
  s = apply(s, { type: "claim", id });
  s = apply(s, { type: "escalate", id });
  assert.equal(s.concerns[0].assignee, "陈予安");
  s = apply(
    s,
    {
      type: "reply",
      id,
      text: "已根据提供的事实完成核对。",
      nextAction: "请按交付安排继续，并联系本院复查。",
    },
    "doctor",
  );
  assert.equal(s.concerns[0].status, "answered");
  s = apply(s, { type: "resolve", id }, "family", "周女士");
  assert.equal(s.concerns[0].status, "resolved");
});
test("护理不能交付专业答复，运营不能发布正式计划", () => {
  const s = seed();
  assert.throws(
    () =>
      apply(
        s,
        { type: "reply", id: "concern-1", text: "答复", nextAction: "继续" },
        "clinic",
      ),
    /兽医/,
  );
  assert.throws(
    () => apply(s, { type: "publish", id: "plan-4" }, "ops"),
    /权限/,
  );
});
test("有未结问题的服务不能静默结束", () =>
  assert.throws(
    () => apply(seed(), { type: "end", petId: "pet-1", reason: "完成" }),
    /未结/,
  ));
test("更正追加新事件，保留原结果", () => {
  let s = seed();
  s = apply(
    s,
    {
      type: "correct",
      id: "event-first",
      result: "attempted",
      note: "重新核对后更正",
    },
    "family",
    "周先生",
  );
  assert.equal(s.events[0].result, "uncertain");
  assert.equal(s.events.at(-1).corrects, "event-first");
});
test("同一原报告的连续更正串联历史，保留其他家人的独立事实", () => {
  let s = seed();
  s = apply(
    s,
    {
      type: "correct",
      id: "event-first",
      result: "attempted",
      note: "确认护理尝试未完成",
    },
    "family",
    "周先生",
  );
  const firstCorrection = s.events.at(-1).id;
  s = apply(
    s,
    {
      type: "report",
      petId: "pet-1",
      taskId: "task-pet-1-0",
      result: "uncertain",
      note: "主人另一次尝试也不确定是否完成",
    },
    "family",
    "周女士",
  );
  s = apply(
    s,
    {
      type: "correct",
      id: "event-first",
      result: "missed",
      note: "核对后确认本次未执行",
    },
    "family",
    "周先生",
  );
  assert.equal(s.events.at(-1).corrects, firstCorrection);
  assert.equal(s.events[0].result, "uncertain");
  assert.equal(
    s.events.find((e) => e.id === firstCorrection).result,
    "attempted",
  );
  assert.deepEqual(
    effectiveTaskEvents(s, "task-pet-1-0").map((e) => [e.actor, e.result]),
    [
      ["周女士", "uncertain"],
      ["周先生", "missed"],
    ],
  );
});
test("已更正为未执行的旧报告不会造成多人执行的假冲突", () => {
  let s = seed();
  s.events = [];
  s.concerns = [];
  s = apply(
    s,
    { type: "report", petId: "pet-1", taskId: "task-pet-1-1", result: "done" },
    "family",
    "周女士",
  );
  const id = s.events[0].id;
  s = apply(
    s,
    { type: "correct", id, result: "missed", note: "记录错了，本次没有执行" },
    "family",
    "周女士",
  );
  s = apply(
    s,
    { type: "report", petId: "pet-1", taskId: "task-pet-1-1", result: "done" },
    "family",
    "周先生",
  );
  assert.equal(s.events.length, 3);
  assert.deepEqual(
    effectiveTaskEvents(s, "task-pet-1-1").map((e) => e.result),
    ["missed", "done"],
  );
  assert.equal(s.concerns.length, 0);
});
test("更正后出现两位家人的已执行报告需要核实且不重复创建待办", () => {
  let s = seed();
  s.events = [];
  s.concerns = [];
  s = apply(
    s,
    {
      type: "report",
      petId: "pet-1",
      taskId: "task-pet-1-1",
      result: "attempted",
    },
    "family",
    "周女士",
  );
  const id = s.events[0].id;
  s = apply(
    s,
    { type: "report", petId: "pet-1", taskId: "task-pet-1-1", result: "done" },
    "family",
    "周先生",
  );
  assert.equal(s.concerns.length, 0);
  s = apply(
    s,
    { type: "correct", id, result: "done", note: "核对后确认本次已完成" },
    "family",
    "周女士",
  );
  assert.equal(s.concerns.length, 1);
  assert.equal(s.concerns[0].planId, "plan-1");
  s = apply(
    s,
    { type: "report", petId: "pet-1", taskId: "task-pet-1-1", result: "done" },
    "family",
    "周先生",
  );
  assert.equal(s.concerns.length, 1);
});
test("已撤销的家人不能通过更正改写本轮有效事实", () => {
  const s = apply(
    seed(),
    { type: "revoke", petId: "pet-1", id: "member" },
    "family",
    "周女士",
  );
  assert.throws(
    () =>
      apply(
        s,
        { type: "correct", id: "event-first", result: "done", note: "更正" },
        "family",
        "周先生",
      ),
    /授权/,
  );
});
test("未经家庭接收不得报告执行", () =>
  assert.throws(
    () =>
      apply(
        seed(),
        { type: "report", petId: "pet-4", taskId: "x", result: "done" },
        "family",
        "王女士",
      ),
    /接收/,
  ));
test("计划草稿、审核、发布、家庭接收依次衔接", () => {
  let s = seed();
  s = apply(s, {
    type: "createPlan",
    name: "豆豆",
    owner: "赵女士",
    source: "出院指导",
    items: items(),
  });
  const pet = s.pets.at(-1),
    plan = s.plans.at(-1);
  assert.equal(plan.status, "draft");
  s = apply(s, { type: "submitPlan", id: plan.id });
  s = apply(s, { type: "publish", id: plan.id }, "doctor");
  s = apply(s, { type: "acceptService", petId: pet.id }, "family", "赵女士");
  assert.equal(s.pets.at(-1).status, "active");
  assert.equal(s.activations.length, 3);
});
test("新版立即生效，旧未来任务失效，既往事实仍关联旧安排", () => {
  let s = seed();
  s = apply(
    s,
    {
      type: "revise",
      petId: "pet-1",
      expectedPlanId: "plan-1",
      items: items(),
      reason: "安排变化",
    },
    "doctor",
  );
  assert.notEqual(currentPlan(s, "pet-1").id, "plan-1");
  assert.ok(
    s.tasks
      .filter((t) => t.petId === "pet-1" && t.planId === "plan-1")
      .every((t) => t.cancelled),
  );
  assert.equal(s.events[0].planId, "plan-1");
});
test("未来安排发布不提前覆盖当前有效安排", () => {
  let s = seed();
  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  s = apply(
    s,
    {
      type: "revise",
      petId: "pet-1",
      expectedPlanId: "plan-1",
      items: items(),
      reason: "明日调整",
      effectiveAt: tomorrow,
    },
    "doctor",
  );
  assert.equal(currentPlan(s, "pet-1").id, "plan-1");
  assert.notEqual(
    currentPlan(s, "pet-1", new Date(Date.now() + 172800000).toISOString()).id,
    "plan-1",
  );
});
test("基于过时计划发起的修订应被拒绝", () => {
  let s = seed();
  s = apply(
    s,
    {
      type: "revise",
      petId: "pet-1",
      expectedPlanId: "plan-1",
      items: items(),
      reason: "第一次修订",
    },
    "doctor",
  );
  assert.throws(
    () =>
      apply(
        s,
        {
          type: "revise",
          petId: "pet-1",
          expectedPlanId: "plan-1",
          items: items(),
          reason: "第二次修订",
        },
        "doctor",
      ),
    /更新/,
  );
});
test("改约不修改计划字段", () => {
  let s = seed();
  const before = JSON.stringify(s.plans);
  s = apply(
    s,
    { type: "appointment", petId: "pet-1", date: day(5), time: "15:00" },
    "family",
    "周女士",
  );
  assert.equal(JSON.stringify(s.plans), before);
  assert.equal(s.appointments.at(-1).status, "requested");
});
test("家庭不得自行确认院方预约", () =>
  assert.throws(
    () =>
      apply(
        seed(),
        { type: "appointmentStatus", id: "appt-1", status: "confirmed" },
        "family",
        "周女士",
      ),
    /医院/,
  ));
test("指定接班人确认之前不改变当前责任人", () => {
  let s = seed();
  s = apply(
    s,
    { type: "handoff", petId: "pet-1", to: "周先生" },
    "family",
    "周女士",
  );
  assert.equal(s.pets[0].member, "周女士");
  assert.throws(
    () =>
      apply(s, { type: "acceptHandoff", petId: "pet-1" }, "family", "周女士"),
    /指定/,
  );
  s = apply(s, { type: "acceptHandoff", petId: "pet-1" }, "family", "周先生");
  assert.equal(s.pets[0].member, "周先生");
});
test("撤销家人授权后不能继续报告", () => {
  let s = seed();
  s = apply(
    s,
    { type: "revoke", petId: "pet-1", id: "member" },
    "family",
    "周女士",
  );
  assert.throws(
    () =>
      apply(
        s,
        {
          type: "report",
          petId: "pet-1",
          taskId: "task-pet-1-1",
          result: "done",
        },
        "family",
        "周先生",
      ),
    /授权/,
  );
});
test("结算基于有效启用，重复结算被拒绝", () => {
  let s = seed();
  s = apply(s, { type: "payment", reference: "收款001" }, "ops");
  assert.equal(s.payments[0].amount, 24);
  assert.throws(
    () => apply(s, { type: "payment", reference: "收款002" }, "ops"),
    /没有待结算/,
  );
  assert.throws(
    () =>
      apply(s, { type: "voidActivation", id: "act-1", reason: "错误" }, "ops"),
    /已结算/,
  );
});
test("作废不影响正式安排与历史记录", () => {
  let s = seed();
  const plans = JSON.stringify(s.plans);
  s = apply(
    s,
    { type: "voidActivation", id: "act-1", reason: "核对后作废" },
    "ops",
  );
  assert.equal(s.activations[0].status, "void");
  assert.equal(JSON.stringify(s.plans), plans);
});
test("不允许将未经答复的问题关闭", () =>
  assert.throws(
    () => apply(seed(), { type: "resolve", id: "concern-2" }),
    /答复/,
  ));
test("运营准备模板，医生确认后可用于出院计划结构", () => {
  let s = seed();
  s = apply(
    s,
    { type: "template", name: "照护结构", scene: "外科术后", items: items() },
    "ops",
  );
  const t = s.templates.at(-1);
  assert.equal(t.status, "pending");
  assert.throws(
    () => apply(s, { type: "approveTemplate", id: t.id }, "ops"),
    /权限/,
  );
  s = apply(s, { type: "approveTemplate", id: t.id }, "doctor");
  assert.equal(s.templates.at(-1).status, "approved");
});
test("过期成员的执行报告被拒绝", () => {
  const s = seed();
  s.pets[0].members[1].expires = day(-1);
  assert.throws(
    () =>
      apply(
        s,
        {
          type: "report",
          petId: "pet-1",
          taskId: "task-pet-1-1",
          result: "done",
        },
        "family",
        "周先生",
      ),
    /授权/,
  );
});
test("医生负责的问题重新打开后仍处于专业判断状态", () => {
  let s = seed();
  s = apply(
    s,
    { type: "reply", id: "concern-1", text: "已核对", nextAction: "复查" },
    "doctor",
  );
  s = apply(s, { type: "resolve", id: "concern-1" }, "family", "周女士");
  s = apply(s, { type: "reopen", id: "concern-1" }, "family", "周女士");
  assert.equal(s.concerns[0].status, "clinical");
  assert.equal(s.concerns[0].assigneeRole, "doctor");
  assert.equal(s.concerns[0].nextAction, "");
});
test("家人确认下一步后仍需要完成实际行动才关闭问题", () => {
  let s = seed();
  s = apply(
    s,
    { type: "reply", id: "concern-1", text: "已核对", nextAction: "联系本院" },
    "doctor",
  );
  s = apply(s, { type: "ackAction", id: "concern-1" }, "family", "周女士");
  assert.equal(s.concerns[0].status, "action");
  s = apply(s, { type: "resolve", id: "concern-1" }, "family", "周女士");
  assert.equal(s.concerns[0].status, "resolved");
});
test("责任转交给替补时保留专业处理历史", () => {
  let s = seed();
  s = apply(s, {
    type: "reassign",
    id: "concern-1",
    assignee: "王雨",
    note: "接班跟进",
  });
  assert.equal(s.concerns[0].status, "accepted");
  assert.equal(s.concerns[0].assignee, "王雨");
  assert.ok(s.concerns[0].messages.at(-1).text.includes("王雨"));
});
test("改约待确认时保留原预约，确认后替换且不改医嘱", () => {
  let s = seed(),
    plans = JSON.stringify(s.plans);
  s = apply(
    s,
    { type: "reschedule", id: "appt-1", date: day(5), time: "15:00" },
    "family",
    "周女士",
  );
  const id = s.appointments.at(-1).id;
  assert.equal(s.appointments[0].status, "confirmed");
  s = apply(s, { type: "appointmentStatus", id, status: "confirmed" });
  assert.equal(s.appointments[0].status, "cancelled");
  assert.equal(s.appointments.at(-1).status, "confirmed");
  assert.equal(JSON.stringify(s.plans), plans);
});
test("撤销待确认改约时不取消原复查", () => {
  let s = seed();
  s = apply(
    s,
    { type: "reschedule", id: "appt-1", date: day(5), time: "15:00" },
    "family",
    "周女士",
  );
  s = apply(
    s,
    {
      type: "appointmentStatus",
      id: s.appointments.at(-1).id,
      status: "cancelled",
    },
    "family",
    "周女士",
  );
  assert.equal(s.appointments[0].status, "confirmed");
});
test("同一预约存在待确认改约时禁止重复申请", () => {
  let s = seed();
  const action = {
    type: "reschedule",
    id: "appt-1",
    date: day(5),
    time: "15:00",
  };
  s = apply(s, action, "family", "周女士");
  assert.throws(() => apply(s, action, "family", "周女士"), /已有/);
});
test("原复查完成后同步撤销待确认改约，不能再确认出第二次预约", () => {
  let s = seed();
  const plans = JSON.stringify(s.plans);
  s = apply(
    s,
    { type: "reschedule", id: "appt-1", date: day(5), time: "15:00" },
    "family",
    "周女士",
  );
  const pendingId = s.appointments.at(-1).id;
  s = apply(s, {
    type: "appointmentStatus",
    id: "appt-1",
    status: "completed",
  });
  assert.equal(s.appointments.at(-1).status, "cancelled");
  assert.match(s.appointments.at(-1).cancelReason, /原复查已完成/);
  assert.throws(
    () =>
      apply(s, {
        type: "appointmentStatus",
        id: pendingId,
        status: "confirmed",
      }),
    /预约已结束/,
  );
  assert.equal(JSON.stringify(s.plans), plans);
});
test("取消原预约同时撤销依赖它的改约申请", () => {
  let s = seed();
  s = apply(
    s,
    { type: "reschedule", id: "appt-1", date: day(5), time: "15:00" },
    "family",
    "周女士",
  );
  s = apply(
    s,
    { type: "appointmentStatus", id: "appt-1", status: "cancelled" },
    "family",
    "周女士",
  );
  assert.equal(s.appointments[0].status, "cancelled");
  assert.equal(s.appointments.at(-1).status, "cancelled");
  assert.match(s.appointments.at(-1).cancelReason, /原预约已取消/);
});
test("既有待确认改约引用已结束原复查时不能恢复有效预约", () => {
  const s = seed();
  s.appointments[0].status = "completed";
  s.appointments.push({
    id: "pending-reschedule",
    petId: "pet-1",
    date: day(5),
    time: "15:00",
    status: "requested",
    replacesId: "appt-1",
  });
  const before = JSON.stringify(s);
  assert.throws(
    () =>
      apply(s, {
        type: "appointmentStatus",
        id: "pending-reschedule",
        status: "confirmed",
      }),
    /预约已结束/,
  );
  assert.equal(JSON.stringify(s), before);
  const refreshed = apply(s, {
    type: "ticket",
    title: "随访支持",
    body: "刷新记录",
  });
  assert.equal(refreshed.appointments.at(-1).status, "cancelled");
  assert.match(refreshed.appointments.at(-1).cancelReason, /原复查已完成/);
});
test("模板退回补充后可修改重提并重新审核", () => {
  let s = seed();
  s = apply(
    s,
    { type: "template", name: "模板", scene: "外科术后", items: items() },
    "ops",
  );
  const id = s.templates.at(-1).id;
  s = apply(
    s,
    { type: "returnTemplate", id, reason: "补充操作说明" },
    "doctor",
  );
  assert.equal(s.templates.at(-1).status, "returned");
  s = apply(
    s,
    {
      type: "editTemplate",
      id,
      name: "补充后的模板",
      scene: "外科术后",
      items: items(),
    },
    "ops",
  );
  s = apply(s, { type: "approveTemplate", id }, "doctor");
  assert.equal(s.templates.at(-1).status, "approved");
});
test("退款有凭证、调整有效用量，原临床资料继续保留", () => {
  let s = seed();
  const plans = JSON.stringify(s.plans);
  s = apply(s, { type: "payment", reference: "收款凭证" }, "ops");
  s = apply(
    s,
    { type: "refund", id: "act-1", reason: "用量核对", reference: "退款凭证" },
    "ops",
  );
  assert.equal(s.activations[0].status, "refunded");
  assert.equal(s.refunds[0].amount, 8);
  assert.equal(JSON.stringify(s.plans), plans);
  assert.throws(
    () =>
      apply(
        s,
        { type: "refund", id: "act-1", reason: "再退", reference: "002" },
        "ops",
      ),
    /已结算/,
  );
});
test("未结算条目不能标记成已退款", () =>
  assert.throws(
    () =>
      apply(
        seed(),
        { type: "refund", id: "act-1", reason: "原因", reference: "凭证" },
        "ops",
      ),
    /已结算/,
  ));
test("院方续订申请在运营端有完成出口", () => {
  let s = seed();
  s = apply(s, { type: "renewal" });
  s = apply(
    s,
    { type: "completeRenewal", note: "继续使用按例计费方案" },
    "ops",
  );
  assert.equal(s.renewal.status, "completed");
});
test("已结束服务不会再生成次日的待执行任务", () => {
  const s = seed();
  s.pets[0].status = "ended";
  s.tasks = s.tasks.filter((t) => t.petId !== "pet-1");
  s.concerns = s.concerns.filter((c) => c.petId !== "pet-1");
  const next = apply(
    s,
    { type: "ticket", title: "支持", body: "记录" },
    "clinic",
  );
  assert.equal(next.tasks.filter((t) => t.petId === "pet-1").length, 0);
});
test("过期家人的责任和未确认交接返回主人", () => {
  let s = seed();
  s.pets[0].member = "周先生";
  s.pets[0].handoff = { to: "周先生", status: "pending" };
  s.pets[0].members[1].expires = day(-1);
  s = apply(s, { type: "ticket", title: "支持", body: "记录" });
  assert.equal(s.pets[0].member, "周女士");
  assert.equal(s.pets[0].handoff, null);
});
test("出院发布时建议复查进入确认队列", () => {
  let s = seed();
  s = apply(s, { type: "publish", id: "plan-4" }, "doctor");
  assert.ok(
    s.appointments.some((a) => a.petId === "pet-4" && a.status === "requested"),
  );
});
test("待生效安排必须先撤销再另行调整", () => {
  let s = seed();
  s = apply(
    s,
    {
      type: "revise",
      petId: "pet-1",
      expectedPlanId: "plan-1",
      items: items(),
      reason: "明日调整",
      effectiveAt: new Date(Date.now() + 86400000).toISOString(),
    },
    "doctor",
  );
  const id = s.plans.at(-1).id;
  assert.throws(
    () =>
      apply(
        s,
        {
          type: "revise",
          petId: "pet-1",
          expectedPlanId: "plan-1",
          items: items(),
          reason: "再调整",
        },
        "doctor",
      ),
    /待生效/,
  );
  s = apply(
    s,
    { type: "withdrawFuturePlan", id, reason: "重新核对" },
    "doctor",
  );
  assert.equal(currentPlan(s, "pet-1").id, "plan-1");
  assert.equal(s.plans.at(-1).status, "withdrawn");
});
test("新一轮服务关联既有档案而不覆盖历史", () => {
  let s = seed();
  s.pets[0].status = "ended";
  s = apply(s, {
    type: "createPlan",
    previousServiceId: "pet-1",
    name: "团团",
    owner: "周女士",
    source: "新一轮指导",
    items: items(),
  });
  assert.equal(s.pets.at(-1).previousServiceId, "pet-1");
  assert.equal(s.pets.at(-1).profileId, "pet-1");
  assert.equal(s.pets[0].status, "ended");
  assert.equal(s.events[0].petId, "pet-1");
});
test("新的专业安排不凭空创建生效前的任务", () => {
  let s = seed();
  const effective = new Date().toISOString();
  s = apply(
    s,
    {
      type: "revise",
      petId: "pet-1",
      expectedPlanId: "plan-1",
      items: [
        {
          id: "before",
          title: "此前时间",
          detail: "照护说明",
          time: "00:00",
          type: "护理",
        },
      ],
      reason: "核对",
      effectiveAt: effective,
    },
    "doctor",
  );
  assert.equal(
    s.tasks.filter((t) => t.planId === s.plans.at(-1).id && t.time === "00:00")
      .length,
    0,
  );
});
test("已接收的正式服务首次主动求助也是有效使用，同轮不重复启用", () => {
  let s = seed();
  s.activations = [];
  const action = {
    type: "concern",
    petId: "pet-1",
    title: "操作遇到困难",
    body: "希望院方协助确认",
    difficulty: "动物抗拒",
  };
  s = apply(s, action, "family", "周女士");
  assert.equal(s.activations.length, 1);
  s = apply(s, action, "family", "周女士");
  assert.equal(s.activations.length, 1);
});
