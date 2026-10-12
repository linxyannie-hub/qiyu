export const iso = () => new Date().toISOString();
export const day = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
};
export const uid = (prefix = "item") =>
  `${prefix}-${globalThis.crypto.randomUUID()}`;
export const roles = {
  clinic: { name: "院方协同", person: "林晓", title: "随访协调员" },
  doctor: { name: "医生工作台", person: "陈予安", title: "主治兽医" },
  family: { name: "家庭照护", person: "周女士", title: "宠物主人" },
  ops: { name: "平台运营", person: "许宁", title: "机构运营" },
};
export function seed() {
  const today = day(),
    tomorrow = day(1),
    future = day(3),
    now = iso();
  const pets = [
    {
      id: "pet-1",
      name: "团团",
      species: "犬",
      breed: "比熊",
      age: "6岁",
      sex: "公 · 已绝育",
      weight: "6.8 kg",
      owner: "周女士",
      phone: "138 0000 0621",
      color: "#d4af78",
      scene: "眼科术后",
      start: day(-3),
      review: future,
      status: "active",
      accepted: true,
      member: "周女士",
      members: [
        { id: "owner", name: "周女士", role: "主人", active: true },
        { id: "member", name: "周先生", role: "家人", active: true },
      ],
      handoff: null,
    },
    {
      id: "pet-2",
      name: "栗子",
      species: "猫",
      breed: "英短",
      age: "3岁",
      sex: "母 · 已绝育",
      weight: "4.2 kg",
      owner: "李女士",
      phone: "139 0000 1832",
      color: "#a3aaa4",
      scene: "外科术后",
      start: day(-2),
      review: tomorrow,
      status: "active",
      accepted: true,
      member: "李女士",
      members: [{ id: "owner", name: "李女士", role: "主人", active: true }],
      handoff: null,
    },
    {
      id: "pet-3",
      name: "可乐",
      species: "犬",
      breed: "柯基",
      age: "5岁",
      sex: "公 · 已绝育",
      weight: "11.6 kg",
      owner: "张先生",
      phone: "137 0000 5908",
      color: "#d59a63",
      scene: "骨科术后",
      start: day(-6),
      review: today,
      status: "active",
      accepted: true,
      member: "张先生",
      members: [{ id: "owner", name: "张先生", role: "主人", active: true }],
      handoff: null,
    },
    {
      id: "pet-4",
      name: "年糕",
      species: "猫",
      breed: "布偶",
      age: "2岁",
      sex: "公 · 已绝育",
      weight: "5.1 kg",
      owner: "王女士",
      phone: "136 0000 2219",
      color: "#c4b9a9",
      scene: "外科术后",
      start: today,
      review: future,
      status: "pending",
      accepted: false,
      member: "王女士",
      members: [{ id: "owner", name: "王女士", role: "主人", active: true }],
      handoff: null,
    },
  ];
  const plans = pets.map((p, i) => ({
    id: `plan-${i + 1}`,
    petId: p.id,
    status: i === 3 ? "review" : "published",
    createdAt: now,
    effectiveAt: new Date(Date.now() - 86400000).toISOString(),
    publishedAt: i === 3 ? null : now,
    author: i === 3 ? "林晓" : "陈予安",
    reason: "出院照护安排",
    source: "本院出院指导单",
    note: "本轮照护以医院交付的出院指导单为依据。如实际执行遇到困难，请及时联系本院。",
    items: [
      {
        id: `i-${i}-1`,
        title: "眼部护理",
        type: "护理",
        time: "09:00",
        detail: "核对出院指导单中的护理对象与操作要求，按本院交付的安排执行。",
        active: true,
      },
      {
        id: `i-${i}-2`,
        title: "佩戴防护圈",
        type: "护理",
        time: "14:00",
        detail: "依照出院指导单确认防护圈佩戴情况，记录遇到的困难。",
        active: true,
      },
      {
        id: `i-${i}-3`,
        title: "晚间状态观察",
        type: "观察",
        time: "20:00",
        detail:
          "记录精神、食欲及本次医院要求关注的变化；不确定的情况可以直接报告。",
        active: true,
      },
    ].map((x) => ({
      ...x,
      title: x.title === "眼部护理" && i !== 0 ? "日常护理" : x.title,
    })),
  }));
  const tasks = plans
    .filter((p) => p.status === "published")
    .flatMap((pl) =>
      pl.items.map((it, j) => ({
        id: `task-${pl.petId}-${j}`,
        petId: pl.petId,
        planId: pl.id,
        itemId: it.id,
        date: today,
        time: it.time,
        title: it.title,
        detail: it.detail,
        type: it.type,
        cancelled: false,
      })),
    );
  return {
    schema: 1,
    revision: 0,
    clinic: {
      name: "禾伴动物医院",
      city: "上海",
      hours: "09:00—18:00",
      phone: "021-0000-0120",
      contact: "林晓",
      backup: "王雨",
      target: 120,
    },
    pets,
    plans,
    tasks,
    events: [
      {
        id: "event-first",
        taskId: "task-pet-1-0",
        petId: "pet-1",
        planId: "plan-1",
        result: "uncertain",
        difficulty: "动物抗拒",
        note: "护理时团团有些抗拒，不确定这次是否完成。",
        actor: "周先生",
        occurredAt: now,
        createdAt: now,
      },
    ],
    concerns: [
      {
        id: "concern-1",
        petId: "pet-1",
        taskId: "task-pet-1-0",
        planId: "plan-1",
        title: "护理尝试后不确定是否完成",
        difficulty: "动物抗拒",
        category: "执行困难",
        body: "护理时团团有些抗拒，不确定这次是否完成，想请医院协助确认下一步。",
        status: "clinical",
        assignee: "陈予安",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        acceptedAt: new Date(Date.now() - 2400000).toISOString(),
        messages: [
          {
            actor: "周先生",
            role: "family",
            text: "护理时团团有些抗拒，不确定这次是否完成。",
            at: now,
          },
          {
            actor: "林晓",
            role: "clinic",
            text: "已收到您的记录，已转交主治医生进一步确认。",
            at: now,
          },
        ],
        nextAction: "",
      },
      {
        id: "concern-2",
        petId: "pet-2",
        taskId: null,
        planId: "plan-2",
        title: "希望调整复查时间",
        category: "预约与资料",
        body: "原复查时间与工作安排冲突，希望调整到下午。",
        status: "new",
        assignee: null,
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        messages: [
          {
            actor: "李女士",
            role: "family",
            text: "希望调整到下午，麻烦协助确认。",
            at: now,
          },
        ],
        nextAction: "",
      },
    ],
    appointments: [
      {
        id: "appt-1",
        petId: "pet-1",
        date: future,
        time: "10:00",
        status: "confirmed",
        note: "眼科术后复查",
      },
      {
        id: "appt-2",
        petId: "pet-3",
        date: today,
        time: "14:30",
        status: "confirmed",
        note: "骨科术后复查",
      },
    ],
    activations: [
      { id: "act-1", petId: "pet-1", at: now, status: "valid", amount: 8 },
      { id: "act-2", petId: "pet-2", at: now, status: "valid", amount: 8 },
      { id: "act-3", petId: "pet-3", at: now, status: "valid", amount: 8 },
    ],
    audit: [
      { id: "audit-first", at: now, actor: "林晓", text: "完成今日随访交接" },
    ],
    settings: { plan: "按有效服务计费", unitPrice: 8 },
    tickets: [],
    institutions: [
      {
        id: "clinic-1",
        name: "禾伴动物医院",
        city: "上海",
        contact: "林晓",
        surgeryScopes: ["眼科术后", "骨科术后", "复杂外科术后"],
        followupContact: "林晓",
        clinicalLead: "陈予安",
        serviceHours: "09:00—18:00",
        reviewPath: "禾伴动物医院院内复查，由林晓确认到院时间",
        status: "active",
      },
    ],
    templates: [
      {
        id: "template-1",
        name: "眼科术后照护",
        scene: "眼科术后",
        status: "approved",
        count: 3,
      },
      {
        id: "template-2",
        name: "骨科术后照护",
        scene: "骨科术后",
        status: "approved",
        count: 3,
      },
      {
        id: "template-3",
        name: "外科术后照护",
        scene: "外科术后",
        status: "approved",
        count: 3,
      },
    ],
    payments: [],
    renewal: null,
  };
}
export const currentPlan = (s, id, at = iso()) =>
  s.plans
    .filter(
      (p) => p.petId === id && p.status === "published" && p.effectiveAt <= at,
    )
    .sort(
      (a, b) =>
        b.effectiveAt.localeCompare(a.effectiveAt) ||
        b.createdAt.localeCompare(a.createdAt),
    )[0];
