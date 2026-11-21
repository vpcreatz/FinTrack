
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CATEGORY_TYPES = ["income", "expense"];

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

    const { data, error } = await supabase
      .from("categories")
      .select("id, name, type, created_at")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ categories: data });
  } catch (error) {
    console.error("GET categories error:", error);

    return NextResponse.json(
      { error: "Could not load categories." },
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

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const type = body.type;

    if (!name || name.length > 40) {
      return NextResponse.json(
        { error: "Enter a category name (maximum 40 characters)." },
        { status: 400 }
      );
    }

    if (
      typeof type !== "string" ||
      !CATEGORY_TYPES.includes(type)
    ) {
      return NextResponse.json(
        { error: "Category type must be income or expense." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: user.id,
        name,
        type,
      })
      .select("id, name, type, created_at")
      .single();

    if (error) {
      console.error("POST categories error:", error);

      return NextResponse.json(
        { error: "Could not create category. It may already exist." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message: "Category created successfully.",
        category: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST categories error:", error);

    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}
