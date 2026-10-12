import { icon, logo, petArt } from "./icons.mjs";
import {
  roles,
  currentPlan,
  latestPlan,
  petById,
  resultLabels,
  effectiveTaskEvents,
  careLoopSummary,
  concernLabels,
  appointmentLabels,
  day,
  uid,
} from "./domain.mjs";
import { getState, dispatch, exportState } from "./store.mjs";
const app = document.querySelector("#app"),
  dialog = document.querySelector("#dialog");
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const fmt = (date, withTime = false) =>
  date
    ? new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        month: "numeric",
        day: "numeric",
        ...(withTime
          ? { hour: "2-digit", minute: "2-digit", hour12: false }
          : {}),
      }).format(new Date(date.length === 10 ? date + "T12:00:00+08:00" : date))
    : "尚未确定";
const timeStr = (d) =>
  new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(d));
const money = (n) =>
  Number(n).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const dateLabel = () =>
  new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
const mins = (d) =>
  Math.max(0, Math.floor((Date.now() - Date.parse(d)) / 60000));
const waitLabel = (d) =>
  mins(d) < 60
    ? `${mins(d)} 分钟`
    : `${Math.floor(mins(d) / 60)} 小时 ${mins(d) % 60} 分钟`;
const state = () => getState();
let filter = "all",
  search = "",
  petFilter = "all",
  familyActor = sessionStorage.getItem("qiyu.actor") || "",
  returnFocus = null,
  modalSubmit = null;
function route() {
  const [role, page, id] = location.hash.slice(2).split("/");
  return {
    role:
      role === "home" ? "home" : Object.hasOwn(roles, role) ? role : "clinic",
    page: page || "dashboard",
    id: id ? decodeURIComponent(id) : "",
  };
}
function href(role, page, id = "") {
  return `#/${role}/${page}${id ? "/" + encodeURIComponent(id) : ""}`;
}
function go(role, page, id) {
  location.hash = href(role, page, id);
}
function actor() {
  const r = route();
  if (r.role !== "family")
    return r.role === "clinic" ? state().clinic.contact : roles[r.role].person;
  const p = selectedPet();
  const names = p.members
    .filter((m) => m.active && (!m.expires || m.expires >= day()))
    .map((m) => m.name);
  return names.includes(familyActor) ? familyActor : p.owner;
}
function selectedPet() {
  const s = state();
  const requested = route().id || sessionStorage.getItem("qiyu.pet");
  return petById(s, requested) || s.pets[0];
}
const badge = (label, color = "green") =>
  `<span class="badge ${color}"><i class="dot"></i>${esc(label)}</span>`;
const cBadge = (c) =>
  badge(
    concernLabels[c.status],
    {
      new: "amber",
      clinical: "blue",
      supplement: "amber",
      resolved: "green",
      answered: "green",
      accepted: "blue",
      action: "amber",
    }[c.status],
  );
const pBadge = (p) =>
  badge(
    p.status === "ended"
      ? "本轮已结束"
      : p.accepted
        ? "照护进行中"
        : "待家庭接收",
    p.status === "ended" ? "" : "green",
  );
const btn = (text, action, id = "", style = "primary", ic = "") =>
  `<button class="btn ${style}" data-action="${action}" data-id="${esc(id)}">${ic ? icon(ic) : ""}${esc(text)}</button>`;
const linkBtn = (text, link, style = "", ic = "") =>
  `<a class="btn ${style}" href="${link}">${ic ? icon(ic) : ""}${esc(text)}</a>`;
const empty = (title, body = "暂无需要处理的事项", action = "") =>
  `<div class="empty">${icon("leaf")}<h3>${esc(title)}</h3><p>${esc(body)}</p>${action}</div>`;
const petCell = (p) =>
  `<div class="pet-cell">${petArt(p.species, p.color)}<div><strong>${esc(p.name)}</strong><small>${esc(p.breed)} · ${esc(p.owner)}</small></div></div>`;
const foot = () =>
  `<footer class="page-foot"><span>${icon("shield")}出院交付 · 原院接手 · 复查衔接</span><span>栖愈 QIYU CARE · 复杂术后照护，持续有人跟进</span></footer>`;
function head(title, desc, actions = "") {
  return `<div class="page-head"><div><div class="eyebrow">${roles[route().role].name}<span class="eyebrow-separator">/</span>QIYU CARE</div><h1>${esc(title)}</h1><p>${esc(desc)}</p></div><div class="actions">${actions}</div></div>`;
}
function roleMenu() {
  const cur = route().role;
  const curName = cur === "home" ? "栖愈首页" : roles[cur].name;
  return `<details class="role-select"><summary>${icon(cur === "family" ? "heart" : "grid")}<span>${curName}</span>${icon("down")}</summary><div class="role-menu"><a class="${cur === "home" ? "current" : ""}" href="${href("home", "dashboard")}">${icon("leaf")}<div>栖愈首页<small>作品封面 · 平台介绍</small></div></a>${Object.entries(
    roles,
  )
    .map(
      ([key, r]) =>
        `<a class="${key === cur ? "current" : ""}" href="${href(key, key === "family" ? "today" : "dashboard")}">${icon({ clinic: "building", family: "heart", doctor: "stethoscope", ops: "chart" }[key])}<div>${r.name}<small>${key === "clinic" ? esc(state().clinic.contact) : r.person} · ${r.title}</small></div></a>`,
    )
    .join("")}</div></details>`;
}
const navs = {
  clinic: [
    ["dashboard", "grid", "工作概览"],
    ["queue", "chat", "照护接手"],
    ["pets", "paw", "服务病例"],
    ["plans", "clipboard", "出院计划"],
    ["appointments", "calendar", "复查安排"],
    ["reports", "chart", "服务报告"],
    ["settings", "settings", "服务设置"],
  ],
  doctor: [
    ["dashboard", "grid", "工作概览"],
    ["clinical", "stethoscope", "专业待办"],
    ["approvals", "clipboard", "计划审核"],
    ["pets", "paw", "我的病例"],
  ],
  ops: [
    ["dashboard", "grid", "运营概览"],
    ["institutions", "building", "合作机构"],
    ["templates", "clipboard", "照护模板"],
    ["billing", "wallet", "用量与结算"],
    ["support", "chat", "机构支持"],
  ],
};
function desktopShell(content) {
  const r = route(),
    s = state();
  const nav = navs[r.role];
  return `<div class="shell"><aside class="sidebar"><a class="brand" href="${href(r.role, "dashboard")}">${logo()}<div><strong>栖愈</strong><small>QIYU CARE</small></div></a><div class="workspace-chip"><i class="dot"></i>${r.role === "ops" ? "栖愈机构服务中心" : esc(s.clinic.name)}</div><div class="nav-caption">工作空间</div><nav class="nav" aria-label="主导航">${nav.map(([page, ic, name]) => `<a class="${r.page === page ? "active" : ""}" ${r.page === page ? 'aria-current="page"' : ""} href="${href(r.role, page)}">${icon(ic)}${name}${page === "queue" && s.concerns.some((c) => c.status !== "resolved") ? `<span class="nav-count">${s.concerns.filter((c) => c.status !== "resolved").length}</span>` : ""}</a>`).join("")}</nav><div class="sidebar-bottom"><div class="sidebar-note"><h3>术后照护，有人接手</h3><p>家庭照护遇到困难<br>带着上下文交给原医院。</p></div><div class="sidebar-foot"><span class="avatar">${esc(actor().slice(-2))}</span><div><b>${esc(actor())}</b><small>${roles[r.role].title}</small></div></div></div></aside><div class="main-shell"><header class="topbar"><button class="icon-btn mobile-menu" data-action="menu" aria-label="打开导航">${icon("grid")}</button><div class="breadcrumb">${r.role === "ops" ? "机构服务中心" : esc(s.clinic.name)}${icon("chevron")}<strong>${nav.find((n) => n[0] === r.page)?.[2] || (r.page === "support" ? "机构支持" : "病例详情")}</strong></div><div class="top-actions"><button class="global-search" data-action="search">${icon("search")}<span>${r.role === "ops" ? "搜索合作机构或负责人" : "搜索宠物、主人或事项"}</span><kbd>⌘ K</kbd></button><button class="icon-btn notification-dot" data-action="notifications" aria-label="查看待办消息">${icon("bell")}</button>${roleMenu()}<span class="avatar">${esc(actor().slice(-2))}</span></div></header><main id="main" class="content">${content}${foot()}</main></div></div>`;
}
function activeMembers(p) {
  return p.members.filter(
    (m) => m.active && (!m.expires || m.expires >= day()),
  );
}
function familyShell(content) {
  const r = route(),
    p = selectedPet();
  const nav = [
    ["today", "sun", "今天"],
    ["plan", "clipboard", "照护计划"],
    ["messages", "chat", "消息"],
    ["me", "heart", "我的"],
  ];
  const count = state().concerns.filter(
    (c) => c.petId === p.id && ["answered", "supplement"].includes(c.status),
  ).length;
  return `<div class="phone-stage"><aside class="phone-intro"><a class="brand" href="${href("clinic", "dashboard")}">${logo()}<div><strong>栖愈</strong><small>QIYU CARE</small></div></a><div class="eyebrow">CARE THAT STAYS WITH YOU</div><h1>出院以后，<br>原医院仍在。</h1><p>复杂术后安排清楚可见，<br>遇到困难，有人接手跟进。</p><div class="phone-intro-detail">${icon("shield")}原院随访 · 专业下一步 · 到院复查</div></aside><div class="phone-frame"><div class="phone-screen"><div class="phone-status"><time>${timeStr(new Date())}</time><div class="phone-island"></div><span><svg viewBox="0 0 54 18" width="54" height="18" aria-hidden="true"><path d="M1 13v3M5 10v6M9 7v9M13 4v12" stroke="currentColor" stroke-width="2.5"/><path d="M21 7q6-6 12 0M24 10q3-3 6 0M27 13v1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><rect x="38" y="5" width="13" height="9" rx="2" stroke="currentColor" fill="none"/><rect x="40" y="7" width="9" height="5" rx="1" fill="currentColor"/><path d="M53 8v3" stroke="currentColor" stroke-width="1.5"/></svg></span></div><div class="family-shell"><header class="family-top"><a class="brand" href="${href("family", "today", p.id)}">${logo()}<strong>栖愈</strong></a><div class="mini-capsule"><button data-action="family-more" aria-label="打开小程序菜单"><span class="capsule-dots">•••</span></button><i></i><a href="${href("family", "today", p.id)}" aria-label="回到今天"><span class="capsule-home"></span></a></div></header><main id="main" class="family-content"><div class="family-petbar">${petArt(p.species, p.color)}<div><strong>${esc(p.name)}</strong><small>${esc(sceneLabel(p.scene))} · ${esc(state().clinic.name)}</small></div><select class="filter-select" id="family-pet" aria-label="选择宠物">${state()
    .pets.map(
      (pet) =>
        `<option value="${pet.id}" ${p.id === pet.id ? "selected" : ""}>${esc(pet.name)}${pet.status === "ended" ? " · 已结束" : "的照护"}</option>`,
    )
    .join(
      "",
    )}</select></div>${content}</main><nav class="mobile-bottom" aria-label="家庭导航">${nav.map(([page, ic, label]) => `<a href="${href("family", page, p.id)}" class="${r.page === page || (r.page === "review" && page === "me") ? "active" : ""}" ${r.page === page || (r.page === "review" && page === "me") ? 'aria-current="page"' : ""}>${icon(ic)}<span>${label}</span>${page === "messages" && count ? `<i class="nav-message-dot">${count}</i>` : ""}</a>`).join("")}</nav><div class="phone-home-indicator"></div></div></div></div><aside class="phone-side-note"><span class="phone-note-icon">${icon("leaf")}</span><h2>每一步，都有着落。</h2><p>按院方安排照护<br>困难由原院接手<br>复查之后交付下一步</p><span class="phone-note-line"></span><small>连续照护，安心相伴</small></aside><div class="stage-corner-switch">${roleMenu()}</div></div>`;
}

function workspaceOverview() {
  const s = state(),
    role = route().role;
  let links, title, description, tag;
  if (role === "clinic") {
    title = "接住家庭做不成的那一步。";
    description =
      "围绕复杂术后执行困难，核对事实、落实责任人、交付下一步，持续跟进到复查。";
    tag = "复杂术后 · 原院随访";
    links = [
      [
        "clipboard",
        "出院交付",
        s.plans.filter((p) => p.status === "review").length + " 待审核",
        "plans",
      ],
      [
        "heart",
        "家庭照护",
        s.pets.filter((p) => p.status === "active").length + " 进行中",
        "pets",
      ],
      [
        "chat",
        "困难接手",
        s.concerns.filter((c) => c.status !== "resolved").length + " 待跟进",
        "queue",
      ],
      [
        "calendar",
        "复查衔接",
        s.appointments.filter((a) => a.status === "confirmed").length +
          " 已确认",
        "appointments",
      ],
    ];
  } else if (role === "doctor") {
    title = "带着执行事实，交付专业下一步。";
    description =
      "查看原始出院材料、当前有效安排与家庭实际尝试；答复后衔接正式安排及复查交付。";
    tag = "专业协作总览";
    links = [
      [
        "clipboard",
        "计划审核",
        s.plans.filter((p) => p.status === "review").length + " 待审核",
        "approvals",
      ],
      [
        "stethoscope",
        "专业判断",
        s.concerns.filter(
          (c) => c.status === "clinical" && c.assigneeRole === "doctor",
        ).length + " 待处理",
        "clinical",
      ],
      [
        "chat",
        "持续跟进",
        s.concerns.filter(
          (c) => c.assigneeRole === "doctor" && c.status !== "resolved",
        ).length + " 在跟进",
        "clinical",
      ],
      [
        "paw",
        "服务病例",
        s.pets.filter((p) => p.status === "active").length + " 进行中",
        "pets",
      ],
    ];
  } else {
    title = "把复杂术后随访，交付给合适的医院。";
    description =
      "面向具备外科业务和随访人员的机构，围绕出院交付、问题接手、复查路径及每例用量运营。";
    tag = "机构服务总览";
    links = [
      [
        "building",
        "合作机构",
        s.institutions.filter((c) => c.status === "active").length + " 已开通",
        "institutions",
      ],
      [
        "clipboard",
        "照护模板",
        s.templates.filter((t) => t.status === "approved").length + " 已审核",
        "templates",
      ],
      [
        "wallet",
        "有效用量",
        s.activations.filter((a) => a.status === "valid").length + " 已启用",
        "billing",
      ],
      [
        "chat",
        "机构支持",
        s.tickets.filter((t) => t.status === "open").length + " 待跟进",
        "support",
      ],
    ];
  }
  const flow = `<div class="care-flow" aria-label="工作流程入口">${links.map(([ic, label, count, page], index) => `<a class="care-flow-step" href="${href(role, page)}"><span class="flow-icon tone-${index}">${icon(ic)}</span><strong>${label}</strong><small>${count}</small><span class="flow-arrow">${icon("chevron")}</span></a>`).join("")}</div>`;
  if (role === "doctor") {
    return `<section class="overview-banner doctor-overview">${flow}</section>`;
  }
  return `<section class="overview-banner"><div class="overview-copy"><span class="overview-kicker">${icon("leaf")}${tag}</span><h2>${title}</h2><p>${description}</p></div>${flow}</section>`;
}
function familyNextStep(summary) {
  if (summary.stage === "support" && summary.ownerRole !== "family")
    return `由${summary.owner}跟进这次困难，答复后请查看并落实下一步。`;
  if (summary.stage === "review" && summary.ownerRole === "clinic")
    return "复查申请已提交，等待院方确认时段。";
  if (summary.stage === "preparation")
    return "院方正在核对出院材料，正式发布后可接收本轮安排。";
  return summary.nextStep;
}
function sceneLabel(scene) {
  return scene === "外科术后" ? "复杂外科术后" : scene;
}
function loopLink(role, petId, key) {
  if (role === "family")
    return href(
      role,
      key === "review"
        ? "review"
        : key === "support" || key === "action"
          ? "messages"
          : key === "closed"
            ? "me"
            : "plan",
      petId,
    );
  return href(role, "case", petId);
}
function roundSummary(p, compact = false) {
  const summary = careLoopSummary(state(), p.id),
    role = route().role;
  const destination =
    summary.stage === "closure" || summary.stage === "closed"
      ? "closed"
      : summary.stage === "review"
        ? "review"
        : summary.stage === "support"
          ? "support"
          : summary.stage === "action"
            ? "action"
            : summary.stage === "receipt"
              ? "receipt"
              : "preparation";
  const nextStep =
    role === "family" ? familyNextStep(summary) : summary.nextStep;
  const stageContent = (step, index) =>
    `<span class="closure-number">${step.status === "done" ? icon("check") : index + 1}</span><span>${esc(step.label)}</span><small>${{ done: "已衔接", current: "当前阶段", pending: "待衔接", optional: "按需发生" }[step.status]}</small>`;
  return `<section class="round-summary ${compact ? "compact" : ""}" aria-label="本轮术后照护进度"><div class="round-summary-head"><div><span class="round-label">${icon("clipboard")}本轮术后照护</span><h2>${esc(summary.stageLabel)}</h2></div>${badge(p.scene, "")}</div><ol class="closure-path">${summary.steps.map((step, index) => `<li class="closure-step ${step.status}">${step.status === "optional" ? `<span class="closure-static">${stageContent(step, index)}</span>` : `<button data-action="loop-step" data-id="${p.id}" data-step="${step.key}" ${step.status === "current" ? 'aria-current="step"' : ""}>${stageContent(step, index)}</button>`}</li>`).join("")}</ol><div class="next-step-card"><span class="next-step-icon">${icon(summary.ownerRole === "doctor" ? "stethoscope" : summary.ownerRole === "family" ? "heart" : "building")}</span><div><small>${esc(summary.ownerRole === "family" ? "家庭下一步" : "当前接手方")} · ${esc(summary.owner)}${summary.openCount ? ` · ${summary.openCount}项未结` : ""}</small><strong>${esc(nextStep)}</strong></div>${role === "family" ? `<a class="text-btn" href="${loopLink(role, p.id, destination)}" aria-label="查看本轮下一步">${icon("chevron")}</a>` : `<button class="text-btn" data-action="loop-step" data-id="${p.id}" data-step="${destination}" aria-label="查看本轮下一步">${icon("chevron")}</button>`}</div></section>`;
}

