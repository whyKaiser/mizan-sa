import { TYPES, ACCOUNTS, OPERATIONS, calculate, ledger } from "./domain.js";
import { backend } from "./config.js";
export const e = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  scale:
    "M12 5v16M7 21h10M3 8l9-3 9 3M4 8l-3 7h6zm16 0-3 7h6zM1 15c0 4 6 4 6 0m10 0c0 4 6 4 6 0",
  home: "m3 10 9-7 9 7v11h-6v-7H9v7H3z",
  folder: "M3 5h7l2 3h9v12H3z",
  chart: "M4 21v-7h4v7m2 0V9h4v12m2 0V4h4v17M3 9l5-5 4 2 7-4",
  receipt: "M5 3h14v19l-3-2-4 2-4-2-3 2zM8 7h8M8 11h8M8 15h4",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  plus: "M12 5v14M5 12h14",
  back: "m10 5 7 7-7 7",
  printer: "M7 8V3h10v5M5 17H3V8h18v9h-2M7 14h10v8H7zM17 11h1",
  cup: "M4 8h13v8a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 9h2a3 3 0 1 1 0 6h-2M7 3v2m4-2v2m4-2v2",
  cake: "M3 12h18v9H3zM7 12V7h10v5M11 7V4h2v3M3 16c3-3 3 3 6 0s3 3 6 0 3 3 6 0",
  shirt: "m8 3-6 4 3 5 3-2v12h8V10l3 2 3-5-6-4c-1 4-7 4-8 0",
  cart: "M2 3h3l3 13h11l3-9H6M9 21h.01M18 21h.01",
  bag: "M4 7h16v15H4zM8 7V5a4 4 0 0 1 8 0v2",
  wallet: "M3 6h18v15H3zM3 6V3h16v3M16 12h5v5h-5z",
  check: "m5 12 4 4L20 5",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 22v-3a8 8 0 0 1 16 0v3z",
  bell: "M5 17h14l-2-4V8a5 5 0 0 0-10 0v5zM10 21h4",
  globe:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18",
  sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M20 4l-2 2M6 18l-2 2",
  help: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5m0 4h.01",
  info: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 10v7m0-11v1",
  logout: "M10 3H3v18h7m4-14 5 5-5 5m-6-5h13",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 16h12l1-16M10 10v8m4-8v8",
  edit: "m4 16 12-12 4 4L8 20l-5 1zM14 6l4 4",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  lock: "M6 10h12v12H6zM8 10V6a4 4 0 0 1 8 0v4M12 14v4",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  refresh: "M20 6v6h-6M4 18v-6h6M5 8a8 8 0 0 1 14-2M19 16a8 8 0 0 1-14 2",
};
export const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.folder}"/></svg>`;
export const logo = (large = false) =>
  `<div class="brand ${large ? "brand-large" : ""}"><span class="brand-icon">${icon("scale")}</span><span><strong>ميزان</strong>${large ? "" : "<small>محاسبتك.. تبدأ من فكرة</small>"}</span></div>`;
export let locale = "ar-SA";
export const setDigits = (v) => {
  locale = v === "latin" ? "en-US" : "ar-SA";
};
export const fmt = (n, digits = 2) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(
    n === 0 ? 0 : n,
  );
export const money = (n) => `${fmt(n)} <small>ريال</small>`;
export const be = (c) =>
  c.breakEven === null
    ? "غير ممكن حاليًا"
    : `${fmt(c.breakEven, 0)} <small>وحدة</small>`;
export const button = (label, action, variant = "", attrs = "") =>
  `<button type="button" class="btn ${variant}" data-action="${action}" ${attrs}>${label}</button>`;
export const title = (text, subtitle = "", back = "") =>
  `<header class="page-heading">${back ? button(icon("back"), back, "icon-button", `aria-label="رجوع"`) : ""}<div><h1>${text}</h1>${subtitle ? `<p>${subtitle}</p>` : ""}</div></header>`;
export const field = (label, name, value = "", type = "text", extra = "") =>
  `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${e(value)}" ${extra}></label>`;
