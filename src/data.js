import { createClient } from "@supabase/supabase-js";
import { backend } from "./config.js";
export const client =
  backend.url && backend.key
    ? createClient(backend.url, backend.key, {
        auth: {
          storageKey: "mizan-auth-v2",
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;
const GUEST_KEY = "mizan-guest-v2";
export const redirectURL = () =>
  new URL(import.meta.env.BASE_URL, location.origin).href;
export function safeRead(storage, key, fallback) {
  try {
    return JSON.parse(storage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
export function guestProjects() {
  return safeRead(localStorage, GUEST_KEY, []);
}
export async function listProjects(user) {
  if (!user) return guestProjects();
  const { data, error } = await client
    .from("mizan_projects")
    .select("id,data,revision,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data.map((r) => ({ ...r.data, id: r.id, revision: r.revision }));
}
export async function saveProject(p, user) {
  if (!user) {
    const all = guestProjects(),
      i = all.findIndex((x) => x.id === p.id);
    const copy = structuredClone({ ...p, revision: (p.revision || 0) + 1 });
    if (i < 0) all.unshift(copy);
    else all[i] = copy;
    localStorage.setItem(GUEST_KEY, JSON.stringify(all));
    return copy;
  }
  const { revision, ...payload } = p;
  const row = {
    id: p.id,
    user_id: user.id,
    data: payload,
    revision: (revision || 0) + 1,
    updated_at: new Date().toISOString(),
  };
  const query = revision
    ? client
        .from("mizan_projects")
        .update(row)
        .eq("id", p.id)
        .eq("revision", revision)
    : client.from("mizan_projects").insert(row);
  const { data, error } = await query.select("revision").maybeSingle();
  if (error) throw error;
  if (!data)
    throw new Error(
      "تم تعديل المشروع من جهاز آخر. أعد فتحه قبل الحفظ حتى لا تفقد التحديثات.",
    );
  return { ...p, revision: data.revision };
}
export async function deleteProject(p, user) {
  if (!user) {
    localStorage.setItem(
      GUEST_KEY,
      JSON.stringify(guestProjects().filter((x) => x.id !== p.id)),
    );
    return;
  }
  const { data, error } = await client
    .from("mizan_projects")
    .delete()
    .eq("id", p.id)
    .eq("revision", p.revision)
    .select("id");
  if (error) throw error;
  if (!data?.length)
    throw new Error("تغير المشروع من جهاز آخر. حدّث القائمة قبل الحذف.");
}
export function requireClient() {
  if (!client)
    throw new Error(
      "تسجيل الحسابات قيد التهيئة. يمكنك استخدام وضع الزائر الآن.",
    );
  return client;
}
export function message(error) {
  const s = error?.message || String(error);
  if (/Invalid login credentials/i.test(s))
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  if (/Email not confirmed/i.test(s))
    return "فعّل حسابك من رسالة البريد أولًا.";
  if (/rate limit|too many|after \d+ seconds/i.test(s))
    return "محاولات متقاربة. انتظر قليلًا ثم أعد المحاولة.";
  if (/Failed to fetch|NetworkError|fetch failed/i.test(s))
    return "تعذر الاتصال. تحقق من الإنترنت؛ لم يتم تأكيد الحفظ.";
  if (/row.level|permission denied/i.test(s))
    return "تعذر الوصول إلى المشروع. سجل الدخول من جديد.";
  if (/Password should/i.test(s))
    return "استخدم كلمة مرور قوية من 8 أحرف على الأقل.";
  return /[\u0600-\u06ff]/.test(s)
    ? s
    : "تعذرت العملية. أعد المحاولة، أو راجع إعدادات حسابك.";
}
