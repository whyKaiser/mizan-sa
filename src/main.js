import "./styles.css";
import * as D from "./domain.js";
import * as U from "./ui.js";
import {
  client,
  requireClient,
  redirectURL,
  safeRead,
  listProjects,
  saveProject,
  deleteProject,
  guestProjects,
  message,
} from "./data.js";
const $ = (s) => document.querySelector(s),
  root = $("#app");
let user = null,
  guest = false,
  projects = [],
  selected = null,
  draft = null,
  view = "home",
  auth = "welcome",
  costKind = "fixed",
  journalTab = "add",
  statementTab = "balance",
  type = "print",
  archive = null,
  busy = false,
  epoch = 0,
  loadError = "",
  currentDialog = null;
let prefs = safeRead(localStorage, "mizan-preferences-v2", {
  name: "زائر",
  theme: "light",
  digits: "arabic",
  notifications: true,
});
let notices = safeRead(sessionStorage, "mizan-notices-v2", []);
const routes = new Set([
  "home",
  "projects",
  "types",
  "info",
  "costs",
  "revenue",
  "results",
  "breakEven",
  "whatif",
  "simulator",
  "reports",
  "report",
  "statements",
  "settings",
]);
const current = () => draft || projects.find((p) => p.id === selected);
const userName = () =>
  user?.user_metadata?.full_name || prefs.name || "صاحب المشروع";
