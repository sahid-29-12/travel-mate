import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Messaging is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("Unable to verify messaging user:", authError.message);
    return NextResponse.json({ error: "Unable to verify your account." }, { status: 401 });
  }
  if (!auth.user) {
    return NextResponse.json({ error: "Sign in to view your messages." }, { status: 401 });
  }

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("*")
    .or(`participant_one.eq.${auth.user.id},participant_two.eq.${auth.user.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load conversations:", error.message);
    return NextResponse.json({ error: "Unable to load conversations." }, { status: 500 });
  }

  const items = await Promise.all(
    conversations.map(async (conversation) => {
      const { data: latestMessage, error: messageError } = await supabase
        .from("messages")
        .select("body, created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (messageError) {
        console.error("Failed to load conversation preview:", messageError.message);
        throw new Error("Unable to load conversation previews.");
      }

      const isFirst = conversation.participant_one === auth.user.id;
      return {
        id: conversation.id,
        peerId: isFirst ? conversation.participant_two : conversation.participant_one,
        name: isFirst ? conversation.participant_two_name : conversation.participant_one_name,
        rideId: conversation.ride_id,
        lastMessage: latestMessage?.body ?? "Start the conversation",
        updatedAt: latestMessage?.created_at ?? conversation.created_at,
      };
    }),
  ).catch((error: unknown) => {
    console.error("Unable to assemble conversation list:", error);
    return null;
  });

  if (!items) {
    return NextResponse.json({ error: "Unable to load conversation previews." }, { status: 500 });
  }

  return NextResponse.json({ conversations: items });
}

export async function POST(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Messaging is not configured." }, { status: 503 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json({ error: "A conversation recipient is required." }, { status: 400 });
  }

  const { peerId, rideId } = payload as { peerId?: unknown; rideId?: unknown };
  if (!isUuid(peerId) || (rideId != null && !isUuid(rideId))) {
    return NextResponse.json({ error: "The selected recipient or ride is invalid." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("Unable to verify conversation participant:", authError.message);
    return NextResponse.json({ error: "Unable to verify your account." }, { status: 401 });
  }
  if (!auth.user) {
    return NextResponse.json({ error: "Sign in to start a conversation." }, { status: 401 });
  }
  if (auth.user.is_anonymous) {
    return NextResponse.json({ error: "Guest accounts can browse rides, but must sign in to message travellers." }, { status: 403 });
  }
  if (peerId === auth.user.id) {
    return NextResponse.json({ error: "You cannot start a conversation with yourself." }, { status: 400 });
  }

  if (rideId) {
    const { data: ride, error: rideError } = await supabase
      .from("rides")
      .select("user_id")
      .eq("id", rideId)
      .single();
    if (rideError) {
      console.error("Unable to verify conversation ride:", rideError.message);
      return NextResponse.json({ error: "The selected ride could not be found." }, { status: 404 });
    }
    if (ride.user_id !== peerId) {
      return NextResponse.json({ error: "The selected user does not own this ride." }, { status: 400 });
    }
  }

  const [ownProfileResult, peerProfileResult] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", auth.user.id).single(),
    supabase.from("public_profiles").select("full_name").eq("id", peerId).single(),
  ]);

  if (ownProfileResult.error || peerProfileResult.error) {
    console.error("Unable to load conversation participants:", ownProfileResult.error?.message, peerProfileResult.error?.message);
    return NextResponse.json({ error: "Unable to load participant profiles." }, { status: 500 });
  }

  let existingQuery = supabase
    .from("conversations")
    .select("*")
    .or(
      `and(participant_one.eq.${auth.user.id},participant_two.eq.${peerId}),and(participant_one.eq.${peerId},participant_two.eq.${auth.user.id})`,
    );
  existingQuery = rideId ? existingQuery.eq("ride_id", rideId) : existingQuery.is("ride_id", null);
  const { data: existing, error: existingError } = await existingQuery.limit(1).maybeSingle();

  if (existingError) {
    console.error("Unable to check for existing conversation:", existingError.message);
    return NextResponse.json({ error: "Unable to start a conversation." }, { status: 500 });
  }
  if (existing) {
    return NextResponse.json({ conversationId: existing.id });
  }

  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      participant_one: auth.user.id,
      participant_two: peerId,
      participant_one_name: ownProfileResult.data.full_name,
      participant_two_name: peerProfileResult.data.full_name,
      ride_id: rideId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Unable to create conversation:", error.message);
    return NextResponse.json({ error: "Unable to start a conversation." }, { status: 500 });
  }

  return NextResponse.json({ conversationId: conversation.id }, { status: 201 });
}
