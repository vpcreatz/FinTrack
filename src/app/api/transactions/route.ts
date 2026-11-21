
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type TransactionInput = {
  description?: unknown;
  amount?: unknown;
  type?: unknown;
  account_id?: unknown;
  category_id?: unknown;
  transfer_account_id?: unknown;
  transaction_date?: unknown;
  notes?: unknown;
};

function validateTransaction(body: TransactionInput) {
  const {
    description,
    amount,
    type,
    account_id,
    category_id,
    transfer_account_id,
    transaction_date,
    notes,
  } = body;

  if (
    typeof description !== "string" ||
    !description.trim() ||
    description.trim().length > 200
  ) {
    return "Enter a valid description (maximum 200 characters).";
  }

  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 999999999999
  ) {
    return "Enter a valid positive amount.";
  }

  if (!["expense", "income", "transfer"].includes(String(type))) {
    return "Invalid transaction type.";
  }

  if (
    typeof account_id !== "string" ||
    !UUID_REGEX.test(account_id)
  ) {
    return "A valid source account is required.";
  }

  if (
    category_id != null &&
    (typeof category_id !== "string" || !UUID_REGEX.test(category_id))
  ) {
    return "Invalid category.";
  }

  if (
    type === "transfer" &&
    (typeof transfer_account_id !== "string" ||
      !UUID_REGEX.test(transfer_account_id) ||
      transfer_account_id === account_id)
  ) {
    return "Choose a different destination account.";
  }

  if (type !== "transfer" && transfer_account_id != null) {
    return "Only transfers can have a destination account.";
  }

  if (
    transaction_date != null &&
    (typeof transaction_date !== "string" ||
      !Number.isFinite(Date.parse(transaction_date)))
  ) {
    return "Invalid transaction date.";
  }

  if (
    notes != null &&
    (typeof notes !== "string" || notes.length > 1000)
  ) {
    return "Notes must be text with a maximum of 1000 characters.";
  }

  return null;
}

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { supabase, user: null };

  return { supabase, user };
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("transactions")
      .select(
        "id, description, amount, type, account_id, category_id, transfer_account_id, transaction_date, notes, created_at"
      )
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false });

    if (error) throw error;

    const [
      { data: accounts, error: accountsError },
      { data: categories, error: categoriesError },
    ] = await Promise.all([
      supabase.from("accounts").select("id, name").eq("user_id", user.id),
      supabase.from("categories").select("id, name").eq("user_id", user.id),
    ]);

    if (accountsError || categoriesError) {
      throw accountsError || categoriesError;
    }

    const accountMap = new Map(
      (accounts ?? []).map((account) => [account.id, account.name])
    );

    const categoryMap = new Map(
      (categories ?? []).map((category) => [category.id, category.name])
    );

    const transactions = (data ?? []).map((transaction) => ({
      ...transaction,
      account_name: accountMap.get(transaction.account_id) ?? "Unknown account",
      category_name: transaction.category_id
        ? categoryMap.get(transaction.category_id) ?? "Uncategorised"
        : "Transfer",
      transfer_account_name: transaction.transfer_account_id
        ? accountMap.get(transaction.transfer_account_id) ?? "Unknown account"
        : null,
    }));

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("GET transactions error:", error);

    return NextResponse.json(
      { error: "Could not load transactions." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as TransactionInput;
    const validationError = validateTransaction(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        description: (body.description as string).trim(),
        amount: body.amount,
        type: body.type,
        account_id: body.account_id,
        category_id: body.type === "transfer" ? null : body.category_id ?? null,
        transfer_account_id:
          body.type === "transfer" ? body.transfer_account_id : null,
        transaction_date:
          body.transaction_date ?? new Date().toISOString(),
        notes:
          typeof body.notes === "string" ? body.notes.trim() || null : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Transaction creation failed:", error.message);
      return NextResponse.json(
        { error: "Could not save the transaction. Check your account and category." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Transaction created successfully.", transaction: data },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request or server error." },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as TransactionInput & { id?: unknown };

    if (typeof body.id !== "string" || !UUID_REGEX.test(body.id)) {
      return NextResponse.json(
        { error: "A valid transaction ID is required." },
        { status: 400 }
      );
    }

    const validationError = validateTransaction(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("transactions")
      .update({
        description: (body.description as string).trim(),
        amount: body.amount,
        type: body.type,
        account_id: body.account_id,
        category_id: body.type === "transfer" ? null : body.category_id ?? null,
        transfer_account_id:
          body.type === "transfer" ? body.transfer_account_id : null,
        transaction_date: body.transaction_date,
        notes:
          typeof body.notes === "string" ? body.notes.trim() || null : null,
      })
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Transaction update failed:", error.message);
      return NextResponse.json(
        { error: "Could not update the transaction. Check its account and category." },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Transaction not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Transaction updated successfully.",
      transaction: data,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request or server error." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as { id?: unknown };

    if (typeof body.id !== "string" || !UUID_REGEX.test(body.id)) {
      return NextResponse.json(
        { error: "A valid transaction ID is required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Transaction deletion failed:", error.message);
      return NextResponse.json(
        { error: "Could not delete the transaction." },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Transaction not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Transaction deleted successfully.",
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request or server error." },
      { status: 400 }
    );
  }
}
