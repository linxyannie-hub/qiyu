import { chromium } from "playwright";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { day } from "../assets/domain.mjs";
const base = "http://127.0.0.1:4182/";
const server = spawn(process.execPath, ["scripts/serve.mjs"], {
  env: { ...process.env, PORT: "4182" },
  stdio: "pipe",
});
let browser;
try {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  const goto = async (route) => {
    await page.goto(base + "#/" + route);
    await page.waitForSelector("main");
  };
  const fresh = async (route) => {
    await goto(route);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  };
  const saved = () =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem("qiyu.care.workspace")),
    );
  const click = async (action, id = "") => {
    const selector = `[data-action="${action}"]${id ? `[data-id="${id}"]` : ""}`;
    const inside = page.locator(`#dialog[open] ${selector}`);
    if (await inside.count()) await inside.first().click();
    else await page.locator(selector).first().click();
  };
  const submit = async () => {
    await page.locator("#dialog [type=submit]").click();
    await page.waitForFunction(() => !document.querySelector("#dialog").open);
  };
  const close = async () => click("close-dialog");
  const routes = [
    "home/dashboard",
    "clinic/dashboard",
    "clinic/queue",
    "clinic/pets",
    "clinic/case/pet-1",
    "clinic/case/pet-4",
    "clinic/plans",
    "clinic/appointments",
    "clinic/reports",
    "clinic/settings",
    "clinic/support",
    "doctor/dashboard",
    "doctor/clinical",
    "doctor/approvals",
    "doctor/pets",
    "doctor/case/pet-4",
    "ops/dashboard",
    "ops/institutions",
    "ops/templates",
    "ops/billing",
    "ops/support",
    "family/today/pet-1",
    "family/plan/pet-1",
    "family/messages/pet-1",
    "family/review/pet-1",
    "family/me/pet-1",
    "family/today/pet-4",
    "family/review/pet-4",
  ];
  const workspacePages = {
    home: new Set(["dashboard"]),
    clinic: new Set([
      "dashboard",
      "queue",
      "pets",
      "case",
      "plans",
      "appointments",
      "reports",
      "settings",
      "support",
    ]),
    doctor: new Set(["dashboard", "clinical", "approvals", "pets", "case"]),
    ops: new Set([
      "dashboard",
      "institutions",
      "templates",
      "billing",
      "support",
    ]),
    family: new Set(["today", "plan", "messages", "me", "review"]),
  };
  const actions = new Set(
    [
      ...(await readFile("assets/app.mjs", "utf8")).matchAll(
        /case ["']([^"']+)["']:/g,
      ),
    ].map((m) => m[1]),
  );
  let inspected = 0,
    clicked = 0;
  for (const width of [1440, 768, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of routes) {
      await goto(route);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `页面溢出 ${route} ${width}`,
      );
      assert.equal(
        /演示|demo|\bv\d/i.test(await page.locator("main").innerText()),
        false,
        route,
      );
      for (const action of await page
        .locator("[data-action]")
        .evaluateAll((els) => els.map((e) => e.dataset.action)))
        assert.ok(actions.has(action), "缺失事件处理 " + action);
      for (const target of await page
        .locator('a[href^="#/"]')
        .evaluateAll((links) =>
          links.map((link) => link.getAttribute("href")),
        )) {
        const [targetRole, targetPage] = target.slice(2).split("/");
        assert.ok(
          workspacePages[targetRole]?.has(targetPage),
          `无效页面入口 ${route}: ${target}`,
        );
      }
      inspected++;
      if (route.startsWith("family/")) {
        const bounds = await page.locator(".phone-screen").boundingBox();
        assert.ok(
          bounds.width <= 400 || width <= 600,
          `用户端没有保持手机宽度 ${bounds.width}`,
        );
        assert.equal(await page.locator(".mobile-bottom").isVisible(), true);
      }
    }
  }
  // Check each distinct first-level control in its actual workspace, including dialogs.
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const route of routes) {
    await page.emulateMedia({
      reducedMotion: route.startsWith("home/") ? "reduce" : "no-preference",
    });
    await fresh(route);
    const controls = await page
      .locator("main [data-action]")
      .evaluateAll((els) =>
        els
          .filter((e) => e.getBoundingClientRect().width)
          .map((e) => ({ action: e.dataset.action, id: e.dataset.id || "" })),
      );
    const seen = new Set();
    for (const c of controls) {
      if (c.action === "queue-filter" || seen.has(c.action)) continue;
      seen.add(c.action);
      await fresh(route);
      await click(c.action, c.id);
      await page.waitForTimeout(30);
      if (c.action === "home-mood") {
        assert.equal(await page.locator(".mood-row button.on").count(), 1);
        assert.ok((await page.locator("#mood-say").innerText()).length > 0);
        clicked++;
        continue;
      }
      assert.equal(
        await page.locator("#toast.error.visible").count(),
        0,
        `操作报错 ${route} ${c.action}`,
      );
      assert.ok(
        (await page.locator("dialog[open]").count()) ||
          (await page.locator("#toast.visible").count()) ||
          !page.url().endsWith("#/" + route),
        `点击无响应 ${route} ${c.action}`,
      );
      if (await page.locator("dialog[open]").count()) await close();
      clicked++;
    }
  }
  // View-record must not silently become a second execution report.
  await fresh("family/today/pet-1");
  await click("task");
  assert.equal(await page.locator("#dialog [name=result]").count(), 0);
  await click("task-concern");
  assert.ok((await page.locator("#dialog").innerText()).includes("关联照护"));
  await page.locator("#dialog [name=title]").fill("针对本次护理求助");
  await page.locator("#dialog [name=body]").fill("请核对执行情况");
  await submit();
  assert.equal((await saved()).concerns[0].taskId, "task-pet-1-0");
  // Doctor reply, family acknowledgment, resolution, reopen, and doctor-queue continuity.
  await fresh("doctor/clinical");
  await click("concern-detail", "concern-1");
  await page.locator("#dialog [name=text]").fill("已核对本轮情况");
  await page.locator("#dialog [name=nextAction]").fill("联系本院安排复查");
  await page.locator("#dialog [type=submit]").click();
  await close();
  await goto("family/messages/pet-1");
  await click("concern-detail", "concern-1");
  await click("ack-action");
  assert.equal((await saved()).concerns[0].status, "action");
  await click("resolve");
  await page
    .locator("#dialog [name=reason]")
    .fill("已联系本院，复查时间已确认");
  await submit();
  await click("concern-detail", "concern-1");
  await click("reopen");
  await goto("doctor/clinical");
  assert.equal(
    await page
      .locator("[data-action=concern-detail][data-id=concern-1]")
      .count(),
    1,
  );
  // A reschedule is pending until the hospital confirms; existing medical plans stay intact.
  await fresh("family/me/pet-1");
  const oldPlans = JSON.stringify((await saved()).plans);
  await click("reschedule", "appt-1");
  await page.locator("#dialog [name=date]").fill(day(5));
  await page.locator("#dialog [name=time]").fill("15:30");
  await page.locator("#dialog [name=note]").fill("调整到下午");
  await submit();
  let s = await saved(),
    changed = s.appointments.at(-1);
  assert.equal(s.appointments[0].status, "confirmed");
  await goto("clinic/appointments");
  await click("confirm-appointment", changed.id);
  await submit();
  s = await saved();
  assert.equal(s.appointments[0].status, "cancelled");
  assert.equal(s.appointments.at(-1).status, "confirmed");
  assert.equal(JSON.stringify(s.plans), oldPlans);
  // Template return, correction, re-submission, physician approval and use in a new plan.
  await fresh("ops/templates");
  await click("new-template");
  await page.locator("#dialog [name=name]").fill("细致照护模板");
  await submit();
  s = await saved();
  const template = s.templates.at(-1);
  await goto("doctor/approvals");
  await click("review-template", template.id);
  await click("return-template");
  await page.locator("#dialog [name=reason]").fill("需要补充实际操作说明");
  await submit();
  await goto("ops/templates");
  await click("edit-template", template.id);
  await page
    .locator("#dialog [name=item-detail]")
    .fill("依据正式指导单核对照护对象，记录实际执行结果");
  await submit();
  await goto("doctor/approvals");
  await click("review-template", template.id);
  await page.locator("#dialog [type=checkbox]").check();
  await submit();
  await goto("clinic/dashboard");
  await click("new-plan");
  await page.locator("#dialog [name=careTemplate]").selectOption(template.id);
  assert.ok(
    (await page.locator("#dialog [name=item-detail]").inputValue()).includes(
      "核对照护对象",
    ),
  );
  await close();
  // Original source attachment survives a draft-only save and can be downloaded after publication.
  await fresh("clinic/dashboard");
  await click("new-plan");
  await page.locator("#dialog [name=name]").fill("豆豆");
  await page.locator("#dialog [name=owner]").fill("许女士");
  await page.locator("#dialog [name=sourceFile]").setInputFiles({
    name: "出院材料.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n原始指导材料\n%%EOF"),
  });
  await submit();
  s = await saved();
  const newPet = s.pets.at(-1),
    newPlan = s.plans.at(-1);
  assert.equal(newPlan.sourceDocument.name, "出院材料.pdf");
  await click("edit-plan", newPlan.id);
  await page.locator("#dialog [name=note]").fill("已核对原始材料");
  await click("save-plan-draft", newPlan.id);
  assert.equal((await saved()).plans.at(-1).status, "draft");
  await click("edit-plan", newPlan.id);
  await submit();
  await goto("doctor/approvals");
  await click("approve", newPlan.id);
  await page.locator("#dialog [type=checkbox]").check();
  await submit();
  await goto("clinic/case/" + newPet.id);
  await click("source", newPlan.id);
  const download = page.waitForEvent("download");
  await click("download-source", newPlan.id);
  assert.equal((await download).suggestedFilename(), "出院材料.pdf");
  await close();
  // Refund and renewal have actual terminal states in operations.
  await fresh("ops/billing");
  await click("payment");
  await page.locator("#dialog [name=reference]").fill("到账0001");
  await page.locator("#dialog [type=checkbox]").check();
  await submit();
  await click("refund-activation", "act-1");
  await page.locator("#dialog [name=reason]").fill("核对后退款");
  await page.locator("#dialog [name=reference]").fill("退款0001");
  await submit();
  s = await saved();
  assert.equal(s.refunds[0].amount, 8);
  assert.ok((await page.locator("main").innerText()).includes("已退款"));
  await goto("clinic/settings");
  await click("renewal");
  await submit();
  await goto("ops/support");
  await click("complete-renewal");
  await page
    .locator("#dialog [name=note]")
    .fill("继续按例结算，保留既有服务设置");
  await submit();
  await goto("clinic/settings");
  assert.ok((await page.locator("main").innerText()).includes("续订已完成"));
  // New-round creation preserves the ended round and links the existing profile.
  await fresh("clinic/case/pet-3");
  await click("complete-appointment", "appt-2");
  await page
    .locator("#dialog [name=note]")
    .fill("已核对实际到院，本轮复查资料已交付家庭");
  await page
    .locator("#dialog [name=nextAction]")
    .fill("院方确认本轮随访可以结束，后续需要协助时联系本院");
  await submit();
  await click("end", "pet-3");
  await page.locator("#dialog [name=reason]").fill("完成本轮，后续另行交付");
  await submit();
  await goto("family/today/pet-3");
  assert.equal(await page.locator(".task-card").count(), 0);
  await goto("clinic/case/pet-3");
  await click("new-round", "pet-3");
  assert.equal(await page.locator("#dialog [name=name]").inputValue(), "可乐");
  await submit();
  s = await saved();
  assert.equal(s.pets.at(-1).previousServiceId, "pet-3");
  assert.equal(s.pets.find((p) => p.id === "pet-3").status, "ended");
  // A difficulty travels through the original hospital and ends with review delivery.
  await fresh("family/messages/pet-3");
  await click("new-concern", "pet-3");
  await page
    .locator("#dialog [name=title]")
    .fill("家庭操作遇到困难，需要院方核对");
  await page
    .locator("#dialog [name=body]")
    .fill("家人交接后，不确定活动安排是否做到，希望原医院核对。");
  await page.locator("#dialog [name=difficulty]").selectOption("不会操作");
  await submit();
  const loopConcern = (await saved()).concerns[0];
  await goto("clinic/queue");
  await click("concern-detail", loopConcern.id);
  await click("claim", loopConcern.id);
  assert.equal((await saved()).concerns[0].status, "accepted");
  await click("escalate", loopConcern.id);
  assert.equal((await saved()).concerns[0].status, "clinical");
  await close();
  await goto("doctor/clinical");
  await click("concern-detail", loopConcern.id);
  assert.match(await page.locator("#dialog").innerText(), /不会操作/);
  await page
    .locator("#dialog [name=text]")
    .fill("已核对家庭报告与本院正式安排，院方会在复查时继续交付操作说明。");
  await page
    .locator("#dialog [name=nextAction]")
    .fill("按已确认的本院复查时间到院，由随访负责人交接复查资料。");
  await page.locator("#dialog [type=submit]").click();
  assert.equal((await saved()).concerns[0].status, "answered");
  await close();
  await goto("family/messages/pet-3");
  await click("concern-detail", loopConcern.id);
  assert.equal(
    await page.locator('#dialog [data-action="resolve"]').count(),
    0,
  );
  await click("ack-action", loopConcern.id);
  await click("resolve", loopConcern.id);
  await page
    .locator("#dialog [name=reason]")
    .fill("已与本院负责人核对复查到院及资料交接安排。");
  await submit();
  assert.equal((await saved()).concerns[0].status, "resolved");
  await goto("clinic/case/pet-3");
  await click("complete-appointment", "appt-2");
  await page
    .locator("#dialog [name=note]")
    .fill("已到院复查，家庭操作说明和本轮资料已交付。");
  await page
    .locator("#dialog [name=nextAction]")
    .fill("院方确认本轮随访结束，后续需要协助时联系本院。");
  await submit();
  await goto("family/review/pet-3");
  assert.match(
    await page.locator("main").innerText(),
    /家庭操作说明和本轮资料已交付/,
  );
  await goto("clinic/case/pet-3");
  await click("end", "pet-3");
  await page.locator("#dialog [name=endType]").selectOption("完成本轮随访");
  await page
    .locator("#dialog [name=reason]")
    .fill("已完成本轮复查与资料交付，后续需要协助时联系本院。");
  await submit();
  await goto("family/review/pet-3");
  assert.match(
    await page.locator("main").innerText(),
    /已完成本轮复查与资料交付/,
  );
  assert.equal(await page.locator('[data-action="appointment"]').count(), 0);
  assert.equal(
    (await saved()).activations.filter(
      (activation) => activation.petId === "pet-3",
    ).length,
    1,
  );
  const deliveredDownload = page.waitForEvent("download");
  await click("export-pet", "pet-3");
  const deliveredHtml = await readFile(
    await (await deliveredDownload).path(),
    "utf8",
  );
  assert.match(deliveredHtml, /家庭操作说明和本轮资料已交付/);
  assert.match(deliveredHtml, /已完成本轮复查与资料交付/);
  for (const endedRoute of [
    "family/plan/pet-3",
    "family/messages/pet-3",
    "doctor/case/pet-3",
  ]) {
    await goto(endedRoute);
    for (const forbiddenAction of [
      "revise",
      "new-concern",
      "reopen",
      "approve",
      "end",
    ])
      assert.equal(
        await page.locator(`[data-action="${forbiddenAction}"]`).count(),
        0,
        `${endedRoute}: ${forbiddenAction}`,
      );
  }
  // Institution eligibility, named owners and onboarding persist across operations pages.
  await fresh("ops/institutions");
  await click("new-institution");
  for (const [name, value] of Object.entries({
    name: "澄明动物医院",
    city: "上海",
    contact: "赵院长",
    followupContact: "苏禾",
    clinicalLead: "沈嘉",
    serviceHours: "09:00—20:00",
    reviewPath: "本院复查，由随访负责人确认到院与资料交接",
  }))
    await page.locator(`#dialog [name="${name}"]`).fill(value);
  await page.locator("#dialog [type=submit]").click();
  assert.match(
    await page.locator("#dialog .form-error").innerText(),
    /适用术后范围/,
  );
  await page.locator('#dialog [name="surgeryScope"][value="眼科术后"]').check();
  await submit();
  const eligibleClinic = (await saved()).institutions.at(-1);
  assert.deepEqual(eligibleClinic.surgeryScopes, ["眼科术后"]);
  assert.equal(eligibleClinic.status, "onboarding");
  await click("activate-institution", eligibleClinic.id);
  for (const checkbox of await page
    .locator('#dialog input[type="checkbox"]')
    .all())
    await checkbox.check();
  await submit();
  assert.equal((await saved()).institutions.at(-1).status, "active");
  await click("institution-detail", eligibleClinic.id);
  assert.match(await page.locator("#dialog").innerText(), /苏禾/);
  await click("edit-institution", eligibleClinic.id);
  await page.locator('#dialog [name="serviceHours"]').fill("10:00—19:00");
  await submit();
  assert.equal((await saved()).institutions.at(-1).serviceHours, "10:00—19:00");
  // Changing identity within a phone screen preserves scroll and hides owner-only actions.
  await fresh("family/me/pet-1");
  await click("switch-member", "周先生");
  assert.equal(await page.locator("[data-action=invite]").count(), 0);
  assert.equal(await page.locator("[data-action=revoke]").count(), 0);
  await page.evaluate(
    () => (document.querySelector(".family-content").scrollTop = 500),
  );
  const before = await page
    .locator(".family-content")
    .evaluate((el) => el.scrollTop);
  await click("family-more");
  await close();
  assert.equal(
    await page.locator(".family-content").evaluate((el) => el.scrollTop),
    before,
  );
  // Current facts retain independent reports and use the latest correction for each report.
  await fresh("family/me/pet-1");
  await click("switch-member", "周先生");
  await goto("family/today/pet-1");
  await click("task", "task-pet-1-0");
  await click("correct", "event-first");
  await page.locator("#dialog [name=result]").selectOption("missed");
  await page.locator("#dialog [name=note]").fill("重新核对后确认本次未执行");
  await submit();
  assert.ok(
    (await page.locator(".task-card").first().innerText()).includes(
      "本次未执行",
    ),
  );
  await goto("family/me/pet-1");
  await click("switch-member", "周女士");
  await goto("family/today/pet-1");
  await click("task", "task-pet-1-0");
  await click("add-task-record", "task-pet-1-0");
  await page.locator("#dialog [name=result][value=done]").check();
  await page.locator("#dialog [name=difficulty]").selectOption("动物抗拒");
  await submit();
  const cardText = await page.locator(".task-card").first().innerText();
  assert.ok(cardText.includes("2份独立报告"));
  assert.ok(cardText.includes("本次未执行"));
  assert.ok(cardText.includes("已按安排执行"));
  assert.equal(
    await page
      .locator(".task-card")
      .first()
      .evaluate((el) => el.classList.contains("done")),
    false,
  );
  await goto("doctor/clinical");
  await click("concern-detail", "concern-1");
  assert.equal(await page.locator("#dialog .effective-report-row").count(), 2);
  await close();
  // The difficulty type accompanies the issue and its responsible handoff.
  await fresh("family/messages/pet-1");
  await click("new-concern");
  await page.locator("#dialog [name=title]").fill("实际操作遇到困难");
  await page
    .locator("#dialog [name=body]")
    .fill("护理时动物抗拒，想确认下一步。");
  await page.locator("#dialog [name=difficulty]").selectOption("动物抗拒");
  await submit();
  let difficultyConcern = (await saved()).concerns[0];
  assert.equal(difficultyConcern.difficulty, "动物抗拒");
  await goto("clinic/queue");
  await click("concern-detail", difficultyConcern.id);
  assert.ok(
    (await page.locator("#dialog").innerText()).includes("家庭报告的困难"),
  );
  await close();
  // Header actions respond on every workspace, including when already on the support page.
  for (const route of ["clinic/dashboard", "doctor/dashboard", "ops/support"]) {
    await fresh(route);
    await click("search");
    await page
      .locator("#global-query")
      .fill(route.startsWith("ops") ? "禾伴" : "团团");
    assert.ok(
      (await page.locator("#search-results .search-result").count()) > 0,
    );
    await close();
    await click("notifications");
    assert.equal(await page.locator("dialog[open]").count(), 1);
    await close();
  }
  // A scheduled arrangement can be reviewed and withdrawn without changing the current one.
  await fresh("doctor/case/pet-1");
  await click("revise", "pet-1");
  await page.locator("#dialog [name=reason]").fill("明日调整护理安排");
  await page.locator("#dialog [name=effectiveMode]").selectOption("scheduled");
  const scheduled = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(Date.now() + 86400000))
    .replace(" ", "T");
  await page.locator("#dialog [name=effectiveTime]").fill(scheduled);
  await page.locator("#dialog input[type=checkbox]").check();
  await submit();
  let upcoming = (await saved()).plans.at(-1);
  await click("withdraw-plan", upcoming.id);
  await page.locator("#dialog [name=reason]").fill("重新核对后续安排");
  await submit();
  assert.equal((await saved()).plans.at(-1).status, "withdrawn");
  await goto("family/plan/pet-1");
  await click("view-plan", upcoming.id);
  assert.ok(
    (await page.locator("#dialog").innerText()).includes(
      "这份安排已撤销，不再生效",
    ),
  );
  await close();
  // Phone-screen layout also fits a short landscape viewport.
  await page.setViewportSize({ width: 812, height: 390 });
  await goto("family/today/pet-1");
  const frame = await page.locator(".phone-frame").boundingBox();
  assert.ok(frame.height <= 390);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    `PASS: ${inspected} 个页面与尺寸检查、${clicked} 个首层交互，以及任务求助、问题重开、改约、模板重提、材料上传、退款、续订与新一轮服务流程`,
  );
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
