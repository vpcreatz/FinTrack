import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "CAD", "AUD"];
function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return "Unknown database error";
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });

    const { data, error } = await supabase.from("profiles").select("id, display_name, currency").eq("id", user.id).maybeSingle();
    if (error) {
      console.error("GET profile database error:", error);
      return NextResponse.json({ error: "Could not read the profiles table. Check its SELECT policy in Supabase.", detail: errorMessage(error) }, { status: 500 });
    }

    if (!data) {
      const fallback = { id: user.id, display_name: String(user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? ""), currency: "INR" };
      const { data: created, error: createError } = await supabase.from("profiles").upsert(fallback, { onConflict: "id" }).select("id, display_name, currency").single();
      if (createError) {
        console.error("Create missing profile error:", createError);
        return NextResponse.json({ error: "Your profile is missing and could not be created. Check profiles INSERT/UPDATE policies in Supabase.", detail: errorMessage(createError) }, { status: 500 });
      }
      return NextResponse.json({ profile: created, email: user.email ?? "" });
    }
    return NextResponse.json({ profile: data, email: user.email ?? "" });
  } catch (error) {
    console.error("GET profile error:", error);
    return NextResponse.json({ error: "Could not load your profile.", detail: errorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
    const body = await request.json() as { display_name?: unknown; currency?: unknown };
    const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";
    if (!displayName || displayName.length > 60) return NextResponse.json({ error: "Enter a display name (maximum 60 characters)." }, { status: 400 });
    if (typeof body.currency !== "string" || !CURRENCIES.includes(body.currency)) return NextResponse.json({ error: "Choose a supported currency." }, { status: 400 });

    const { data, error } = await supabase.from("profiles").upsert({ id: user.id, display_name: displayName, currency: body.currency }, { onConflict: "id" }).select("id, display_name, currency").single();
    if (error) {
      console.error("PATCH profile database error:", error);
      return NextResponse.json({ error: "Could not save your profile. Check profiles INSERT/UPDATE policies in Supabase.", detail: errorMessage(error) }, { status: 500 });
    }
    return NextResponse.json({ profile: data, message: "Profile updated." });
  } catch (error) {
    console.error("PATCH profile error:", error);
    return NextResponse.json({ error: "Could not update your profile.", detail: errorMessage(error) }, { status: 500 });
  }
}
