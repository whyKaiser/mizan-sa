export const TYPES = [
  ["print", "مشروع طباعة", "printer"],
  ["coffee", "كوفي", "cup"],
  ["bakery", "حلويات منزلية", "cake"],
  ["clothes", "متجر ملابس", "shirt"],
  ["online", "متجر إلكتروني", "cart"],
  ["other", "مشروع آخر", "more"],
];
export const ACCOUNTS = {
  cash: "النقدية",
  inventory: "المخزون",
  equipment: "المعدات",
  receivables: "الحسابات المدينة",
  payables: "الدائنون",
  otherLiabilities: "التزامات أخرى",
  capital: "رأس المال",
  revenue: "الإيرادات",
  expenses: "المصروفات",
  cogs: "تكلفة البضاعة المباعة",
  drawings: "مسحوبات المالك",
};
export const OPERATIONS = {
  "buy-cash": {
    name: "شراء بضاعة نقدًا",
    debit: "inventory",
    credit: "cash",
    icon: "bag",
    description: "يزيد المخزون وتنخفض النقدية بالقيمة نفسها.",
  },
  "buy-credit": {
    name: "شراء بضاعة بالأجل",
    debit: "inventory",
    credit: "payables",
    icon: "bag",
    description: "يزيد المخزون ويزيد المبلغ المستحق للدائنين.",
  },
  "equipment-credit": {
    name: "شراء معدات بالأجل",
    debit: "equipment",
    credit: "payables",
    icon: "printer",
    description: "تزيد المعدات ويزيد المبلغ المستحق للدائنين.",
  },
  "sell-cash": {
    name: "بيع بضاعة نقدًا",
    debit: "cash",
    credit: "revenue",
    icon: "receipt",
    description:
      "تزيد النقدية وتثبت إيرادات البيع. عند إدخال تكلفة البضاعة، تنخفض قيمة المخزون وتثبت تكلفة البيع أيضًا.",
  },
  expense: {
    name: "دفع مصروف نقدي",
    debit: "expenses",
    credit: "cash",
    icon: "wallet",
    description: "يزيد المصروف وتنخفض النقدية، فينخفض صافي الدخل.",
  },
  "pay-creditor": {
    name: "سداد جزء من الدائنين",
    debit: "payables",
    credit: "cash",
    icon: "check",
    description: "ينخفض رصيد الدائنين وتنخفض النقدية بالمبلغ المسدد.",
  },
  capital: {
    name: "إضافة رأس مال",
    debit: "cash",
    credit: "capital",
    icon: "plus",
    description: "تزيد النقدية ويزيد رأس مال المالك، دون تسجيل إيراد.",
  },
  withdrawal: {
    name: "مسحوبات المالك",
    debit: "drawings",
    credit: "cash",
    icon: "wallet",
    description:
      "تزيد المسحوبات وتنخفض النقدية وحقوق الملكية، ولا تعد المسحوبات مصروفًا تشغيليًا.",
  },
};
export const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export function number(
  value,
  label = "المبلغ",
  { integer = false, positive = false, max = 1e9 } = {},
) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === "" ||
    !["string", "number"].includes(typeof value)
  )
    throw new Error(`أدخل ${label}.`);
  const n = Number(value);
  if (
    !Number.isFinite(n) ||
    n < 0 ||
    n > max ||
    (positive && n === 0) ||
    (integer && !Number.isInteger(n))
  )
    throw new Error(
      `${label}: أدخل ${integer ? "عددًا صحيحًا" : "رقمًا"} ${positive ? "أكبر من صفر" : "غير سالب"} ضمن الحد المسموح.`,
    );
  const result = integer ? n : round(n);
  if (positive && result === 0)
    throw new Error(`${label}: الحد الأدنى 0.01 ريال.`);
  return result;
}
export function text(value, label, max = 120) {
  const s = String(value ?? "").trim();
  if (!s || s.length > max)
    throw new Error(`${label} مطلوب، بحد أقصى ${max} حرفًا.`);
  return s;
}
export function project(type = "other") {
  return {
    id: crypto.randomUUID(),
    name: "",
    type,
    capital: 0,
    description: "",
    product: "",
    price: 0,
    units: 0,
    costs: [],
    journal: [],
    reports: [],
    createdAt: new Date().toISOString(),
    revision: 0,
  };
}
export function calculate(p, override = {}) {
  const price = number(override.price ?? p.price, "سعر البيع"),
    units = number(override.units ?? p.units, "عدد الوحدات", {
      integer: true,
      max: 1e7,
    });
  let fixedCents = 0,
    unitCents = 0;
  for (const c of p.costs) {
    const v = Math.round(number(c.amount, "التكلفة") * 100);
    if (c.kind === "fixed") fixedCents += v;
    else if (c.kind === "variable") unitCents += v;
    else throw new Error("نوع تكلفة غير صالح.");
  }
  const revenueCents = Math.round(price * 100) * units,
    variableCents = unitCents * units,
    totalCents = fixedCents + variableCents,
    profitCents = revenueCents - totalCents,
    contributionCents = Math.round(price * 100) - unitCents;
  if (
    ![
      fixedCents,
      unitCents,
      revenueCents,
      variableCents,
      totalCents,
      profitCents,
    ].every(Number.isSafeInteger)
  )
    throw new Error(
      "الأرقام تتجاوز نطاق الحساب الدقيق. خفّض القيم أو عدد الوحدات.",
    );
  const breakEven =
    fixedCents === 0
      ? contributionCents >= 0
        ? 0
        : null
      : contributionCents > 0
        ? Math.ceil(fixedCents / contributionCents)
        : null;
  return {
    fixed: fixedCents / 100,
    variableUnit: unitCents / 100,
    variable: variableCents / 100,
    total: totalCents / 100,
    revenue: revenueCents / 100,
    profit: profitCents / 100,
    margin: revenueCents ? (profitCents / revenueCents) * 100 : null,
    breakEven,
    contribution: contributionCents / 100,
    units,
    price,
  };
}
export function ledger(p) {
  const a = Object.fromEntries(Object.keys(ACCOUNTS).map((k) => [k, 0]));
  a.cash = Math.round(number(p.capital, "رأس المال") * 100);
  a.capital = -a.cash;
  for (const j of p.journal) {
    let balance = 0;
    for (const line of j.lines) {
      if (!Object.hasOwn(a, line.account)) throw new Error("حساب غير معروف.");
      const debit = number(line.debit, "المدين"),
        credit = number(line.credit, "الدائن");
      if (debit > 0 && credit > 0)
        throw new Error("لا يمكن أن يكون السطر مدينًا ودائنًا معًا.");
      const cents = Math.round(debit * 100) - Math.round(credit * 100);
      balance += cents;
      a[line.account] += cents;
      if (!Number.isSafeInteger(a[line.account]))
        throw new Error("رصيد الحساب يتجاوز نطاق الحساب الدقيق.");
    }
    if (balance !== 0)
      throw new Error(
        "القيد غير متوازن: إجمالي المدين يجب أن يساوي إجمالي الدائن.",
      );
  }
  for (const k in a) a[k] /= 100;
  const assets = round(a.cash + a.inventory + a.equipment + a.receivables),
    liabilities = round(-a.payables - a.otherLiabilities),
    income = round(-a.revenue - a.expenses - a.cogs),
    equity = round(-a.capital + income - a.drawings);
  return {
    accounts: a,
    assets,
    liabilities,
    income,
    equity,
    revenue: -a.revenue,
    expenses: round(a.expenses + a.cogs),
    difference: round(assets - liabilities - equity),
  };
}
export function transaction(p, kind, amount, date, note = "", cost = 0) {
  const op = OPERATIONS[kind];
  if (!op) throw new Error("اختر نوع العملية.");
  amount = number(amount, "المبلغ", { positive: true });
  cost = number(cost, "تكلفة البضاعة");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    throw new Error("أدخل تاريخًا صحيحًا.");
  const a = ledger(p).accounts;
  if (op.credit === "cash" && amount > a.cash)
    throw new Error("الرصيد النقدي غير كافٍ. أضف رأس مال أو راجع المبلغ.");
  if (kind === "pay-creditor" && amount > round(-a.payables))
    throw new Error("المبلغ أكبر من الرصيد المستحق للدائنين.");
  if (kind === "sell-cash" && cost > a.inventory)
    throw new Error("تكلفة البضاعة أكبر من رصيد المخزون.");
  const lines = [
    { account: op.debit, debit: amount, credit: 0 },
    { account: op.credit, debit: 0, credit: amount },
  ];
  if (kind === "sell-cash" && cost > 0)
    lines.push(
      { account: "cogs", debit: cost, credit: 0 },
      { account: "inventory", debit: 0, credit: cost },
    );
  return {
    id: crypto.randomUUID(),
    kind,
    label: op.name,
    amount,
    date,
    note: String(note).trim().slice(0, 400),
    lines,
    description: op.description,
    createdAt: new Date().toISOString(),
  };
}
export function migrateLegacy(source) {
  if (!Array.isArray(source?.projects)) return [];
  const reverse = Object.fromEntries(
    Object.entries(ACCOUNTS).map(([k, v]) => [v, k]),
  );
  reverse["المسحوبات"] = "drawings";
  return source.projects.slice(0, 100).flatMap((old) => {
    try {
      const p = project(TYPES.find((t) => t[1] === old.type)?.[0] || "other");
      p.name = text(old.name, "اسم المشروع");
      p.description = String(old.description || "").slice(0, 600);
      p.product = String(old.product || "").slice(0, 120);
      p.capital = number(old.capital);
      p.price = number(old.price);
      p.units = number(old.units, "الوحدات", { integer: true, max: 1e7 });
      p.costs = (old.costs || []).map((c) => ({
        id: crypto.randomUUID(),
        name: text(c.name, "التكلفة"),
        amount: number(c.amount),
        kind: c.kind === "variable" ? "variable" : "fixed",
      }));
      p.journal = (old.journal || []).map((j) => {
        if (!reverse[j.debit] || !reverse[j.credit])
          throw new Error("قيد غير معروف");
        const amount = number(j.amount);
        return {
          id: crypto.randomUUID(),
          label: String(j.label),
          date: new Date().toISOString().slice(0, 10),
          note: `تاريخ السجل السابق: ${j.date}`,
          amount,
          lines: [
            { account: reverse[j.debit], debit: amount, credit: 0 },
            { account: reverse[j.credit], debit: 0, credit: amount },
          ],
          description: "قيد مستعاد من النسخة السابقة.",
        };
      });
      calculate(p);
      return [p];
    } catch {
      return [];
    }
  });
}
