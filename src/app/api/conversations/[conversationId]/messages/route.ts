import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/conversations/[conversationId]/messages">,
) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Messaging is not configured." }, { status: 503 });
  }

  const { conversationId } = await context.params;
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("Unable to verify message reader:", authError.message);
    return NextResponse.json({ error: "Unable to verify your account." }, { status: 401 });
  }
  if (!auth.user) {
    return NextResponse.json({ error: "Sign in to view messages." }, { status: 401 });
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError) {
    console.error("Unable to verify conversation access:", conversationError.message);
    return NextResponse.json({ error: "Unable to load this conversation." }, { status: 500 });
  }
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Unable to load conversation messages:", error.message);
    return NextResponse.json({ error: "Unable to load messages." }, { status: 500 });
  }

  return NextResponse.json({ messages });
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/conversations/[conversationId]/messages">,
) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Messaging is not configured." }, { status: 503 });
  }

  const { conversationId } = await context.params;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof payload !== "object" || payload === null || typeof (payload as { body?: unknown }).body !== "string") {
    return NextResponse.json({ error: "Enter a message before sending." }, { status: 400 });
  }

  const body = ((payload as { body: string }).body).trim();
  if (body.length < 1 || body.length > 4000) {
    return NextResponse.json({ error: "Messages must be between 1 and 4,000 characters." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("Unable to verify message sender:", authError.message);
    return NextResponse.json({ error: "Unable to verify your account." }, { status: 401 });
  }
  if (!auth.user) {
    return NextResponse.json({ error: "Sign in to send messages." }, { status: 401 });
  }
  if (auth.user.is_anonymous) {
    return NextResponse.json({ error: "Guest accounts can browse rides, but must sign in to send messages." }, { status: 403 });
  }

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: auth.user.id,
      body,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Unable to save message:", error.message);
    return NextResponse.json({ error: "Unable to send your message." }, { status: 500 });
  }

  return NextResponse.json({ message }, { status: 201 });
}
