import { supabase } from "./supabase.js";

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Sign up. The trigger on auth.users creates a profile row with status='pending'. */
export async function requestAccess(email, password, orgSlug) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: {
      data: { requested_org: orgSlug || null },
    },
  });
  if (error) throw error;
  return data;
}

/** Load the caller's profile row (approved/status/role/org). */
export async function fetchMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, role, status, org_id, email, full_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listOrganizations() {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, slug, display_name")
    .order("display_name");
  if (error) throw error;
  return data || [];
}

/** Send a password-recovery email. redirectTo must be in the Supabase allow-list. */
export async function requestPasswordReset(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
  return data;
}

/** Set a new password for the currently-authenticated (recovery) session. */
export async function setNewPassword(password) {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  return data;
}
