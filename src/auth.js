// Passwords are used only for Auth requests; never persisted in project data.
export function validatePassword(password, confirmation) {
  if (password !== confirmation) throw new Error("كلمتا المرور غير متطابقتين.");
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  )
    throw new Error("كلمة المرور يجب أن تكون بين 8 و128 حرفًا.");
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
    throw new Error("استخدم أحرفًا إنجليزية وأرقامًا في كلمة المرور.");
  return password;
}

export async function changePassword(
  connection,
  user,
  currentPassword,
  password,
  confirmation,
) {
  if (!connection || !user?.id || !user?.email)
    throw new Error("سجّل الدخول لتغيير كلمة المرور.");
  validatePassword(password, confirmation);
  if (typeof currentPassword !== "string" || !currentPassword)
    throw new Error("أدخل كلمة المرور الحالية.");
  if (password === currentPassword)
    throw new Error("اختر كلمة مرور مختلفة عن الحالية.");
  // A fresh password sign-in verifies the old password without any email flow.
  const verified = await connection.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verified.error) throw verified.error;
  if (!verified.data?.session || verified.data.user?.id !== user.id)
    throw new Error("تعذر التحقق من الحساب. سجّل الدخول من جديد.");
  const changed = await connection.auth.updateUser({
    password,
    current_password: currentPassword,
  });
  if (changed.error) throw changed.error;
  if (changed.data?.user?.id !== user.id)
    throw new Error("لم يتم تأكيد تغيير كلمة المرور.");
  return changed.data.user;
}
