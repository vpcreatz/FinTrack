import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getUserClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}

function databaseError(error: unknown) {
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return "Unknown database error";
}

function validateGoal(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const targetAmount = body.target_amount;
  const currentAmount = body.current_amount ?? 0;
  const targetDate = body.target_date;

  if (!name || name.length > 80) return "Enter a goal name (maximum 80 characters).";
  if (typeof targetAmount !== "number" || !Number.isFinite(targetAmount) || targetAmount <= 0 || targetAmount > 999999999999) {
    return "Enter a valid target amount.";
  }
  if (typeof currentAmount !== "number" || !Number.isFinite(currentAmount) || currentAmount < 0 || currentAmount > 999999999999) {
    return "Enter a valid current amount.";
  }
  if (targetDate !== null && targetDate !== undefined && (typeof targetDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || Number.isNaN(Date.parse(`${targetDate}T00:00:00`)))) {
    return "Choose a valid target date.";
  }
  return null;
}

export async function GET() {
  try {
    const { supabase, user } = await getUserClient();
    if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

    const { data, error } = await supabase
      .from("savings_goals")
      .select("id, name, target_amount, current_amount, target_date, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return NextResponse.json({ goals: data ?? [] });
  } catch (error) {
    console.error("GET savings goals error:", error);
    return NextResponse.json({ error: "Could not load savings goals.", detail: databaseError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getUserClient();
    if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

    const body = await request.json() as Record<string, unknown>;
    const validationError = validateGoal(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const { data, error } = await supabase.from("savings_goals").insert({
      user_id: user.id,
      name: (body.name as string).trim(),
      target_amount: body.target_amount as number,
      current_amount: (body.current_amount ?? 0) as number,
      target_date: (body.target_date as string | null | undefined) || null,
    }).select("id, name, target_amount, current_amount, target_date, created_at").single();
    if (error) throw error;

    return NextResponse.json({ goal: data }, { status: 201 });
  } catch (error) {
    console.error("POST savings goal error:", error);
    return NextResponse.json({ error: "Could not create the savings goal. Check the savings_goals table and INSERT policy in Supabase.", detail: databaseError(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await getUserClient();
    if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

    const body = await request.json() as Record<string, unknown>;
    if (typeof body.id !== "string" || !UUID_REGEX.test(body.id)) {
      return NextResponse.json({ error: "A valid goal ID is required." }, { status: 400 });
    }
    const validationError = validateGoal(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const { data, error } = await supabase.from("savings_goals").update({
      name: (body.name as string).trim(),
      target_amount: body.target_amount as number,
      current_amount: (body.current_amount ?? 0) as number,
      target_date: (body.target_date as string | null | undefined) || null,
    }).eq("id", body.id).eq("user_id", user.id)
      .select("id, name, target_amount, current_amount, target_date, created_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Savings goal not found." }, { status: 404 });

    return NextResponse.json({ goal: data });
  } catch (error) {
    console.error("PATCH savings goal error:", error);
    return NextResponse.json({ error: "Could not update the savings goal.", detail: databaseError(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, user } = await getUserClient();
    if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

    const body = await request.json() as { id?: unknown };
    if (typeof body.id !== "string" || !UUID_REGEX.test(body.id)) {
      return NextResponse.json({ error: "A valid goal ID is required." }, { status: 400 });
    }

    const { data, error } = await supabase.from("savings_goals").delete()
      .eq("id", body.id).eq("user_id", user.id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Savings goal not found." }, { status: 404 });

    return NextResponse.json({ message: "Savings goal deleted." });
  } catch (error) {
    console.error("DELETE savings goal error:", error);
    return NextResponse.json({ error: "Could not delete the savings goal.", detail: databaseError(error) }, { status: 500 });
  }
}
