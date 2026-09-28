import { test } from "node:test";
import assert from "node:assert/strict";
import {
  project,
  calculate,
  transaction,
  ledger,
  number,
  text,
  migrateLegacy,
  OPERATIONS,
} from "../src/domain.js";
import { e, whatIfStats, reportBody, navigation } from "../src/ui.js";

const planning = () => ({
  ...project("print"),
  name: "مشروع طباعة صور",
  capital: 20000,
  product: "صورة مطبوعة",
  price: 25,
  units: 300,
  costs: [
    { id: "1", name: "إيجار", kind: "fixed", amount: 1000 },
    { id: "2", name: "رواتب", kind: "fixed", amount: 2000 },
    { id: "3", name: "مصروف ثابت", kind: "fixed", amount: 5000 },
    { id: "4", name: "ورق وحبر", kind: "variable", amount: 5 },
  ],
});
const add = (p, kind, amount, cost = 0) =>
  p.journal.push(transaction(p, kind, amount, "2026-09-28", "اختبار", cost));

test("Each new project has a unique ID and independent empty collections", () => {
  const a = project(),
    b = project();
  assert.notEqual(a.id, b.id);
  a.costs.push({});
  assert.equal(b.costs.length, 0);
  assert.equal(a.name, "");
  assert.equal(a.journal.length, 0);
});
test("Financial planning uses unit variable cost and separates capital", () => {
  const c = calculate(planning());
  assert.deepEqual(c, {
    fixed: 8000,
    variableUnit: 5,
    variable: 1500,
    total: 9500,
    revenue: 7500,
    profit: -2000,
    margin: (-2000 / 7500) * 100,
    breakEven: 400,
    contribution: 20,
    units: 300,
    price: 25,
  });
});
test("What-if is pure and does not mutate the stored project", () => {
  const p = planning(),
    before = JSON.stringify(p),
    c = calculate(p, { price: 30, units: 400 });
  assert.equal(c.profit, 2000);
  assert.equal(JSON.stringify(p), before);
});
test("Unreachable break-even is null, never falsely zero", () => {
  const p = planning();
  assert.equal(calculate(p, { price: 5 }).breakEven, null);
  assert.equal(calculate(p, { price: 4 }).breakEven, null);
});
test("Zero revenue has undefined margin; zero fixed cost is handled", () => {
  const p = project();
  assert.equal(calculate(p).margin, null);
  assert.equal(calculate(p).breakEven, 0);
  p.costs = [{ kind: "variable", amount: 2 }];
  assert.equal(calculate(p).breakEven, null);
});
test("Break-even units round up and meet costs", () => {
  const p = {
    ...project(),
    price: 7,
    units: 1,
    costs: [
      { kind: "fixed", amount: 10 },
      { kind: "variable", amount: 4 },
    ],
  };
  assert.equal(calculate(p).breakEven, 4);
  assert.ok(calculate(p, { units: 4 }).profit >= 0);
  assert.ok(calculate(p, { units: 3 }).profit < 0);
});
test("Reference image arithmetic is corrected: 10000 / (25 - 15) = 1000", () => {
  const p = {
    ...project(),
    price: 25,
    units: 300,
    costs: [
      { kind: "fixed", amount: 10000 },
      { kind: "variable", amount: 15 },
    ],
  };
  assert.equal(calculate(p).breakEven, 1000);
});
test("Decimal calculations use integer halalas", () => {
  const p = {
    ...project(),
    price: 0.3,
    units: 3,
    costs: [
      { kind: "fixed", amount: 0.1 },
      { kind: "variable", amount: 0.2 },
    ],
  };
  assert.equal(calculate(p).revenue, 0.9);
  assert.equal(calculate(p).variable, 0.6);
  assert.equal(calculate(p).profit, 0.2);
});
test("Inputs reject blank, invalid, negative, fractional quantity and unsafe totals", () => {
  for (const value of [
    "",
    null,
    undefined,
    "  ",
    true,
    {},
    -1,
    Infinity,
    NaN,
    "no",
  ])
    assert.throws(() => number(value));
  assert.throws(() => number(1.5, "quantity", { integer: true }));
  assert.throws(() => number(0, "amount", { positive: true }));
  assert.throws(() => number(0.001, "amount", { positive: true }));
  assert.throws(() => calculate({ ...project(), price: 1e9, units: 1e7 }));
  assert.throws(() => text(" ", "name"));
  assert.throws(() => text("long", "name", 2));
});
test("Five-operation required example produces correct statements", () => {
  const p = planning();
  add(p, "buy-cash", 3000);
  add(p, "equipment-credit", 5000);
  add(p, "expense", 1000);
  add(p, "sell-cash", 2500);
  add(p, "pay-creditor", 1500);
  const s = ledger(p);
  assert.equal(s.accounts.cash, 17000);
  assert.equal(s.accounts.inventory, 3000);
  assert.equal(s.accounts.equipment, 5000);
  assert.equal(s.assets, 25000);
  assert.equal(s.liabilities, 3500);
  assert.equal(s.income, 1500);
  assert.equal(s.equity, 21500);
  assert.equal(s.difference, 0);
});
test("All eight operation types preserve the accounting equation", () => {
  const p = planning();
  for (const kind of Object.keys(OPERATIONS)) {
    add(p, kind, 100);
    assert.equal(ledger(p).difference, 0, kind);
  }
  assert.equal(p.journal.length, 8);
});
test("Sale cost reduces inventory and income without altering gross sales", () => {
  const p = planning();
  add(p, "buy-cash", 1000);
  add(p, "sell-cash", 800, 500);
  const s = ledger(p);
  assert.equal(s.accounts.inventory, 500);
  assert.equal(s.revenue, 800);
  assert.equal(s.income, 300);
  assert.equal(s.difference, 0);
  assert.equal(p.journal[1].lines.length, 4);
});
test("Capital and drawings do not count as operating income or expenses", () => {
  const p = planning();
  add(p, "capital", 500);
  add(p, "withdrawal", 300);
  const s = ledger(p);
  assert.equal(s.income, 0);
  assert.equal(s.expenses, 0);
  assert.equal(s.equity, 20200);
});
test("Impossible cash, payable, inventory and date transactions are rejected", () => {
  const p = planning();
  assert.throws(() => add(p, "buy-cash", 20001));
  assert.throws(() => add(p, "pay-creditor", 1));
  assert.throws(() => add(p, "sell-cash", 100, 1));
  assert.throws(() => transaction(p, "capital", 1, "2026-02-30"));
  assert.throws(() => transaction(p, "capital", 1, "28/09/2026"));
  assert.throws(() => add(p, "unknown", 1));
});
test("Ledger rejects malformed or unbalanced entries", () => {
  const p = planning();
  p.journal = [{ lines: [{ account: "cash", debit: 100, credit: 0 }] }];
  assert.throws(() => ledger(p), /غير متوازن/);
  p.journal[0].lines[0].account = "__proto__";
  assert.throws(() => ledger(p), /غير معروف/);
});
test("Repeated decimal transactions remain exactly balanced", () => {
  const p = { ...project(), capital: 1000 };
  for (let i = 0; i < 1000; i++) add(p, "expense", 0.1);
  assert.equal(ledger(p).accounts.cash, 900);
  assert.equal(ledger(p).difference, 0);
});
test("Legacy data import preserves independent valid records and drawings", () => {
  const source = {
    projects: [
      {
        name: "قديم",
        capital: 100,
        price: 10,
        units: 5,
        costs: [],
        journal: [
          {
            debit: "المسحوبات",
            credit: "النقدية",
            amount: 10,
            label: "مسحوبات",
            date: "2026-09-01",
          },
        ],
      },
      { name: "تالف", capital: -1 },
    ],
  };
  const result = migrateLegacy(source);
  assert.equal(result.length, 1);
  assert.equal(ledger(result[0]).equity, 90);
  assert.equal(source.projects.length, 2);
});
test("UI escapes user text, formats negative changes, includes all report fields", () => {
  assert.equal(e('<img onerror="x">'), "&lt;img onerror=&quot;x&quot;&gt;");
  assert.match(
    whatIfStats(planning(), 20, 300),
    /stat loss"><span>الفرق<\/span><strong>\u061c?-/,
  );
  const p = planning();
  p.name = "<script>alert(1)</script>";
  const html = reportBody(p);
  assert.ok(!html.includes("<script>"));
  for (const label of [
    "رأس المال المتوفر",
    "إجمالي التكاليف",
    "هامش الربح",
    "نقطة التعادل",
    "قائمة الدخل",
    "الميزانية العمومية",
  ])
    assert.ok(html.includes(label));
  assert.equal(navigation.length, 5);
  assert.equal(navigation[4][0], "settings");
});