function queueSummary(cs, role) {
  const items =
    role === "doctor"
      ? [
          ["clinical", "待专业答复", "stethoscope"],
          ["answered", "等待家庭确认", "chat"],
          ["action", "下一步待落实", "check"],
        ]
      : [
          ["new", "等待院方接手", "chat"],
          ["accepted", "负责人跟进中", "users"],
          ["clinical", "等待专业答复", "stethoscope"],
          ["action", "下一步待落实", "check"],
        ];
  return `<div class="queue-summary" aria-label="接手与落实队列">${items.map(([key, label, ic]) => `<button class="queue-summary-item ${filter === key ? "selected" : ""}" data-action="queue-filter" data-id="${key}"><span>${icon(ic)}${label}</span><strong>${cs.filter((c) => c.status === key).length}<small>项</small></strong></button>`).join("")}</div>`;
}
function serviceFit() {
  return `<section class="service-fit"><div><span class="round-label">${icon("building")}合作机构适用条件</span><h2>有复杂术后业务，也有能接手的随访团队。</h2><p>眼科、骨科及复杂外科术后，院方安排需要家庭持续执行，遇阻后由原医院交付下一步。</p></div><div class="fit-points"><span>${icon("stethoscope")}主治兽医负责专业安排</span><span>${icon("users")}协调员负责接手与交接</span><span>${icon("calendar")}有明确的到院复查路径</span></div></section>`;
}
function enhanceSectionHeadings() {
  const names = [
    [/复查/, "calendar"],
    [/团队|成员|分工|协作/, "users"],
    [/问题|反馈|关注/, "chat"],
    [/收款|退款|结算|软件/, "wallet"],
    [/模板|计划|安排/, "clipboard"],
    [/资料/, "file"],
    [/发生|记录/, "clock"],
    [/机构|合作/, "building"],
    [/实施|交付/, "shield"],
    [/照护|护理/, "heart"],
    [/服务/, "shield"],
  ];
  for (const title of app.querySelectorAll(
    ".card-head h2,.card.pad > h2,.card.pad > .field-action > h2",
  )) {
    if (title.querySelector("svg")) continue;
    const name = names.find(([pattern]) =>
      pattern.test(title.textContent),
    )?.[1];
    if (name) {
      title.classList.add("section-title");
      title.insertAdjacentHTML(
        "afterbegin",
        `<span class="section-icon">${icon(name)}</span>`,
      );
    }
  }
}
function stat(label, number, sub, ic = "heart", suffix = "", green = false) {
  return `<div class="stat tone-${{ chat: "amber", calendar: "blue", wallet: "sand", clock: "amber", building: "blue" }[ic] || "green"}"><div class="stat-top"><span>${esc(label)}</span><span class="metric-icon">${icon(ic)}</span></div><div class="stat-number">${number}<small>${suffix}</small></div><div class="stat-foot ${green ? "green" : ""}">${green ? icon("check") : ""}${esc(sub)}</div></div>`;
}
function clinicDashboard() {
  const s = state(),
    r = route(),
    open = s.concerns.filter((c) => c.status !== "resolved"),
    apps = s.appointments.filter((a) => a.status === "confirmed"),
    n = s.pets.filter((p) => p.status === "active").length;
  const pending =
    r.role === "doctor" ? open.filter((c) => c.status === "clinical") : open;
  return `${head(`${actor()}，今天也辛苦了`, dateLabel() + " · 复杂术后照护：先接手困难，再落实下一步与复查。", r.role === "clinic" ? btn("新建出院计划", "new-plan", "", "primary", "plus") : linkBtn("查看专业待办", href("doctor", "clinical"), "primary", "stethoscope"))}${workspaceOverview()}<section class="stats" aria-label="服务指标">${stat("术后照护进行中", n, "家庭已接收本轮正式安排", "heart", "只宠物", true)}${stat(r.role === "doctor" ? "待专业判断" : "未结照护困难", pending.length, r.role === "doctor" ? "由兽医确认下一步" : "有责任人的协同队列", "chat", "项")}${stat("复查待到院", apps.length, "按院方确认的时段衔接", "calendar", "项")}${stat("正式安排已交付", s.plans.filter((p) => p.status === "published").length, "来源与签发信息完整", "shield", "份", true)}</section><div class="dashboard-grid"><section class="card"><div class="card-head"><div><h2>需要落实的照护困难 <span class="count-dot">${pending.length}</span></h2><p>优先核对实际尝试和当前责任人，答复之后继续跟进落实。</p></div><a class="text-btn" href="${href(r.role, r.role === "doctor" ? "clinical" : "queue")}">全部事项 ${icon("chevron")}</a></div>${queueSummary(pending, r.role)}${queueTabs(pending, true)}${concernTable(pending.slice(0, 5), true)}<div class="table-footer"><span>普通执行记录已汇总至病例</span><span>显示 ${pending.length} 项</span></div></section><aside class="stack"><section class="card"><div class="card-head"><h2>近期复查</h2><a class="text-btn" href="${href(r.role, r.role === "clinic" ? "appointments" : "pets")}">${icon("arrow")}</a></div>${
    apps
      .slice(0, 3)
      .map((a) => {
        const p = petById(s, a.petId);
        return `<a class="schedule-item" href="${href(r.role, "case", p.id)}"><div class="schedule-time">${a.time}<br><small>${fmt(a.date)}</small></div>${petArt(p.species, p.color)}<div class="schedule-info"><b>${esc(p.name)}</b><small>${esc(a.note)}</small></div>${icon("chevron")}</a>`;
      })
      .join("") || empty("暂无已确认复查")
  }</section><section class="card mini-card"><h3>${icon("users")}今日协作</h3><div class="progress-row"><span>已明确接手人</span><b>${open.filter((c) => c.assignee).length} / ${open.length}</b></div><div class="progress"><i style="width:${open.length ? (open.filter((c) => c.assignee).length / open.length) * 100 : 100}%"></i></div><p>协调员处理信息与安排，医生处理专业判断。每一步都保留交接记录。</p></section></aside></div><section class="card activity"><div class="card-head"><h2>最近发生</h2><span class="subtle">团队的每一份照护，都有迹可循</span></div><div class="activity-grid" style="padding:0 23px 23px">${s.audit
    .slice(0, 4)
    .map(
      (a) =>
        `<div class="timeline-item"><span class="timeline-icon">${icon("check")}</span><div><h3>${esc(a.text)}</h3><p>${esc(a.actor)}${a.petId && petById(s, a.petId) ? " · " + esc(petById(s, a.petId).name) : ""}</p><time>${fmt(a.at, true)}</time></div></div>`,
    )
    .join("")}</div></section>`;
}
function queueTabs(list, compact = false) {
  return `<div class="tabs" role="tablist" aria-label="事项状态">${[
    ["all", "全部事项"],
    ["new", "待院方接手"],
    ["accepted", "处理中"],
    ["supplement", "待补充"],
    ["clinical", "待专业答复"],
    ["answered", "待家庭确认"],
    ["action", "待落实"],
    ["resolved", "已落实"],
  ]
    .filter(
      ([key]) =>
        !compact || ["all", "new", "clinical", "answered"].includes(key),
    )
    .map(
      ([k, l]) =>
        `<button role="tab" aria-selected="${filter === k}" class="tab ${filter === k ? "active" : ""}" data-action="queue-filter" data-id="${k}">${l}<span>${k === "all" ? list.length : list.filter((c) => c.status === k).length}</span></button>`,
    )
    .join("")}</div>`;
}
function concernTable(cs, useFilter = true) {
  const s = state(),
    r = route();
  let list = useFilter
    ? cs.filter(
        (c) =>
          (filter === "all" || c.status === filter) &&
          `${c.title}${petById(s, c.petId).name}${petById(s, c.petId).owner}`.includes(
            search,
          ),
      )
    : cs;
  if (!list.length)
    return empty(
      filter === "all" ? "当前没有照护困难" : "当前队列没有匹配事项",
      filter === "all"
        ? "家庭如实报告困难后，由院方在此接手跟进。"
        : "可切换全部事项查看其他阶段。",
      filter === "all"
        ? ""
        : btn("查看全部事项", "queue-filter", "all", "soft"),
    );
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>宠物 / 家庭</th><th>执行困难 / 关联事项</th><th>衔接状态</th><th>当前责任人</th><th>发起至今</th><th>操作</th></tr></thead><tbody>${list
    .map((c) => {
      const p = petById(s, c.petId);
      return `<tr><td><a href="${href(r.role, "case", p.id)}">${petCell(p)}</a></td><td><div class="table-title">${esc(c.title)}</div><div class="table-note">${esc(c.difficulty || c.category)}${c.nextAction ? " · 已交付下一步" : ""}</div></td><td>${cBadge(c)}</td><td>${esc(c.assignee || "待接手")}</td><td>${c.status === "resolved" ? "已完成" : waitLabel(c.createdAt)}</td><td><button class="text-btn" data-action="concern-detail" data-id="${c.id}">${c.status === "new" ? "接手处理" : "查看处理"} ${icon("chevron")}</button></td></tr>`;
    })
    .join("")}</tbody></table></div>`;
}
function queuePage() {
  const r = route(),
    s = state(),
    cs =
      r.role === "doctor"
        ? s.concerns.filter((c) => c.assigneeRole === "doctor")
        : s.concerns;
  return `${head(r.role === "doctor" ? "专业待办" : "照护接手", r.role === "doctor" ? "核对实际执行和正式安排，交付专业答复、明确下一步及复查衔接。" : "家庭报告做不成或不确定的情况，由原院负责人接手并跟进到实际落实。")}<div class="toolbar"><label class="search-input">${icon("search")}<input id="list-search" placeholder="搜索宠物、主人或问题" value="${esc(search)}" aria-label="搜索事项"></label><span class="subtle">共 ${cs.length} 项 · ${cs.filter((c) => c.status !== "resolved").length} 项未结</span></div>${queueSummary(cs, r.role)}<section class="card">${queueTabs(cs)}${concernTable(cs)}</section>`;
}
function petsPage() {
  const s = state(),
    r = route(),
    ps = s.pets.filter(
      (p) =>
        (petFilter === "all" || p.status === petFilter) &&
        `${p.name}${p.owner}${p.breed}`.includes(search),
    );
  return `${head(r.role === "doctor" ? "我的病例" : "服务病例", "按本轮术后照护跟进困难、正式安排和复查交付，结轮后保留全过程。", r.role === "clinic" ? btn("新建出院计划", "new-plan", "", "primary", "plus") : "")}<div class="toolbar"><label class="search-input">${icon("search")}<input id="list-search" placeholder="搜索宠物或主人" value="${esc(search)}" aria-label="搜索病例"></label><select id="pet-filter" class="filter-select" aria-label="病例状态">${[
    ["all", "全部服务"],
    ["active", "照护进行中"],
    ["pending", "待接收"],
    ["ended", "已结束"],
  ]
    .map(
      ([v, l]) =>
        `<option value="${v}" ${petFilter === v ? "selected" : ""}>${l}</option>`,
    )
    .join(
      "",
    )}</select></div><div class="pet-grid">${ps.map((p) => `<article class="card pet-card">${petCell(p)}${pBadge(p)}<div class="pet-meta"><span>照护场景<b>${esc(sceneLabel(p.scene))}</b></span><span>本轮开始<b>${fmt(p.start)}</b></span><span>当前责任人<b>${esc(p.member)}</b></span><span>未结困难<b>${s.concerns.filter((c) => c.petId === p.id && c.status !== "resolved").length} 项</b></span><span>当前阶段<b>${esc(careLoopSummary(s, p.id).stageLabel)}</b></span><span>下一次复查<b>${esc(careLoopSummary(s, p.id).review.label)}</b></span></div>${linkBtn("打开服务病例", href(r.role, "case", p.id), "full", "arrow")}</article>`).join("") || empty("没有匹配的病例", "试试其他姓名或服务状态。")}</div>`;
}
function instructionList(plan) {
  return plan.items
    .filter((i) => i.active !== false)
    .map(
      (i) =>
        `<div class="instruction"><span class="instruction-time">${esc(i.time)}</span><div><h3>${esc(i.title)} ${badge(i.type || "护理", "")}</h3><p>${esc(i.detail)}</p></div></div>`,
    )
    .join("");
}
function eventTimeline(petId) {
  const s = state(),
    events = s.events
      .filter((e) => e.petId === petId)
      .slice()
      .reverse();
  return events.length
    ? `<div class="timeline">${events
        .slice(0, 12)
        .map((e) => {
          const t = s.tasks.find((t) => t.id === e.taskId);
          return `<div class="timeline-item"><span class="timeline-icon">${icon(e.result === "done" ? "check" : "chat")}</span><div><h3>${esc(t?.title || "执行记录")} · ${esc(resultLabels[e.result])}${e.corrects ? " · 更正记录" : ""}</h3><p>${esc(e.note || "已记录实际执行情况")}</p>${e.difficulty ? `<p>报告的困难：${esc(e.difficulty)}</p>` : ""}<time>${esc(e.actor)} · ${fmt(e.occurredAt, true)}</time>${e.attachment ? `<img class="message-image" src="${safeImage(e.attachment)}" alt="照护记录附件">` : ""}${route().role === "family" && petById(s, petId)?.status !== "ended" && e.actor === actor() ? `<button class="text-btn" data-action="correct" data-id="${e.id}">更正记录</button>` : ""}</div></div>`;
        })
        .join("")}</div>`
    : empty("还没有执行记录", "家庭开始记录后，照护过程会在这里连续呈现。");
}
function unissuedPlanPanel(p) {
  if (p.status === "ended" || route().role === "family") return "";
  const pending = state().plans.filter(
    (plan) =>
      plan.petId === p.id &&
      ["draft", "review", "returned"].includes(plan.status),
  );
  if (!pending.length) return "";
  return `<section class="unissued-plans"><h3>${icon("clipboard")}尚未交付的安排</h3><p>当前正式安排继续保留，准备中的内容需要审核或明确撤销。</p>${pending.map((plan) => `<div class="field-action"><div><strong>${esc(plan.reason)}</strong><small>${{ draft: "草稿", review: "待医生审核", returned: "待补充" }[plan.status]} · ${esc(plan.author)}</small></div><div class="actions">${route().role === "doctor" ? `${plan.status === "review" ? btn("审核计划", "approve", plan.id, "small soft", "clipboard") : ""}${btn("撤销未交付安排", "withdraw-plan", plan.id, "small", "close")}` : btn(plan.status === "review" ? "查看审核状态" : "打开草稿", "edit-plan", plan.id, "small soft", "edit")}</div></div>`).join("")}</section>`;
}
function casePage() {
  const s = state(),
    r = route(),
    p = petById(s, r.id);
  if (!p)
    return empty(
      "未找到服务病例",
      "请返回病例列表。",
      linkBtn("返回病例", href(r.role, "pets")),
    );
  const plan = currentPlan(s, p.id),
    latest = latestPlan(s, p.id),
    cs = s.concerns.filter((c) => c.petId === p.id);
  return `<div class="section-gap"><a class="text-btn" href="${href(r.role, "pets")}">${icon("back")}返回服务病例</a></div><header class="pet-header">${petArt(p.species, p.color)}<div><h1>${esc(p.name)}</h1><p>${esc(p.breed)} · ${esc(p.age)} · ${esc(p.weight)}</p><div style="margin-top:8px">${pBadge(p)} ${badge(p.scene, "")}</div></div><div class="actions">${r.role === "clinic" && p.status !== "ended" ? btn("编辑资料", "edit-pet", p.id, "", "edit") : ""}${r.role === "clinic" && p.status === "ended" ? btn("建立新一轮照护", "new-round", p.id, "primary", "plus") : ""}${btn("导出资料", "export-pet", p.id, "", "download")}${r.role === "doctor" && plan && p.status !== "ended" ? btn("调整照护安排", "revise", p.id, "primary", "edit") : ""}${r.role === "clinic" && p.status !== "ended" ? btn("结束本轮服务", "end", p.id, "", "check") : ""}</div></header>${roundSummary(p)}<div class="case-grid"><div class="stack"><section class="card pad"><div class="field-action"><h2>${p.status === "ended" ? "本轮交付安排" : "当前照护安排"}</h2>${p.status === "ended" ? badge("已归档", "") : plan ? badge("已由医生确认") : badge("尚未正式发布", "amber")}</div>${futurePlanNotice(p.id)}${unissuedPlanPanel(p)}${plan ? `<p class="subtle" style="margin-top:8px">${esc(plan.author)} · ${fmt(plan.publishedAt, true)}发布</p>${instructionList(plan)}<div class="notice">${icon("file")}<div>来源：${esc(plan.source)}<br><button class="text-btn" data-action="source" data-id="${plan.id}">查看指导单 ${icon("chevron")}</button></div></div>` : `${empty("等待正式安排", "护理准备完成后，由医生审核发布。")}${latest ? `<div class="actions">${badge({ draft: "草稿", review: "待医生审核", returned: "待补充" }[latest.status] || "草稿", "amber")}${r.role === "clinic" ? btn("打开草稿", "edit-plan", latest.id, "soft", "edit") : latest.status === "review" ? btn("审核计划", "approve", latest.id, "primary", "clipboard") : badge("待护理补充", "amber")}</div>` : ""}`}</section><section class="card pad"><h2 class="section-gap">家庭执行记录</h2>${eventTimeline(p.id)}</section></div><aside class="stack"><section class="card pad"><h2 class="section-gap">本轮服务</h2>${p.previousServiceId ? `<a class="text-btn" href="${href(r.role, "case", p.previousServiceId)}">${icon("file")}查看上一轮服务资料</a>` : ""}<dl class="info-list"><div><dt>主人</dt><dd>${esc(p.owner)}</dd></div><div><dt>联系信息</dt><dd>${esc(p.phone || "待补充")}</dd></div><div><dt>家庭照护人</dt><dd>${esc(p.member)}</dd></div><div><dt>随访协调员</dt><dd>${esc(s.clinic.contact)}</dd></div><div><dt>服务时间</dt><dd>${esc(s.clinic.hours)}</dd></div><div><dt>服务医院</dt><dd>${esc(s.clinic.name)}</dd></div></dl>${p.status === "ended" ? `<div class="notice">${icon("check")}<div>本轮已结束<br>${esc(p.endReason)}</div></div>` : ""}</section><section class="card"><div class="card-head"><h2>照护困难与落实</h2><span class="count-dot">${cs.filter((c) => c.status !== "resolved").length} 未结</span></div>${cs.map((c) => `<button class="family-concern full" style="width:100%;text-align:left" data-action="concern-detail" data-id="${c.id}"><div><h3>${esc(c.title)}</h3><p>${esc(c.assignee || "等待医院接手")}</p>${cBadge(c)}</div>${icon("chevron")}</button>`).join("") || empty("暂无问题")}</section><section class="card pad case-review"><h2 class="section-gap">复查安排</h2>${appointmentCards(p.id)}${r.role === "clinic" && p.status !== "ended" ? btn(hasActiveReview(p.id) ? "追加复查安排" : "安排复查", "appointment", p.id, "soft full", "calendar") : ""}</section></aside></div>`;
}
function planPage() {
  const s = state(),
    r = route(),
    plans = s.pets
      .map((p) => ({ pet: p, plan: latestPlan(s, p.id) }))
      .filter((x) => x.plan && `${x.pet.name}${x.pet.owner}`.includes(search));
  const list =
    r.page === "approvals"
      ? plans.filter(
          (x) => x.plan.status === "review" && x.pet.status !== "ended",
        )
      : plans;
  return `${head(r.page === "approvals" ? "计划审核" : "出院计划", "核对材料与家庭实际看到的安排，让交付从一开始就清楚。", r.role === "clinic" ? btn("新建出院计划", "new-plan", "", "primary", "plus") : "")}<section class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>宠物与家庭</th><th>照护场景</th><th>当前状态</th><th>来源</th><th>准备人 / 签发人</th><th>操作</th></tr></thead><tbody>${list.map(({ pet: p, plan }) => `<tr><td>${petCell(p)}</td><td>${esc(sceneLabel(p.scene))}</td><td>${badge({ draft: "草稿", review: "待医生审核", returned: "待补充", published: "正式发布", withdrawn: "已撤销" }[plan.status], plan.status === "published" ? "green" : "amber")}</td><td>${esc(plan.source)}</td><td>${esc(plan.author)}</td><td>${p.status === "ended" || ["published", "withdrawn"].includes(plan.status) ? `<a class="text-btn" href="${href(r.role, "case", p.id)}">查看安排 ${icon("chevron")}</a>` : btn(r.role === "doctor" ? "审核" : "查看草稿", r.role === "doctor" ? "approve" : "edit-plan", plan.id, "small soft", "clipboard")}</td></tr>`).join("")}</tbody></table></div>${list.length ? "" : empty("当前没有待审核计划", "新的计划提交后会出现在这里。")}</section>${
    r.role === "doctor"
      ? `<section class="card" style="margin-top:22px"><div class="card-head"><h2>照护模板审核</h2><p>审核适用场景与结构化内容</p></div>${
          s.templates
            .filter((t) => t.status === "pending")
            .map(
              (t) =>
                `<div class="schedule-item"><div class="schedule-info"><b>${esc(t.name)}</b><small>${esc(sceneLabel(t.scene))} · ${t.count} 项照护结构</small></div>${btn("审核模板", "review-template", t.id, "small soft", "clipboard")}</div>`,
            )
            .join("") ||
          empty("暂无待审核模板", "运营提交的模板在这里完成临床审核。")
        }</section>`
      : ""
  }`;
}
function hasActiveReview(petId) {
  return state().appointments.some(
    (a) => a.petId === petId && ["requested", "confirmed"].includes(a.status),
  );
}
function appointmentCards(petId, compact = false) {
  const s = state(),
    r = route(),
    list = s.appointments
      .filter(
        (a) =>
          a.petId === petId &&
          (!compact || ["requested", "confirmed"].includes(a.status)),
      )
      .sort((a, b) =>
        compact
          ? a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
          : b.date.localeCompare(a.date),
      );
  return list.length
    ? list
        .map(
          (a) =>
            `<div class="metric-detail"><div class="field-action"><b>${fmt(a.date)} ${esc(a.time)}</b>${badge(appointmentLabels[a.status], a.status === "requested" ? "amber" : a.status === "cancelled" ? "" : a.status === "confirmed" ? "blue" : "green")}</div><p>${esc(a.note)}${a.replacesId ? " · 改约申请" : ""}</p>${a.status === "completed" ? `<div class="review-delivery"><b>${icon("file")}复查交付</b><p>${esc(a.reviewNote || "此前复查已登记，交付说明尚未补充")}</p>${a.nextAction ? `<strong>院方下一步</strong><p>${esc(a.nextAction)}</p>` : ""}<small>${esc(a.completedBy || "院方登记")} · ${fmt(a.completedAt || a.updatedAt, true)}</small></div>` : ""}<div class="actions" style="margin-top:9px">${r.role === "clinic" && a.status === "requested" ? btn("确认时间", "confirm-appointment", a.id, "small soft", "check") : ""}${["clinic", "doctor"].includes(r.role) && a.status === "confirmed" && a.date <= day() ? btn(r.role === "doctor" ? "交付复查结果" : "记录已到院", "complete-appointment", a.id, "small soft", "check") : ""}${["family", "clinic"].includes(r.role) && ["requested", "confirmed"].includes(a.status) && !s.appointments.some((x) => x.replacesId === a.id && x.status === "requested") ? btn("调整时间", "reschedule", a.id, "small soft", "calendar") : ""}${["family", "clinic"].includes(r.role) && ["requested", "confirmed"].includes(a.status) ? btn("取消预约", "cancel-appointment", a.id, "small", "close") : ""}</div></div>`,
        )
        .join("")
    : empty("暂无复查安排", "可以向医院申请复查时间。");
}
function appointmentsPage() {
  const s = state(),
    list = s.appointments.slice().sort((a, b) => a.date.localeCompare(b.date));
  return `${head("复查与后续交付", "申请由院方确认，到院复查后记录实际交付与明确下一步。", btn("安排复查", "appointment", "", "primary", "plus"))}<section class="stats">${stat("待确认申请", list.filter((a) => a.status === "requested").length, "需要院方确认时段", "calendar", "项")}${stat("已确认复查", list.filter((a) => a.status === "confirmed").length, "已向家庭交付安排", "check", "项", true)}${stat("已登记到院复查", list.filter((a) => a.status === "completed").length, "按真实到院与交付记录汇总", "heart", "项", true)}${stat("当前服务病例", s.pets.filter((p) => p.status === "active").length, "持续跟进中的宠物", "paw", "只")}</section><section class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>宠物与家庭</th><th>复查时间</th><th>预约状态</th><th>备注</th><th>操作</th></tr></thead><tbody>${list
    .map((a) => {
      const p = petById(s, a.petId);
      return `<tr><td>${petCell(p)}</td><td>${fmt(a.date)} ${esc(a.time)}</td><td>${badge(appointmentLabels[a.status], a.status === "requested" ? "amber" : a.status === "cancelled" ? "" : a.status === "confirmed" ? "blue" : "green")}</td><td>${esc(a.status === "completed" ? a.reviewNote || a.note : a.note)}${a.status === "completed" && a.nextAction ? `<p class="table-note">下一步：${esc(a.nextAction)}</p>` : ""}</td><td><div class="actions">${a.status === "requested" ? btn("确认时间", "confirm-appointment", a.id, "small soft", "check") : ""}${a.status === "confirmed" && a.date <= day() ? btn("已到院", "complete-appointment", a.id, "small soft", "check") : ""}${["requested", "confirmed"].includes(a.status) && !s.appointments.some((x) => x.replacesId === a.id && x.status === "requested") ? btn("改约", "reschedule", a.id, "small soft", "calendar") : ""}${["requested", "confirmed"].includes(a.status) ? btn("取消", "cancel-appointment", a.id, "small") : ""}</div></td></tr>`;
    })
    .join(
      "",
    )}</tbody></table></div>${list.length ? "" : empty("暂无复查安排")}</section>`;
}
function reportsPage() {
  const s = state(),
    valid = s.activations.filter((a) => a.status === "valid"),
    cs = s.concerns,
    received = cs.filter((c) => c.acceptedAt),
    resolved = cs.filter((c) => c.status === "resolved");
  return `${head("术后服务过程", "核对实际接手、行动落实、到院复查与本轮交付记录。", btn("导出服务报告", "export-report", "", "", "download"))}<section class="stats">${stat("有效服务启用", valid.length, `全部 ${s.pets.length} 个本轮服务`, "heart", "例", true)}${stat("已明确接手", received.length, `全部 ${cs.length} 个问题`, "users", "项")}${stat("已记录行动落实", resolved.length, `未结 ${cs.length - resolved.length} 项`, "check", "项", true)}${stat("已交付资料", s.pets.filter((p) => p.status === "ended").length, "已结束服务可获取资料", "file", "份")}</section><div class="settings-grid"><section class="card pad"><h2>服务过程概览</h2><p class="subtle" style="margin-top:5px">基于当前机构的业务记录</p><div class="chart-bars">${[
    ["建立服务", s.pets.length],
    ["正式发布", s.pets.filter((p) => currentPlan(s, p.id)).length],
    ["家庭接收", s.pets.filter((p) => p.accepted).length],
    ["有效启用", valid.length],
    ["结束交付", s.pets.filter((p) => p.status === "ended").length],
  ]
    .map(
      ([l, n]) =>
        `<div class="chart-col"><b>${n}</b><i style="height:${(n / Math.max(1, s.pets.length)) * 90}px"></i><small>${l}</small></div>`,
    )
    .join(
      "",
    )}</div><div class="notice">${icon("chart")}有效启用以正式发布、家庭接收和首次记录或求助为依据；家庭自报与到院记录分别保留。</div></section><section class="card pad"><h2 class="section-gap">问题处理</h2>${Object.entries(
    concernLabels,
  )
    .map(
      ([k, l]) =>
        `<div class="progress-row"><span>${l}</span><b>${cs.filter((c) => c.status === k).length} 项</b></div><div class="progress"><i style="width:${cs.length ? (cs.filter((c) => c.status === k).length / cs.length) * 100 : 0}%"></i></div>`,
    )
    .join("")}</section></div>`;
}
function settingsPage() {
  const s = state();
  return `${head("服务设置", "把负责人、服务时段和交接方式约定清楚。")}<div class="settings-grid"><section class="card pad"><h2 class="section-gap">机构服务信息</h2><form class="form" data-form="settings"><div class="form-grid">${field("医院名称", "name", s.clinic.name, "text", true)}${field("服务时间", "hours", s.clinic.hours, "text", true)}${field("院方联系电话", "phone", s.clinic.phone, "text", true)}${field("接单目标（分钟）", "target", s.clinic.target, "number", true)}${field("随访负责人", "contact", s.clinic.contact, "text", true)}${field("替补负责人", "backup", s.clinic.backup, "text", true)}</div><div class="form-error" role="alert"></div><div class="actions"><button class="btn primary" type="submit">${icon("check")}保存设置</button></div></form><div class="divider"></div>${btn("联系栖愈机构支持", "ticket", "", "soft", "chat")}${linkBtn("查看支持进度", href("clinic", "support"), "", "arrow")}</section><div class="stack"><section class="card pad"><h2 class="section-gap">团队与职责</h2><div class="staff-list">${[
    [s.clinic.contact, "随访协调员", "接单与交接"],
    ["陈予安", "主治兽医", "专业判断"],
    [s.clinic.backup, "替补协调员", "协同接手"],
  ]
    .map(
      ([name, title, b]) =>
        `<div class="staff-row"><span class="avatar">${esc(name.slice(-2))}</span><div><b>${esc(name)}</b><small>${esc(title)}</small></div>${badge(b, "")}</div>`,
    )
    .join(
      "",
    )}</div></section><section class="card pad"><h2>软件服务</h2><p class="subtle" style="margin-top:8px">${esc(s.settings.plan)} · 每例 ¥${s.settings.unitPrice}</p><div class="divider"></div><p class="subtle">同轮安排调整与复查改约不重复计费。</p><div style="margin-top:18px">${s.renewal ? badge(s.renewal.status === "completed" ? "续订已完成" : "续订申请已提交", s.renewal.status === "completed" ? "green" : "blue") : btn("申请续订", "renewal", "", "soft", "arrow")}</div></section></div></div>`;
}
function opsDashboard() {
  const s = state(),
    valid = s.activations.filter((a) => a.status === "valid"),
    amount = valid.reduce((x, a) => x + a.amount, 0);
  return `${head("复杂术后服务运营", dateLabel() + " · 机构准入、责任配置与每例软件用量。", btn("新增合作机构", "new-institution", "", "primary", "plus"))}${workspaceOverview()}${serviceFit()}<section class="stats">${stat("已开通合作机构", s.institutions.filter((c) => c.status === "active").length, "已完成实施交付", "building", "家", true)}${stat("有效术后服务启用", valid.length, "正式交付后首次记录或求助", "heart", "例")}${stat("本期软件用量", money(amount), "以有效用量明细为依据", "wallet", "元")}${stat("待处理机构支持", s.tickets.filter((t) => t.status === "open").length, "跟踪实施与使用问题", "chat", "项")}</section><div class="settings-grid"><section class="card pad"><div class="field-action"><h2>合作机构</h2><a class="text-btn" href="${href("ops", "institutions")}">全部机构 ${icon("arrow")}</a></div>${institutionTable()}</section><section class="card pad"><h2 class="section-gap">实施与交付</h2><div class="timeline">${[
    ["服务责任", "确认协调员、替补与主治兽医"],
    ["出院交接", "配置已审核模板和家庭接收流程"],
    ["持续协同", "跟踪接单、专业答复与复查"],
    ["结算与续用", "每例 ¥8，草稿与未启用服务不收费"],
  ]
    .map(
      ([t, d]) =>
        `<div class="timeline-item"><span class="timeline-icon">${icon("check")}</span><div><h3>${t}</h3><p>${d}</p></div></div>`,
    )
    .join("")}</div></section></div>`;
}
function institutionFields(c = {}) {
  return `<div class="form-grid">${field("机构名称", "name", c.name || "", "text", true)}${field("所在城市", "city", c.city || "上海", "text", true)}${field("机构负责人", "contact", c.contact || "", "text", true)}${field("随访接手负责人", "followupContact", c.followupContact || "", "text", true)}${field("主治 / 临床负责人", "clinicalLead", c.clinicalLead || "", "text", true)}${field("随访服务时段", "serviceHours", c.serviceHours || "", "text", true, "例如每日 09:00—20:00")}</div><fieldset class="scope-field"><legend>适用术后范围（至少选择一项）</legend>${["眼科术后", "骨科术后", "复杂外科术后"].map((value) => `<label class="checkbox"><input type="checkbox" name="surgeryScope" value="${value}" ${c.surgeryScopes?.includes(value) ? "checked" : ""}>${value}</label>`).join("")}</fieldset>${textarea("复查与到院联系路径", "reviewPath", c.reviewPath || "", true, "说明家庭如何申请、谁确认时间、到院后由谁交付下一步")}`;
}
function readInstitutionProfile(data, form) {
  const surgeryScopes = [
    ...form.querySelectorAll('[name="surgeryScope"]:checked'),
  ].map((input) => input.value);
  if (!surgeryScopes.length) {
    form.querySelector(".form-error").textContent =
      "请选择至少一项适用术后范围。";
    return null;
  }
  const { surgeryScope, ...profile } = data;
  return { ...profile, surgeryScopes };
}
function editInstitutionProfile(id) {
  const c = state().institutions.find((c) => c.id === id);
  if (!c) return toast("未找到机构档案。", true);
  modal(
    "配置机构术后服务",
    "明确能接手的人与复查路径，配置完成后再验收开通。",
    institutionFields(c),
    {
      label: "保存服务配置",
      handler: (data, form) => {
        const profile = readInstitutionProfile(data, form);
        if (profile) run({ type: "institutionProfile", id, ...profile });
      },
    },
    true,
  );
}
function institutionTable() {
  const s = state();
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>机构 / 术后范围</th><th>接手与专业负责人</th><th>城市 / 状态</th><th>操作</th></tr></thead><tbody>${s.institutions.map((c) => `<tr><td><b>${esc(c.name)}</b><p class="table-note">${esc(c.surgeryScopes?.join(" · ") || "待配置术后范围")}</p></td><td>${esc(c.followupContact || "待配置随访负责人")}<p class="table-note">${esc(c.clinicalLead || "待配置临床负责人")}</p></td><td>${esc(c.city)}<br>${badge(c.status === "active" ? "已开通" : "实施中", c.status === "active" ? "green" : "amber")}</td><td><div class="actions">${btn("服务概况", "institution-detail", c.id, "small", "chart")}${c.status === "onboarding" ? btn("实施验收", "activate-institution", c.id, "small soft", "check") : ""}</div></td></tr>`).join("")}</tbody></table></div>`;
}