const selectionKey = () => `mizan-selection:${user?.id || "guest"}`;
function applyPreferences() {
  document.documentElement.dataset.theme = prefs.theme;
  U.setDigits(prefs.digits);
  localStorage.setItem("mizan-preferences-v2", JSON.stringify(prefs));
}
function announce(text, error = false) {
  const toast = $("#toast");
  toast.textContent = text;
  toast.className = `toast ${error ? "error" : ""}`;
  clearTimeout(announce.timer);
  announce.timer = setTimeout(() => toast.classList.add("hidden"), 4500);
}
function notify(text) {
  if (!prefs.notifications) return;
  notices.unshift({ text, time: new Date().toISOString() });
  notices = notices.slice(0, 30);
  sessionStorage.setItem("mizan-notices-v2", JSON.stringify(notices));
}
function fail(error) {
  const text = message(error);
  const target =
    currentDialog?.querySelector(".form-message") ||
    $(".form-message") ||
    $("#global-error");
  if (target) {
    target.textContent = text;
    target.classList.add("error");
  }
  announce(text, true);
}
function saved() {
  return user ? "محفوظ في الحساب" : "حفظ على هذا المتصفح";
}
async function persist(p, quiet = false) {
  const copy = structuredClone(p);
  D.calculate(copy);
  const balances = D.ledger(copy).accounts;
  if (balances.cash < 0)
    throw new Error(
      "رأس المال المعدل لا يكفي للعمليات المسجلة. راجع الرصيد الافتتاحي.",
    );
  const result = await saveProject(copy, user);
  const i = projects.findIndex((x) => x.id === result.id);
  if (i < 0) projects.unshift(result);
  else projects[i] = result;
  selected = result.id;
  sessionStorage.setItem(selectionKey(), selected);
  draft = null;
  if (!quiet) {
    notify(`تم حفظ مشروع ${result.name}`);
    announce("تم حفظ المشروع");
  }
  return result;
}
async function load() {
  const n = ++epoch;
  loadError = "";
  root.innerHTML =
    '<div class="loading"><div class="spinner"></div>جارٍ تحميل مشاريعك…</div>';
  try {
    const result = await listProjects(user);
    if (n !== epoch) return;
    projects = result;
    const previous = sessionStorage.getItem(selectionKey());
    selected =
      projects.find((p) => p.id === previous)?.id || projects[0]?.id || null;
    draft = null;
    render();
  } catch (error) {
    if (n !== epoch) return;
    loadError = message(error);
    render();
  }
}
function render() {
  if (!user && !guest) {
    root.innerHTML = U.authScreen(auth);
    return;
  }
  let p = current(),
    content = "";
  if (loadError)
    content = `${U.title("تعذر تحميل المشاريع")}<section class="panel"><p>${U.e(loadError)}</p>${U.button("إعادة المحاولة", "refresh")}</section>`;
  else if (view === "home") content = U.home(projects, userName(), p);
  else if (view === "projects")
    content = `${U.title("مشاريعي", "أفكارك ودراساتك المالية في مكان واحد.")}<div class="section-title"><h2>${U.fmt(projects.length, 0)} مشروع</h2>${U.button(`${U.icon("plus")}مشروع جديد`, "nav:types")}</div>${projects.length ? `<div class="project-grid">${projects.map(U.projectCard).join("")}</div>` : U.empty("ابدأ مشروعك الأول", "أدخل فكرة مشروعك لتعرف تكلفتها وربحها.")}`;
  else if (view === "types") content = U.typeScreen(type);
  else if (view === "settings")
    content = U.settingsScreen(userName(), prefs, !user);
  else if (!p)
    content = U.empty(
      "اختر مشروعًا أولًا",
      "أنشئ مشروعك أو افتح مشروعًا محفوظًا.",
    );
  else if (view === "info") content = U.infoScreen(p);
  else if (view === "costs") content = U.costsScreen(p, costKind);
  else if (view === "revenue") content = U.revenueScreen(p);
  else if (view === "results") content = U.resultsScreen(p);
  else if (view === "breakEven") content = U.breakEvenScreen(p);
  else if (view === "whatif") content = U.whatIfScreen(p);
  else if (view === "simulator") content = U.simulatorScreen(p, journalTab);
  else if (view === "statements") content = U.statements(p, statementTab);
  else if (view === "reports")
    content = `${U.title("التقارير", "خطط مشروعك وتابع حساباته.")}<div class="action-grid">${U.button(`${U.icon("receipt")}التقرير المالي`, "nav:report")}${U.button("القوائم المالية", "nav:statements", "secondary")}</div><section class="panel saved-reports"><h2>التقارير المحفوظة</h2>${
      (p.reports || []).length
        ? p.reports
            .slice()
            .reverse()
            .map(
              (r) =>
                `<div class="saved-report"><div><strong>${U.e(r.project.name)}</strong><small>${r.createdAt.slice(0, 10)}</small></div>${U.button("فتح", `report-open:${r.id}`, "secondary")}</div>`,
            )
            .join("")
        : '<p class="inline-empty">افتح التقرير المالي ثم احفظ نسخة للاحتفاظ بالأرقام في هذا التاريخ.</p>'
    }</section>`;
  else if (view === "report")
    content = `${U.title(archive ? "نسخة محفوظة من التقرير" : "التقرير المالي", archive ? archive.createdAt.slice(0, 10) : "ملخص التخطيط والعمليات المسجلة.", "nav:reports")}<div class="report-tools">${U.button(`${U.icon("download")}تحميل PDF`, "download-report")}${U.button("طباعة / حفظ PDF", "print", "secondary")}${archive ? "" : U.button("حفظ نسخة من التقرير", "report-save", "secondary")}</div>${U.reportBody(archive?.project || p, archive?.createdAt)}`;
  root.innerHTML = U.shell(
    `<div id="global-error" class="form-message" role="alert"></div>${content}`,
    view,
    userName(),
    p?.id,
    saved(),
    notices.length,
  );
  const select = $("#project-switch");
  if (select)
    select.innerHTML = projects
      .map(
        (p) =>
          `<option value="${p.id}" ${p.id === selected ? "selected" : ""}>${U.e(p.name)}</option>`,
      )
      .join("");
}
async function flush() {
  const form = $('form[data-form="info"],form[data-form="revenue"]');
  if (!form) return;
  if (!form.reportValidity())
    throw new Error("أكمل بيانات المشروع قبل المتابعة.");
  const f = Object.fromEntries(new FormData(form)),
    p = structuredClone(current());
  if (form.dataset.form === "info") {
    p.name = D.text(f.name, "اسم المشروع");
    p.capital = D.number(f.capital, "رأس المال");
    p.type = f.type;
    p.description = String(f.description).trim().slice(0, 600);
  } else {
    p.product = D.text(f.product, "اسم المنتج");
    p.price = D.number(f.price, "سعر البيع");
    p.units = D.number(f.units, "عدد الوحدات", { integer: true, max: 1e7 });
  }
  if (JSON.stringify(p) !== JSON.stringify(current()) || !p.revision)
    await persist(p, true);
}
async function go(next, skip = false) {
  if (!routes.has(next)) next = "home";
  if (!skip) await flush();
  if (next === "types") {
    draft = null;
    type = "print";
  }
  if (next !== "report") archive = null;
  view = next;
  history.replaceState(null, "", `#${next}`);
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
  $("#main")?.focus({ preventScroll: true });
}
function dialog(title, body) {
  const d = $("#dialog");
  d.innerHTML = `<header><h2>${title}</h2>${U.button("×", "close", "icon-button", 'aria-label="إغلاق"')}</header>${body}<div class="form-message" role="alert"></div>`;
  currentDialog = d;
  d.showModal();
  return d;
}
function closeDialog() {
  currentDialog?.close();
  currentDialog = null;
}
function costDialog(id) {
  const c = current().costs.find((x) => x.id === id) || {
    id: "",
    name: "",
    amount: "",
    kind: costKind,
  };
  dialog(
    c.id ? "تعديل تكلفة" : "إضافة تكلفة",
    `<form data-form="cost" data-id="${c.id}">${U.field("اسم التكلفة", "name", c.name, "text", 'required maxlength="120"')}${U.amountField(c.kind === "fixed" ? "المبلغ الشهري (ريال)" : "تكلفة الوحدة (ريال)", "amount", c.amount)}<input type="hidden" name="kind" value="${c.kind}"><button type="submit" class="btn full">حفظ التكلفة</button></form>`,
  );
}
function operationDialog(kind) {
  const op = D.OPERATIONS[kind];
  dialog(
    op.name,
    `<form data-form="operation" data-kind="${kind}">${U.amountField("المبلغ (ريال)", "amount", "", 'min="0.01"')}${U.field("التاريخ", "date", new Date().toLocaleDateString("en-CA"), "date", "required")}${kind === "sell-cash" ? U.amountField("تكلفة البضاعة المباعة (اختياري، ريال)", "cost", 0) : ""}${U.field("وصف العملية (اختياري)", "note", "", "text", 'maxlength="400" placeholder="مثال: إيجار شهر سبتمبر"')}<div class="hint">${op.description}</div><div id="entry-preview"></div><button type="submit" class="btn full">تسجيل العملية</button></form>`,
  );
}
async function action(name, button) {
  const [a, b] = name.split(":");
  if (a === "nav") return go(b);
  if (a === "close") return closeDialog();
  if (a === "auth") {
    auth = b;
    history.replaceState(null, "", `#${b}`);
    render();
    return;
  }
  if (a === "password") {
    const input = button.closest(".password-wrap").querySelector("input");
    input.type = input.type === "password" ? "text" : "password";
    button.setAttribute(
      "aria-label",
      input.type === "password" ? "إظهار كلمة المرور" : "إخفاء كلمة المرور",
    );
    return;
  }
  if (a === "guest") {
    guest = true;
    user = null;
    sessionStorage.setItem("mizan-guest-session", "yes");
    view = "home";
    await load();
    return;
  }
  if (a === "type") {
    type = b;
    render();
    return;
  }
  if (a === "new") {
    draft = D.project(type);
    return go("info", true);
  }
  if (a === "cancel-draft") {
    dialog(
      "إلغاء المسودة",
      `<p>المسودة الجديدة غير محفوظة. هل تريد تجاهلها والعودة إلى مشاريعك؟</p><footer>${U.button("متابعة التحرير", "close", "secondary")}${U.button("تجاهل المسودة", "confirm-cancel-draft")}</footer>`,
    );
    return;
  }
  if (a === "confirm-cancel-draft") {
    draft = null;
    closeDialog();
    return go("projects", true);
  }
  if (a === "open") {
    await flush();
    selected = b;
    draft = null;
    sessionStorage.setItem(selectionKey(), b);
    return go("results", true);
  }
  if (a === "cost-tab") {
    costKind = b;
    render();
    return;
  }
  if (a === "cost-add") return costDialog();
  if (a === "cost-edit") return costDialog(b);
  if (a === "cost-delete") {
    const c = current().costs.find((c) => c.id === b);
    return dialog(
      "حذف تكلفة",
      `<p>هل تريد حذف «${U.e(c.name)}»؟</p><footer>${U.button("إلغاء", "close", "secondary")}${U.button("حذف", `confirm-cost:${b}`, "danger secondary")}</footer>`,
    );
  }
  if (a === "confirm-cost") {
    const p = structuredClone(current());
    p.costs = p.costs.filter((c) => c.id !== b);
    await persist(p);
    closeDialog();
    render();
    return;
  }
  if (a === "delete") {
    const p = projects.find((p) => p.id === b);
    return dialog(
      "حذف المشروع",
      `<p>هل أنت متأكد من حذف مشروع «${U.e(p.name)}»؟ ستُحذف عملياته وتقاريره المحفوظة معه.</p><footer>${U.button("إلغاء", "close", "secondary")}${U.button("حذف المشروع", `confirm-delete:${b}`, "danger secondary")}</footer>`,
    );
  }
  if (a === "confirm-delete") {
    const p = projects.find((p) => p.id === b);
    await deleteProject(p, user);
    projects = projects.filter((p) => p.id !== b);
    if (selected === b) {
      selected = projects[0]?.id || null;
      draft = null;
    }
    closeDialog();
    announce("تم حذف المشروع");
    notify("تم حذف المشروع المحدد");
    render();
    return;
  }
  if (a === "operation") return operationDialog(b);
  if (a === "journal-tab") {
    journalTab = b;
    render();
    return;
  }
  if (a === "journal") {
    const j = current().journal.find((j) => j.id === b);
    dialog(
      "تفاصيل العملية",
      `<h3>${U.e(j.label)}</h3>${U.row("التاريخ", U.e(j.date))}${U.row("المبلغ", U.money(j.amount))}${U.journalLines(j.lines)}<p class="hint">${U.e(j.description)}</p>${j.note ? `<p>${U.e(j.note)}</p>` : ""}${U.button("إغلاق", "close", "full")}`,
    );
    return;
  }
  if (a === "statement") {
    statementTab = b;
    return go("statements");
  }
  if (a === "report-save") {
    const p = structuredClone(current());
    const snapshot = structuredClone(p);
    snapshot.reports = [];
    p.reports = p.reports || [];
    if (p.reports.length >= 30)
      throw new Error(
        "وصلت إلى حد 30 تقريرًا محفوظًا للمشروع. يمكنك طباعة التقرير الحالي.",
      );
    p.reports.push({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      project: snapshot,
    });
    await persist(p, true);
    announce("تم حفظ نسخة التقرير بتاريخ اليوم");
    notify("تم حفظ تقرير مالي");
    render();
    return;
  }
  if (a === "report-open") {
    archive = current().reports.find((r) => r.id === b);
    return go("report");
  }
  if (a === "download-report") {
    announce("جارٍ تجهيز ملف PDF…");
    const { downloadReport } = await import("./report-pdf.js");
    await downloadReport(archive?.project || current(), archive?.createdAt);
    announce("تم تجهيز ملف PDF للتحميل");
    return;
  }
  if (a === "print") {
    await document.fonts.ready;
    window.print();
    return;
  }
  if (a === "profile") {
    dialog(
      "الملف الشخصي",
      `<form data-form="profile">${U.field("الاسم الكامل", "name", userName(), "text", 'required maxlength="80"')}${user ? U.field("البريد الإلكتروني", "email", user.email, "email", "disabled") : '<p class="hint">أنت في وضع الزائر. تسجيل الدخول يحفظ المشاريع في حساب مستقل.</p>'}<button type="submit" class="btn full">حفظ</button></form>${!user ? U.button("تسجيل الدخول / إنشاء حساب", "end-guest", "text-button full") : ""}${guestProjects().length && user ? U.button("نقل مشاريع الزائر إلى حسابي", "import-guest", "secondary full") : ""}${localStorage.getItem("mizan-platform-v1") && !localStorage.getItem("mizan-legacy-imported") ? U.button("استعادة مشاريع النسخة السابقة", "import-legacy", "secondary full") : ""}`,
    );
    return;
  }
  if (a === "end-guest") {
    closeDialog();
    guest = false;
    sessionStorage.removeItem("mizan-guest-session");
    auth = "login";
    render();
    return;
  }
  if (a === "import-guest") {
    const candidates = guestProjects();
    dialog(
      "نقل مشاريع الزائر",
      `<p>سيتم نسخ ${U.fmt(candidates.length, 0)} مشروع من هذا المتصفح إلى حسابك الحالي لتفتحها من أجهزتك الأخرى.</p><footer>${U.button("إلغاء", "close", "secondary")}${U.button("نسخ إلى حسابي", "confirm-import")}</footer>`,
    );
    return;
  }
  if (a === "confirm-import") {
    for (const p of guestProjects()) {
      const copy = structuredClone(p);
      copy.id = crypto.randomUUID();
      copy.revision = 0;
      await persist(copy, true);
    }
    closeDialog();
    announce("تم نسخ المشاريع إلى حسابك");
    render();
    return;
  }
  if (a === "import-legacy") {
    const migrated = D.migrateLegacy(
      safeRead(localStorage, "mizan-platform-v1", {}),
    );
    dialog(
      "استعادة المشاريع السابقة",
      `<p>يمكن استعادة ${U.fmt(migrated.length, 0)} مشروع. ${user ? "ستُنسخ إلى حسابك الحالي." : "ستبقى محفوظة على هذا المتصفح."} تبقى النسخة القديمة دون حذف.</p><footer>${U.button("إلغاء", "close", "secondary")}${U.button("استعادة", "confirm-legacy")}</footer>`,
    );
    return;
  }
  if (a === "confirm-legacy") {
    for (const p of D.migrateLegacy(
      safeRead(localStorage, "mizan-platform-v1", {}),
    ))
      await persist(p, true);
    localStorage.setItem("mizan-legacy-imported", "yes");
    closeDialog();
    announce("تمت استعادة المشاريع");
    render();
    return;
  }
  if (a === "notifications") {
    dialog(
      "الإشعارات",
      notices.length
        ? notices
            .map(
              (n) =>
                `<div class="notification-item"><p>${U.e(n.text)}</p><small>${new Date(n.time).toLocaleString(U.locale)}</small></div>`,
            )
            .join("")
        : "<p>لا توجد إشعارات جديدة. تظهر هنا تأكيدات الحفظ والعمليات أثناء الجلسة.</p>",
    );
    return;
  }
  if (a === "notification-settings") {
    dialog(
      "إعدادات الإشعارات",
      `<form data-form="notifications"><label class="check-label"><input type="checkbox" name="enabled" ${prefs.notifications ? "checked" : ""}>إظهار تأكيدات الحفظ والعمليات داخل المنصة</label><p class="hint">تظهر أثناء استخدام ميزان؛ لا ترسل رسائل خارج المنصة.</p><button class="btn full">حفظ</button></form>`,
    );
    return;
  }
  if (a === "language") {
    dialog(
      "اللغة",
      `<form data-form="language"><p>لغة المنصة العربية.</p><label class="field"><span>شكل الأرقام</span><select name="digits"><option value="arabic" ${prefs.digits === "arabic" ? "selected" : ""}>عربية: ١٢٣٤</option><option value="latin" ${prefs.digits === "latin" ? "selected" : ""}>لاتينية: 1234</option></select></label><button class="btn full">حفظ</button></form>`,
    );
    return;
  }
  if (a === "theme") {
    dialog(
      "مظهر المنصة",
      `<form data-form="theme"><label class="field"><span>المظهر</span><select name="theme"><option value="light" ${prefs.theme === "light" ? "selected" : ""}>فاتح</option><option value="dark" ${prefs.theme === "dark" ? "selected" : ""}>داكن</option></select></label><button class="btn full">حفظ</button></form>`,
    );
    return;
  }
  if (a === "about") {
    dialog(
      "عن ميزان",
      `${U.logo()}<h3 class="section-title">محاسبتك.. تبدأ من فكرة</h3><p>منصة عربية تعليمية لتخطيط المشاريع وتحليل التكاليف والأرباح ومحاكاة القيود والقوائم المالية.</p><p class="hint">الإصدار 2.0 • العملة: الريال السعودي</p><p>ميزان.. أكثر من مجرد حسابات.<br>لأن كل مشروع ناجح يبدأ بحسابات صحيحة.</p>`,
    );
    return;
  }
  if (a === "help") {
    dialog(
      "المساعدة والدعم",
      `<div class="help-list"><details open><summary>كيف أبدأ مشروعًا؟</summary><p>اختر «إنشاء مشروع جديد»، حدد النوع وأدخل الاسم ورأس المال، ثم تكاليفك الشهرية وتكلفة الوحدة وسعر البيع والمبيعات.</p></details><details><summary>ما الفرق بين الثابت والمتغير؟</summary><p>الثابت مثل الإيجار، والمتغير يتكرر مع كل وحدة. إجمالي المتغير = تكلفة الوحدة × عدد الوحدات. أدخل تكلفة المعدات مرة واحدة ضمن تقدير فترة التأسيس إن أردت، ولا تكررها شهريًا دون قصد.</p></details><details><summary>كيف يحسب هامش الربح والتعادل؟</summary><p>الهامش = صافي الربح ÷ الإيرادات × 100. التعادل = الثابت ÷ (السعر − تكلفة الوحدة)، مع تقريب الوحدات للأعلى. إذا كان سعر البيع لا يغطي التكلفة لا توجد نقطة تعادل قابلة للتحقق.</p></details><details><summary>كيف أحفظ ملف PDF؟</summary><p>افتح التقرير ثم «طباعة / حفظ PDF»، واختر «حفظ بصيغة PDF» من نافذة جهازك. أوقف ترويسات المتصفح عند الحاجة.</p></details><details><summary>هل المخطط المالي هو المحاكي؟</summary><p>التخطيط تقديرات شهرية. المحاكي يسجل عمليات مستقلة، ويبدأ برأس المال كرصيد نقدي افتتاحي. أدخل تكلفة البضاعة مع البيع لتظهر في قائمة الدخل وينخفض المخزون.</p></details><details><summary>أين تحفظ مشاريعي؟</summary><p>${user ? "في حسابك، ويمكن فتحها بعد تسجيل الدخول من جهاز آخر. تأكد من نجاح الحفظ قبل الإغلاق." : "مشاريع الزائر على هذا المتصفح فقط. يمكنك نقلها إلى حسابك من الملف الشخصي بعد تسجيل الدخول."}</p></details><details><summary>تعذر الحفظ أو تسجيل الدخول</summary><p>تحقق من اتصال الإنترنت، وفعّل البريد من الرسالة. لاستعادة كلمة المرور استخدم «نسيت كلمة المرور؟». عند تعارض تعديل من جهازين، حدّث المشروع قبل تعديله مجددًا.</p></details></div>`,
    );
    return;
  }
  if (a === "logout") {
    await flush();
    if (user) {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw error;
    }
    user = null;
    guest = false;
    projects = [];
    selected = null;
    draft = null;
    epoch++;
    notices = [];
    sessionStorage.removeItem("mizan-notices-v2");
    sessionStorage.removeItem("mizan-guest-session");
    auth = "welcome";
    render();
    return;
  }
  if (a === "refresh") return load();
}
async function submit(form) {
  const f = Object.fromEntries(new FormData(form)),
    kind = form.dataset.form;
  if (kind === "login") {
    const { data, error } = await requireClient().auth.signInWithPassword({
      email: f.email.trim(),
      password: f.password,
    });
    if (error) throw error;
    if (!data.user || !data.session) throw new Error("لم يكتمل تسجيل الدخول.");
    user = data.user;
    guest = false;
    sessionStorage.removeItem("mizan-guest-session");
    view = "home";
    await load();
    return;
  }
  if (kind === "signup") {
    if (f.password !== f.confirm)
      throw new Error("كلمتا المرور غير متطابقتين.");
    if (!/[A-Za-z\u0600-\u06ff]/.test(f.password) || !/[0-9]/.test(f.password))
      throw new Error("استخدم أحرفًا وأرقامًا في كلمة المرور.");
    const { data, error } = await requireClient().auth.signUp({
      email: f.email.trim(),
      password: f.password,
      options: {
        data: { full_name: D.text(f.name, "الاسم", 80) },
        emailRedirectTo: redirectURL(),
      },
    });
    if (error) throw error;
    if (data.session) {
      user = data.user;
      guest = false;
      view = "home";
      await load();
    } else {
      auth = "login";
      root.innerHTML = U.authScreen(
        auth,
        "إذا كان البريد صالحًا للتسجيل، ستصلك رسالة تفعيل. افتحها ثم سجّل الدخول.",
      );
    }
    return;
  }
  if (kind === "forgot") {
    const { error } = await requireClient().auth.resetPasswordForEmail(
      f.email.trim(),
      { redirectTo: redirectURL() },
    );
    if (error) throw error;
    root.innerHTML = U.authScreen(
      "forgot",
      "إذا كان البريد مرتبطًا بحساب، ستصلك رسالة استعادة كلمة المرور.",
    );
    return;
  }
  if (kind === "reset") {
    if (f.password !== f.confirm)
      throw new Error("كلمتا المرور غير متطابقتين.");
    const { error } = await requireClient().auth.updateUser({
      password: f.password,
    });
    if (error) throw error;
    announce("تم تحديث كلمة المرور");
    const { data } = await client.auth.getUser();
    user = data.user;
    auth = "welcome";
    view = "home";
    await load();
    return;
  }
  if (kind === "info") {
    await flush();
    announce("تم حفظ معلومات المشروع");
    return go("costs", true);
  }
  if (kind === "revenue") {
    await flush();
    announce("تم حفظ الإيرادات");
    return go("results", true);
  }
  if (kind === "cost") {
    const p = structuredClone(current()),
      c = {
        id: form.dataset.id || crypto.randomUUID(),
        name: D.text(f.name, "اسم التكلفة"),
        amount: D.number(f.amount, "التكلفة"),
        kind: f.kind,
      };
    const index = p.costs.findIndex((x) => x.id === c.id);
    if (index >= 0) p.costs[index] = c;
    else p.costs.push(c);
    await persist(p, true);
    closeDialog();
    announce("تم حفظ التكلفة");
    render();
    return;
  }
  if (kind === "whatif") {
    $("#whatif-live").innerHTML = U.whatIfStats(
      current(),
      D.number(f.price, "السعر"),
      D.number(f.units, "الوحدات", { integer: true, max: 1e7 }),
    );
    return;
  }
  if (kind === "operation") {
    const p = structuredClone(current());
    p.journal.push(
      D.transaction(
        p,
        form.dataset.kind,
        f.amount,
        f.date,
        f.note,
        f.cost || 0,
      ),
    );
    await persist(p, true);
    closeDialog();
    journalTab = "list";
    announce("تم تسجيل العملية والقيد");
    notify("تم تسجيل عملية محاسبية");
    render();
    return;
  }
  if (kind === "profile") {
    const name = D.text(f.name, "الاسم", 80);
    if (user) {
      const { data, error } = await client.auth.updateUser({
        data: { full_name: name },
      });
      if (error) throw error;
      user = data.user;
    } else prefs.name = name;
    applyPreferences();
    closeDialog();
    announce("تم حفظ الملف الشخصي");
    render();
    return;
  }
  if (kind === "theme") {
    prefs.theme = f.theme;
    applyPreferences();
    closeDialog();
    render();
    return;
  }
  if (kind === "language") {
    prefs.digits = f.digits;
    applyPreferences();
    closeDialog();
    render();
    return;
  }
  if (kind === "notifications") {
    prefs.notifications = f.enabled === "on";
    applyPreferences();
    closeDialog();
    render();
    return;
  }
}
async function run(task, trigger) {
  if (busy) return;
  busy = true;
  trigger?.setAttribute("disabled", "");
  try {
    await task();
  } catch (error) {
    fail(error);
  } finally {
    busy = false;
    trigger?.removeAttribute("disabled");
  }
}
document.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-action]");
  if (!b) return;
  ev.preventDefault();
  run(() => action(b.dataset.action, b), b);
});
document.addEventListener("submit", (ev) => {
  const f = ev.target;
  if (!f.dataset.form) return;
  ev.preventDefault();
  if (f.reportValidity())
    run(() => submit(f), f.querySelector("[type=submit],button:not([type])"));
});
document.addEventListener("input", (ev) => {
  const form = ev.target.closest("form");
  if (!form) return;
  const f = Object.fromEntries(new FormData(form));
  try {
    if (form.dataset.form === "revenue")
      $("#revenue-live").innerHTML = U.money(
        D.calculate(current(), {
          price: D.number(f.price),
          units: D.number(f.units, "الوحدات", { integer: true, max: 1e7 }),
        }).revenue,
      );
    if (form.dataset.form === "whatif")
      $("#whatif-live").innerHTML = U.whatIfStats(
        current(),
        D.number(f.price),
        D.number(f.units, "الوحدات", { integer: true, max: 1e7 }),
      );
    if (form.dataset.form === "operation") {
      const op = D.OPERATIONS[form.dataset.kind],
        amount = D.number(f.amount);
      $("#entry-preview").innerHTML =
        amount > 0
          ? U.journalLines([
              { account: op.debit, debit: amount, credit: 0 },
              { account: op.credit, debit: 0, credit: amount },
            ])
          : "";
    }
  } catch {
    if (form.dataset.form === "whatif")
      $("#whatif-live").innerHTML =
        '<p class="hint negative">أدخل سعرًا غير سالب وعدد وحدات صحيحًا.</p>';
    if (form.dataset.form === "revenue") $("#revenue-live").textContent = "—";
  }
});
document.addEventListener("change", (ev) => {
  if (ev.target.id === "project-switch")
    run(async () => {
      selected = ev.target.value;
      draft = null;
      archive = null;
      sessionStorage.setItem(selectionKey(), selected);
      render();
    });
});
$("#dialog").addEventListener("close", () => {
  currentDialog = null;
});
window.addEventListener("hashchange", () => {
  const target = location.hash.slice(1);
  if (routes.has(target) && (user || guest)) run(() => go(target));
});
window.addEventListener("beforeunload", (ev) => {
  const form = $('form[data-form="info"],form[data-form="revenue"]');
  if (!form) return;
  const f = Object.fromEntries(new FormData(form)),
    p = current();
  const dirty = Object.entries(f).some(([k, v]) => String(p?.[k] ?? "") !== v);
  if (dirty) {
    ev.preventDefault();
    ev.returnValue = "";
  }
});
async function start() {
  applyPreferences();
  const splash = $("#splash");
  if (client) {
    client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        queueMicrotask(() => {
          user = null;
          guest = false;
          auth = "reset";
          root.innerHTML = U.authScreen(auth);
        });
      } else if (event === "SIGNED_OUT" && user) {
        queueMicrotask(() => {
          user = null;
          guest = false;
          projects = [];
          draft = null;
          auth = "login";
          render();
        });
      }
    });
    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (data.session) {
        const verified = await client.auth.getUser();
        if (verified.error) throw verified.error;
        user = verified.data.user;
      }
    } catch (error) {
      announce(message(error), true);
    }
  }
  if (auth !== "reset") {
    guest = !user && sessionStorage.getItem("mizan-guest-session") === "yes";
    const route = location.hash.slice(1);
    if (user || guest) {
      view = routes.has(route) ? route : "home";
      await load();
    } else {
      auth = ["login", "signup", "forgot"].includes(route) ? route : "welcome";
      render();
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 450));
  splash.remove();
}
start().catch((error) => {
  root.innerHTML = U.authScreen(
    "welcome",
    "تعذر تحميل الجلسة. أعد تحميل الصفحة.",
  );
  $("#splash")?.remove();
  fail(error);
});