export const latestPlan = (s, id) =>
  s.plans.filter((p) => p.petId === id && p.status !== "withdrawn").at(-1);
export const petById = (s, id) => s.pets.find((p) => p.id === id);
function eventRoot(event, eventsById) {
  const visited = new Set();
  let root = event;
  while (root.corrects && !visited.has(root.id)) {
    visited.add(root.id);
    const previous = eventsById.get(root.corrects);
    if (
      !previous ||
      previous.taskId !== event.taskId ||
      previous.actor !== event.actor
    )
      break;
    root = previous;
  }
  return root.id;
}
export function effectiveTaskEvents(s, taskId) {
  const events = s.events.filter((e) => e.taskId === taskId);
  const byId = new Map(events.map((e) => [e.id, e]));
  const latestByRoot = new Map();
  for (const event of events)
    latestByRoot.set(eventRoot(event, byId), event.id);
  const effectiveIds = new Set(latestByRoot.values());
  return events.filter((e) => effectiveIds.has(e.id));
}
export const resultLabels = {
  done: "已按安排执行",
  attempted: "尝试未完成",
  missed: "本次未执行",
  uncertain: "不确定是否完成",
};
export const concernLabels = {
  new: "待接收",
  accepted: "已接手",
  supplement: "待家庭补充",
  clinical: "待专业判断",
  answered: "已答复",
  action: "待后续行动",
  resolved: "已解决",
};
export const appointmentLabels = {
  requested: "待院方确认",
  confirmed: "已确认",
  completed: "已完成",
  cancelled: "已取消",
};
export function careLoopSummary(s, petId, at = iso()) {
  const pet = petById(s, petId);
  if (!pet) return null;
  const plan = currentPlan(s, petId, at);
  const latest = latestPlan(s, petId);
  const concerns = s.concerns.filter((c) => c.petId === petId);
  const open = concerns.filter((c) => c.status !== "resolved");
  const appointments = s.appointments.filter((a) => a.petId === petId);
  const active = appointments
    .filter((a) => ["requested", "confirmed"].includes(a.status))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const completed =
    appointments
      .filter((a) => a.status === "completed")
      .sort((a, b) =>
        `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`),
      )[0] || null;
  const pendingChange = active.find((a) => a.replacesId) || null;
  const appointment =
    active.find((a) => a.status === "confirmed") || active[0] || completed;
  const reviewStatus =
    appointment?.status ||
    (appointments.some((a) => a.status === "cancelled")
      ? "cancelled"
      : pet.review
        ? "proposed"
        : "none");
  const review = {
    status: reviewStatus,
    label: {
      none: "尚未安排",
      proposed: "建议日期待确认",
      ...appointmentLabels,
    }[reviewStatus],
    appointment,
    pendingChange,
    completed,
  };
  const futurePlan = s.plans.some(
    (p) => p.petId === petId && p.status === "published" && p.effectiveAt > at,
  );
  const unfinishedPlan = s.plans.some(
    (p) =>
      p.petId === petId && ["draft", "review", "returned"].includes(p.status),
  );
  const blockers = [];
  if (!plan) blockers.push("正式照护安排尚未发布");
  if (!pet.accepted) blockers.push("家庭尚未接收本轮照护");
  if (open.length) blockers.push(`仍有 ${open.length} 项未结求助`);
  if (active.length) blockers.push("复查预约仍待确认或尚未完成");
  if (!completed) blockers.push("尚未记录完成本轮复查");
  if (futurePlan) blockers.push("仍有尚未生效的照护安排");
  if (unfinishedPlan)
    blockers.push("仍有未处理的照护草稿或审核安排，请先审核或明确撤销");
  let stage = "care",
    stageLabel = "家庭按正式安排照护",
    owner = pet.member,
    ownerRole = "family",
    nextStep = "按医院正式安排执行，遇到困难及时报告本院。";
  if (pet.status === "ended") {
    stage = "closed";
    stageLabel = "本轮资料已交付";
    owner = s.clinic.contact;
    ownerRole = "clinic";
    nextStep = pet.endReason || "查看本轮资料与院方交付的后续说明。";
  } else if (!plan) {
    stage = "preparation";
    stageLabel =
      latest?.status === "review" ? "待医生核对出院交付" : "出院交付准备中";
    ownerRole = latest?.status === "review" ? "doctor" : "clinic";
    owner = ownerRole === "doctor" ? roles.doctor.person : s.clinic.contact;
    nextStep =
      latest?.status === "review"
        ? "核对出院材料、照护事项与建议复查，发布正式安排。"
        : "依据本院出院材料完善照护草稿，提交医生核对。";
  } else if (!pet.accepted) {
    stage = "receipt";
    stageLabel = "待家庭接收出院安排";
    owner = pet.owner;
    nextStep = "核对本轮照护安排、医院联系路径与复查建议，确认接收。";
  } else if (open.length) {
    const priority = {
      new: 0,
      clinical: 1,
      accepted: 2,
      supplement: 3,
      answered: 4,
      action: 5,
    };
    const focus = [...open].sort(
      (a, b) => (priority[a.status] ?? 6) - (priority[b.status] ?? 6),
    )[0];
    if (["new", "clinical", "accepted"].includes(focus.status)) {
      stage = "support";
      stageLabel =
        focus.status === "new"
          ? "等待原医院接手"
          : focus.status === "clinical"
            ? "院方已接手，待专业下一步"
            : "院方已接手，核对实际困难";
      owner = focus.assignee || s.clinic.contact;
      ownerRole =
        focus.assigneeRole ||
        (focus.assignee === roles.doctor.person ? "doctor" : "clinic");
      nextStep =
        focus.status === "new"
          ? `接收“${focus.title}”，明确负责人与跟进方式。`
          : focus.status === "clinical"
            ? `结合家庭事实核对“${focus.title}”，交付明确的专业下一步。`
            : `核对“${focus.title}”的执行事实，必要时转交主治医生。`;
    } else {
      stage = "action";
      stageLabel =
        focus.status === "supplement"
          ? "待家庭补充执行事实"
          : focus.status === "answered"
            ? "待家庭确认下一步"
            : "家庭正在落实后续行动";
      owner = pet.member;
      nextStep =
        focus.status === "supplement"
          ? focus.messages.at(-1)?.text || "按院方请求补充实际情况。"
          : focus.nextAction || "查看医院交付的后续安排。";
    }
  } else if (active.length || !completed) {
    stage = "review";
    if (reviewStatus === "confirmed") {
      stageLabel = pendingChange ? "原复查保留，改期待确认" : "复查时间已确认";
      nextStep = pendingChange
        ? "院方确认改期前，原复查预约继续保留。"
        : `按已确认时间到院复查：${appointment.date} ${appointment.time}。`;
    } else {
      stageLabel =
        reviewStatus === "requested"
          ? "复查申请待院方确认"
          : "待落实本轮复查安排";
      ownerRole = reviewStatus === "requested" ? "clinic" : "family";
      owner = ownerRole === "clinic" ? s.clinic.contact : pet.member;
      nextStep =
        reviewStatus === "requested"
          ? "核对复查时间并向家庭确认预约。"
          : "联系本院确认复查时间；建议日期尚不是正式预约。";
    }
  } else {
    stage = "closure";
    stageLabel = "复查已登记，待本轮交付";
    owner =
      futurePlan || unfinishedPlan ? roles.doctor.person : s.clinic.contact;
    ownerRole = futurePlan || unfinishedPlan ? "doctor" : "clinic";
    nextStep = unfinishedPlan
      ? "请主治医生先核对未交付的草稿或审核安排，完成审核或记录原因撤销后，再交付本轮资料。"
      : futurePlan
        ? "请主治医生先核对尚未生效的安排，再确认本轮后续交付。"
        : completed.nextAction || "核对未结事项与后续说明，交付本轮资料。";
  }
  const handoffDone =
    concerns.length > 0 && concerns.every((c) => c.acceptedAt || c.assignee);
  const currentKey = {
    preparation: "preparation",
    receipt: "receipt",
    support: handoffDone ? "action" : "support",
    action: "action",
    care: "action",
    review: "review",
    closure: "closed",
    closed: "closed",
  }[stage];
  const steps = [
    { key: "preparation", label: "出院交付", done: Boolean(plan) },
    { key: "receipt", label: "家庭接收", done: Boolean(pet.accepted) },
    {
      key: "support",
      label: concerns.length ? "院方接手" : "按需院方接手",
      optional: !concerns.length,
      done: handoffDone,
    },
    {
      key: "action",
      label: concerns.length ? "下一步落实" : "按需后续行动",
      optional: !concerns.length,
      done:
        concerns.length > 0 &&
        concerns.every(
          (c) => c.status === "resolved" && c.closeReason && c.nextAction,
        ),
    },
    {
      key: "review",
      label: "到院复查",
      done: !active.length && Boolean(completed),
    },
    { key: "closed", label: "本轮交付", done: pet.status === "ended" },
  ].map(({ key, label, done, optional }) => ({
    key,
    label,
    status: optional
      ? "optional"
      : done
        ? "done"
        : key === currentKey
          ? "current"
          : "pending",
  }));
  return {
    petId,
    stage,
    stageLabel,
    owner,
    ownerRole,
    nextStep,
    openCount: open.length,
    review,
    readyToEnd: pet.status !== "ended" && blockers.length === 0,
    blockers,
    steps,
  };
}
export function normalizeState(s) {
  s.refunds ||= [];
  if (s.clinic.city === "杭州 · 滨江") s.clinic.city = "上海";
  if (s.clinic.phone === "0571-8600-0120") s.clinic.phone = "021-0000-0120";
  const originalInstitution = s.institutions.find(
    (c) =>
      c.id === "clinic-1" && c.name === "禾伴动物医院" && c.city === "杭州",
  );
  if (originalInstitution) originalInstitution.city = "上海";
  for (const a of s.appointments) {
    if (a.status !== "requested" || !a.replacesId) continue;
    const previous = s.appointments.find((x) => x.id === a.replacesId);
    if (
      !previous ||
      previous.petId !== a.petId ||
      ["completed", "cancelled"].includes(previous.status)
    ) {
      a.status = "cancelled";
      a.cancelReason =
        previous?.status === "completed"
          ? "原复查已完成，改约申请已撤销"
          : "原预约已结束，改约申请已撤销";
    }
  }
  for (const c of s.concerns) {
    c.assigneeRole ||=
      c.assignee === roles.doctor.person
        ? "doctor"
        : c.assignee
          ? "clinic"
          : null;
  }
  for (const t of s.templates) {
    if (!t.items && t.status === "approved") {
      const pl = s.plans.find((p) => petById(s, p.petId)?.scene === t.scene);
      t.items = structuredClone(pl?.items || []);
      t.count = t.items.length;
    }
  }
  for (const pet of s.pets) {
    const current = pet.members.find((m) => m.name === pet.member);
    if (!current?.active || (current.expires && current.expires < day()))
      pet.member = pet.owner;
    if (
      pet.handoff?.status === "pending" &&
      !pet.members.some(
        (m) =>
          m.name === pet.handoff.to &&
          m.active &&
          (!m.expires || m.expires >= day()),
      )
    )
      pet.handoff = null;
  }
  return s;
}
export function syncTasks(s, at = iso()) {
  normalizeState(s);
  for (const pet of s.pets) {
    if (pet.status !== "active") continue;
    const plan = currentPlan(s, pet.id, at);
    if (!plan) continue;
    for (const t of s.tasks.filter(
      (t) =>
        t.petId === pet.id &&
        t.planId !== plan.id &&
        Date.parse(`${t.date}T${t.time}:00+08:00`) >=
          Date.parse(plan.effectiveAt),
    ))
      t.cancelled = true;
    for (const item of plan.items.filter((i) => i.active !== false)) {
      if (
        Date.parse(`${day()}T${item.time}:00+08:00`) <
        Date.parse(plan.effectiveAt)
      )
        continue;
      if (
        !s.tasks.some(
          (t) =>
            t.petId === pet.id &&
            t.planId === plan.id &&
            t.itemId === item.id &&
            t.date === day(),
        )
      )
        s.tasks.push({
          id: uid("task"),
          petId: pet.id,
          planId: plan.id,
          itemId: item.id,
          date: day(),
          time: item.time,
          title: item.title,
          type: item.type,
          detail: item.detail,
          cancelled: false,
        });
    }
  }
  return s;
}
function requireRole(role, allowed) {
  if (!allowed.includes(role))
    throw new Error("当前工作空间没有执行此操作的权限。");
}
function required(v, msg) {
  if (!String(v ?? "").trim()) throw new Error(msg);
  return String(v).trim();
}
function validateAppointmentTime(date, time) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date || "") ||
    Number.isNaN(Date.parse(`${date}T00:00:00+08:00`)) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date ||
    date < day() ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time || "")
  )
    throw new Error("请选择有效的复查日期与时间。");
}
const surgeryScopes = ["眼科术后", "骨科术后", "复杂外科术后"];
function institutionProfile(values) {
  return {
    surgeryScopes: [
      ...new Set(
        (Array.isArray(values.surgeryScopes)
          ? values.surgeryScopes
          : []
        ).filter((scene) => surgeryScopes.includes(scene)),
      ),
    ],
    followupContact: String(values.followupContact || "").trim(),
    clinicalLead: String(values.clinicalLead || "").trim(),
    serviceHours: String(values.serviceHours || "").trim(),
    reviewPath: String(values.reviewPath || "").trim(),
  };
}
function validateInstitutionProfile(c) {
  if (!c.surgeryScopes?.some((scene) => surgeryScopes.includes(scene)))
    throw new Error("请至少确认一种复杂术后照护场景。");
  for (const [key, label] of [
    ["followupContact", "随访协调员"],
    ["clinicalLead", "临床负责人"],
    ["serviceHours", "服务时间"],
    ["reviewPath", "院内复查联系路径"],
  ])
    required(c[key], `请补齐${label}后再开通机构。`);
}
function createConcern(
  s,
  petId,
  title,
  body,
  actor,
  taskId = null,
  category = "执行困难",
  difficulty = null,
) {
  const c = {
    id: uid("concern"),
    petId,
    taskId,
    planId: currentPlan(s, petId)?.id || null,
    title,
    body,
    category,
    difficulty,
    status: "new",
    assignee: null,
    createdAt: iso(),
    messages: [{ actor, role: "family", text: body, at: iso() }],
    nextAction: "",
  };
  s.concerns.unshift(c);
  return c;
}
function checkExecutionReports(s, task, actor) {
  const completedActors = new Set(
    effectiveTaskEvents(s, task.id)
      .filter((e) => e.result === "done")
      .map((e) => e.actor),
  );
  const title = "收到两份执行报告，请协助核实";
  if (
    completedActors.size < 2 ||
    s.concerns.some(
      (c) =>
        c.taskId === task.id &&
        c.category === "记录核实" &&
        c.title === title &&
        c.status !== "resolved",
    )
  )
    return;
  const c = createConcern(
    s,
    task.petId,
    title,
    "家庭成员分别报告了本次执行，请院方协助核对事实。",
    actor,
    task.id,
    "记录核实",
  );
  c.planId = task.planId;
}
function activateIfUsed(s, pet) {
  if (
    !pet?.accepted ||
    pet.status !== "active" ||
    !currentPlan(s, pet.id) ||
    s.activations.some((a) => a.petId === pet.id)
  )
    return;
  s.activations.push({
    id: uid("act"),
    petId: pet.id,
    at: iso(),
    status: "valid",
    amount: s.settings.unitPrice,
  });
}
export function transition(
  original,
  action,
  role,
  actor = roles[role]?.person,
) {
  const s = normalizeState(structuredClone(original));
  syncTasks(s);
  const p = action.petId ? petById(s, action.petId) : null;
  let message = "已保存";
  let entity = null;
  const requireFamilyPet = (pet) => {
    if (role !== "family") return;
    if (
      !pet?.members.some(
        (m) =>
          m.active && (!m.expires || m.expires >= day()) && m.name === actor,
      )
    )
      throw new Error("当前照护者没有本轮服务的授权。");
  };
  const concern = () => {
    const c = s.concerns.find((c) => c.id === action.id);
    if (!c) throw new Error("未找到该问题，请刷新后重试。");
    if (petById(s, c.petId)?.status === "ended")
      throw new Error("本轮已结束，请联系本院确认新的跟进安排。");
    if (role === "family") {
      const pet = petById(s, c.petId);
      if (
        !pet?.members.some(
          (m) =>
            m.active && (!m.expires || m.expires >= day()) && m.name === actor,
        )
      )
        throw new Error("当前照护者没有本轮服务的授权。");
    }
    return c;
  };
  switch (action.type) {
    case "acceptService":
      requireRole(role, ["family"]);
      if (!p) throw new Error("未找到服务");
      if (p.status === "ended")
        throw new Error("本轮已结束，请查看已交付资料。");
      if (!currentPlan(s, p.id)) throw new Error("医院尚未发布正式安排。");
      requireFamilyPet(p);
      p.accepted = true;
      p.status = "active";
      message = "已接收本轮照护服务";
      break;
    case "report": {
      requireRole(role, ["family"]);
      if (!p?.accepted || p.status !== "active")
        throw new Error("请先接收正在进行的照护服务。");
      if (
        !p.members.some(
          (m) =>
            m.active && (!m.expires || m.expires >= day()) && m.name === actor,
        )
      )
        throw new Error("当前照护者的授权已失效。");
      if (
        s.events.some((e) => e.operationId === action.operationId) &&
        action.operationId
      )
        return { state: original, message: "此记录已保存" };
      const task = s.tasks.find(
        (t) => t.id === action.taskId && t.petId === p.id,
      );
      if (!task) throw new Error("未找到本次事项。");
      if (!Object.hasOwn(resultLabels, action.result))
        throw new Error("请选择实际执行结果。");
      const at = action.occurredAt || iso();
      if (Number.isNaN(Date.parse(at)) || Date.parse(at) > Date.now() + 60000)
        throw new Error("发生时间不能晚于当前时间。");
      const event = {
        id: uid("event"),
        operationId: action.operationId || uid("operation"),
        taskId: task.id,
        petId: p.id,
        planId: task.planId,
        result: action.result,
        note: action.note || "",
        actor,
        occurredAt: at,
        createdAt: iso(),
        attachment: action.attachment || null,
        difficulty: action.difficulty || null,
      };
      s.events.push(event);
      checkExecutionReports(s, task, actor);
      if (task.cancelled || currentPlan(s, p.id, at)?.id !== task.planId)
        createConcern(
          s,
          p.id,
          "历史安排下的执行记录待核实",
          action.note || "本次记录关联此前安排，请协助核实。",
          actor,
          task.id,
          "记录核实",
        );
      if (action.help)
        createConcern(
          s,
          p.id,
          `${task.title}遇到困难`,
          required(action.note, "请说明需要医院协助的情况。"),
          actor,
          task.id,
          "执行困难",
          action.difficulty || null,
        );
      activateIfUsed(s, p);
      message = action.help ? "已记录，并提交医院协助" : "实际执行情况已记录";
      entity = event.id;
      break;
    }
    case "correct":
      requireRole(role, ["family"]);
      {
        const e = s.events.find((e) => e.id === action.id);
        if (!e || e.actor !== actor)
          throw new Error("只能更正自己提交的记录。");
        const pet = petById(s, e.petId);
        if (
          !pet?.members.some(
            (m) =>
              m.active &&
              (!m.expires || m.expires >= day()) &&
              m.name === actor,
          )
        )
          throw new Error("当前照护者的授权已失效。");
        if (!resultLabels[action.result]) throw new Error("请选择更正结果");
        const byId = new Map(s.events.map((event) => [event.id, event]));
        const rootId = eventRoot(e, byId);
        const previous = effectiveTaskEvents(s, e.taskId).find(
          (event) => eventRoot(event, byId) === rootId,
        );
        s.events.push({
          ...previous,
          id: uid("event"),
          operationId: uid("operation"),
          result: action.result,
          note: required(action.note, "请填写更正原因"),
          corrects: previous.id,
          createdAt: iso(),
        });
        const task = s.tasks.find((t) => t.id === e.taskId);
        if (task) checkExecutionReports(s, task, actor);
        message = "已追加更正，原记录保留";
      }
      break;
    case "concern":
      requireRole(role, ["family"]);
      if (!p?.accepted || p.status !== "active")
        throw new Error("当前服务不可提交新问题。");
      if (
        !p.members.some(
          (m) =>
            m.active && (!m.expires || m.expires >= day()) && m.name === actor,
        )
      )
        throw new Error("照护授权已失效。");
      entity = createConcern(
        s,
        p.id,
        required(action.title, "请填写问题标题。"),
        required(action.body, "请描述需要协助的情况。"),
        actor,
        action.taskId,
        action.category,
        action.difficulty || null,
      ).id;
      activateIfUsed(s, p);
      message = "已提交，等待医院接收";
      break;
    case "claim":
      requireRole(role, ["clinic", "doctor"]);
      {
        const c = concern();
        if (c.status !== "new")
          throw new Error("该问题已被接手，请查看最新状态。");
        c.status = role === "doctor" ? "clinical" : "accepted";
        c.assignee = actor;
        c.assigneeRole = role;
        c.acceptedAt = iso();
        c.messages.push({
          actor,
          role,
          text: "已接手，会继续跟进此问题。",
          at: iso(),
        });
        message = "已接手问题";
      }
      break;
    case "escalate":
      requireRole(role, ["clinic"]);
      {
        const c = concern();
        if (!["accepted", "supplement"].includes(c.status))
          throw new Error("请先接手问题再转交医生。");
        c.status = "clinical";
        c.assignee = roles.doctor.person;
        c.assigneeRole = "doctor";
        c.messages.push({
          actor,
          role,
          text: action.note || "已转交主治医生处理专业判断。",
          at: iso(),
        });
        message = "已交由陈医生处理";
      }
      break;
    case "supplement":
      requireRole(role, ["clinic", "doctor"]);
      {
        const c = concern();
        if (["resolved", "new"].includes(c.status))
          throw new Error("当前状态不可请求补充。");
        if (c.status !== "supplement") c.resumeStatus = c.status;
        c.status = "supplement";
        c.messages.push({
          actor,
          role,
          text: required(action.text, "请说明需要补充什么。"),
          at: iso(),
        });
        message = "已向家庭请求补充";
      }
      break;
    case "reply": {
      const c = concern();
      if (c.status === "resolved")
        throw new Error("问题已解决，请先重新打开。");
      const text = required(action.text, "请填写内容。");
      if (role === "ops") throw new Error("平台运营不能交付临床答复。");
      if (role === "family") {
        const cp = petById(s, c.petId);
        if (
          !cp.members.some(
            (m) =>
              m.active &&
              (!m.expires || m.expires >= day()) &&
              m.name === actor,
          )
        )
          throw new Error("照护授权已失效。");
        if (c.status === "supplement") {
          c.status = ["answered", "action"].includes(c.resumeStatus)
            ? c.resumeStatus
            : c.assigneeRole === "doctor"
              ? "clinical"
              : "accepted";
          delete c.resumeStatus;
        }
      } else {
        requireRole(role, ["clinic", "doctor"]);
        if (c.status === "new") throw new Error("请先接手问题。");
        if (role === "clinic" && c.category !== "预约与资料")
          throw new Error("此问题需要兽医专业答复，请转交医生。");
        c.status = "answered";
        c.nextAction = required(action.nextAction, "请填写明确的后续动作。");
        c.answeredAt = iso();
        c.answeredBy = actor;
        delete c.resumeStatus;
        delete c.actionAcknowledgedAt;
        delete c.actionAcknowledgedBy;
      }
      c.messages.push({ actor, role, text, at: iso() });
      message = role === "family" ? "补充信息已发送" : "答复与后续安排已交付";
      break;
    }
    case "ackAction":
      requireRole(role, ["family"]);
      {
        const c = concern();
        if (c.status !== "answered")
          throw new Error("请先查看医院的专业答复。");
        c.status = "action";
        c.actionAcknowledgedAt = iso();
        c.actionAcknowledgedBy = actor;
        c.messages.push({
          actor,
          role,
          text: "已收到后续安排，正在落实。",
          at: iso(),
        });
        message = "已确认后续安排，待实际行动完成";
      }
      break;
    case "reassign":
      requireRole(role, ["clinic", "doctor"]);
      {
        const c = concern();
        if (c.status === "resolved") throw new Error("已解决的问题无需转交");
        const name = required(action.assignee, "请选择接手人");
        if (
          ![s.clinic.contact, s.clinic.backup, roles.doctor.person].includes(
            name,
          )
        )
          throw new Error("请选择本院已配置的接手人员");
        c.assignee = name;
        c.assigneeRole = name === roles.doctor.person ? "doctor" : "clinic";
        if (!["answered", "action", "supplement"].includes(c.status))
          c.status = c.assigneeRole === "doctor" ? "clinical" : "accepted";
        c.acceptedAt ||= iso();
        c.messages.push({
          actor,
          role,
          text: `已交由${name}继续跟进。${action.note || ""}`,
          at: iso(),
        });
        message = "责任交接已记录";
      }
      break;
    case "resolve":
      requireRole(role, ["family", "clinic", "doctor"]);
      {
        const c = concern();
        if (!["answered", "action"].includes(c.status))
          throw new Error("问题须有答复或后续行动后才能解决。");
        if (role === "family" && c.status !== "action")
          throw new Error("请先确认医院的后续安排，再记录实际行动结果。");
        c.status = "resolved";
        c.closedAt = iso();
        c.closedBy = actor;
        c.closedRole = role;
        c.closeReason = required(
          action.reason,
          "请记录实际完成的行动或处理结果。",
        );
        c.messages.push({
          actor,
          role,
          text: `已记录处理结果：${c.closeReason}`,
          at: c.closedAt,
        });
        message = "问题已解决";
      }
      break;
    case "reopen":
      requireRole(role, ["family", "clinic", "doctor"]);
      {
        const c = concern();
        if (c.status !== "resolved") throw new Error("此问题尚未关闭。");
        if (petById(s, c.petId)?.status === "ended")
          throw new Error("本轮已结束，请联系本院确认新的跟进安排。");
        c.status =
          c.assigneeRole === "doctor"
            ? "clinical"
            : c.assignee
              ? "accepted"
              : "new";
        c.nextAction = "";
        delete c.closedAt;
        delete c.closeReason;
        delete c.closedBy;
        delete c.closedRole;
        delete c.actionAcknowledgedAt;
        delete c.actionAcknowledgedBy;
        delete c.resumeStatus;
        c.messages.push({
          actor,
          role,
          text: action.reason || "需要继续跟进，重新打开问题。",
          at: iso(),
        });
        message = "已重新打开问题";
      }
      break;
    case "createPlan": {
      requireRole(role, ["clinic"]);
      const name = required(action.name, "请填写宠物姓名。");
      const owner = required(action.owner, "请填写主人称呼。");
      if (action.review && action.review < day())
        throw new Error("建议复查日期不能早于今天。");
      const previous = action.previousServiceId
        ? petById(s, action.previousServiceId)
        : null;
      if (action.previousServiceId && previous?.status !== "ended")
        throw new Error("请先结束上一轮服务后再建立新一轮。");
      const pet = {
        id: uid("pet"),
        profileId: previous?.profileId || previous?.id || uid("profile"),
        previousServiceId: previous?.id || null,
        name,
        owner,
        species: action.species || "犬",
        breed: action.breed || "待补充",
        age: action.age || "待补充",
        weight: action.weight || "待补充",
        sex: "待补充",
        phone: action.phone || "",
        scene: action.scene || "外科术后",
        color: "#d4af78",
        start: day(),
        review: action.review || day(3),
        status: "pending",
        accepted: false,
        member: owner,
        members: [{ id: "owner", name: owner, role: "主人", active: true }],
        handoff: null,
      };
      s.pets.push(pet);
      const plan = {
        id: uid("plan"),
        petId: pet.id,
        status: "draft",
        createdAt: iso(),
        author: actor,
        source: required(action.source, "请填写材料来源。"),
        sourceDocument: action.sourceDocument || null,
        note: action.note || "",
        reason: "出院照护安排",
        effectiveAt: iso(),
        items: action.items,
      };
      validateItems(plan.items);
      s.plans.push(plan);
      message = "出院草稿已建立";
      entity = pet.id;
      break;
    }
    case "savePlan":
      requireRole(role, ["clinic"]);
      {
        const plan = s.plans.find((pl) => pl.id === action.id);
        if (!plan || !["draft", "returned"].includes(plan.status))
          throw new Error("只有草稿可以编辑。");
        if (petById(s, plan.petId)?.status === "ended")
          throw new Error("本轮已结束，不能继续编辑出院安排。");
        validateItems(action.items);
        plan.items = action.items;
        plan.source = required(action.source, "请填写来源");
        plan.note = action.note || "";
        if (action.sourceDocument) plan.sourceDocument = action.sourceDocument;
        plan.status = "draft";
        message = "草稿已保存";
      }
      break;
    case "submitPlan":
      requireRole(role, ["clinic"]);
      {
        const plan = s.plans.find((pl) => pl.id === action.id);
        if (!plan || !["draft", "returned"].includes(plan.status))
          throw new Error("当前计划不能提交审核。");
        if (petById(s, plan.petId)?.status === "ended")
          throw new Error("本轮已结束，不能继续提交出院安排。");
        validateItems(plan.items);
        plan.status = "review";
        message = "已提交医生审核";
      }
      break;
    case "returnPlan":
      requireRole(role, ["doctor"]);
      {
        const plan = s.plans.find((pl) => pl.id === action.id);
        if (plan?.status !== "review")
          throw new Error("当前计划不在审核队列。");
        if (petById(s, plan.petId)?.status === "ended")
          throw new Error("本轮已结束，不能继续审核出院安排。");
        plan.status = "returned";
        plan.returnReason = required(action.reason, "请填写退回原因。");
        message = "已退回护理人员补充";
      }
      break;
    case "publish":
      requireRole(role, ["doctor"]);
      {
        const plan = s.plans.find((pl) => pl.id === action.id);
        if (plan?.status !== "review")
          throw new Error("只有待审核的计划可以发布。");
        if (petById(s, plan.petId)?.status === "ended")
          throw new Error("本轮已结束，不能继续发布出院安排。");
        validateItems(plan.items);
        plan.status = "published";
        plan.publishedAt = iso();
        plan.effectiveAt = action.effectiveAt || iso();
        plan.author = actor;
        const pet = petById(s, plan.petId);
        if (
          pet.review &&
          pet.review >= day() &&
          !s.appointments.some((a) => a.petId === pet.id)
        )
          s.appointments.push({
            id: uid("appt"),
            petId: pet.id,
            date: pet.review,
            time: "10:00",
            status: "requested",
            note: "出院计划中的建议复查，待本院确认",
          });
        message = "正式照护安排已发布";
      }
      break;
    case "revise":
      requireRole(role, ["doctor"]);
      {
        if (!p || p.status === "ended") throw new Error("当前服务不可调整。");
        if (
          s.plans.some(
            (pl) =>
              pl.petId === p.id &&
              pl.status === "published" &&
              pl.effectiveAt > iso(),
          )
        )
          throw new Error("已有待生效的安排，请先核对并撤销该安排后再调整。");
        const old = currentPlan(s, p.id);
        if (!old || old.id !== action.expectedPlanId)
          throw new Error("安排已更新，请重新查看后调整。");
        validateItems(action.items);
        const effectiveAt = action.effectiveAt || iso();
        if (Number.isNaN(Date.parse(effectiveAt)))
          throw new Error("请填写有效生效时间");
        const plan = {
          ...old,
          id: uid("plan"),
          previousId: old.id,
          status: "published",
          createdAt: iso(),
          publishedAt: iso(),
          effectiveAt,
          author: actor,
          reason: required(action.reason, "请填写调整原因。"),
          items: action.items,
          note: action.note ?? old.note,
        };
        s.plans.push(plan);
        message = "照护安排已更新";
        entity = plan.id;
      }
      break;
    case "withdrawPlan":
    case "withdrawFuturePlan":
      requireRole(role, ["doctor"]);
      {
        const pl = s.plans.find((pl) => pl.id === action.id);
        if (
          !pl ||
          !(
            ["draft", "review", "returned"].includes(pl.status) ||
            (pl.status === "published" && pl.effectiveAt > iso())
          )
        )
          throw new Error("只有未正式交付或尚未生效的安排可以撤销");
        if (petById(s, pl.petId)?.status === "ended")
          throw new Error("本轮已结束，未交付安排仅保留历史，不再变更。");
        pl.status = "withdrawn";
        pl.withdrawReason = required(action.reason, "请填写撤销原因");
        pl.withdrawnAt = iso();
        pl.withdrawnBy = actor;
        message = currentPlan(s, pl.petId)
          ? "未生效安排已撤销，当前正式安排继续有效"
          : "未交付安排已撤销，内容与撤销说明已保留";
      }
      break;
    case "invite":
      requireRole(role, ["family"]);
      if (p && actor !== p.owner) throw new Error("只有主人可以管理照护成员。");
      if (action.expires && action.expires < day())
        throw new Error("授权到期日期不能早于今天。");
      if (!p) throw new Error("未找到宠物");
      {
        const name = required(action.name, "请填写家人称呼。");
        if (p.members.some((m) => m.name === name && m.active))
          throw new Error("该成员已有照护授权");
        p.members.push({
          id: uid("member"),
          name,
          role: "家人",
          active: true,
          expires: action.expires || null,
        });
        message = "照护成员已加入";
      }
      break;
    case "revoke":
      requireRole(role, ["family"]);
      if (p && actor !== p.owner) throw new Error("只有主人可以撤销成员授权。");
      {
        const m = p?.members.find((m) => m.id === action.id);
        if (!m || m.role === "主人") throw new Error("不能撤销主人权限");
        m.active = false;
        if (p.member === m.name) p.member = p.owner;
        if (p.handoff?.to === m.name) p.handoff = null;
        message = "该成员照护授权已撤销";
      }
      break;
    case "handoff":
      requireRole(role, ["family"]);
      if (
        !p?.members.some(
          (m) =>
            m.active &&
            (!m.expires || m.expires >= day()) &&
            m.name === action.to,
        )
      )
        throw new Error("请选择已授权家人");
      p.handoff = {
        from: p.member,
        to: action.to,
        status: "pending",
        at: iso(),
      };
      message = "已发起交接，等待接班确认";
      break;
    case "acceptHandoff":
      requireRole(role, ["family"]);
      if (
        !p?.members.some(
          (m) =>
            m.active && (!m.expires || m.expires >= day()) && m.name === actor,
        )
      )
        throw new Error("照护授权已失效。");
      if (!p?.handoff || p.handoff.to !== actor)
        throw new Error("请由指定接班人确认。");
      p.member = actor;
      p.handoff.status = "accepted";
      message = "已确认接班";
      break;
    case "appointment":
      requireRole(role, ["family", "clinic"]);
      if (!p || p.status === "ended") throw new Error("当前服务不可申请复查");
      requireFamilyPet(p);
      validateAppointmentTime(action.date, action.time || "10:00");
      if (
        s.appointments.some(
          (a) =>
            a.petId === p.id &&
            a.date === action.date &&
            a.time === (action.time || "10:00") &&
            ["requested", "confirmed"].includes(a.status),
        )
      )
        throw new Error("该复查时间已有有效预约或待确认申请，请查看原预约。");
      s.appointments.push({
        id: uid("appt"),
        petId: p.id,
        date: action.date,
        time: action.time || "10:00",
        status: role === "clinic" ? "confirmed" : "requested",
        note: action.note || "复查申请",
      });
      message =
        role === "clinic" ? "复查时间已确认" : "已提交复查申请，等待医院确认";
      break;
    case "reschedule": {
      requireRole(role, ["family", "clinic"]);
      const previous = s.appointments.find((a) => a.id === action.id);
      if (!previous || !["confirmed", "requested"].includes(previous.status))
        throw new Error("当前预约不能改约。");
      validateAppointmentTime(action.date, action.time);
      if (previous.date === action.date && previous.time === action.time)
        throw new Error("新时间与原预约相同，请选择实际需要调整的时间。");
      if (
        s.appointments.some(
          (a) =>
            a.id !== previous.id &&
            a.petId === previous.petId &&
            a.date === action.date &&
            a.time === action.time &&
            ["requested", "confirmed"].includes(a.status),
        )
      )
        throw new Error("新复查时间已有有效预约或申请，请核对原预约。");
      if (
        s.appointments.some(
          (a) => a.replacesId === previous.id && a.status === "requested",
        )
      )
        throw new Error("已有待确认的改约申请，请等待院方处理。");
      const pet = petById(s, previous.petId);
      if (pet.status === "ended") throw new Error("本轮已结束，无法改约。");
      requireFamilyPet(pet);
      const changed = {
        id: uid("appt"),
        petId: previous.petId,
        date: action.date,
        time: action.time,
        status: role === "clinic" ? "confirmed" : "requested",
        note: action.note || "复查改约",
        replacesId: previous.id,
      };
      if (role === "clinic") {
        previous.status = "cancelled";
        previous.cancelReason = "改约已确认";
        pet.review = action.date;
      }
      s.appointments.push(changed);
      message =
        role === "clinic"
          ? "复查改约已确认"
          : "改约申请已提交，原预约在确认前保留";
      break;
    }
    case "appointmentStatus":
      requireRole(role, ["clinic", "doctor", "family"]);
      {
        const a = s.appointments.find((a) => a.id === action.id);
        if (!a) throw new Error("未找到预约");
        const pet = petById(s, a.petId);
        if (!pet || pet.status === "ended")
          throw new Error("本轮已结束，复查记录不能继续变更。");
        requireFamilyPet(pet);
        if (role === "family" && action.status !== "cancelled")
          throw new Error("预约需要医院确认");
        if (role === "doctor" && action.status !== "completed")
          throw new Error("预约时间由本院随访协调员确认。");
        if (!["confirmed", "completed", "cancelled"].includes(action.status))
          throw new Error("预约状态无效");
        if (action.status === "completed" && a.status !== "confirmed")
          throw new Error("需先确认复查");
        if (action.status === "completed" && a.date > day())
          throw new Error(
            "不能登记未来预约已完成复查，请先核对实际到院日期并调整预约。",
          );
        if (a.status === "completed" || a.status === "cancelled")
          throw new Error("当前预约已结束");
        if (action.status === "confirmed" && a.replacesId) {
          const old = s.appointments.find((x) => x.id === a.replacesId);
          if (
            !old ||
            old.petId !== a.petId ||
            !["confirmed", "requested"].includes(old.status)
          )
            throw new Error("原复查已结束，请重新申请复查。");
        }
        if (
          action.status === "confirmed" &&
          s.appointments.some(
            (x) =>
              x.id !== a.id &&
              x.id !== a.replacesId &&
              x.petId === a.petId &&
              x.date === a.date &&
              x.time === a.time &&
              ["requested", "confirmed"].includes(x.status),
          )
        )
          throw new Error(
            "该复查时间已存在其他有效预约或申请，请先核对重复记录。",
          );
        a.status = action.status;
        if (a.status === "confirmed") {
          if (a.replacesId) {
            const old = s.appointments.find((x) => x.id === a.replacesId);
            if (old && old.status !== "completed") {
              old.status = "cancelled";
              old.cancelReason = "改约已确认";
            }
          }
          petById(s, a.petId).review = a.date;
        }
        if (a.status === "completed") {
          a.completedAt = iso();
          a.reviewNote = required(
            action.reviewNote || action.note,
            "请记录本次到院复查与资料交付情况。",
          );
          a.nextAction = required(
            action.nextAction,
            "请记录院方已交付的后续安排。",
          );
          a.completedBy = actor;
          a.completedRole = role;
        }
        if (["completed", "cancelled"].includes(a.status)) {
          for (const pending of s.appointments.filter(
            (x) => x.replacesId === a.id && x.status === "requested",
          )) {
            pending.status = "cancelled";
            pending.cancelReason =
              a.status === "completed"
                ? "原复查已完成，改约申请已撤销"
                : "原预约已取消，改约申请已撤销";
          }
        }
        message = "复查状态已更新";
      }
      break;
    case "end":
      requireRole(role, ["clinic", "doctor"]);
      if (!p || p.status === "ended") throw new Error("服务已经结束");
      if (s.concerns.some((c) => c.petId === p.id && c.status !== "resolved"))
        throw new Error("请先处理未结问题或完成明确转交。");
      {
        const types = [
          "完成本轮随访",
          "转入新一轮服务",
          "转院并完成交接",
          "主人退出服务",
        ];
        const endType =
          action.endType ||
          types.find((type) => action.reason?.startsWith(type)) ||
          "完成本轮随访";
        if (!types.includes(endType))
          throw new Error("请选择明确的本轮结束方式。");
        const reason = required(action.reason, "请填写服务结束原因及下一步。");
        if (endType === "完成本轮随访") {
          const loop = careLoopSummary(s, p.id);
          if (!loop.readyToEnd)
            throw new Error(
              `请先完成本轮交付条件：${loop.blockers.join("；")}。`,
            );
        } else {
          for (const a of s.appointments.filter(
            (a) =>
              a.petId === p.id && ["requested", "confirmed"].includes(a.status),
          )) {
            a.status = "cancelled";
            a.cancelReason = `本轮${endType}，原预约撤销；${reason}`;
          }
          for (const pl of s.plans.filter(
            (pl) =>
              pl.petId === p.id &&
              (["draft", "review", "returned"].includes(pl.status) ||
                (pl.status === "published" && pl.effectiveAt > iso())),
          )) {
            pl.status = "withdrawn";
            pl.withdrawnAt = iso();
            pl.withdrawReason = `本轮${endType}，未生效安排停止交付；${reason}`;
          }
        }
        p.endType = endType;
        p.endReason = reason;
      }
      p.status = "ended";
      p.endedAt = iso();
      for (const t of s.tasks.filter(
        (t) =>
          t.petId === p.id &&
          Date.parse(`${t.date}T${t.time}:00+08:00`) >= Date.now(),
      ))
        t.cancelled = true;
      message = "本轮服务已结束，资料可继续获取";
      break;
    case "editPet":
      requireRole(role, ["clinic"]);
      if (!p) throw new Error("未找到病例");
      {
        const oldOwner = p.owner;
        const owner = required(action.owner, "请填写主人称呼");
        Object.assign(p, {
          name: required(action.name, "请填写宠物姓名"),
          owner,
          breed: action.breed || "待补充",
          age: action.age || "待补充",
          weight: action.weight || "待补充",
          phone: action.phone || "",
        });
        const member = p.members.find((m) => m.role === "主人");
        if (member) member.name = owner;
        if (p.member === oldOwner) p.member = owner;
        message = "病例基础资料已更新";
      }
      break;
    case "settings":
      requireRole(role, ["clinic"]);
      for (const name of ["name", "hours", "phone", "contact", "backup"])
        required(action.values[name], "请完整填写机构服务信息");
      if (
        !Number.isInteger(Number(action.values.target)) ||
        Number(action.values.target) < 1 ||
        Number(action.values.target) > 1440
      )
        throw new Error("接单目标需为1—1440分钟");
      s.clinic = { ...s.clinic, ...action.values };
      {
        const main = s.institutions.find((c) => c.id === "clinic-1");
        if (main) {
          main.name = s.clinic.name;
          main.followupContact = s.clinic.contact;
          main.serviceHours = s.clinic.hours;
        }
      }
      message = "服务设置已保存";
      break;
    case "institution":
      requireRole(role, ["ops"]);
      s.institutions.push({
        id: uid("clinic"),
        name: required(action.name, "请填写机构名称"),
        city: required(action.city, "请填写城市"),
        contact: required(action.contact, "请填写负责人"),
        ...institutionProfile(action),
        status: "onboarding",
      });
      message = "机构已建立，进入实施流程";
      break;
    case "institutionProfile":
      requireRole(role, ["ops"]);
      {
        const c = s.institutions.find((c) => c.id === action.id);
        if (!c) throw new Error("未找到机构，请重新查看。");
        const values = institutionProfile(action);
        validateInstitutionProfile(values);
        Object.assign(c, values);
        if (action.name !== undefined)
          c.name = required(action.name, "请填写机构名称。");
        if (c.id === "clinic-1") {
          s.clinic.name = c.name;
          s.clinic.contact = c.followupContact;
          s.clinic.hours = c.serviceHours;
        }
        c.profileUpdatedAt = iso();
        message = "复杂术后服务配置已保存";
      }
      break;
    case "activateInstitution":
      requireRole(role, ["ops"]);
      {
        const c = s.institutions.find((c) => c.id === action.id);
        if (!c || c.status !== "onboarding")
          throw new Error("机构已经开通或不存在");
        validateInstitutionProfile(c);
        const checks = ["handoff", "instructions", "familyPath", "reviewPath"];
        if (
          !Array.isArray(action.checks) ||
          !checks.every((check) => action.checks.includes(check))
        )
          throw new Error(
            "请完成接手人员、出院交付、家庭求助与复查路径的实施验收。",
          );
        c.status = "active";
        c.activatedAt = iso();
        c.activatedBy = actor;
        c.implementationChecks = [...checks];
        message = "机构已开通";
      }
      break;
    case "template":
      requireRole(role, ["ops"]);
      validateItems(action.items);
      s.templates.push({
        id: uid("template"),
        name: required(action.name, "请填写模板名称"),
        scene: action.scene || "外科术后",
        status: "pending",
        count: action.items.length,
        items: action.items,
      });
      message = "模板已建立，待临床审核";
      break;
    case "editTemplate":
      requireRole(role, ["ops"]);
      {
        const t = s.templates.find((t) => t.id === action.id);
        if (!t || t.status !== "returned")
          throw new Error("仅退回的模板可以修改重提");
        validateItems(action.items);
        Object.assign(t, {
          name: required(action.name, "请填写模板名称"),
          scene: action.scene,
          items: action.items,
          count: action.items.length,
          status: "pending",
        });
        message = "模板已重新提交临床审核";
      }
      break;
    case "returnTemplate":
      requireRole(role, ["doctor"]);
      {
        const t = s.templates.find((t) => t.id === action.id);
        if (!t || t.status !== "pending") throw new Error("模板不在审核队列");
        t.status = "returned";
        t.returnReason = required(action.reason, "请填写需要补充的内容");
        message = "模板已退回补充";
      }
      break;
    case "approveTemplate":
      requireRole(role, ["doctor"]);
      {
        const t = s.templates.find((t) => t.id === action.id);
        if (!t || t.status !== "pending")
          throw new Error("当前模板不在审核队列");
        validateItems(t.items);
        t.status = "approved";
        t.approvedBy = actor;
        t.approvedAt = iso();
        message = "照护模板已完成临床审核";
      }
      break;
    case "ticket":
      requireRole(role, ["ops", "clinic"]);
      s.tickets.push({
        id: uid("ticket"),
        title: required(action.title, "请填写支持事项"),
        body: required(action.body, "请描述问题"),
        status: "open",
        at: iso(),
        actor,
      });
      message = "支持事项已登记";
      break;
    case "closeTicket":
      requireRole(role, ["ops"]);
      {
        const t = s.tickets.find((t) => t.id === action.id);
        if (!t) throw new Error("未找到事项");
        t.status = "closed";
        message = "支持事项已完成";
      }
      break;
    case "voidActivation":
      requireRole(role, ["ops"]);
      {
        const a = s.activations.find((a) => a.id === action.id);
        if (!a || a.status !== "valid") throw new Error("该条目已作废");
        if (s.payments.some((p) => p.activationIds.includes(a.id)))
          throw new Error("已结算条目请通过退款流程处理");
        a.status = "void";
        a.reason = required(action.reason, "请填写作废原因");
        message = "已作废计费条目";
      }
      break;
    case "refund":
      requireRole(role, ["ops"]);
      {
        const a = s.activations.find((a) => a.id === action.id);
        if (
          !a ||
          a.status !== "valid" ||
          !s.payments.some((p) => p.activationIds.includes(a.id))
        )
          throw new Error("仅已结算的有效条目可以登记退款");
        const reason = required(action.reason, "请填写退款原因");
        const reference = required(action.reference, "请填写退款凭证");
        s.refunds.push({
          id: uid("refund"),
          activationId: a.id,
          amount: a.amount,
          reason,
          reference,
          at: iso(),
        });
        a.status = "refunded";
        a.reason = reason;
        message = "退款与用量调整已记录";
      }
      break;
    case "completeRenewal":
      requireRole(role, ["ops"]);
      if (s.renewal?.status !== "requested")
        throw new Error("当前没有待处理续订申请");
      s.renewal.status = "completed";
      s.renewal.completedAt = iso();
      s.renewal.note = required(action.note, "请填写续订交付内容");
      message = "续订申请已处理";
      break;
    case "payment":
      requireRole(role, ["ops"]);
      {
        const outstanding = s.activations.filter(
          (a) =>
            a.status === "valid" &&
            !s.payments.some((p) => p.activationIds.includes(a.id)),
        );
        if (!outstanding.length) throw new Error("当前没有待结算用量");
        s.payments.push({
          id: uid("payment"),
          at: iso(),
          amount: outstanding.reduce((x, a) => x + a.amount, 0),
          activationIds: outstanding.map((a) => a.id),
          reference: required(action.reference, "请填写收款凭证或流水号"),
        });
        message = "收款已登记";
      }
      break;
    case "renewal":
      requireRole(role, ["clinic"]);
      s.renewal = { at: iso(), status: "requested" };
      message = "续订申请已提交";
      break;
    default:
      throw new Error("无法识别的操作。");
  }
  syncTasks(s);
  s.revision = (s.revision || 0) + 1;
  s.audit.unshift({
    id: uid("audit"),
    at: iso(),
    actor,
    text: message,
    petId: action.petId || entity,
  });
  s.audit = s.audit.slice(0, 150);
  return { state: s, message, entity };
}
export function validateItems(items) {
  if (!Array.isArray(items) || !items.length)
    throw new Error("请至少保留一项照护安排");
  for (const i of items) {
    required(i.title, "请填写事项名称");
    required(i.detail, "请填写操作说明");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(i.time))
      throw new Error("请填写有效事项时间");
  }
}
