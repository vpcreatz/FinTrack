import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

type ShortcutPayload = {
  amount?: unknown;
  type?: unknown;
  category?: unknown;
  category_id?: unknown;
  description?: unknown;
  date?: unknown;
  transaction_date?: unknown;
  payment_method?: unknown;
  account?: unknown;
  account_id?: unknown;
  source?: unknown;
  notes?: unknown;
  transfer_account?: unknown;
  transfer_account_id?: unknown;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Server configuration missing SUPABASE_SERVICE_ROLE_KEY.");
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") ?? "";
    const match = authorization.match(/^Bearer\s+(ft_[a-f0-9]{64})$/i);
    if (!match) return jsonError("Missing or invalid Authorization: Bearer token.", 401);

    const supabase = getAdminClient();
    const tokenHash = hashToken(match[1]);
    const { data: tokenRow, error: tokenError } = await supabase
      .from("shortcut_tokens")
      .select("id, user_id")
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .maybeSingle();

    if (tokenError) {
      console.error("Shortcut token verification failed:", tokenError.message);
      return jsonError("Could not verify Shortcut token.", 500);
    }
    if (!tokenRow) return jsonError("This Shortcut token is invalid or has been revoked.", 401);

    const body = await request.json() as ShortcutPayload;
    const amount = typeof body.amount === "number" ? body.amount :
      typeof body.amount === "string" && body.amount.trim() ? Number(body.amount) : NaN;
    const type = body.type;
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const date = body.transaction_date ?? body.date ?? new Date().toISOString();
    const accountInput = body.account_id ?? body.account;
    const categoryInput = body.category_id ?? body.category;
    const transferInput = body.transfer_account_id ?? body.transfer_account;

    if (!Number.isFinite(amount) || amount <= 0 || amount > 999999999999) {
      return jsonError("amount must be a positive number.", 400);
    }
    if (!["income", "expense", "transfer"].includes(String(type))) {
      return jsonError("type must be income, expense, or transfer.", 400);
    }
    if (!description || description.length > 200) {
      return jsonError("description is required and must be 200 characters or fewer.", 400);
    }
    if (typeof date !== "string" || !Number.isFinite(Date.parse(date))) {
      return jsonError("date must be a valid date or ISO date string.", 400);
    }
    if (typeof accountInput !== "string" || !accountInput.trim()) {
      return jsonError("account or account_id is required.", 400);
    }

    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("id, name")
      .eq("user_id", tokenRow.user_id);
    if (accountsError) throw accountsError;

    const account = accounts?.find((item) =>
      item.id === accountInput || item.name.toLowerCase() === accountInput.trim().toLowerCase()
    );
    if (!account) return jsonError("Account not found. Use an account name from FinTrack or its ID.", 400);

    let categoryId: string | null = null;
    if (type !== "transfer" && categoryInput != null && String(categoryInput).trim()) {
      if (typeof categoryInput !== "string") return jsonError("category must be a category name or ID.", 400);
      const { data: categories, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name, type")
        .eq("user_id", tokenRow.user_id)
        .eq("type", type);
      if (categoriesError) throw categoriesError;
      const category = categories?.find((item) =>
        item.id === categoryInput || item.name.toLowerCase() === categoryInput.trim().toLowerCase()
      );
      if (!category) return jsonError(`Category not found for ${type}. Check its spelling in FinTrack.`, 400);
      categoryId = category.id;
    }

    let transferAccountId: string | null = null;
    if (type === "transfer") {
      if (typeof transferInput !== "string" || !transferInput.trim()) {
        return jsonError("transfer_account or transfer_account_id is required for transfers.", 400);
      }
      const destination = accounts?.find((item) =>
        item.id === transferInput || item.name.toLowerCase() === transferInput.trim().toLowerCase()
      );
      if (!destination || destination.id === account.id) {
        return jsonError("Destination account was not found or matches the source account.", 400);
      }
      transferAccountId = destination.id;
    }

    const noteParts = [
      "Source: iOS Shortcuts",
      typeof body.source === "string" && body.source.trim() ? `Shortcut: ${body.source.trim().slice(0, 80)}` : "",
      typeof body.payment_method === "string" && body.payment_method.trim() ? `Payment method: ${body.payment_method.trim().slice(0, 80)}` : "",
      typeof body.notes === "string" && body.notes.trim() ? body.notes.trim().slice(0, 700) : "",
    ].filter(Boolean);

    const { data: transaction, error: insertError } = await supabase
      .from("transactions")
      .insert({
        user_id: tokenRow.user_id,
        description,
        amount,
        type,
        account_id: account.id,
        category_id: type === "transfer" ? null : categoryId,
        transfer_account_id: transferAccountId,
        transaction_date: new Date(date).toISOString(),
        notes: noteParts.join(" | ").slice(0, 1000),
      })
      .select("id, description, amount, type, account_id, category_id, transaction_date, created_at")
      .single();

    if (insertError) {
      console.error("Shortcut transaction insert failed:", insertError.message);
      return jsonError("Could not save transaction. Check account/category and database permissions.", 400);
    }

    await supabase.from("shortcut_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    return NextResponse.json({ message: "Transaction added to FinTrack.", transaction }, { status: 201 });
  } catch (error) {
    console.error("iOS Shortcut API error:", error);
    return jsonError(error instanceof Error ? error.message : "Unexpected server error.", 500);
  }
}