export const amountField = (label, name, value, extra = "") =>
  field(
    label,
    name,
    value,
    "number",
    `min="0" max="1000000000" step="0.01" inputmode="decimal" required ${extra}`,
  );
export const passwordField = (label, name = "password", confirm = false) =>
  `<label class="field"><span>${label}</span><span class="password-wrap"><input name="${name}" type="password" autocomplete="${confirm ? "new-password" : "current-password"}" minlength="8" maxlength="128" required>${button(icon("eye"), "password", "icon-button", `aria-label="إظهار ${label}"`)}</span></label>`;
export const stat = (label, value, cls = "") =>
  `<article class="stat ${cls}"><span>${label}</span><strong>${value}</strong></article>`;
export function authScreen(mode, notice = "") {
  const head = mode === "welcome" ? logo(true) : logo();
  let body = "";
  if (mode === "welcome")
    body = `<h1 class="welcome-name">ميزان</h1><p class="motto">محاسبتك.. تبدأ من فكرة</p><hr><p class="brand-values">تخطيط • تحليل • محاكاة • نجاح</p><h2>مرحبًا بك في ميزان</h2><p>ابدأ رحلتك نحو مشروع أكثر وعيًا ماليًا.</p><div class="stack">${button("ابدأ الآن", "auth:login")}${button("إنشاء حساب جديد", "auth:signup", "secondary")}${button("الاستمرار كزائر", "guest", "text-button")}</div>`;
  else if (mode === "login")
    body = `<h1>مرحبًا بعودتك</h1><p>سجّل دخولك لمتابعة مشاريعك.</p><form data-form="login">${field("البريد الإلكتروني", "email", "", "email", 'required autocomplete="email" maxlength="254"')}${passwordField("كلمة المرور")}<button class="btn" type="submit">تسجيل الدخول</button></form>${button("نسيت كلمة المرور؟", "auth:forgot", "text-button")}<div class="divider">أو</div>${button("إنشاء حساب جديد", "auth:signup", "secondary")}`;
  else if (mode === "signup")
    body = `<h1>إنشاء حساب جديد</h1><p>${backend.emailConfirmation ? "أنشئ حسابك ثم فعّله من بريدك." : "إيميل وكلمة مرور فقط، بدون رسالة تأكيد."}</p><form data-form="signup">${field("الاسم الكامل", "name", "", "text", 'required autocomplete="name" maxlength="80"')}${field("البريد الإلكتروني", "email", "", "email", 'required autocomplete="email" maxlength="254"')}${passwordField("كلمة المرور", "password", true)}${passwordField("تأكيد كلمة المرور", "confirm", true)}<small>8 أحرف على الأقل، تتضمن أحرفًا إنجليزية وأرقامًا.</small>${!backend.emailRecovery ? '<p class="hint">استخدم بريدك أنت، واحفظ كلمة المرور؛ استعادتها بالبريد غير متاحة في هذه النسخة. هذه منصة تعليمية، فلا تدخل بيانات حساسة.</p>' : ""}<button class="btn" type="submit">إنشاء الحساب</button></form>${button("لديك حساب بالفعل؟ تسجيل الدخول", "auth:login", "text-button")}`;
  else if (mode === "forgot")
    body = backend.emailRecovery
      ? `<h1>استعادة كلمة المرور</h1><p>أدخل بريدك لإرسال رابط تعيين كلمة مرور جديدة.</p><form data-form="forgot">${field("البريد الإلكتروني", "email", "", "email", 'required autocomplete="email"')}<button class="btn" type="submit">إرسال رابط الاستعادة</button></form>${button("رجوع لتسجيل الدخول", "auth:login", "text-button")}`
      : `<h1>نسيت كلمة المرور؟</h1><p>استعادة كلمة المرور بالبريد غير متاحة في هذه النسخة التعليمية.</p><p>إذا كنت تتذكر كلمة المرور، سجّل الدخول ثم افتح الإعدادات، الملف الشخصي، تغيير كلمة المرور.</p><p class="hint">إذا فقدتها، فلا يمكن فتح مشاريع الحساب بكلمة مرور جديدة من هذه الشاشة. لا تنشئ حسابًا ببريد شخص آخر.</p>${button("رجوع لتسجيل الدخول", "auth:login")}`;
  else
    body = `<h1>كلمة مرور جديدة</h1><form data-form="reset">${passwordField("كلمة المرور الجديدة", "password", true)}${passwordField("تأكيد كلمة المرور", "confirm", true)}<button class="btn" type="submit">حفظ كلمة المرور</button></form>`;
  return `<main class="auth-layout"><aside class="brand-story">${logo(true)}<h2>كل مشروع ناجح<br>يبدأ بحسابات صحيحة.</h2><p>خطط فكرتك. افهم أرقامك. اتخذ قرارك.</p><div class="story-rule"></div><span>ميزان.. أكثر من مجرد حسابات.</span></aside><section class="auth-card">${mode !== "welcome" ? button(icon("back"), "auth:welcome", "icon-button auth-back", 'aria-label="رجوع للبداية"') : ""}${head}${!backend.authReady ? '<p class="hint">الحسابات السحابية قيد التهيئة. وضع الزائر متاح للحفظ على هذا المتصفح.</p>' : ""}${body}<div class="form-message" role="status">${e(notice)}</div>${mode === "welcome" ? '<p class="footnote">وضع الزائر يحفظ مشاريعك على هذا المتصفح فقط.</p>' : ""}</section></main>`;
}
export const navigation = [
  ["home", "الرئيسية", "home"],
  ["projects", "مشاريعي", "folder"],
  ["simulator", "المحاكاة", "chart"],
  ["reports", "التقارير", "receipt"],
  ["settings", "المزيد", "more"],
];
export function shell(content, view, name, selected, savedLabel, noticeCount) {
  const active = [
    "types",
    "info",
    "costs",
    "revenue",
    "results",
    "breakEven",
    "whatif",
  ].includes(view)
    ? "projects"
    : view === "report" || view === "statements"
      ? "reports"
      : view;
  return `<a class="skip" href="#main">تجاوز إلى المحتوى</a><div class="app-shell"><aside class="sidebar">${logo()}<nav aria-label="القائمة الرئيسية">${navigation.map(([id, label, ic]) => button(`${icon(ic)}<span>${label}</span>`, `nav:${id}`, active === id ? "active" : "", `aria-current="${active === id ? "page" : "false"}"`)).join("")}</nav><div class="sidebar-footer"><p>تخطيط • تحليل • محاكاة • نجاح</p><small>لأن كل مشروع ناجح يبدأ بحسابات صحيحة.</small></div></aside><div class="workspace"><header class="topbar"><a href="#home" class="mobile-brand" data-action="nav:home">${logo()}</a><span class="desktop-greeting">أهلًا، ${e(name)}</span><div class="topbar-actions"><span class="save-label" id="save-label" role="status">${savedLabel}</span>${button(icon("bell") + (noticeCount ? '<i class="unread"></i>' : ""), "notifications", "icon-button", 'aria-label="الإشعارات"')}${button(icon("user"), "profile", "icon-button", 'aria-label="الملف الشخصي"')}</div></header><main id="main" tabindex="-1">${selected && ["simulator", "reports", "report", "statements"].includes(view) ? `<label class="project-switch">المشروع<select id="project-switch" aria-label="المشروع الحالي"></select></label>` : ""}${content}</main></div><nav class="bottom-nav" aria-label="التنقل السفلي">${navigation.map(([id, label, ic]) => button(`${icon(ic)}<span>${label}</span>`, `nav:${id}`, active === id ? "active" : "", `aria-current="${active === id ? "page" : "false"}"`)).join("")}</nav></div>`;
}
export const empty = (
  head,
  copy,
  action = "nav:types",
  label = "إنشاء مشروع جديد",
) =>
  `<section class="empty panel">${icon("folder")}<h2>${head}</h2><p>${copy}</p>${button(`${icon("plus")}${label}`, action)}</section>`;
