// Explicit integration check against the dedicated free Mizan project.
// Creates two disposable accounts. Review and remove only the returned fixture IDs.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { backend } from "../src/config.js";
import { project, transaction } from "../src/domain.js";
import { listProjects, saveProject, deleteProject } from "../src/data.js";
import { changePassword } from "../src/auth.js";

const checks = [],
  accounts = [],
  clients = [];
const runId = crypto.randomUUID();
const connect = () => {
  const connection = createClient(backend.url, backend.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  clients.push(connection);
  return connection;
};
const ok = (name) => {
  checks.push(name);
  console.log(`PASS ${name}`);
};
await mkdir(new URL("../.local/", import.meta.url), { recursive: true });
const fixturePath = new URL("../.local/cloud-qa-session.json", import.meta.url);
const record = () =>
  writeFile(fixturePath, JSON.stringify({ runId, accounts, checks }, null, 2));
try {
  const settings = await fetch(`${backend.url}/auth/v1/settings`, {
    headers: { apikey: backend.key },
  }).then((r) => r.json());
  assert.equal(
    settings.mailer_autoconfirm,
    true,
    "Do not create fixtures if email confirmation is enabled",
  );
  assert.equal(settings.external.email, true);
  ok("Direct email/password signup enabled; no confirmation email");
  const a = connect(),
    b = connect(),
    secondDevice = connect();
  for (const [label, connection] of [
    ["a", a],
    ["b", b],
  ]) {
    const email = `mizan-qa-${label}-${runId}@example.com`;
    const password = `${crypto.randomUUID()}Aa9!`;
    const result = await connection.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: "اختبار تقني مؤقت", mizan_test_run: runId },
      },
    });
    if (result.error) throw result.error;
    assert.ok(result.data.session);
    accounts.push({ id: result.data.user.id, email, password });
    await record();
  }
  ok("Two real independent accounts receive authenticated sessions");
  const userA = (await a.auth.getUser()).data.user;
  const userB = (await b.auth.getUser()).data.user;
  let p = {
    ...project("print"),
    name: "اختبار اتصال سحابي مؤقت",
    capital: 20000,
    price: 25,
    units: 300,
  };
  p.costs = [
    { id: crypto.randomUUID(), kind: "fixed", name: "إيجار", amount: 8000 },
    { id: crypto.randomUUID(), kind: "variable", name: "ورق", amount: 5 },
  ];
  p.journal.push(transaction(p, "buy-cash", 3000, "2026-09-28", "اختبار"));
  p = await saveProject(p, userA, a);
  accounts[0].projectId = p.id;
  await record();
  assert.equal((await listProjects(userA, a))[0].id, p.id);
  assert.equal((await listProjects(userB, b)).length, 0);
  const directRead = await b.from("mizan_projects").select("*").eq("id", p.id);
  assert.deepEqual(directRead.data, []);
  await assert.rejects(saveProject({ ...p, name: "forbidden" }, userB, b));
  await assert.rejects(deleteProject(p, userB, b));
  const illegal = { ...project(), name: "illegal owner" };
  const denied = await b
    .from("mizan_projects")
    .insert({ id: illegal.id, user_id: userA.id, data: illegal });
  assert.ok(denied.error);
  ok(
    "Real JWTs enforce isolation for read, update, delete and forged ownership",
  );
  assert.equal(
    (
      await secondDevice.auth.signInWithPassword({
        email: accounts[0].email,
        password: "WrongPassword99",
      })
    ).error?.status,
    400,
  );
  const signedIn = await secondDevice.auth.signInWithPassword({
    email: accounts[0].email,
    password: accounts[0].password,
  });
  if (signedIn.error) throw signedIn.error;
  const fromOtherDevice = (
    await listProjects(signedIn.data.user, secondDevice)
  )[0];
  assert.equal(fromOtherDevice.journal.length, 1);
  const stale = structuredClone(fromOtherDevice);
  p = await saveProject({ ...p, name: "تحديث من جهاز آخر" }, userA, a);
  await assert.rejects(
    saveProject({ ...stale, name: "stale" }, userA, secondDevice),
    /جهاز آخر/,
  );
  ok(
    "Incorrect login rejected; another device restores journal; stale save rejected",
  );
  await assert.rejects(
    changePassword(
      a,
      userA,
      "WrongPassword99",
      "NextSecretPass91",
      "NextSecretPass91",
    ),
  );
  const newPassword = `${crypto.randomUUID()}Bb8!`;
  await changePassword(
    a,
    userA,
    accounts[0].password,
    newPassword,
    newPassword,
  );
  const oldPassword = accounts[0].password;
  accounts[0].password = newPassword;
  await record();
  await a.auth.signOut({ scope: "global" });
  const invalid = await a.auth.signInWithPassword({
    email: accounts[0].email,
    password: oldPassword,
  });
  assert.ok(invalid.error);
  const fresh = await a.auth.signInWithPassword({
    email: accounts[0].email,
    password: newPassword,
  });
  if (fresh.error) throw fresh.error;
  ok(
    "Password change verifies old password; old password then fails; new password works",
  );
  await deleteProject(p, fresh.data.user, a);
  assert.equal((await listProjects(fresh.data.user, a)).length, 0);
  ok("Owner can delete the project; no project fixtures remain");
  await record();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  for (const connection of clients)
    await connection.auth.signOut({ scope: "global" }).catch(() => {});
  console.log(
    JSON.stringify({
      runId,
      userIds: accounts.map((a) => a.id),
      checks: checks.length,
      credentialsFile: ".local/cloud-qa-session.json",
    }),
  );
}
