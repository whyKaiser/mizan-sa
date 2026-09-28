import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePassword, changePassword } from "../src/auth.js";
import { authScreen } from "../src/ui.js";

test("Password validation requires matching, bounded letters and digits", () => {
  assert.equal(
    validatePassword("SecurePass42", "SecurePass42"),
    "SecurePass42",
  );
  for (const password of [
    "short1",
    "12345678",
    "abcdefgh",
    "A".repeat(129),
    null,
  ])
    assert.throws(() => validatePassword(password, password));
  assert.throws(() => validatePassword("SecurePass42", "Different42"));
});

const user = { id: "account-a", email: "a@example.invalid" };
function mockAuth({
  loginError = null,
  updateError = null,
  id = user.id,
} = {}) {
  const calls = [];
  return {
    calls,
    auth: {
      async signInWithPassword(input) {
        calls.push(["verify", input]);
        return {
          data: { session: {}, user: { ...user, id } },
          error: loginError,
        };
      },
      async updateUser(input) {
        calls.push(["change", input]);
        return { data: { user }, error: updateError };
      },
    },
  };
}
test("Password change verifies the current password before updating", async () => {
  const connection = mockAuth();
  assert.equal(
    await changePassword(
      connection,
      user,
      "Current42",
      "NextPass42",
      "NextPass42",
    ),
    user,
  );
  assert.deepEqual(connection.calls, [
    ["verify", { email: user.email, password: "Current42" }],
    ["change", { password: "NextPass42", current_password: "Current42" }],
  ]);
});
test("Wrong password, different account and server failures never report success", async () => {
  for (const options of [
    { loginError: new Error("Invalid login credentials") },
    { id: "other" },
  ]) {
    const connection = mockAuth(options);
    await assert.rejects(
      changePassword(connection, user, "Current42", "NextPass42", "NextPass42"),
    );
    assert.equal(connection.calls.length, 1);
  }
  await assert.rejects(
    changePassword(
      mockAuth({ updateError: new Error("offline") }),
      user,
      "Current42",
      "NextPass42",
      "NextPass42",
    ),
    /offline/,
  );
  await assert.rejects(
    changePassword(mockAuth(), null, "Current42", "NextPass42", "NextPass42"),
  );
  await assert.rejects(
    changePassword(mockAuth(), user, "Current42", "Current42", "Current42"),
  );
});
test("Email-free recovery page never pretends to send a message", () => {
  const html = authScreen("forgot");
  assert.ok(html.includes("غير متاحة"));
  assert.ok(!html.includes('data-form="forgot"'));
  assert.ok(!html.includes("إرسال رابط الاستعادة"));
  assert.ok(authScreen("signup").includes("بدون رسالة تأكيد"));
});
