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
      data: { requested_org_slug: orgSlug || null },
    },
  });
  if (error) throw error;
  return data;
}

/** Load the caller's profile row (approved/status/role/org). */
export async function fetchMyProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, role, status, org_id, email, full_name")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listOrganizations() {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, slug, name")
    .order("name");
  if (error) throw error;
  return data || [];
}
