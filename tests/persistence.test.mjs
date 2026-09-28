import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { project } from "../src/domain.js";
const backing = new Map();
globalThis.localStorage = {
  getItem: (k) => backing.get(k) ?? null,
  setItem: (k, v) => backing.set(k, v),
  removeItem: (k) => backing.delete(k),
};
const { saveProject, listProjects, deleteProject, safeRead, requireClient } =
  await import("../src/data.js");
beforeEach(() => backing.clear());
test("Guest create, update, reopen, journal and report retention", async () => {
  let p = { ...project(), name: "حفظ" };
  p = await saveProject(p, null);
  assert.equal(p.revision, 1);
  p.journal.push({ id: "test", lines: [] });
  p.reports.push({ id: "report", project: { name: "نسخة" } });
  p = await saveProject(p, null);
  assert.equal(p.revision, 2);
  const all = await listProjects(null);
  assert.equal(all.length, 1);
  assert.equal(all[0].journal.length, 1);
  assert.equal(all[0].reports.length, 1);
});
test("Guest projects remain independent and deletion targets only one project", async () => {
  const a = await saveProject({ ...project(), name: "أ" }, null),
    b = await saveProject({ ...project(), name: "ب" }, null);
  await deleteProject(a, null);
  const rows = await listProjects(null);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, b.id);
});
test("Malformed preferences are recovered without an exception", () => {
  backing.set("broken", "{");
  assert.deepEqual(safeRead(localStorage, "broken", []), []);
});
test("Unconfigured cloud auth fails explicitly rather than pretending success", () => {
  assert.throws(() => requireClient(null), /قيد التهيئة/);
});
test("Storage write failure propagates; save cannot be reported as success", async () => {
  const original = localStorage.setItem;
  localStorage.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  try {
    await assert.rejects(
      saveProject({ ...project(), name: "خطأ" }, null),
      /QuotaExceededError/,
    );
  } finally {
    localStorage.setItem = original;
  }
});
