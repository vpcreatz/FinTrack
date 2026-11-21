
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ACCOUNT_TYPES = ["cash", "bank", "wallet", "other"];


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

    // Fetch the user's accounts
    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("id, name, account_type, opening_balance, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (accountsError) throw accountsError;

    // Fetch all transactions belonging to the user
    const { data: transactions, error: transactionsError } =
      await supabase
        .from("transactions")
        .select("account_id, transfer_account_id, type, amount")
        .eq("user_id", user.id);

    if (transactionsError) throw transactionsError;

    // Calculate each account's current balance
    const balances = new Map<string, number>();

    for (const account of accounts ?? []) {
      balances.set(
        account.id,
        Number(account.opening_balance) || 0
      );
    }

    for (const transaction of transactions ?? []) {
      const amount = Number(transaction.amount);

      if (transaction.type === "income") {
        balances.set(
          transaction.account_id,
          (balances.get(transaction.account_id) ?? 0) + amount
        );
      }

      if (transaction.type === "expense") {
        balances.set(
          transaction.account_id,
          (balances.get(transaction.account_id) ?? 0) - amount
        );
      }

      if (transaction.type === "transfer") {
        // Subtract from the source account
        balances.set(
          transaction.account_id,
          (balances.get(transaction.account_id) ?? 0) - amount
        );

        // Add to the destination account
        if (transaction.transfer_account_id) {
          balances.set(
            transaction.transfer_account_id,
            (balances.get(transaction.transfer_account_id) ?? 0) + amount
          );
        }
      }
    }

    const result = (accounts ?? []).map((account) => ({
      ...account,
      current_balance: balances.get(account.id) ?? 0,
    }));

    return NextResponse.json({ accounts: result });
  } catch (error) {
    console.error("GET accounts error:", error);

    return NextResponse.json(
      { error: "Could not load accounts." },
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
    const accountType = body.account_type;
    const openingBalance = body.opening_balance ?? 0;

    if (!name || name.length > 60) {
      return NextResponse.json(
        { error: "Enter an account name (maximum 60 characters)." },
        { status: 400 }
      );
    }

    if (
      typeof accountType !== "string" ||
      !ACCOUNT_TYPES.includes(accountType)
    ) {
      return NextResponse.json(
        { error: "Invalid account type." },
        { status: 400 }
      );
    }

    if (
      typeof openingBalance !== "number" ||
      !Number.isFinite(openingBalance) ||
      Math.abs(openingBalance) > 999999999999
    ) {
      return NextResponse.json(
        { error: "Enter a valid opening balance." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("accounts")
      .insert({
        user_id: user.id,
        name,
        account_type: accountType,
        opening_balance: openingBalance,
      })
      .select("id, name, account_type, opening_balance, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json(
      { message: "Account created successfully.", account: data },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST accounts error:", error);

    return NextResponse.json(
      { error: "Could not create account." },
      { status: 500 }
    );
  }
}
