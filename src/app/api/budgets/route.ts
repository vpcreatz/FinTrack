
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const { data: budgets, error } = await supabase
      .from("budgets")
      .select("id, category_id, amount, month")
      .eq("user_id", user.id)
      .order("month", { ascending: false });

    if (error) throw error;

    const { data: categories, error: categoryError } = await supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", user.id);

    if (categoryError) throw categoryError;

    const categoryMap = new Map(
      (categories ?? []).map((category) => [
        category.id,
        category.name,
      ])
    );

    const result = (budgets ?? []).map((budget) => ({
      ...budget,
      category_name:
        categoryMap.get(budget.category_id) ?? "Unknown category",
    }));

    return NextResponse.json({ budgets: result });
  } catch (error) {
    console.error("GET budgets error:", error);

    return NextResponse.json(
      { error: "Could not load budgets." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const { category_id, amount, month } = body;

    if (
      typeof category_id !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(category_id)
    ) {
      return NextResponse.json(
        { error: "Invalid category." },
        { status: 400 }
      );
    }

    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 999999999999
    ) {
      return NextResponse.json(
        { error: "Enter a valid budget amount." },
        { status: 400 }
      );
    }

    if (
      typeof month !== "string" ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)
    ) {
      return NextResponse.json(
        { error: "Select a valid budget month." },
        { status: 400 }
      );
    }

    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", category_id)
      .eq("user_id", user.id)
      .eq("type", "expense")
      .maybeSingle();

    if (categoryError) throw categoryError;

    if (!category) {
      return NextResponse.json(
        { error: "Choose one of your expense categories." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("budgets")
      .upsert(
        {
          user_id: user.id,
          category_id,
          amount,
          month: `${month}-01`,
        },
        {
          onConflict: "user_id,category_id,month",
        }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        message: "Budget saved successfully.",
        budget: data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST budgets error:", error);

    return NextResponse.json(
      { error: "Could not save budget." },
      { status: 500 }
    );
  }
}
