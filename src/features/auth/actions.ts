"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/services/supabase/server";
import type { ActionState } from "@/types";

import {
  ForgotPasswordSchema,
  LoginSchema,
  ResetPasswordSchema,
  SignupSchema,
} from "./schemas";

/**
 * Only ever redirect to a same-site relative path. formData is user-
 * controlled input, so without this check `next` could be set to
 * `https://evil.example.com` and used for a post-login open redirect.
 */
function safeRedirectTarget(next: FormDataEntryValue | null): string {
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/dashboard";
}

export async function signup(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const validated = SignupSchema.safeParse({
    businessName: formData.get("businessName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const { businessName, email, password } = validated.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Stored on the auth user now; Milestone 1 reads this when creating
      // the first `businesses` row during onboarding.
      data: { business_name: businessName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/confirm`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/login?confirmEmail=1");
}

export async function login(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(validated.data);

  if (error) {
    return { error: "Incorrect email or password." };
  }

  redirect(safeRedirectTarget(formData.get("next")));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const validated = ForgotPasswordSchema.safeParse({ email: formData.get("email") });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(validated.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/confirm?next=/reset-password`,
  });

  // Deliberately don't reveal whether the email exists — same success
  // message either way, so this can't be used to enumerate accounts.
  if (error) {
    return { error: "Something went wrong. Please try again." };
  }

  return { message: "If that email has an account, a reset link is on its way." };
}

export async function resetPassword(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const validated = ResetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: validated.data.password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
