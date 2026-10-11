import test from "node:test";
import assert from "node:assert/strict";
import { seed, transition, currentPlan, day, uid } from "../assets/domain.mjs";
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