export function projectCard(p) {
  const c = calculate(p),
    t = TYPES.find((t) => t[0] === p.type) || TYPES[5];
  return `<article class="project-card panel"><div class="project-card-heading"><span class="project-icon">${icon(t[2])}</span><div><h3>${e(p.name)}</h3><small>${t[1]}</small></div><span class="tag ${c.profit >= 0 ? "" : "warning"}">${p.product ? "قيد الدراسة" : "مسودة"}</span></div><div class="project-profit"><span>صافي الربح المتوقع</span><strong class="${c.profit < 0 ? "negative" : "positive"}">${money(c.profit)}</strong></div><div class="card-actions">${button("عرض المشروع", `open:${p.id}`, "secondary")}${button(icon("trash"), `delete:${p.id}`, "icon-button danger", `aria-label="حذف مشروع ${e(p.name)}"`)}</div></article>`;
}
export function home(projects, name, p) {
  return `${title(`مرحبًا، ${e(name)}`, "ابدأ مشروعك بخطوة صحيحة وحسابات واضحة.")}<section class="new-project-banner"><div><span class="eyebrow">من الفكرة إلى الأرقام</span><h2>ابدأ مشروعك الآن</h2><p>اعرف تكاليفك وربحك ونقطة التعادل.</p>${button(`${icon("plus")}إنشاء مشروع جديد`, "nav:types", "cream")}</div><span class="banner-scale">${icon("scale")}</span></section><div class="section-title"><h2>مشاريعي</h2>${projects.length ? button("عرض الكل", "nav:projects", "text-button") : ""}</div>${projects.length ? `<div class="project-grid">${projects.slice(0, 3).map(projectCard).join("")}</div>` : empty("مشروعك الأول يبدأ هنا", "أضف فكرتك ثم اكتشف أرقامها.")} ${
    p
      ? `<h2 class="section-title">اختصارات ${e(p.name)}</h2><div class="shortcut-grid">${[
          ["costs", "التكاليف", "wallet"],
          ["revenue", "الإيرادات", "receipt"],
          ["results", "النتائج", "chart"],
          ["report", "التقرير", "download"],
        ]
          .map(([v, l, i]) =>
            button(`${icon(i)}<span>${l}</span>`, `nav:${v}`, "shortcut"),
          )
          .join("")}</div>`
      : ""
  }<footer class="brand-footer">ميزان.. أكثر من مجرد حسابات.<small>لأن كل مشروع ناجح يبدأ بحسابات صحيحة.</small></footer>`;
}
export function wizard(view) {
  const steps = [
    ["info", "المشروع"],
    ["costs", "التكاليف"],
    ["revenue", "الإيرادات"],
    ["results", "النتائج"],
  ];
  return `<nav class="steps" aria-label="خطوات المشروع">${steps.map(([v, l], i) => button(`<span>${i + 1}</span>${l}`, `nav:${v}`, v === view ? "active" : "")).join("")}</nav>`;
}
export function typeScreen(selected) {
  return `${title("إنشاء مشروع جديد", "ما نوع مشروعك؟", "nav:home")}<section class="panel narrow"><div class="type-grid" role="group" aria-label="نوع المشروع">${TYPES.map(([v, l, i]) => button(`${icon(i)}<span>${l}</span>`, `type:${v}`, v === selected ? "selected" : "", `aria-pressed="${v === selected}"`)).join("")}</div>${button("التالي", "new:info", "full")}</section>`;
}
export function infoScreen(p) {
  return `${title("معلومات المشروع", "عرّف فكرتك وحدد رأس المال.", "nav:projects")}${wizard("info")}<form class="panel narrow" data-form="info"><div class="form-grid">${field("اسم المشروع", "name", p.name, "text", 'required maxlength="120" placeholder="مشروع طباعة صور"')}${amountField("رأس المال المتوفر (ريال)", "capital", p.capital)}<label class="field"><span>نوع المشروع</span><select name="type">${TYPES.map(([v, l]) => `<option value="${v}" ${p.type === v ? "selected" : ""}>${l}</option>`).join("")}</select></label><label class="field full"><span>وصف مختصر (اختياري)</span><textarea name="description" maxlength="600" rows="3" placeholder="صف فكرتك باختصار">${e(p.description)}</textarea></label></div>${p.journal.length ? '<p class="hint">تعديل رأس المال يحدث الرصيد الافتتاحي في المحاكي أيضًا.</p>' : ""}<button type="submit" class="btn full">حفظ ومتابعة</button>${p.revision ? "" : button("إلغاء المسودة غير المحفوظة", "cancel-draft", "text-button full")}</form>`;
}
export function costsScreen(p, kind) {
  const c = calculate(p),
    items = p.costs.filter((x) => x.kind === kind);
  return `${title("تكاليف المشروع", "أدخل الثابت شهريًا والمتغير لكل وحدة.", "nav:info")}${wizard("costs")}<section class="panel narrow"><div class="tabs" role="tablist" aria-label="نوع التكاليف">${button("التكاليف الثابتة", "cost-tab:fixed", kind === "fixed" ? "active" : "", `role="tab" aria-selected="${kind === "fixed"}"`)}${button("التكاليف المتغيرة", "cost-tab:variable", kind === "variable" ? "active" : "", `role="tab" aria-selected="${kind === "variable"}"`)}</div><h2>${kind === "fixed" ? "التكاليف الثابتة الشهرية" : "التكاليف المتغيرة للوحدة"}</h2><p class="hint">${kind === "fixed" ? "مثل الإيجار والرواتب والاشتراكات." : "مثل الورق والأحبار والتغليف. الإجمالي = تكلفة الوحدة × الوحدات."}</p><div class="cost-list">${items.map((x) => `<div class="cost-item"><span>${icon(kind === "fixed" ? "home" : "bag")}${e(x.name)}</span><strong>${money(x.amount)}</strong><div>${button(icon("edit"), `cost-edit:${x.id}`, "icon-button", `aria-label="تعديل ${e(x.name)}"`)}${button(icon("trash"), `cost-delete:${x.id}`, "icon-button danger", `aria-label="حذف ${e(x.name)}"`)}</div></div>`).join("") || '<p class="inline-empty">لم تضف تكاليف لهذا القسم بعد.</p>'}</div>${button(`${icon("plus")}إضافة تكلفة`, "cost-add", "secondary add-cost")}<div class="totals">${row("إجمالي التكاليف الثابتة", money(c.fixed))}${row("التكلفة المتغيرة للوحدة", money(c.variableUnit))}${row(`إجمالي المتغيرة (${fmt(p.units, 0)} وحدة)`, money(c.variable))}${row("إجمالي التكاليف", money(c.total), "total")}</div>${button("التالي", "nav:revenue", "full")}</section>`;
}
export const row = (label, value, cls = "") =>
  `<div class="detail-row ${cls}"><span>${label}</span><strong>${value}</strong></div>`;
