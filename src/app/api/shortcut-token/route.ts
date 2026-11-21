import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}

export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const { data, error } = await supabase
    .from("shortcut_tokens")
    .select("id, token_prefix, created_at, last_used_at, revoked_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Shortcut token lookup failed:", error.message);
    return NextResponse.json({ error: "Could not load Shortcut connection. Run the iOS Shortcuts SQL migration in Supabase.", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ token: data });
}

export async function POST() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  // Only one active token per account. Revoke old tokens before issuing a replacement.
  const { error: revokeError } = await supabase
    .from("shortcut_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("revoked_at", null);

  if (revokeError) {
    console.error("Shortcut token revoke-before-create failed:", revokeError.message);
    return NextResponse.json({ error: "Could not prepare a new Shortcut token. Check shortcut_tokens UPDATE permissions.", detail: revokeError.message }, { status: 500 });
  }

  const token = `ft_${randomBytes(32).toString("hex")}`;
  const { data, error } = await supabase
    .from("shortcut_tokens")
    .insert({
      user_id: user.id,
      token_hash: hashToken(token),
      token_prefix: token.slice(0, 11),
    })
    .select("id, token_prefix, created_at, last_used_at, revoked_at")
    .single();

  if (error) {
    console.error("Shortcut token creation failed:", error.message);
    return NextResponse.json({ error: "Could not create Shortcut token. Check shortcut_tokens INSERT permissions.", detail: error.message }, { status: 500 });
  }

  // Raw token is shown only once and is never stored in plaintext.
  return NextResponse.json({ token: data, secret: token }, { status: 201 });
}

export async function DELETE() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const { error } = await supabase
    .from("shortcut_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("revoked_at", null);

  if (error) {
    console.error("Shortcut token revocation failed:", error.message);
    return NextResponse.json({ error: "Could not revoke Shortcut token.", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ message: "Shortcut connection revoked." });
}