function institutionsPage() {
  return `${head("合作机构", "确认复杂术后范围、随访接手人、主治负责人和复查路径后开通。", btn("新增合作机构", "new-institution", "", "primary", "plus"))}${serviceFit()}<section class="card">${institutionTable()}</section>`;
}
function templatesPage() {
  return `${head("术后照护模板", "按眼科、骨科及复杂外科场景准备结构，由医生确认每例正式安排。", btn("建立模板", "new-template", "", "primary", "plus"))}<div class="pet-grid">${state()
    .templates.map(
      (t) =>
        `<section class="card pet-card"><span class="timeline-icon" style="width:42px;height:42px;margin-bottom:17px">${icon("clipboard")}</span><h2>${esc(t.name)}</h2><p class="subtle" style="margin:7px 0 15px">${esc(sceneLabel(t.scene))} · ${t.count} 个结构化事项</p>${badge(t.status === "approved" ? "已审核模板" : t.status === "returned" ? "待补充" : "待临床审核", t.status === "approved" ? "green" : "amber")}<div style="margin-top:20px">${btn("查看模板", "template-detail", t.id, "full", "eye")}${t.status === "returned" ? btn("修改并重提", "edit-template", t.id, "full soft", "edit") : t.status === "approved" ? btn("建立相似模板", "edit-template", t.id, "full soft", "plus") : ""}</div></section>`,
    )
    .join("")}</div>`;
}
function billingPage() {
  const s = state(),
    valid = s.activations.filter((a) => a.status === "valid"),
    total = valid.reduce((x, a) => x + a.amount, 0),
    paid =
      s.payments.reduce((x, p) => x + p.amount, 0) -
      s.refunds.reduce((x, r) => x + r.amount, 0);
  return `${head("用量与结算", "医院按有效启用的本轮术后服务结算，家庭使用不收费。", btn("导出用量明细", "export-billing", "", "", "download"))}<section class="stats">${stat("有效启用", valid.length, "草稿和未启用服务不计费", "heart", "例")}${stat("用量金额", money(total), "按有效用量汇总", "wallet", "元")}${stat("已登记收款", money(paid), "有收款凭证可追溯", "check", "元", true)}${stat("待结算金额", money(total - paid), "等待核对与登记", "clock", "元")}</section><div class="commercial-note">${icon("wallet")}<div><strong>每轮有效启用 ¥${s.settings.unitPrice}</strong><p>正式发布 → 家庭接收 → 首次记录或求助。同一轮调整安排、再次求助与复查改约不重复收费。</p></div></div><section class="card section-gap"><div class="card-head"><div><h2>${esc(s.clinic.name)}</h2><p>${esc(s.settings.plan)} · 每例 ¥${s.settings.unitPrice} · 同轮调整不重复收费</p></div>${total > paid ? btn("登记收款", "payment", "", "primary", "check") : badge("本期已结清")}</div><div class="table-wrap"><table class="data-table"><thead><tr><th>服务病例</th><th>启用时间</th><th>计费依据</th><th>金额</th><th>状态</th><th>操作</th></tr></thead><tbody>${s.activations
    .map((a) => {
      const p = petById(s, a.petId),
        settled = s.payments.some((x) => x.activationIds.includes(a.id));
      return `<tr><td>${petCell(p)}</td><td>${fmt(a.at, true)}</td><td>正式发布 · 家庭接收 · 首次记录或求助</td><td>¥${money(a.amount)}</td><td>${badge(a.status === "refunded" ? "已退款" : a.status === "void" ? "已作废" : settled ? "已结算" : "有效启用", a.status === "void" ? "" : "green")}</td><td>${a.status === "valid" && !settled ? btn("作废条目", "void-activation", a.id, "small danger") : a.status === "valid" && settled ? btn("登记退款", "refund-activation", a.id, "small danger") : esc(a.reason || "—")}</td></tr>`;
    })
    .join(
      "",
    )}</tbody></table></div></section><section class="card pad"><h2 class="section-gap">收款记录</h2>${s.payments.length ? s.payments.map((p) => `<div class="metric-detail"><b>¥${money(p.amount)} · ${fmt(p.at, true)}</b><p>凭证：${esc(p.reference)}</p></div>`).join("") : empty("暂无收款登记", "完成线下对账后，可登记收款凭证。")}</section><section class="card pad" style="margin-top:22px"><h2 class="section-gap">退款记录</h2>${s.refunds.length ? s.refunds.map((r) => `<div class="metric-detail"><b>¥${money(r.amount)} · ${fmt(r.at, true)}</b><p>${esc(r.reason)}<br>退款凭证：${esc(r.reference)}</p></div>`).join("") : empty("暂无退款记录", "核对实际退款后，记录凭证与用量调整。")}</section>`;
}
function supportPage() {
  const renewal = state().renewal;
  const renewalCard = renewal
    ? `<section class="card pad section-gap"><div class="field-action"><h2>${esc(state().clinic.name)} · 续订申请</h2>${badge(renewal.status === "completed" ? "续订已完成" : "待跟进", renewal.status === "completed" ? "green" : "amber")}</div><p class="subtle" style="margin:10px 0">申请时间 ${fmt(renewal.at, true)}${renewal.note ? " · " + esc(renewal.note) : ""}</p>${route().role === "ops" && renewal.status === "requested" ? btn("处理续订", "complete-renewal", "", "soft", "check") : ""}</section>`
    : "";
  return `${head("机构支持", "让使用中的问题，得到有记录的处理。", btn("登记支持事项", "ticket", "", "primary", "plus"))}${renewalCard}<section class="card">${
    state().tickets.length
      ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>支持事项</th><th>登记人</th><th>时间</th><th>状态</th><th>操作</th></tr></thead><tbody>${state()
          .tickets.map(
            (t) =>
              `<tr><td><b>${esc(t.title)}</b><p class="table-note">${esc(t.body)}</p></td><td>${esc(t.actor)}</td><td>${fmt(t.at, true)}</td><td>${badge(t.status === "open" ? "跟进中" : "已完成", t.status === "open" ? "amber" : "green")}</td><td>${route().role === "ops" && t.status === "open" ? btn("完成处理", "close-ticket", t.id, "small soft", "check") : "—"}</td></tr>`,
          )
          .join("")}</tbody></table></div>`
      : empty("当前没有待处理支持事项", "机构使用中的问题与处理结果都会保留。")
  }</section>`;
}
function taskDisplaySummary(s, taskId) {
  const reports = effectiveTaskEvents(s, taskId),
    latest = reports.at(-1);
  const singleDone = reports.length === 1 && latest.result === "done";
  const label =
    reports.length > 1
      ? `${reports.length}份独立报告：${reports.map((e) => e.actor + " · " + resultLabels[e.result]).join("；")}`
      : latest
        ? latest.actor + " · " + resultLabels[latest.result]
        : "本次尚无记录";
  return {
    reports,
    latest,
    singleDone,
    label,
    iconName:
      reports.length > 1
        ? new Set(reports.map((e) => e.actor)).size > 1
          ? "users"
          : "clipboard"
        : singleDone
          ? "check"
          : "clock",
  };
}
function effectiveReportsPanel(s, taskId) {
  const reports = effectiveTaskEvents(s, taskId);
  if (!reports.length) return "";
  return `<section class="effective-reports"><h3>${icon("clipboard")}当前有效记录${reports.length > 1 ? ` · ${reports.length}份独立报告` : ""}</h3>${reports.map((e) => `<div class="effective-report-row"><span class="avatar">${esc(e.actor.slice(-2))}</span><div><b>${esc(e.actor)} · ${esc(resultLabels[e.result])}</b><small>${fmt(e.occurredAt, true)}${e.corrects ? " · 已更正" : ""}</small>${e.difficulty ? `<p>报告的困难：${esc(e.difficulty)}</p>` : ""}</div></div>`).join("")}<p class="report-source-note">汇总采用每份报告的最新更正，历史记录继续保留。</p></section>`;
}
function difficultySelect() {
  return select("遇到的具体困难（可选）", "difficulty", [
    ["", "暂不选择"],
    ["动物抗拒", "动物抗拒"],
    ["不会操作", "不会操作"],
    ["药物吐出或未确认服用", "药物吐出或未确认服用"],
    ["无法安排照护时间", "无法安排照护时间"],
    ["不确定是否成功", "不确定是否成功"],
    ["家人记录不一致", "家人记录不一致"],
    ["其他困难", "其他困难"],
  ]);
}
function familyToday() {
  const s = state(),
    p = selectedPet(),
    plan = currentPlan(s, p.id),
    tasks = s.tasks.filter(
      (t) =>
        p.status !== "ended" &&
        t.petId === p.id &&
        !t.cancelled &&
        t.date === day(),
    ),
    events = s.events.filter((e) => e.petId === p.id),
    cs = s.concerns.filter((c) => c.petId === p.id && c.status !== "resolved");
  const latest = latestPlan(s, p.id);
  if (!p.accepted)
    return `${head("接收本轮术后照护", "核对原医院正式安排，确认家人如何执行和遇阻后如何求助。")}<section class="card pad"><div class="field-action"><h2>${esc(p.name)}的出院照护</h2>${badge(plan ? "等待接收" : "等待医院确认", "amber")}</div><div class="notice">${icon("building")}<div>${esc(s.clinic.name)}<br>随访负责人：${esc(s.clinic.contact)} · ${esc(s.clinic.hours)}</div></div>${plan ? instructionList(plan) : empty("医院正在准备安排", "正式发布后，你就可以在这里接收本轮服务。")}<div class="consent-box" style="margin:18px 0">本轮照护以医院交付的正式安排为依据。你可以记录实际执行情况、邀请家人协助，并在遇到困难时联系原医院。</div>${plan ? btn("核对无误，接收照护安排", "accept-service", p.id, "primary full", "check") : ""}<a class="btn full" style="margin-top:10px" href="tel:${s.clinic.phone.replace(/[^\d+]/g, "")}">${icon("phone")}需要确认，先联系院方</a></section>`;
  return `<div class="family-grid"><div><section class="family-greeting"><div class="eyebrow">${dateLabel()}</div><h1>${p.status === "ended" ? "本轮已结束，资料已归档" : "今天按原院安排照护"}</h1><p>${esc(p.member)}负责本轮${esc(sceneLabel(p.scene))}${p.status === "ended" ? " · 本轮已交付" : ""}</p>${petArt(p.species, p.color)}</section>${roundSummary(p, true)}${latest?.previousId ? `<section class="card change-card section-gap"><h3>${icon("clipboard")} 医院已更新照护安排</h3><p>${esc(latest.reason)} · ${fmt(latest.effectiveAt, true)}生效</p><a class="text-btn" href="${href("family", "plan", p.id)}">查看具体变化 ${icon("arrow")}</a></section>` : ""}${p.handoff?.status === "pending" ? `<div class="notice amber">${icon("users")}<div>正在等待${esc(p.handoff.to)}确认接班。<br>${actor() === p.handoff.to ? btn("确认接班", "accept-handoff", p.id, "small soft", "check") : "交接完成前，请继续核对照护情况。"}</div></div>` : ""}<section class="card"><div class="card-head"><div><h2>${p.status === "ended" ? "本轮照护资料" : "今天的术后安排"}</h2><p>${p.status === "ended" ? "照护资料持续保留，新照护由医院建立新一轮安排。" : "按原院安排执行 · 困难和不确定都能如实记录"}</p></div><div class="actions"><span class="subtle">${tasks.length} 项</span>${p.status !== "ended" ? btn("遇到困难", "new-concern", p.id, "small soft", "chat") : ""}</div></div>${
    tasks
      .map((t) => {
        const summary = taskDisplaySummary(s, t.id),
          e = summary.latest;
        return `<div class="task-card ${summary.singleDone ? "done" : ""}"><span class="task-clock">${t.time}</span><div class="task-info"><div class="task-title-row"><h3>${esc(t.title)}</h3><span class="task-type">${icon({ 护理: "heart", 观察: "eye", 用药: "clipboard", 活动: "paw", 饮食: "leaf" }[t.type] || "clipboard")}${esc(t.type)}</span></div><div class="task-status">${icon(summary.iconName)}${esc(summary.label)}</div></div>${btn(e ? "查看记录" : "去记录", "task", t.id, e ? "small" : "small soft", e ? "chevron" : "edit")}</div>`;
      })
      .join("") ||
    empty("当前没有待执行事项", "本轮结束后可在资料中查看照护过程。")
  }</section><section class="card section-gap" style="margin-top:20px"><div class="card-head"><h2>最近的照护记录</h2><a href="${href("family", "plan", p.id)}" class="text-btn">全部 ${icon("chevron")}</a></div><div style="padding:0 20px 20px">${eventTimeline(p.id)}</div></section></div><aside class="stack"><section class="card contact-card"><h3>做不成时，联系原医院。</h3><p style="font-size:12px">求助会带上当前安排和实际记录，<br>不用重新解释整段照护过程。</p>${p.status !== "ended" ? btn("联系医院协助", "new-concern", p.id, "full", "chat") : linkBtn("查看照护资料", href("family", "me", p.id), "full", "file")}<small>本院服务时间 ${esc(s.clinic.hours)}<br>需要尽快联系时，请拨打 ${esc(s.clinic.phone)}</small></section><section class="card"><div class="card-head"><h2>正在跟进</h2><span class="count-dot">${cs.length}</span></div>${cs.map((c) => `<button class="family-concern" style="width:100%;text-align:left" data-action="concern-detail" data-id="${c.id}"><div><h3>${esc(c.title)}</h3><p>${esc(c.assignee ? c.assignee + "正在跟进" : "等待医院接收")}</p>${cBadge(c)}</div>${icon("chevron")}</button>`).join("") || empty("目前没有未结问题", "新的求助与医院回复会在这里呈现。")}</section><section class="card pad"><div class="field-action"><h2 class="section-gap">下一次复查</h2><a class="text-btn" href="${href("family", "review", p.id)}">复查详情 ${icon("chevron")}</a></div>${appointmentCards(p.id, true)}${p.status !== "ended" && !hasActiveReview(p.id) ? btn("申请复查时间", "appointment", p.id, "soft full", "calendar") : ""}</section></aside></div>`;
}
function familyPlan() {
  const s = state(),
    p = selectedPet(),
    plan = currentPlan(s, p.id),
    plans = s.plans
      .filter(
        (pl) =>
          pl.petId === p.id && ["published", "withdrawn"].includes(pl.status),
      )
      .slice()
      .reverse();
  return `${head(p.status === "ended" ? "本轮已结束，资料已归档" : "原院正式照护安排", p.status === "ended" ? "保留本轮正式安排与实际记录，新照护由医院建立新一轮安排。" : "查看本轮当前有效安排，实际困难由原医院核对后交付下一步。", btn("导出照护资料", "export-pet", p.id, "", "download"))}<div class="family-grid"><div class="stack"><section class="card pad"><div class="field-action"><h2>${p.status === "ended" ? "本轮交付安排" : "当前安排"}</h2>${p.status === "ended" ? badge("已归档", "") : plan ? badge("医生已确认") : badge("待发布", "amber")}</div>${futurePlanNotice(p.id)}${plan ? `<p class="subtle" style="margin:8px 0">${esc(plan.author)} · ${fmt(plan.effectiveAt, true)}生效</p>${instructionList(plan)}<div class="notice">${icon("file")}<div>来源：${esc(plan.source)}<br>${esc(plan.note)}</div></div>${btn("查看出院指导单", "source", plan.id, "full", "file")}` : empty("等待院方发布", "正式安排会在医院确认后出现。")}</section><section class="card pad"><h2 class="section-gap">实际执行记录</h2>${eventTimeline(p.id)}</section></div><aside class="stack"><section class="card pad"><h2 class="section-gap">安排变化</h2><div class="timeline">${plans.map((pl) => `<div class="timeline-item"><span class="timeline-icon">${icon("clipboard")}</span><div><h3>${esc(pl.reason)}</h3><p>${esc(pl.author)} · ${pl.status === "withdrawn" ? fmt(pl.withdrawnAt, true) + "撤销" : fmt(pl.effectiveAt, true) + "生效"}</p>${badge(pl.status === "withdrawn" ? "已撤销" : p.status === "ended" ? "本轮此前安排" : plan?.id === pl.id ? "当前有效" : pl.effectiveAt > new Date().toISOString() ? "即将生效" : "此前安排", plan?.id === pl.id ? "green" : "")}<button class="text-btn" style="display:block" data-action="view-plan" data-id="${pl.id}">查看${pl.previousId ? "变化" : "详情"} ${icon("chevron")}</button></div></div>`).join("") || empty("暂无安排")}</div></section><section class="card pad"><h2>照护分工</h2><p class="subtle" style="margin:10px 0">当前照护人：${esc(p.member)}</p>${linkBtn("管理家人交接", href("family", "me", p.id), "full", "users")}</section></aside></div>`;
}
function familyMessages() {
  const p = selectedPet(),
    cs = state().concerns.filter((c) => c.petId === p.id);
  return `${head("原院接手与下一步", "从报告困难、院方接手到实际落实，每一步都有责任人和后续。", p.status === "active" ? btn("发起求助", "new-concern", p.id, "primary", "plus") : "")}<section class="card">${cs.map((c) => `<button class="family-concern" style="width:100%;text-align:left;padding:22px" data-action="concern-detail" data-id="${c.id}"><span class="timeline-icon">${icon(c.status === "resolved" ? "check" : "chat")}</span><div><h3>${esc(c.title)}</h3><p>${esc(c.messages.at(-1)?.text || c.body)}</p><p>${esc(c.assignee || "等待医院接收")} · ${fmt(c.createdAt, true)}</p></div>${cBadge(c)}${icon("chevron")}</button>`).join("") || empty("还没有消息", "发起求助后，可在这里查看医院接手和答复情况。")}</section>`;
}
function familyReview() {
  const p = selectedPet(),
    s = state(),
    summary = careLoopSummary(s, p.id);
  return `<a class="text-btn review-back" href="${href("family", "today", p.id)}">${icon("back")}返回今天</a>${head("复查与后续交付", "院方确认时间，到院之后交付下一步。")}<section class="card pad section-gap"><div class="field-action"><h2>本轮复查</h2>${badge(summary.review.label, summary.review.status === "completed" ? "green" : "blue")}</div><p class="subtle" style="margin:8px 0 16px">${esc(s.clinic.name)} · 随访负责人 ${esc(s.clinic.contact)}</p>${appointmentCards(p.id)}${p.status !== "ended" && !hasActiveReview(p.id) ? btn("申请复查时间", "appointment", p.id, "soft full", "calendar") : ""}</section><section class="card pad"><h2 class="section-gap">本轮后续</h2><div class="next-step-card"><span class="next-step-icon">${icon(p.status === "ended" ? "file" : "building")}</span><div><small>${esc(summary.owner)}</small><strong>${esc(familyNextStep(summary))}</strong></div></div>${p.status === "ended" ? `<div class="review-delivery"><b>${esc(p.endType || "本轮服务交付")}</b><p>${esc(p.endReason)}</p></div>${btn("下载本轮照护资料", "export-pet", p.id, "full", "download")}` : `<p class="subtle" style="margin-top:14px">到院情况由医院登记；复查后的照护调整以医生正式发布的安排为依据。</p>${linkBtn("查看当前正式安排", href("family", "plan", p.id), "full", "clipboard")}`}</section>`;
}
function familyMe() {
  const p = selectedPet(),
    s = state();
  return `${head("本轮家人与照护资料", "家人按同一份正式安排交接，复查与结轮交付持续保留。")}<div class="family-grid"><div class="stack"><section class="card pad"><div class="field-action"><h2>照护成员</h2>${actor() === p.owner && p.status !== "ended" ? btn("邀请家人", "invite", p.id, "small soft", "plus") : badge("授权照护成员", "")}</div><div class="notice">${icon("users")}当前照护人：${esc(p.member)}</div><div class="member-grid">${p.members
    .filter((m) => m.active && (!m.expires || m.expires >= day()))
    .map(
      (m) =>
        `<section class="card member-card"><span class="avatar">${esc(m.name.slice(-2))}</span><h3>${esc(m.name)}</h3><p>${m.role}${p.member === m.name ? " · 当前照护人" : ""}${m.expires ? " · 授权至" + fmt(m.expires) : ""}</p><div class="actions">${m.name !== actor() ? btn("以此成员查看", "switch-member", m.name, "small", "eye") : badge("当前身份")}${m.role !== "主人" && actor() === p.owner && p.status !== "ended" ? btn("撤销授权", "revoke", m.id, "small danger") : ""}</div></section>`,
    )
    .join(
      "",
    )}</div><div style="margin-top:18px">${p.status !== "ended" ? btn("发起照护交接", "handoff", p.id, "full", "users") : badge("本轮已交付资料", "")}</div>${p.handoff?.status === "pending" ? `<div class="notice amber">${icon("clock")}<div>${esc(p.handoff.from)} → ${esc(p.handoff.to)}<br>等待接班确认${actor() === p.handoff.to ? btn("确认接班", "accept-handoff", p.id, "small soft") : ""}</div></div>` : ""}</section><section class="card pad"><h2 class="section-gap">本轮照护资料</h2>${p.previousServiceId ? `<a class="text-btn" href="${href("family", "me", p.previousServiceId)}">${icon("file")}查看上一轮照护资料</a>` : ""}<dl class="info-list"><div><dt>宠物</dt><dd>${esc(p.name)} · ${esc(p.breed)}</dd></div><div><dt>照护场景</dt><dd>${esc(sceneLabel(p.scene))}</dd></div><div><dt>本轮开始</dt><dd>${fmt(p.start)}</dd></div><div><dt>服务状态</dt><dd>${pBadge(p)}</dd></div></dl>${p.status === "ended" ? `<div class="notice">${icon("check")}<div>${esc(p.endReason)}</div></div>` : '<div class="divider"></div>'}${btn("下载照护资料包", "export-pet", p.id, "full", "download")}</section></div><aside class="stack"><section class="card pad"><h2 class="section-gap">复查安排</h2>${linkBtn("打开复查与交付", href("family", "review", p.id), "full soft", "calendar")}${appointmentCards(p.id)}${p.status !== "ended" && !hasActiveReview(p.id) ? btn("申请复查", "appointment", p.id, "soft full", "calendar") : ""}</section><section class="card contact-card"><h3>${esc(s.clinic.name)}</h3><p style="font-size:12px">随访负责人：${esc(s.clinic.contact)}<br>服务时间：${esc(s.clinic.hours)}</p><a class="btn full" href="tel:${s.clinic.phone.replace(/[^\d+]/g, "")}">${icon("phone")}拨打医院电话</a></section></aside></div>`;
}
let homeMood = -1;
const homeMoodFaces = ["😸", "😌", "🙂", "🥺", "🤒"];
const homeMoodSay = [
  "栗子今天：很有精神，恢复得不错",
  "栗子今天：平静安稳",
  "栗子今天：状态一般，多观察",
  "栗子今天：有点没精神，注意饮食",
  "栗子今天：不太舒服，建议联系随访负责人",
];
const homeRoleCards = () => {
  const s = state();
  const cards = [
    [
      "clinic",
      "building",
      "院方协同",
      `跟进出院交接与协同待办，让每份安排都有回应。当前待办 ${s.concerns.filter((c) => c.status !== "resolved").length} 项。`,
    ],
    [
      "doctor",
      "stethoscope",
      "医生工作台",
      "复核出院计划、审核调整与用药疑问，专业意见直达家庭。",
    ],
    [
      "family",
      "paw",
      "家庭照护",
      `照护任务、每日打卡与医生叮嘱。${s.pets.filter((p) => p.status !== "ended").length} 位小动物照护中。`,
    ],
    [
      "ops",
      "chart",
      "平台运营",
      "合作机构、照护模板与用量结算，支撑服务持续运转。",
    ],
  ];
  return cards
    .map(
      ([key, ic, name, desc]) =>
        `<a class="role-card" href="${href(key, key === "family" ? "today" : "dashboard")}"><span class="role-ic">${icon(ic)}</span><div><b>${name}</b><small>${desc}</small></div><span class="go">进入工作台${icon("arrow")}</span></a>`,
    )
    .join("");
};
function homePage() {
  const heartSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21c-4.5-3.4-8-6.6-8-10.2C4 7.9 6.2 6 8.6 6c1.4 0 2.6.7 3.4 1.9C12.8 6.7 14 6 15.4 6 17.8 6 20 7.9 20 10.8c0 3.6-3.5 6.8-8 10.2Z"/></svg>`;
  const checkSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="#0891a8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
  return `<div class="home-page"><div class="bg" aria-hidden="true"><div class="orb orb-mint"></div><div class="orb orb-blue"></div></div><span class="spark" aria-hidden="true"></span><span class="spark" aria-hidden="true"></span><span class="spark" aria-hidden="true"></span><span class="spark" aria-hidden="true"></span><span class="spark" aria-hidden="true"></span><span class="spark" aria-hidden="true"></span>
<nav class="home-nav" aria-label="主导航"><a class="brand" href="${href("home", "dashboard")}"><span class="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="#0891a8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21c-4.5-3.4-8-6.6-8-10.2C4 7.9 6.2 6 8.6 6c1.4 0 2.6.7 3.4 1.9C12.8 6.7 14 6 15.4 6 17.8 6 20 7.9 20 10.8c0 3.6-3.5 6.8-8 10.2Z"/></svg></span><span>栖愈<small>QIYU CARE</small></span></a><div class="nav-right"><div class="nav-links"><a href="${href("clinic", "dashboard")}">院方协同</a><a href="${href("doctor", "dashboard")}">医生工作台</a><a href="${href("family", "today")}">家庭照护</a><a href="${href("ops", "dashboard")}">平台运营</a></div><i class="nav-divider" aria-hidden="true"></i><a class="btn-primary" href="${href("clinic", "dashboard")}">${heartSvg}开始使用</a></div></nav>
<main class="hero" id="main"><section class="copy"><span class="badge"><svg class="leaf" viewBox="0 0 24 24" fill="none" stroke="#4a9a5c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20c0-9 5-14 16-16-1 11-6 16-13 16"/><path d="M4 20c4-6 8-9 12-11"/></svg>宠物诊后协同照护平台</span><h1>照护在手，<br><span class="soft">安心相伴。</span></h1><div class="trust"><span>${checkSvg}来源清楚</span><span>${checkSvg}责任明确</span><span>${checkSvg}照护连续</span></div><div class="cta-row"><a class="btn-primary btn-hero" href="${href("clinic", "dashboard")}">${heartSvg}开始使用</a><a class="btn-soft" href="${href("family", "today")}">看看家庭端</a></div></section>
<section class="stage" aria-label="栖愈家庭端预览"><div class="halo" aria-hidden="true"></div><div class="orbit" aria-hidden="true"></div><div class="streak" role="status"><span class="flame">🔥</span><span><b>连续照护 12 天</b><small>家庭自报 · 每日执行</small></span></div><div class="glass-card"><div class="card-top"><span class="avatar">🐈</span><span class="who"><b>栗子的家长</b><small>家庭端 · 照护进行中</small></span><span class="live"><i></i>已连接医院</span></div><div class="mood"><p>今天栗子的状态如何？</p><div class="mood-row" role="group" aria-label="选择宠物状态">${homeMoodFaces.map((f, i) => `<button type="button" data-action="home-mood" data-mood="${i}" class="${homeMood === i ? "on" : ""}" aria-label="${["很有精神", "平静", "一般", "没精神", "不舒服"][i]}">${f}</button>`).join("")}</div><p class="mood-say" id="mood-say" aria-live="polite">${homeMood >= 0 ? esc(homeMoodSay[homeMood]) : ""}</p></div><div class="affirm"><span class="moon"><svg viewBox="0 0 24 24" fill="none" stroke="#a0aec0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg></span><p>晚间 21:00 服药后，记得拍一张记录照。<small>来自 安安动物医院 · 随访负责人 林医生</small></p></div><div class="act-row"><a class="act" href="${href("family", "today")}">🍚 记录喂药</a><a class="act" href="${href("family", "messages")}">📸 上传记录</a></div></div><div class="pill-float"><span class="vet">🩺</span><span>兽医已回复 · 用药疑问 3 条</span></div></section></main>
<section class="home-roles" aria-label="选择工作空间"><div class="roles-head"><h2>四端协同，一个闭环</h2><p>点击卡片进入对应工作台 · 演示数据均为虚构</p></div><div class="roles-grid">${homeRoleCards()}</div></section>
<footer class="home-foot">栖愈 QIYU CARE · 宠物诊后协同照护平台 · 连续照护，安心相伴</footer></div>`;
}
function render() {
  const r = route();
  const previousScroll =
    document.querySelector(".family-content")?.scrollTop || 0;
  const sameRoute = render.lastRoute === location.hash;
  render.lastRoute = location.hash;
  document.body.classList.toggle("family-mode", r.role === "family");
  if (r.role === "family") sessionStorage.setItem("qiyu.pet", selectedPet().id);
  document.body.dataset.workspace = r.role;
  if (r.role === "home") {
    document.title = "栖愈 · 连续照护，安心相伴";
    app.innerHTML = homePage();
    return;
  }
  document.title = `${roles[r.role].name} · 栖愈`;
  let content;
  if (r.role === "family") {
    content =
      {
        today: familyToday,
        plan: familyPlan,
        messages: familyMessages,
        me: familyMe,
        review: familyReview,
      }[r.page]?.() || familyToday();
    app.innerHTML = familyShell(content);
    if (sameRoute)
      document.querySelector(".family-content").scrollTop = previousScroll;
  } else {
    content =
      {
        dashboard: r.role === "ops" ? opsDashboard : clinicDashboard,
        queue: queuePage,
        clinical: queuePage,
        pets: petsPage,
        case: casePage,
        plans: planPage,
        approvals: planPage,
        appointments: appointmentsPage,
        reports: reportsPage,
        settings: settingsPage,
        institutions: institutionsPage,
        templates: templatesPage,
        billing: billingPage,
        support: supportPage,
      }[r.page]?.() || clinicDashboard();
    app.innerHTML = desktopShell(content);
  }
  enhanceSectionHeadings();
  sprinkleLive();
}
/* 给主按钮 / 图标按钮注入随机 --sd，让扫光与图标微动效错峰跳动 */
function sprinkleLive() {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  document
    .querySelectorAll(".btn.primary,.btn.soft,.icon-btn,.metric-icon")
    .forEach((el) => {
      if (!el.style.getPropertyValue("--sd"))
        el.style.setProperty("--sd", (Math.random() * 3.4).toFixed(2) + "s");
    });
}
function toast(text, error = false) {
  const el = document.querySelector("#toast");
  el.textContent = text;
  el.className = `visible${error ? " error" : ""}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.className = ""), 4000);
}
function run(action, close = true) {
  try {
    const result = dispatch(action, route().role, actor());
    if (close) closeDialog();
    toast(result.message);
    return result;
  } catch (e) {
    const err = dialog.open ? dialog.querySelector(".form-error") : null;
    if (err) {
      err.textContent = e.message;
      err.tabIndex = -1;
      err.focus();
    } else toast(e.message, true);
    return null;
  }
}
function field(
  label,
  name,
  value = "",
  type = "text",
  required = false,
  placeholder = "",
) {
  return `<label class="field">${esc(label)}${required ? ' <span class="visually-hidden">（必填）</span>' : ""}<input name="${name}" type="${type}" value="${esc(value)}" ${required ? "required" : ""} placeholder="${esc(placeholder)}" ${type === "number" ? 'min="1" max="1440"' : ""} maxlength="${name === "phone" ? 40 : 120}"></label>`;
}
function textarea(label, name, value = "", required = false, placeholder = "") {
  return `<label class="field">${esc(label)}<textarea name="${name}" ${required ? "required" : ""} maxlength="2000" placeholder="${esc(placeholder)}">${esc(value)}</textarea></label>`;
}
function select(label, name, options, value = "") {
  return `<label class="field">${esc(label)}<select name="${name}">${options.map(([v, l]) => `<option value="${esc(v)}" ${v === value ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
}
function modal(title, subtitle, body, submit = null, wide = false) {
  returnFocus = document.activeElement;
  modalSubmit = submit;
  dialog.className = wide ? "wide" : "";
  dialog.innerHTML = `<div class="dialog-head"><div><h2 id="dialog-title">${esc(title)}</h2><p>${esc(subtitle)}</p></div><button class="icon-btn" data-action="close-dialog" aria-label="关闭窗口">${icon("close")}</button></div><div class="dialog-body">${submit ? `<form class="form" id="modal-form">${body}<div class="form-error" role="alert"></div><div class="dialog-actions"><button class="btn" type="button" data-action="close-dialog">取消</button><button class="btn primary" type="submit">${esc(submit.label || "确认保存")}</button></div></form>` : body}</div>`;
  if (!dialog.open) dialog.showModal();
  setTimeout(
    () => dialog.querySelector("input,textarea,select,button")?.focus(),
    30,
  );
}
function closeDialog() {
  if (dialog.open) dialog.close();
  modalSubmit = null;
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  else {
    const main = document.querySelector("main");
    main?.setAttribute("tabindex", "-1");
    main?.focus({ preventScroll: true });
  }
}
function confirmAction(title, description, action, button = "确认") {
  modal(
    title,
    "请核对后继续",
    `<div class="consent-box">${esc(description)}</div>`,
    { label: button, handler: () => run(action) },
  );
}
function safeImage(value) {
  return /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(
    value || "",
  )
    ? value
    : "";
}
function planEditors(items) {
  return `<div id="plan-items">${items.map((i, n) => editorItem(i, n)).join("")}</div><button type="button" class="btn soft" data-action="add-plan-item">${icon("plus")}增加照护事项</button>`;
}
function editorItem(i, n) {
  return `<div class="plan-item-editor" data-item-id="${esc(i.id || uid("instruction"))}"><label class="field">事项名称<input name="item-title" required maxlength="80" value="${esc(i.title)}"></label><label class="field">安排时间<input type="time" name="item-time" required value="${esc(i.time)}"></label><label class="field full">操作说明<textarea name="item-detail" required maxlength="1000">${esc(i.detail)}</textarea></label><div class="field-action field full"><select name="item-type" class="filter-select" aria-label="事项类型">${["护理", "观察", "用药", "活动", "饮食"].map((t) => `<option ${t === i.type ? "selected" : ""}>${t}</option>`).join("")}</select><button class="text-btn" type="button" data-action="remove-plan-item">${icon("close")}移除事项</button></div></div>`;
}
function readItems() {
  return [...dialog.querySelectorAll(".plan-item-editor")].map((el) => ({
    id: el.dataset.itemId,
    title: el.querySelector("[name=item-title]").value.trim(),
    time: el.querySelector("[name=item-time]").value,
    detail: el.querySelector("[name=item-detail]").value.trim(),
    type: el.querySelector("[name=item-type]").value,
    active: true,
  }));
}
function openNewPlan() {
  const items = [
    {
      title: "回家后的护理",
      time: "09:00",
      type: "护理",
      detail: "按本次出院指导单的具体要求执行，并如实记录实际情况。",
    },
    {
      title: "晚间状态观察",
      time: "20:00",
      type: "观察",
      detail: "记录医院要求关注的变化，无法观察或不确定时直接说明。",
    },
  ];
  modal(
    "新建出院计划",
    "准备资料与家庭安排，完成后交由医生审核。",
    `<div class="form-grid">${field("宠物姓名", "name", "", "text", true, "例如：团团")}${field("主人称呼", "owner", "", "text", true, "例如：周女士")}${select(
      "动物种类",
      "species",
      [
        ["犬", "犬"],
        ["猫", "猫"],
      ],
    )}${field("品种", "breed", "", "text", false)}${field("年龄", "age", "", "text")}${field("体重", "weight", "", "text")}${field("联系电话", "phone", "", "tel")}${select(
      "照护场景",
      "scene",
      [
        ["眼科术后", "眼科术后"],
        ["骨科术后", "骨科术后"],
        ["外科术后", "复杂外科术后"],
      ],
    )}${field("材料来源", "source", "本院出院指导单", "text", true)}${field("建议复查日期", "review", day(3), "date", true)}</div>${select(
      "照护结构模板（可选）",
      "careTemplate",
      [
        ["", "使用当前准备结构"],
        ...state()
          .templates.filter((t) => t.status === "approved")
          .map((t) => [t.id, t.name]),
      ],
    )}${sourceUpload()}${textarea("家庭指导补充", "note", "")}<div><div class="editor-top"><h3>照护事项</h3><small>逐项核对本次正式材料</small></div>${planEditors(items)}</div>`,
    {
      label: "保存出院草稿",
      handler: async (data, form) => {
        const sourceDocument = await documentFile(
          form.elements.sourceFile?.files[0],
        );
        const result = run({
          type: "createPlan",
          ...data,
          sourceDocument,
          items: readItems(),
        });
        if (result) go("clinic", "case", result.entity);
      },
    },
    true,
  );
}
function openEditPlan(id) {
  const pl = state().plans.find((p) => p.id === id),
    p = petById(state(), pl.petId);
  if (pl.status === "review") {
    modal(
      "等待医生审核",
      `${p.name}的出院计划`,
      `<div class="notice">${icon("clipboard")}已提交医生审核，正式发布后家庭才能接收。</div>${instructionList(pl)}${linkBtn("打开医生工作台", href("doctor", "approvals"), "full primary", "stethoscope")}`,
    );
    return;
  }
  modal(
    "完善出院草稿",
    `${p.name} · ${p.owner}`,
    `${pl.returnReason ? `<div class="notice amber">${icon("chat")}退回原因：${esc(pl.returnReason)}</div>` : ""}${field("材料来源", "source", pl.source, "text", true)}${sourceUpload(pl.sourceDocument)}${textarea("家庭指导补充", "note", pl.note)}${planEditors(pl.items)}<button type="button" class="btn" data-action="save-plan-draft" data-id="${pl.id}">保存草稿，稍后提交</button>`,
    {
      label: "保存并提交审核",
      handler: async (data, form) => {
        const sourceDocument = await documentFile(
          form.elements.sourceFile?.files[0],
        );
        const result = run(
          { type: "savePlan", id, ...data, sourceDocument, items: readItems() },
          false,
        );
        if (result) run({ type: "submitPlan", id });
      },
    },
    true,
  );
}
function openApproval(id) {
  const s = state(),
    pl = s.plans.find((p) => p.id === id),
    p = petById(s, pl.petId);
  if (pl.status !== "review") {
    toast("该计划已更新，请查看最新状态", true);
    return;
  }
  modal(
    "审核出院安排",
    `${p.name} · 核对来源与家庭将收到的内容`,
    `<div class="plan-preview"><h3>${esc(p.name)}的照护安排</h3><p>来源：${esc(pl.source)} · 准备人：${esc(pl.author)}</p>${instructionList(pl)}<p>${esc(pl.note)}</p></div><div class="actions" style="margin-top:18px">${btn("退回补充", "return-plan", id, "", "back")}${btn("撤销未交付安排", "withdraw-plan", id, "", "close")}</div><label class="checkbox"><input type="checkbox" name="confirmed" required>我已核对本次材料、照护对象和安排，确认交付家庭。</label>`,
    { label: "确认并正式发布", handler: () => run({ type: "publish", id }) },
    true,
  );
}
function openRevision(petId) {
  const s = state(),
    p = petById(s, petId),
    pl = currentPlan(s, petId);
  modal(
    "调整照护安排",
    `${p.name} · 以当前正式安排为基础，原执行记录保留。`,
    `${textarea("调整原因", "reason", "", true, "向家庭解释本次变化")}${select(
      "生效方式",
      "effectiveMode",
      [
        ["now", "发布后立即生效"],
        ["scheduled", "指定生效时间"],
      ],
    )}<label class="field" id="effective-field" hidden>生效时间（医院当地时间）<input name="effectiveTime" type="datetime-local"></label>${textarea("家庭指导补充", "note", pl.note)}${planEditors(pl.items)}<label class="checkbox"><input type="checkbox" required>已核对修改内容与生效时间，确认交付家庭。</label>`,
    {
      label: "发布调整后的安排",
      handler: (data) => {
        if (
          data.effectiveMode === "scheduled" &&
          (!data.effectiveTime ||
            Date.parse(data.effectiveTime + ":00+08:00") <= Date.now())
        ) {
          dialog.querySelector(".form-error").textContent =
            "请选择未来的生效时间。";
          return;
        }
        run({
          type: "revise",
          petId,
          expectedPlanId: pl.id,
          reason: data.reason,
          note: data.note,
          items: readItems(),
          effectiveAt:
            data.effectiveMode === "scheduled"
              ? new Date(data.effectiveTime + ":00+08:00").toISOString()
              : new Date().toISOString(),
        });
      },
    },
    true,
  );
}
async function imageFile(file) {
  if (!file?.size) return null;
  if (
    !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)
  )
    throw new Error("请选择 JPG、PNG、WebP 或 GIF 图片");
  if (file.size > 500000) throw new Error("图片较大，请选择 500KB 以内的图片");
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("读取图片失败，请重新选择"));
    r.readAsDataURL(file);
  });
}
function openTask(id, addRecord = false) {
  const s = state(),
    t = s.tasks.find((t) => t.id === id);
  if (!t) {
    toast("这项照护记录已更新，请重新打开。", true);
    return;
  }
  const p = petById(s, t.petId),
    ev = s.events.filter((e) => e.taskId === id);
  const historical = t.planId !== currentPlan(s, p.id)?.id;
  if (ev.length && !addRecord) {
    modal(
      t.title,
      `${p.name} · ${t.date} ${t.time}`,
      `${historical ? `<div class="notice amber">${icon("clipboard")}本次记录关联此前安排；新的执行请查看当前正式安排。</div>` : ""}<div class="notice">${icon("clipboard")}${esc(t.detail)}</div>${effectiveReportsPanel(s, id)}<div class="timeline">${ev.map((e) => `<div class="timeline-item"><span class="timeline-icon">${icon(e.result === "done" ? "check" : "chat")}</span><div><h3>${esc(resultLabels[e.result])}${e.corrects ? " · 更正记录" : ""}</h3><p>${esc(e.note || "已如实记录")}</p>${e.difficulty ? `<p>报告的困难：${esc(e.difficulty)}</p>` : ""}<time>${esc(e.actor)} · ${fmt(e.occurredAt, true)}</time>${e.attachment ? `<img class="message-image" src="${safeImage(e.attachment)}" alt="照护照片">` : ""}${p.status !== "ended" && e.actor === actor() ? btn("更正这条记录", "correct", e.id, "small", "edit") : ""}</div></div>`).join("")}</div>${p.status !== "ended" ? `<div class="actions" style="margin-top:20px">${btn("针对这次照护求助", "task-concern", t.id, "primary", "chat")}${btn("追加实际执行记录", "add-task-record", t.id, "", "plus")}</div>` : ""}`,
    );
    return;
  }
  const operationId = uid("operation");
  modal(
    t.title,
    `${p.name} · ${t.time} · 当前照护人 ${p.member}`,
    `<div class="notice ${historical ? "amber" : ""}">${icon("clipboard")}<div>${esc(t.detail)}${historical ? "<br>这项记录关联此前安排，医院将协助核实。" : ""}</div></div>${ev.length ? `<div class="metric-detail"><b>最近一条记录</b><p>${esc(ev.at(-1).actor)} · ${esc(resultLabels[ev.at(-1).result])}</p><p>${esc(ev.at(-1).note)}</p></div>` : ""}${
      p.status === "ended"
        ? `<div class="notice">${icon("check")}本轮已结束，执行记录可在照护资料中查看。</div>`
        : `<h3>这一次的实际情况</h3><div class="result-options">${Object.entries(
            resultLabels,
          )
            .map(
              ([k, l]) =>
                `<label class="result-option"><input type="radio" name="result" value="${k}" required>${l}</label>`,
            )
            .join(
              "",
            )}</div>${difficultySelect()}${textarea("补充说明", "note", "", "", "记录实际情况，不确定的地方也可以说明")}<label class="field">补充照片（可选）<input type="file" name="attachment" accept="image/png,image/jpeg,image/webp,image/gif"><small>选择清晰的照护照片，单张不超过 500KB。</small></label>${field("实际发生时间（医院当地时间）", "occurredAt", new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()).replace(" ", "T"), "datetime-local", true)}<label class="checkbox"><input type="checkbox" name="help">这次需要医院协助，请一并提交求助</label>`
    }`,
    p.status === "ended"
      ? null
      : {
          label: "记录实际情况",
          handler: async (data, form) => {
            try {
              const attachment = await imageFile(
                form.elements.attachment.files[0],
              );
              run({
                type: "report",
                petId: p.id,
                taskId: id,
                result: data.result,
                difficulty: data.difficulty || null,
                note: data.note,
                help: !!data.help,
                attachment,
                operationId,
                occurredAt: new Date(
                  data.occurredAt + ":00+08:00",
                ).toISOString(),
              });
            } catch (e) {
              dialog.querySelector(".form-error").textContent = e.message;
            }
          },
        },
  );
}
function openConcern(petId, taskId = null) {
  const p = petById(state(), petId) || selectedPet();
  const related = state().tasks.find((t) => t.id === taskId);
  modal(
    "联系医院协助",
    `${p.name} · ${state().clinic.name}`,
    `${related ? `<div class="notice">${icon("clipboard")}关联照护：${esc(related.title)} · ${related.time}</div>` : ""}<div class="notice">${icon("clock")}<div>服务时间 ${esc(state().clinic.hours)}<br>需尽快联系时，请拨打 ${esc(state().clinic.phone)}</div></div>${select(
      "需要协助的类型",
      "category",
      [
        ["执行困难", "执行困难"],
        ["安排看不清", "安排看不清"],
        ["记录核实", "家人记录需要核实"],
        ["观察变化", "希望报告变化"],
        ["预约与资料", "预约或资料"],
      ],
    )}${difficultySelect()}${field("问题标题", "title", "", "text", true, "概括你需要协助的情况")}${textarea("实际情况", "body", "", true, "发生了什么、已经尝试了什么、希望医院协助什么")}`,
    {
      label: "提交医院协助",
      handler: (data) => run({ type: "concern", petId: p.id, taskId, ...data }),
    },
  );
}
function concernDetail(id) {
  const s = state(),
    c = s.concerns.find((c) => c.id === id),
    r = route(),
    p = c && petById(s, c.petId),
    task = s.tasks.find((t) => t.id === c?.taskId),
    plan = currentPlan(s, p?.id),
    canReply =
      r.role === "family" ||
      r.role === "doctor" ||
      (r.role === "clinic" && c?.category === "预约与资料");
  if (!c || !p) {
    toast("此问题已更新，请重新打开。", true);
    return;
  }
  modal(
    c.title,
    `${p.name} · ${esc(c.category)} · ${fmt(c.createdAt, true)}`,
    `<div class="field-action">${cBadge(c)}<span class="subtle">${esc(c.assignee ? "责任人：" + c.assignee : "等待医院接手")}</span></div><section class="handoff-context"><div><small>本轮术后</small><strong>${esc(sceneLabel(p.scene))} · ${fmt(p.start)}开始</strong></div><div><small>当前照护人</small><strong>${esc(p.member)}</strong></div><div><small>有效安排</small><strong>${esc(plan ? plan.author + "签发" : "待正式发布")}</strong></div><div><small>复查衔接</small><strong>${esc(careLoopSummary(s, p.id).review.label)}</strong></div>${plan ? `<button class="text-btn" data-action="source" data-id="${plan.id}">${icon("file")}查看原院指导单</button>` : ""}${r.role === "doctor" && plan && p.status !== "ended" ? btn("调整照护安排", "revise", p.id, "small soft", "edit") : ""}</section>${task ? `<div class="notice">${icon("clipboard")}<div>关联事项：${esc(task.title)} · ${task.time}<br>${esc(task.detail)}</div></div>` : ""}${task ? effectiveReportsPanel(s, task.id) : ""}${c.difficulty ? `<div class="notice"><span>${icon("chat")}</span><div><b>家庭报告的困难</b><br>${esc(c.difficulty)}</div></div>` : ""}<div class="message-list">${c.messages.map((m) => `<div class="message ${m.role !== "family" ? "professional" : ""}"><span class="avatar ${m.role !== "family" ? "staff" : ""}">${esc(m.actor.slice(-2))}</span><div class="message-body"><div class="message-meta"><b>${esc(m.actor)}</b><time>${fmt(m.at, true)}</time>${m.role === "doctor" ? "<span>兽医答复</span>" : ""}</div><div class="message-text">${esc(m.text)}</div></div></div>`).join("")}</div>${c.nextAction ? `<div class="notice next-action-notice">${icon("arrow")}<div><b>院方交付的下一步</b><br>${esc(c.nextAction)}${c.status === "answered" ? "<p>待家庭确认接收，之后记录实际落实情况。</p>" : ""}${c.closeReason ? `<p>已记录落实：${esc(c.closeReason)}</p>` : ""}</div></div>` : ""}<div class="actions" style="margin-top:20px">${r.role !== "family" && c.status === "new" ? btn("接手此问题", "claim", id, "primary", "check") : ""}${r.role === "clinic" && ["accepted", "supplement"].includes(c.status) && c.category !== "预约与资料" ? btn("转交主治医生", "escalate", id, "primary", "stethoscope") : ""}${r.role !== "family" && !["new", "resolved"].includes(c.status) ? btn("请求家庭补充", "request-supplement", id, "", "chat") : ""}${r.role === "family" && c.status === "answered" ? btn("已收到，开始落实", "ack-action", id, "primary", "check") : ""}${r.role !== "family" && c.status !== "resolved" ? btn("交接负责人", "reassign", id, "", "users") : ""}${(r.role === "family" ? c.status === "action" : ["answered", "action"].includes(c.status)) ? btn("确认已解决", "resolve", id, "soft", "check") : ""}${c.status === "resolved" && p.status !== "ended" ? btn("需要继续跟进", "reopen", id, "", "chat") : ""}</div>${p.status !== "ended" && c.status !== "resolved" && canReply && (r.role === "family" || c.status !== "new") ? `<div class="divider"></div><form class="form" data-form="concern-reply" data-id="${id}">${textarea(r.role === "family" ? "补充信息" : "交付答复", "text", "", true, r.role === "family" ? "补充实际情况" : "说明判断与处理结果")}${r.role !== "family" ? textarea("明确的下一步", "nextAction", "", true, "说明后续行动、由谁执行及联系安排") : ""}<div class="form-error" role="alert"></div><div class="actions"><button class="btn primary" type="submit">${icon("chat")}${r.role === "family" ? "发送补充" : "交付答复与后续安排"}</button></div></form>` : ""}`,
    null,
    true,
  );
}
function sourceModal(id) {
  const s = state(),
    pl = s.plans.find((p) => p.id === id),
    p = petById(s, pl.petId);
  modal(
    "出院指导单",
    `${esc(pl.source)} · ${esc(pl.author)}`,
    `${pl.sourceDocument ? `<div class="metric-detail"><b>原始出院材料</b><p>${esc(pl.sourceDocument.name)}</p>${pl.sourceDocument.type.startsWith("image/") ? `<img class="source-image" src="${safeImage(pl.sourceDocument.data)}" alt="原始出院材料">` : ""}${btn("下载原始材料", "download-source", pl.id, "small", "download")}</div>` : ""}<article class="doc-paper">${p.status === "ended" ? `<div class="notice">${icon("file")}本轮已结束，以下为本轮归档的正式交付材料。</div>` : ""}<h2>${esc(s.clinic.name)}<br>家庭照护指导单</h2><dl class="info-list"><div><dt>宠物</dt><dd>${esc(p.name)} · ${esc(p.breed)}</dd></div><div><dt>主人</dt><dd>${esc(p.owner)}</dd></div><div><dt>照护场景</dt><dd>${esc(sceneLabel(p.scene))}</dd></div><div><dt>交付人</dt><dd>${esc(pl.author)}</dd></div></dl>${instructionList(pl)}<p>${esc(pl.note)}</p><p>服务时间：${esc(s.clinic.hours)}<br>本院联系：${esc(s.clinic.phone)}</p></article><div class="actions" style="margin-top:18px">${btn("下载本轮资料", "export-pet", p.id, "primary", "download")}</div>`,
    null,
    true,
  );
}
function viewPlan(id) {
  const s = state(),
    pl = s.plans.find((p) => p.id === id),
    old = s.plans.find((p) => p.id === pl.previousId);
  const changes = old
    ? pl.items.filter((i) => {
        const before = old.items.find((x) => x.id === i.id);
        return !before || JSON.stringify(before) !== JSON.stringify(i);
      })
    : [];
  const removed = old
    ? old.items.filter((i) => !pl.items.some((x) => x.id === i.id))
    : [];
  modal(
    pl.previousId ? "照护安排变化" : "照护安排详情",
    `${pl.status === "withdrawn" ? "已撤销，不会生效" : fmt(pl.effectiveAt, true) + "生效"} · ${esc(pl.author)}`,
    `${pl.status === "withdrawn" ? `<div class="notice amber">${icon("close")}<div>这份安排已撤销，不再生效。<br>原因：${esc(pl.withdrawReason)}</div></div>` : ""}${old ? `<div class="notice">${icon("edit")}<div><b>${esc(pl.reason)}</b><br>${changes.length ? changes.map((i) => esc(i.title) + "的安排已调整").join("<br>") : "医院已更新补充指导，请查看当前安排。"}</div></div>` : ""}${removed.length ? `<div class="notice amber">${icon("clipboard")}已取消：${removed.map((i) => esc(i.title)).join("、")}</div>` : ""}${instructionList(pl)}<p class="subtle">${esc(pl.note)}</p>`,
    null,
    true,
  );
}
function appointmentModal(petId = "") {
  const s = state(),
    r = route(),
    p = petById(s, petId) || selectedPet();
  modal(
    r.role === "family" ? "申请复查时间" : "安排复查",
    "复查请求由医院确认后，成为正式预约。",
    `${
      r.role === "clinic"
        ? select(
            "服务病例",
            "petId",
            s.pets
              .filter((p) => p.status !== "ended")
              .map((p) => [p.id, p.name + " · " + p.owner]),
            petId || p.id,
          )
        : ""
    }<div class="form-grid">${field("希望复查日期", "date", day(3), "date", true)}${field("希望复查时段", "time", "10:00", "time", true)}</div>${textarea("备注", "note", "", false, "方便联系的时间或其他需要说明的事项")}`,
    {
      label: r.role === "family" ? "提交复查申请" : "确认复查安排",
      handler: (data) =>
        run({
          type: "appointment",
          petId: r.role === "clinic" ? data.petId : p.id,
          ...data,
        }),
    },
  );
  dialog.querySelector("[name=date]").min = day();
}
function inviteModal(petId) {
  modal(
    "邀请家人一起照护",
    "授权成员可以查看本轮安排、记录执行与参与交接。",
    `${field("家人称呼", "name", "", "text", true, "例如：周先生")}${field("授权到期日期（可选）", "expires", "", "date")}<div class="consent-box">授权范围为这只宠物的本轮照护。撤销后停止后续访问，已经下载的资料副本无法远程收回。</div>`,
    {
      label: "加入照护成员",
      handler: (data) => run({ type: "invite", petId, ...data }),
    },
  );
  const date = dialog.querySelector("[name=expires]");
  date.min = day();
}
function handoffModal(petId) {
  const s = state(),
    p = petById(s, petId),
    members = activeMembers(p).filter((m) => m.name !== p.member);
  if (!members.length) {
    toast("请先邀请另一位照护成员");
    inviteModal(petId);
    return;
  }
  modal(
    "把照护清楚地交给家人",
    `${p.name} · 当前照护人 ${p.member}`,
    `${select(
      "接班人",
      "to",
      members.map((m) => [m.name, m.name]),
    )}<div class="plan-preview"><h3>交班摘要</h3><p>当前正式安排：${fmt(currentPlan(s, petId)?.effectiveAt, true)}生效</p><p>今日事项：${s.tasks.filter((t) => t.petId === petId && !t.cancelled && t.date === day()).length} 项</p><p>未结问题：${s.concerns.filter((c) => c.petId === petId && c.status !== "resolved").length} 项</p></div><label class="checkbox"><input type="checkbox" required>已核对当前安排、实际记录与未结问题。</label>`,
    {
      label: "发起交接",
      handler: (data) => run({ type: "handoff", petId, to: data.to }),
    },
  );
}
function download(name, text, type = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportPet(petId) {
  const s = state(),
    p = petById(s, petId),
    plans = s.plans.filter(
      (pl) =>
        pl.petId === petId &&
        (pl.status === "published" ||
          (pl.status === "withdrawn" && pl.publishedAt)),
    ),
    events = s.events.filter((e) => e.petId === petId),
    cs = s.concerns.filter((c) => c.petId === petId);
  const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(p.name)}的照护资料 · 栖愈</title><style>body{font-family:system-ui,sans-serif;color:#23373c;max-width:800px;margin:40px auto;padding:24px;line-height:1.8}h1{font-size:26px}h2{font-size:20px;margin-top:30px}section{border-bottom:1px solid #dae4e5;padding:16px 0}p{white-space:pre-wrap}small{color:#687477}img{max-width:260px}dt{color:#687477}dd{margin-left:0}</style><h1>${esc(p.name)}的本轮照护资料</h1><p>${esc(s.clinic.name)} · ${esc(sceneLabel(p.scene))}<br>主人：${esc(p.owner)}<br>资料截至：${fmt(new Date().toISOString(), true)}</p><h2>正式照护安排</h2>${plans.map((pl) => `<section><h3>${esc(pl.reason)}</h3><p>确认人：${esc(pl.author)}<br>来源：${esc(pl.source)}<br>状态：${pl.status === "withdrawn" ? "已撤销" : p.status === "ended" ? "本轮归档安排" : currentPlan(s, p.id)?.id === pl.id ? "当前有效" : pl.effectiveAt > new Date().toISOString() ? "尚未生效" : "此前安排"}<br>${pl.status === "withdrawn" ? "撤销：" + fmt(pl.withdrawnAt, true) + "；" + esc(pl.withdrawReason) : "安排生效时间：" + fmt(pl.effectiveAt, true)}</p>${pl.items.map((i) => `<p><b>${esc(i.time)} ${esc(i.title)}</b><br>${esc(i.detail)}</p>`).join("")}<p>${esc(pl.note)}</p>${pl.sourceDocument && /^data:(application\/pdf|image\/(png|jpeg|webp));base64,/.test(pl.sourceDocument.data) ? `<p><a href="${esc(pl.sourceDocument.data)}" download="${esc(pl.sourceDocument.name)}">下载原始材料：${esc(pl.sourceDocument.name)}</a></p>` : ""}</section>`).join("")}<h2>家庭自报执行记录</h2>${events.map((e) => `<section><b>${esc(s.tasks.find((t) => t.id === e.taskId)?.title || "照护事项")} · ${esc(resultLabels[e.result])}</b><p>${esc(e.note)}</p>${e.difficulty ? `<p>报告的困难：${esc(e.difficulty)}</p>` : ""}<small>记录人：${esc(e.actor)} · 实际发生：${fmt(e.occurredAt, true)}${e.corrects ? " · 更正记录" : ""}</small>${e.attachment ? `<p><img src="${safeImage(e.attachment)}" alt="照护记录附件"></p>` : ""}</section>`).join("") || "<p>暂无记录</p>"}<h2>问题与医院答复</h2>${cs.map((c) => `<section><h3>${esc(c.title)} · ${esc(concernLabels[c.status])}</h3>${c.difficulty ? `<p>家庭报告的困难：${esc(c.difficulty)}</p>` : ""}${c.messages.map((m) => `<p><b>${esc(m.actor)}</b> · ${fmt(m.at, true)}<br>${esc(m.text)}</p>`).join("")}<p>下一步：${esc(c.nextAction || "待明确")}</p></section>`).join("") || "<p>暂无问题</p>"}<h2>复查与服务交付</h2>${s.appointments
    .filter((a) => a.petId === petId)
    .map(
      (a) =>
        `<p>${fmt(a.date)} ${esc(a.time)} · ${esc(appointmentLabels[a.status])}<br>${esc(a.reviewNote || a.note)}${a.nextAction ? "<br>复查下一步：" + esc(a.nextAction) : ""}${a.completedAt ? "<br>到院登记：" + esc(a.completedBy) + " · " + fmt(a.completedAt, true) : ""}</p>`,
    )
    .join(
      "",
    )}<p>${p.status === "ended" ? "结束方式：" + esc(p.endType || "本轮服务交付") + "<br>结束时间：" + fmt(p.endedAt, true) + "<br>结束说明：" + esc(p.endReason) : "本轮仍在进行中"}</p><small>栖愈 · 正式安排与家庭自报分别保留，资料按生成时点交付。</small></html>`;
  download(`${p.name}-照护资料-${day()}.html`, html, "text/html;charset=utf-8");
  toast("照护资料已下载");
}
function csv(rows) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map(
            (v) =>
              `"${String(v ?? "")
                .replace(/^[=+@-]/, "'$&")
                .replaceAll('"', '""')}"`,
          )
          .join(","),
      )
      .join("\r\n")
  );
}
function searchModal() {
  modal(
    "搜索工作空间",
    "查找宠物、主人或需要处理的事项",
    `<label class="search-input" style="max-width:none;margin-bottom:18px">${icon("search")}<input id="global-query" placeholder="输入宠物、主人或问题关键词" aria-label="搜索关键词"></label><div id="search-results" class="search-results">${searchResults("")}</div>`,
  );
  dialog.querySelector("#global-query")?.focus();
}
function searchResults(q) {
  const s = state(),
    r = route();
  if (r.role === "ops")
    return (
      s.institutions
        .filter((c) => `${c.name}${c.city}${c.contact}`.includes(q))
        .map(
          (c) =>
            `<button class="search-result" data-action="institution-detail" data-id="${c.id}">${icon("building")}<div style="text-align:left"><b>${esc(c.name)}</b><small>${esc(c.city)} · ${esc(c.contact)}</small></div>${icon("chevron")}</button>`,
        )
        .join("") || empty("没有匹配的机构")
    );
  const pets = s.pets.filter((p) =>
      `${p.name}${p.owner}${p.breed}`.includes(q),
    ),
    cs = s.concerns.filter(
      (c) =>
        (r.role !== "family" || c.petId === selectedPet().id) &&
        c.title.includes(q),
    );
  return (
    pets
      .map(
        (p) =>
          `<a class="search-result" data-action="close-on-nav" href="${href(r.role === "ops" ? "clinic" : r.role, r.role === "family" ? "today" : "case", p.id)}">${petArt(p.species, p.color)}<div><b>${esc(p.name)}</b><small>${esc(p.owner)} · ${esc(sceneLabel(p.scene))}</small></div>${icon("chevron")}</a>`,
      )
      .join("") +
      cs
        .slice(0, 5)
        .map(
          (c) =>
            `<button class="search-result" data-action="concern-detail" data-id="${c.id}">${icon("chat")}<div style="text-align:left"><b>${esc(c.title)}</b><small>${esc(petById(s, c.petId).name)} · ${esc(concernLabels[c.status])}</small></div>${icon("chevron")}</button>`,
        )
        .join("") || empty("没有找到匹配内容", "换个关键词再试试。")
  );
}
function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}
function futurePlanNotice(petId) {
  const future = state().plans.find(
    (pl) =>
      pl.petId === petId &&
      pl.status === "published" &&
      pl.effectiveAt > new Date().toISOString(),
  );
  return future
    ? `<div class="notice amber">${icon("clock")}<div>新的安排将于${fmt(future.effectiveAt, true)}生效，当前安排继续有效。<br>${btn("查看待生效安排", "view-plan", future.id, "small", "clipboard")}${route().role === "doctor" ? btn("撤销待生效安排", "withdraw-plan", future.id, "small danger", "close") : ""}</div></div>`
    : "";
}
function openNewRound(id) {
  const p = petById(state(), id),
    plan = currentPlan(state(), id);
  openNewPlan();
  dialog.querySelector("#dialog-title").textContent = "建立新一轮照护";
  dialog.querySelector(".dialog-head p").textContent =
    `${p.name} · 上一轮资料保留，新一轮重新审核交付`;
  const form = dialog.querySelector("form");
  for (const key of [
    "name",
    "owner",
    "species",
    "breed",
    "age",
    "weight",
    "phone",
    "scene",
  ])
    if (form.elements[key]) form.elements[key].value = p[key] || "";
  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.name = "previousServiceId";
  hidden.value = id;
  form.append(hidden);
  if (plan) {
    form.elements.source.value = plan.source;
    form.elements.note.value = plan.note;
    dialog.querySelector("#plan-items").innerHTML = plan.items
      .map((i, n) => editorItem({ ...i, id: uid("instruction") }, n))
      .join("");
  }
}
function sourceUpload(doc) {
  return `<label class="field">原始出院材料（可选）<input type="file" name="sourceFile" accept="application/pdf,image/png,image/jpeg,image/webp"><small>${doc ? "已保存：" + esc(doc.name) + "；选择新材料可替换。" : "支持 PDF 或清晰图片，单份不超过 1MB。"}</small></label>`;
}
async function documentFile(file) {
  if (!file?.size) return null;
  if (
    !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(
      file.type,
    )
  )
    throw new Error("请选择 PDF、JPG、PNG 或 WebP 材料");
  if (file.size > 1000000) throw new Error("材料较大，请选择1MB以内的文件");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({ name: file.name, type: file.type, data: reader.result });
    reader.onerror = () => reject(new Error("读取材料失败，请重新选择"));
    reader.readAsDataURL(file);
  });
}
function openTemplateEditor(id = "") {
  const original = state().templates.find((t) => t.id === id),
    editing = original?.status === "returned";
  modal(
    editing ? "补充并重提模板" : "建立照护模板",
    "模板内容经医生审核后，才可作为院方准备结构。",
    `${original?.returnReason ? `<div class="notice amber">${icon("chat")}${esc(original.returnReason)}</div>` : ""}${field("模板名称", "name", original ? (editing ? original.name : original.name + " · 新结构") : "", "text", true)}${select(
      "适用场景",
      "scene",
      [
        ["眼科术后", "眼科术后"],
        ["骨科术后", "骨科术后"],
        ["外科术后", "复杂外科术后"],
      ],
      original?.scene || "外科术后",
    )}${planEditors(original?.items || [{ title: "日常照护", time: "09:00", type: "护理", detail: "依照本院交付的具体指导核对执行，并记录实际情况。" }])}`,
    {
      label: "提交临床审核",
      handler: (d) =>
        run({
          type: editing ? "editTemplate" : "template",
          id: original?.id,
          ...d,
          items: readItems(),
        }),
    },
    true,
  );
}
async function onAction(el) {
  const action = el.dataset.action,
    id = el.dataset.id || "",
    s = state(),
    r = route();
  switch (action) {
    case "loop-step": {
      const p = petById(s, id),
        step = el.dataset.step;
      if (!p) break;
      if (step === "preparation") {
        const plan = currentPlan(s, id),
          latest = latestPlan(s, id);
        if (plan) sourceModal(plan.id);
        else if (r.role === "clinic" && latest) openEditPlan(latest.id);
        else if (latest?.status === "review") openApproval(latest.id);
        else
          modal(
            "出院交付",
            p.name,
            empty("正式安排仍在准备", "院方补齐本轮材料后，由医生审核发布。"),
          );
      } else if (step === "receipt")
        modal(
          "家庭接收情况",
          p.name,
          `<div class="notice">${icon(p.accepted ? "check" : "clock")}<div>${p.accepted ? "家庭已确认接收本轮正式安排。" : "等待家庭核对并接收正式安排。"}</div></div><a class="btn full" data-action="close-on-nav" href="${href("family", "today", p.id)}">${icon("heart")}查看家庭接收页面</a>`,
        );
      else if (step === "support" || step === "action") {
        const relevant = s.concerns.filter((c) => c.petId === id),
          current =
            relevant.find((c) => c.status !== "resolved") || relevant.at(-1);
        if (current) concernDetail(current.id);
        else
          modal(
            "本轮照护困难",
            p.name,
            empty(
              "本轮尚未报告困难",
              "实际执行遇到困难时，家庭可以带着安排和事实联系原医院。",
            ),
          );
      } else if (step === "review") {
        if (r.role === "family") go("family", "review", id);
        else
          modal(
            "复查与后续交付",
            p.name,
            `${appointmentCards(p.id)}${r.role === "clinic" && p.status !== "ended" ? btn("追加复查安排", "appointment", p.id, "soft full", "calendar") : ""}`,
            null,
            true,
          );
      } else if (p.status === "ended") exportPet(id);
      else if (r.role === "family") go("family", "me", id);
      else if (r.role === "clinic")
        await onAction({ dataset: { action: "end", id } });
      else
        modal(
          "本轮交付",
          p.name,
          `<div class="notice">${icon("file")}协调员在核对未结困难、到院复查及后续安排后，登记本轮结束。</div>${btn("导出当前照护资料", "export-pet", p.id, "full", "download")}`,
        );
      break;
    }
    case "home-mood": {
      const i = Number(el.dataset.mood);
      homeMood = i;
      document
        .querySelectorAll(".mood-row button")
        .forEach((b) => b.classList.toggle("on", Number(b.dataset.mood) === i));
      const say = document.getElementById("mood-say");
      if (say) say.textContent = homeMoodSay[i];
      break;
    }
    case "new-round":
      openNewRound(id);
      break;
    case "withdraw-plan": {
      const plan = s.plans.find((plan) => plan.id === id),
        unissued = ["draft", "review", "returned"].includes(plan?.status);
      modal(
        unissued ? "撤销未交付安排" : "撤销待生效安排",
        "当前正式安排和历史事实继续保留，撤销原因将随资料记录。",
        textarea("撤销原因", "reason", "", true),
        {
          label: "确认撤销",
          handler: (d) => run({ type: "withdrawPlan", id, ...d }),
        },
      );
      break;
    }
    case "family-more": {
      const p = selectedPet();
      modal(
        "栖愈 · 家庭照护",
        `${p.name}的本轮服务`,
        `${roleMenu()}<div class="divider"></div><div class="search-results">${linkBtn("查看当前照护安排", href("family", "plan", p.id), "full", "clipboard")}${linkBtn("管理家人和交接", href("family", "me", p.id), "full", "users")}${btn("下载本轮资料", "export-pet", p.id, "full", "download")}</div><div class="notice">${icon("building")}<div>${esc(s.clinic.name)}<br>服务时间 ${esc(s.clinic.hours)}</div></div>`,
      );
      break;
    }
    case "add-task-record":
      openTask(id, true);
      break;
    case "task-concern": {
      const t = s.tasks.find((t) => t.id === id);
      openConcern(t.petId, id);
      break;
    }
    case "ack-action":
      if (run({ type: "ackAction", id }, false)) concernDetail(id);
      break;
    case "reassign":
      modal(
        "交接负责人",
        "当前问题、来源和处理历史将一并交给接手人。",
        `${select("接手人", "assignee", [
          [s.clinic.contact, s.clinic.contact + " · 协调员"],
          [s.clinic.backup, s.clinic.backup + " · 替补协调员"],
          [roles.doctor.person, roles.doctor.person + " · 主治兽医"],
        ])}${textarea("交接说明", "note", "", true)}`,
        {
          label: "确认责任交接",
          handler: (d) => {
            if (run({ type: "reassign", id, ...d }, false)) concernDetail(id);
          },
        },
      );
      break;
    case "edit-pet": {
      const p = petById(s, id);
      modal(
        "编辑病例基础资料",
        "基础资料更新不会改写正式照护安排和既往事实。",
        `<div class="form-grid">${field("宠物姓名", "name", p.name, "text", true)}${field("主人称呼", "owner", p.owner, "text", true)}${field("品种", "breed", p.breed)}${field("年龄", "age", p.age)}${field("体重", "weight", p.weight)}${field("联系电话", "phone", p.phone, "tel")}</div>`,
        {
          label: "保存基础资料",
          handler: (d) => run({ type: "editPet", petId: id, ...d }),
        },
      );
      break;
    }
    case "reschedule": {
      const a = s.appointments.find((a) => a.id === id);
      modal(
        "调整复查时间",
        r.role === "family"
          ? "医院确认前，原预约继续保留。"
          : "确认本次改约后，原预约将取消。",
        `<div class="form-grid">${field("新的复查日期", "date", a.date, "date", true)}${field("新的时段", "time", a.time, "time", true)}</div>${textarea("改约说明", "note", "", true)}`,
        {
          label: r.role === "family" ? "提交改约申请" : "确认改约",
          handler: (d) => run({ type: "reschedule", id, ...d }),
        },
      );
      dialog.querySelector("[name=date]").min = day();
      break;
    }
    case "edit-template":
      openTemplateEditor(id);
      break;
    case "return-template":
      modal(
        "退回模板补充",
        "说明需要核对的场景、字段或内容。",
        textarea("补充要求", "reason", "", true),
        {
          label: "退回运营补充",
          handler: (d) => run({ type: "returnTemplate", id, ...d }),
        },
      );
      break;
    case "complete-renewal":
      modal(
        "处理续订申请",
        "记录与医院确认的服务方案和下一周期交付。",
        textarea("续订交付内容", "note", "", true),
        {
          label: "确认续订完成",
          handler: (d) => run({ type: "completeRenewal", ...d }),
        },
      );
      break;
    case "refund-activation":
      modal(
        "登记实际退款",
        "核对已结算条目与实际退款凭证，资料和照护安排继续保留。",
        `${textarea("退款原因", "reason", "", true)}${field("退款凭证或流水号", "reference", "", "text", true)}`,
        {
          label: "确认登记退款",
          handler: (d) => run({ type: "refund", id, ...d }),
        },
      );
      break;
    case "save-plan-draft": {
      const form = dialog.querySelector("#modal-form");
      if (!form.reportValidity()) break;
      const d = formData(form),
        sourceDocument = await documentFile(form.elements.sourceFile?.files[0]);
      run({ type: "savePlan", id, ...d, sourceDocument, items: readItems() });
      break;
    }
    case "download-source": {
      const doc = s.plans.find((p) => p.id === id)?.sourceDocument;
      if (!doc) throw new Error("该材料尚未上传");
      const response = await fetch(doc.data),
        blob = await response.blob(),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = doc.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("原始材料已下载");
      break;
    }

    case "menu":
      if (document.querySelector(".sidebar").classList.contains("open")) {
        document.querySelector(".sidebar").classList.remove("open");
        document.querySelector(".mobile-scrim")?.remove();
        break;
      }
      document.querySelector(".sidebar").classList.add("open");
      if (!document.querySelector(".mobile-scrim")) {
        const b = document.createElement("button");
        b.className = "mobile-scrim";
        b.setAttribute("aria-label", "关闭导航");
        b.dataset.action = "close-menu";
        document.body.append(b);
      }
      break;
    case "close-menu":
      document.querySelector(".sidebar")?.classList.remove("open");
      document.querySelector(".mobile-scrim")?.remove();
      break;
    case "close-dialog":
    case "close-on-nav":
      closeDialog();
      break;
    case "search":
      searchModal();
      break;
    case "notifications":
      if (r.role === "ops") {
        modal(
          "机构服务待办",
          "跟进入驻、支持与续订。",
          `${s.institutions
            .filter((c) => c.status === "onboarding")
            .map(
              (c) =>
                `<a class="search-result" data-action="close-on-nav" href="${href("ops", "institutions")}">${icon("building")}<div><b>${esc(c.name)}</b><small>等待实施验收</small></div>${icon("chevron")}</a>`,
            )
            .join(
              "",
            )}${s.renewal?.status === "requested" ? `<a class="search-result" data-action="close-on-nav" href="${href("ops", "support")}">${icon("wallet")}<div><b>${esc(s.clinic.name)}的续订申请</b><small>待运营跟进</small></div>${icon("chevron")}</a>` : ""}${s.tickets
            .filter((t) => t.status === "open")
            .map(
              (t) =>
                `<a class="search-result" data-action="close-on-nav" href="${href("ops", "support")}">${icon("chat")}<div><b>${esc(t.title)}</b><small>机构支持跟进中</small></div>${icon("chevron")}</a>`,
            )
            .join(
              "",
            )}${!s.institutions.some((c) => c.status === "onboarding") && s.renewal?.status !== "requested" && !s.tickets.some((t) => t.status === "open") ? empty("当前没有待处理事项", "新的机构服务请求会出现在这里。") : ""}`,
        );
        break;
      }
      modal(
        "需要你关注的事项",
        "把需要处理的事交到明确的人手中。",
        s.concerns
          .filter(
            (c) =>
              c.status !== "resolved" &&
              (r.role !== "doctor" || c.assigneeRole === "doctor"),
          )
          .map(
            (c) =>
              `<button class="search-result" style="width:100%;margin-bottom:10px;text-align:left" data-action="concern-detail" data-id="${c.id}">${icon("chat")}<div><b>${esc(c.title)}</b><small>${esc(petById(s, c.petId).name)} · ${esc(concernLabels[c.status])}</small></div>${icon("chevron")}</button>`,
          )
          .join("") || empty("当前没有未结事项"),
      );
      break;
    case "queue-filter":
      filter = id;
      render();
      break;
    case "new-plan":
      openNewPlan();
      break;
    case "edit-plan":
      openEditPlan(id);
      break;
    case "approve":
      openApproval(id);
      break;
    case "return-plan":
      modal(
        "退回补充",
        "清楚说明需要核对的字段与材料。",
        textarea("退回原因", "reason", "", true),
        {
          label: "退回护理人员",
          handler: (d) => run({ type: "returnPlan", id, ...d }),
        },
      );
      break;
    case "revise":
      openRevision(id);
      break;
    case "add-plan-item":
      dialog
        .querySelector("#plan-items")
        .insertAdjacentHTML(
          "beforeend",
          editorItem({ title: "", time: "12:00", detail: "", type: "护理" }, 0),
        );
      break;
    case "remove-plan-item":
      el.closest(".plan-item-editor").remove();
      break;
    case "source":
      sourceModal(id);
      break;
    case "view-plan":
      viewPlan(id);
      break;
    case "accept-service":
      run({ type: "acceptService", petId: id });
      break;
    case "task":
      openTask(id);
      break;
    case "correct": {
      const e = s.events.find((e) => e.id === id);
      modal(
        "更正实际记录",
        "更正会追加保存，原始记录保留。",
        `${select("更正后的实际结果", "result", Object.entries(resultLabels), e.result)}${textarea("更正原因", "note", "", true)}`,
        {
          label: "保存更正",
          handler: (d) => run({ type: "correct", id, ...d }),
        },
      );
      break;
    }
    case "new-concern":
      openConcern(id);
      break;
    case "concern-detail":
      concernDetail(id);
      break;
    case "claim":
      if (run({ type: "claim", id }, false)) concernDetail(id);
      break;
    case "escalate":
      if (run({ type: "escalate", id }, false)) concernDetail(id);
      break;
    case "request-supplement":
      modal(
        "请求家庭补充",
        "说明需要补充的事实，避免让家庭猜测。",
        textarea("需要补充什么", "text", "", true),
        {
          label: "发送补充请求",
          handler: (d) => {
            if (run({ type: "supplement", id, ...d }, false)) concernDetail(id);
          },
        },
      );
      break;
    case "resolve":
      modal(
        "确认问题已解决",
        "记录具体落实情况，答复与实际行动分别保留。",
        textarea(
          "实际落实与处理结果",
          "reason",
          "",
          true,
          "谁在什么时间完成了哪一步，或院方确认的处理结果",
        ),
        {
          label: "确认已解决",
          handler: (d) => run({ type: "resolve", id, ...d }),
        },
      );
      break;
    case "reopen":
      run({ type: "reopen", id });
      break;
    case "appointment":
      appointmentModal(id);
      break;
    case "confirm-appointment":
      confirmAction(
        "确认复查时间",
        "确认后将向家庭展示正式预约，请先核对院方安排。",
        { type: "appointmentStatus", id, status: "confirmed" },
        "确认复查",
      );
      break;
    case "complete-appointment":
      modal(
        "记录已完成复查",
        "核对院方实际到院记录与复查交付，照护调整继续由医生正式发布。",
        `${textarea("到院与复查交付说明", "note", "", true, "记录实际到院情况和已交付资料")}${textarea("复查后的明确下一步", "nextAction", "", true, "说明后续由谁负责、是否继续照护或另行复查")}`,
        {
          label: "确认已到院",
          handler: (d) =>
            run({ type: "appointmentStatus", id, status: "completed", ...d }),
        },
      );
      break;
    case "cancel-appointment":
      confirmAction(
        "取消本次复查预约",
        "取消仅更新预约安排；当前照护指导继续按医院确认的安排执行。",
        { type: "appointmentStatus", id, status: "cancelled" },
        "确认取消",
      );
      break;
    case "end":
      modal(
        "结束本轮服务",
        "正常结轮需先落实未结困难、完成复查并处理待办预约；转交或退出会撤销未完成预约。",
        `${careLoopSummary(s, id).blockers.length ? `<div class="notice amber">${icon("clipboard")}<div><b>正常结轮尚待落实</b><br>${careLoopSummary(s, id).blockers.map(esc).join("<br>")}</div></div>` : `<div class="notice">${icon("check")}未结困难、复查和安排已核对，可交付本轮后续。</div>`}${select(
          "结束原因",
          "endType",
          [
            ["完成本轮随访", "完成本轮随访"],
            ["转入新一轮服务", "转入新一轮服务"],
            ["转院并完成交接", "转院并完成交接"],
            ["主人退出服务", "主人退出服务"],
          ],
        )}${textarea("后续安排与交付说明", "reason", "", true, "说明下一步由谁负责，家庭需要做什么")}`,
        {
          label: "确认结束并交付资料",
          handler: (d) =>
            run({
              type: "end",
              petId: id,
              endType: d.endType,
              reason: d.reason,
            }),
        },
      );
      break;
    case "invite":
      inviteModal(id);
      break;
    case "revoke":
      confirmAction(
        "撤销照护授权",
        "撤销后该成员不能继续查看或记录本轮照护，过去记录保留。",
        { type: "revoke", petId: selectedPet().id, id },
        "撤销授权",
      );
      break;
    case "handoff":
      handoffModal(id);
      break;
    case "accept-handoff":
      run({ type: "acceptHandoff", petId: id });
      break;
    case "switch-member":
      familyActor = id;
      sessionStorage.setItem("qiyu.actor", id);
      render();
      toast(`已切换为${id}的照护视图`);
      break;
    case "export-pet":
      exportPet(id);
      break;
    case "export-report":
      download(
        `栖愈-服务报告-${day()}.csv`,
        csv([
          ["指标", "数量", "分母说明"],
          ["服务建立", s.pets.length, "本轮服务总数"],
          [
            "有效启用",
            s.activations.filter((a) => a.status === "valid").length,
            "正式发布、家庭接收并实际使用",
          ],
          ["问题总数", s.concerns.length, "家庭提交及记录核实问题"],
          [
            "已解决",
            s.concerns.filter((c) => c.status === "resolved").length,
            "全部问题",
          ],
          [
            "已结束服务",
            s.pets.filter((p) => p.status === "ended").length,
            "全部服务",
          ],
        ]),
        "text/csv;charset=utf-8",
      );
      toast("服务报告已下载");
      break;
    case "export-billing":
      download(
        `栖愈-用量明细-${day()}.csv`,
        csv([
          ["宠物", "主人", "启用时间", "金额", "状态", "原因"],
          ...s.activations.map((a) => {
            const p = petById(s, a.petId);
            return [
              p.name,
              p.owner,
              fmt(a.at, true),
              a.amount,
              a.status === "valid"
                ? "有效"
                : a.status === "refunded"
                  ? "已退款"
                  : "作废",
              a.reason || "",
            ];
          }),
        ]),
        "text/csv;charset=utf-8",
      );
      toast("用量明细已下载");
      break;
    case "renewal":
      confirmAction(
        "申请继续使用栖愈",
        "提交后由机构服务团队跟进续订。当前照护安排与资料不受影响。",
        { type: "renewal" },
        "提交续订申请",
      );
      break;
    case "new-institution":
      modal(
        "新增合作机构",
        "面向具备复杂术后业务与随访团队的医院，建立人员接手和复查路径。",
        institutionFields(),
        {
          label: "建立合作机构",
          handler: (data, form) => {
            const profile = readInstitutionProfile(data, form);
            if (profile) run({ type: "institution", ...profile });
          },
        },
        true,
      );
      break;
    case "edit-institution":
      editInstitutionProfile(id);
      break;
    case "activate-institution": {
      const c = s.institutions.find((c) => c.id === id);
      const complete =
        c &&
        c.surgeryScopes?.length &&
        c.followupContact &&
        c.clinicalLead &&
        c.serviceHours &&
        c.reviewPath;
      if (!complete) {
        modal(
          "先完善机构服务配置",
          c?.name || "合作机构",
          `<div class="notice amber">${icon("building")}需明确适用术后范围、随访与临床负责人、服务时段及复查路径，才能实施验收。</div>${btn("补齐服务配置", "edit-institution", id, "full primary", "edit")}`,
        );
        break;
      }
      modal(
        "实施验收与开通",
        "完成机构交付检查后，正式开通服务。",
        `${[
          ["handoff", "随访负责人可接手，临床负责人可交付专业下一步"],
          ["instructions", "本院出院材料与正式安排已经核对"],
          ["familyPath", "家庭接收、实际报告与困难转交路径已走通"],
          ["reviewPath", "复查确认、到院记录与后续交付路径已核对"],
        ]
          .map(
            ([value, t]) =>
              `<label class="checkbox"><input type="checkbox" name="implementationCheck" value="${value}" required>${t}</label>`,
          )
          .join("")}`,
        {
          label: "验收完成，开通机构",
          handler: (_, form) =>
            run({
              type: "activateInstitution",
              id,
              checks: [
                ...form.querySelectorAll(
                  '[name="implementationCheck"]:checked',
                ),
              ].map((input) => input.value),
            }),
        },
      );
      break;
    }
    case "institution-detail": {
      const c = s.institutions.find((c) => c.id === id);
      modal(
        "机构术后服务概况",
        c.name,
        `<dl class="info-list"><div><dt>城市 / 机构负责人</dt><dd>${esc(c.city)} · ${esc(c.contact)}</dd></div><div><dt>适用术后范围</dt><dd>${esc(c.surgeryScopes?.join(" · ") || "待配置")}</dd></div><div><dt>随访接手负责人</dt><dd>${esc(c.followupContact || "待配置")}</dd></div><div><dt>主治 / 临床负责人</dt><dd>${esc(c.clinicalLead || "待配置")}</dd></div><div><dt>服务时段</dt><dd>${esc(c.serviceHours || "待配置")}</dd></div><div><dt>复查路径</dt><dd>${esc(c.reviewPath || "待配置")}</dd></div><div><dt>机构状态</dt><dd>${c.status === "active" ? "已开通" : "实施中"}</dd></div>${c.activatedAt ? `<div><dt>实施验收</dt><dd>${esc(c.activatedBy)} · ${fmt(c.activatedAt, true)}</dd></div>` : ""}<div><dt>有效启用</dt><dd>${c.id === "clinic-1" ? s.activations.filter((a) => a.status === "valid").length : 0} 例</dd></div></dl><div class="commercial-note">${icon("wallet")}<div><strong>每例有效启用 ¥${s.settings.unitPrice}</strong><p>同轮调整与复查改约不重复收费，家庭使用不收费。</p></div></div>${btn("编辑服务配置", "edit-institution", c.id, "full soft", "edit")}`,
        null,
        true,
      );
      break;
    }
    case "new-template":
      openTemplateEditor();
      break;
    case "review-template": {
      const t = s.templates.find((t) => t.id === id);
      modal(
        "审核照护模板",
        `${t.name} · ${t.scene}`,
        `${instructionList(t)}<div class="actions">${btn("退回补充", "return-template", t.id, "", "back")}</div><label class="checkbox"><input type="checkbox" required>已核对模板适用场景及内容，确认可以作为院方准备结构。</label>`,
        {
          label: "确认审核通过",
          handler: () => run({ type: "approveTemplate", id }),
        },
        true,
      );
      break;
    }
    case "template-detail": {
      const t = s.templates.find((t) => t.id === id);
      modal(
        t.name,
        "模板提供照护结构，由医院核对具体内容。",
        `${badge(t.status === "approved" ? "已审核" : "待临床审核", t.status === "approved" ? "green" : "amber")}<div class="notice">${icon("clipboard")}模板包含事项名称、照护对象、操作说明、执行安排与复查联系信息。</div>${t.items ? instructionList(t) : t.status === "approved" ? instructionList(s.plans.find((p) => petById(s, p.petId).scene === t.scene) || s.plans[0]) : empty("等待临床内容审核", "机构确认适用范围和具体内容后交付使用。")}`,
      );
      break;
    }
    case "ticket":
      modal(
        "登记机构支持事项",
        "记录问题、影响范围与需要的协助。",
        `${field("事项标题", "title", "", "text", true)}${textarea("问题与影响", "body", "", true)}`,
        {
          label: "登记支持事项",
          handler: (d) => run({ type: "ticket", ...d }),
        },
      );
      break;
    case "close-ticket":
      confirmAction(
        "完成支持事项",
        "请确认机构使用问题已得到处理，并已交付结果。",
        { type: "closeTicket", id },
        "确认完成",
      );
      break;
    case "void-activation":
      modal(
        "作废计费条目",
        "用于重复、误建或不符合启用条件的服务。",
        textarea("作废原因", "reason", "", true),
        {
          label: "确认作废",
          handler: (d) => run({ type: "voidActivation", id, ...d }),
        },
      );
      break;
    case "payment":
      modal(
        "登记收款",
        "完成用量核对后，记录实际到账凭证。",
        `${field("收款凭证或流水号", "reference", "", "text", true, "填写可追溯的收款凭证")}<label class="checkbox"><input type="checkbox" required>已核对有效用量和实际到账金额。</label>`,
        {
          label: "确认登记收款",
          handler: (d) => run({ type: "payment", ...d }),
        },
      );
      break;
    default:
      throw new Error("该操作暂不可用，请重新打开页面。");
  }
}
document.addEventListener("click", (e) => {
  for (const details of document.querySelectorAll("details[open]"))
    if (!details.contains(e.target)) details.open = false;
  const el = e.target.closest("[data-action]");
  if (el) {
    if (el.tagName === "BUTTON") e.preventDefault();
    onAction(el).catch((err) => toast(err.message, true));
  }
});
document.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  if (!form.reportValidity()) return;
  const data = formData(form);
  const submitBtn = form.querySelector("[type=submit]");
  if (submitBtn) submitBtn.disabled = true;
  try {
    if (form.id === "modal-form" && modalSubmit)
      await modalSubmit.handler(data, form);
    else if (form.dataset.form === "settings") {
      const n = Number(data.target);
      if (!Number.isInteger(n) || n < 1 || n > 1440)
        throw new Error("接单目标需为 1—1440 分钟");
      run({ type: "settings", values: { ...data, target: n } }, false);
    } else if (form.dataset.form === "concern-reply") {
      if (run({ type: "reply", id: form.dataset.id, ...data }, false))
        concernDetail(form.dataset.id);
    }
  } catch (err) {
    const error = form.querySelector(".form-error");
    if (error) error.textContent = err.message;
    else toast(err.message, true);
  } finally {
    if (submitBtn?.isConnected) submitBtn.disabled = false;
  }
});
document.addEventListener("change", (e) => {
  if (e.target.name === "careTemplate" && e.target.value) {
    const t = state().templates.find((t) => t.id === e.target.value);
    const source =
      t.items ||
      state().plans.find((p) => petById(state(), p.petId).scene === t.scene)
        ?.items;
    if (source)
      dialog.querySelector("#plan-items").innerHTML = source
        .map((i, n) => editorItem({ ...i, id: uid("instruction") }, n))
        .join("");
    dialog.querySelector("[name=scene]").value = t.scene;
  }
  if (e.target.id === "family-pet") {
    sessionStorage.setItem("qiyu.pet", e.target.value);
    familyActor = "";
    go("family", route().page, e.target.value);
  }
  if (e.target.id === "pet-filter") {
    petFilter = e.target.value;
    render();
  }
  if (e.target.name === "effectiveMode") {
    const field = dialog.querySelector("#effective-field");
    field.hidden = e.target.value !== "scheduled";
    field.querySelector("input").required = e.target.value === "scheduled";
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "global-query")
    dialog.querySelector("#search-results").innerHTML = searchResults(
      e.target.value,
    );
  if (e.target.id === "list-search") {
    const pos = e.target.selectionStart;
    search = e.target.value;
    render();
    const input = document.querySelector("#list-search");
    input.focus();
    input.setSelectionRange(pos, pos);
  }
});
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    )
      closeDialog();
  }
});
dialog.addEventListener("cancel", () => {
  modalSubmit = null;
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  else {
    const main = document.querySelector("main");
    main?.setAttribute("tabindex", "-1");
    main?.focus({ preventScroll: true });
  }
});
window.addEventListener("hashchange", () => {
  closeDialog();
  filter = "all";
  search = "";
  petFilter = "all";
  document.querySelector(".mobile-scrim")?.remove();
  render();
  window.scrollTo(0, 0);
});
window.addEventListener("qiyu:update", (e) => {
  render();
  if (e.detail?.external && dialog.open) {
    const form = dialog.querySelector("form");
    if (form) {
      let note = dialog.querySelector(".external-update");
      if (!note) {
        note = document.createElement("div");
        note.className = "notice amber external-update";
        note.textContent = "此服务有新的协作记录，提交前请核对当前状态。";
        form.prepend(note);
      }
    }
  }
});
setInterval(() => {
  if (
    !dialog.open &&
    !document.querySelector("input:focus,textarea:focus,select:focus")
  )
    render();
}, 60000);
document.addEventListener("keydown", (e) => {
  if (
    e.target.matches(".tab") &&
    ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
  ) {
    e.preventDefault();
    const tabs = [...e.target.closest(".tabs").querySelectorAll(".tab")];
    const i = tabs.indexOf(e.target);
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? tabs.length - 1
          : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    const id = tabs[next].dataset.id;
    tabs[next].click();
    document.querySelector(`.tab[data-id="${id}"]`)?.focus();
    return;
  }
  if (
    (e.metaKey || e.ctrlKey) &&
    e.key.toLowerCase() === "k" &&
    route().role !== "home"
  ) {
    e.preventDefault();
    searchModal();
  }
});
if (!location.hash) location.replace(href("home", "dashboard"));
render();