export function revenueScreen(p) {
  return `${title("الإيرادات المتوقعة", "توقع المبيعات خلال شهر.", "nav:costs")}${wizard("revenue")}<form class="panel narrow" data-form="revenue">${field("اسم المنتج", "product", p.product, "text", 'required maxlength="120" placeholder="صورة مطبوعة"')}<div class="form-grid">${amountField("سعر بيع الوحدة (ريال)", "price", p.price)}${field("عدد الوحدات المتوقع بيعها شهريًا", "units", p.units, "number", 'required min="0" max="10000000" step="1" inputmode="numeric"')}</div><div class="highlight-total"><span>الإيرادات المتوقعة شهريًا</span><strong id="revenue-live">${money(calculate(p).revenue)}</strong></div><button type="submit" class="btn full">حساب النتائج</button></form>`;
}
export function bars(c) {
  const max = Math.max(c.revenue, c.total, 1);
  return `<figure class="chart" aria-label="الإيرادات ${c.revenue} ريال، التكاليف ${c.total} ريال"><div class="bar-group"><strong>${money(c.revenue)}</strong><div style="height:${Math.max(3, (140 * c.revenue) / max)}px" class="bar green"></div><span>الإيرادات</span></div><div class="bar-group"><strong>${money(c.total)}</strong><div style="height:${Math.max(3, (140 * c.total) / max)}px" class="bar sand"></div><span>التكاليف</span></div></figure>`;
}
export function resultsScreen(p) {
  const c = calculate(p);
  return `${title("النتائج المالية", e(p.name), "nav:revenue")}${wizard("results")}<div class="results-grid">${stat("إجمالي الإيرادات", money(c.revenue))}${stat("إجمالي التكاليف", money(c.total))}${stat("صافي الربح المتوقع", money(c.profit), `profit-span ${c.profit < 0 ? "loss" : "gain"}`)}${stat("هامش الربح", c.margin === null ? "غير معرّف" : fmt(c.margin, 1) + "٪")}${stat("نقطة التعادل", be(c))}</div><section class="panel chart-panel"><h2>مقارنة الإيرادات والتكاليف</h2>${bars(c)}</section><div class="action-grid">${button("نقطة التعادل", "nav:breakEven", "secondary")}${button("ماذا لو؟", "nav:whatif", "secondary")}${button("عرض التقرير المالي", "nav:report")}${button("المحاكي المحاسبي", "nav:simulator", "secondary")}</div>`;
}
export function breakEvenScreen(p) {
  const c = calculate(p),
    progress =
      c.breakEven === null
        ? 0
        : c.breakEven === 0
          ? 100
          : Math.min(100, (c.units / c.breakEven) * 100);
  return `${title("نقطة التعادل", "متى تغطي إيراداتك جميع التكاليف؟", "nav:results")}<section class="panel narrow"><div class="break-ring" style="--progress:${progress * 3.6}deg"><div><span>نقطة التعادل</span><strong>${c.breakEven === null ? "غير ممكنة" : fmt(c.breakEven, 0)}</strong><small>${c.breakEven === null ? "بهذه الأسعار" : "وحدة"}</small></div></div><p class="center">${c.breakEven === null ? "سعر البيع لا يغطي تكلفة الوحدة والتكاليف الثابتة. غيّر السعر أو خفّض التكلفة." : c.breakEven === 0 ? "لا تحتاج إلى مبيعات لتغطية تكاليف ثابتة؛ التكاليف الثابتة صفر." : `يجب بيع ${fmt(c.breakEven, 0)} وحدة على الأقل للوصول إلى نقطة التعادل.`}</p><div class="equation-box"><h3>معادلة نقطة التعادل</h3><p>التكاليف الثابتة ÷ (سعر البيع − التكلفة المتغيرة للوحدة)</p><div class="equation-numbers" dir="ltr">${fmt(c.fixed)} ÷ (${fmt(c.price)} − ${fmt(c.variableUnit)}) = ${c.breakEven === null ? "—" : fmt(c.breakEven, 0)}</div></div><div class="break-legend"><span class="negative">خسارة</span><span>نقطة التعادل</span><span class="positive">ربح</span></div>${button("التالي: ماذا لو؟", "nav:whatif", "full")}</section>`;
}
export function whatIfScreen(p, price = p.price, units = p.units) {
  return `${title("ماذا لو؟", "جرّب تغيير الأسعار أو المبيعات وشاهد تأثيرها على الربح.", "nav:results")}<form class="panel narrow" data-form="whatif"><div class="form-grid">${amountField("سعر البيع الجديد (ريال)", "price", price)}${field("عدد الوحدات الجديد", "units", units, "number", 'required min="0" max="10000000" step="1" inputmode="numeric"')}</div><button type="submit" class="btn full">احسب</button><div id="whatif-live">${whatIfStats(p, price, units)}</div><p class="hint">هذه تجربة فقط؛ أرقام مشروعك الأصلية محفوظة كما هي.</p></form>`;
}
export function whatIfStats(p, price, units) {
  const current = calculate(p),
    next = calculate(p, { price, units });
  return `<div class="whatif-stats">${stat("الربح الحالي", money(current.profit))}${stat("الربح بعد التغيير", money(next.profit), next.profit < 0 ? "loss" : "gain")}${stat("الفرق", (next.profit - current.profit >= 0 ? "+" : "") + money(next.profit - current.profit), next.profit - current.profit < 0 ? "loss" : "gain")}</div>`;
}
export function journalLines(lines) {
  return `<table class="journal-table"><thead><tr><th>الحساب</th><th>مدين</th><th>دائن</th></tr></thead><tbody>${lines.map((l) => `<tr><th>${e(ACCOUNTS[l.account])}</th><td>${l.debit ? money(l.debit) : "—"}</td><td>${l.credit ? money(l.credit) : "—"}</td></tr>`).join("")}</tbody></table>`;
}
export function simulatorScreen(p, tab) {
  const s = ledger(p);
  return `${title("المحاكي المحاسبي", "حوّل العمليات اليومية إلى قيود وتابع أثرها على الحسابات.")}<div class="tabs">${button("إضافة عملية", "journal-tab:add", tab === "add" ? "active" : "")}${button(`سجل العمليات (${fmt(p.journal.length, 0)})`, "journal-tab:list", tab === "list" ? "active" : "")}</div>${
    tab === "add"
      ? `<div class="operation-grid">${Object.entries(OPERATIONS)
          .map(([k, o]) =>
            button(
              `${icon(o.icon)}<span>${o.name}</span>${icon("back")}`,
              `operation:${k}`,
              "operation",
            ),
          )
          .join("")}</div>`
      : p.journal.length
        ? `<div class="journal-cards">${p.journal
            .slice()
            .reverse()
            .map(
              (j, index) =>
                `<article class="panel journal-card"><div class="section-title"><span>#${fmt(p.journal.length - index, 0)}</span><time>${e(j.date)}</time></div><h3>${e(j.label)}</h3>${journalLines(j.lines)}${button("تفاصيل العملية", `journal:${j.id}`, "text-button")}</article>`,
            )
            .join("")}</div>`
        : empty(
            "لا توجد عمليات بعد",
            "أضف أول عملية وشاهد القيد الناتج.",
            "journal-tab:add",
            "إضافة عملية",
          )
  }<section class="panel equation-summary"><h2>المعادلة المحاسبية</h2><div class="accounting-equation"><div><small>الأصول</small><strong>${money(s.assets)}</strong></div><b>=</b><div><small>الالتزامات</small><strong>${money(s.liabilities)}</strong></div><b>+</b><div><small>حقوق الملكية</small><strong>${money(s.equity)}</strong></div></div><p class="${s.difference === 0 ? "positive" : "negative"}">${icon(s.difference === 0 ? "check" : "info")}${s.difference === 0 ? "المعادلة متوازنة" : `فرق يحتاج مراجعة: ${fmt(s.difference)} ريال`}</p>${button("عرض القوائم المالية", "nav:statements", "secondary")}</section>`;
}
export function statements(p, tab = "balance") {
  const s = ledger(p),
    a = s.accounts;
  return `${title("القوائم المالية", "حسب العمليات المسجلة في المحاكي.", "nav:simulator")}<div class="tabs">${button("الميزانية العمومية", "statement:balance", tab === "balance" ? "active" : "")}${button("قائمة الدخل", "statement:income", tab === "income" ? "active" : "")}</div><section class="panel narrow">${statementBody(s, tab)}</section>`;
}
export function statementBody(s, tab) {
  const a = s.accounts;
  return tab === "income"
    ? `<h2>قائمة الدخل</h2>${row("الإيرادات", money(s.revenue))}${row("تكلفة البضاعة المباعة", money(a.cogs))}${row("المصروفات", money(a.expenses))}${row("صافي الدخل", money(s.income), s.income < 0 ? "total negative" : "total positive")}<p class="hint">تدرج تكلفة البضاعة المباعة عندما تُدخلها ضمن عمليات البيع.</p>`
    : `<h2>الميزانية العمومية</h2><h3 class="statement-group">الأصول</h3>${["cash", "inventory", "equipment", "receivables"].map((k) => row(ACCOUNTS[k], money(a[k]))).join("")}${row("إجمالي الأصول", money(s.assets), "total")}<h3 class="statement-group">الالتزامات</h3>${row("الدائنون", money(-a.payables))}${row("الالتزامات الأخرى", money(-a.otherLiabilities))}${row("إجمالي الالتزامات", money(s.liabilities), "total")}<h3 class="statement-group">حقوق الملكية</h3>${row("رأس المال", money(-a.capital))}${row("الأرباح / الخسائر المسجلة", money(s.income))}${row("يخصم: مسحوبات المالك", money(a.drawings))}${row("إجمالي حقوق الملكية", money(s.equity), "total")}${row("الالتزامات + حقوق الملكية", money(s.liabilities + s.equity), "total")}`;
}
export function reportBody(p, date = new Date().toISOString()) {
  const c = calculate(p),
    s = ledger(p);
  return `<article class="report-document panel"><header class="report-header">${logo()}<div><h1>التقرير المالي</h1><time>${e(date.slice(0, 10))}</time></div></header><h2>${e(p.name)}</h2><p>${TYPES.find((t) => t[0] === p.type)?.[1] || "مشروع آخر"}</p><h3>ملخص المشروع</h3><p>${e(p.description) || "دراسة تقديرية لأرقام المشروع والعمليات المسجلة."}</p><h3>التخطيط المالي الشهري</h3><div class="report-numbers">${row("رأس المال المتوفر", money(p.capital))}${row("المنتج", e(p.product) || "غير محدد")}${row("سعر الوحدة / الوحدات", `${money(p.price)} / ${fmt(p.units, 0)}`)}${row("إجمالي التكاليف الثابتة", money(c.fixed))}${row("إجمالي التكاليف المتغيرة", money(c.variable))}${row("إجمالي التكاليف", money(c.total))}${row("الإيرادات المتوقعة", money(c.revenue))}${row("صافي الربح المتوقع", money(c.profit), "total")}${row("هامش الربح", c.margin === null ? "غير معرّف" : fmt(c.margin, 1) + "٪")}${row("نقطة التعادل", be(c))}</div><div class="report-statements"><section>${statementBody(s, "income")}</section><section>${statementBody(s, "balance")}</section></div><footer>ميزان.. أكثر من مجرد حسابات.<small>تقديرات التخطيط مستقلة عن نتائج العمليات الفعلية المسجلة في المحاكي.</small></footer></article>`;
}
export function settingsScreen(name, prefs, guest) {
  return `${title("الإعدادات", "ملفك وتفضيلاتك.")}<section class="panel narrow settings-list">${[
    ["profile", "الملف الشخصي", "user", name],
    [
      "notification-settings",
      "إعدادات الإشعارات",
      "bell",
      prefs.notifications ? "مفعّلة داخل المنصة" : "متوقفة",
    ],
    ["language", "اللغة", "globe", "العربية"],
    ["theme", "مظهر المنصة", "sun", prefs.theme === "dark" ? "داكن" : "فاتح"],
    ["help", "المساعدة والدعم", "help", "دليل الاستخدام"],
    ["about", "عن ميزان", "info", "الإصدار 2.0"],
  ]
    .map(([a, l, i, v]) =>
      button(
        `${icon(i)}<span>${l}<small>${e(v)}</small></span>${icon("back")}`,
        a,
        "setting-row",
      ),
    )
    .join(
      "",
    )}${button(`${icon("logout")}${guest ? "إنهاء وضع الزائر" : "تسجيل الخروج"}`, "logout", "danger secondary full")}</section><p class="hint center">${guest ? "مشاريع الزائر محفوظة على هذا المتصفح فقط." : "مشاريعك محفوظة في حسابك، والتفضيلات على هذا الجهاز."}</p>`;
}
