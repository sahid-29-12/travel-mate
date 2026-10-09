import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "The ride service is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rides")
    .select("*")
    .order("departure_at", { ascending: true });

  if (error) {
    console.error("Failed to load ride posts:", error.message);
    return NextResponse.json({ error: "Unable to load ride posts." }, { status: 500 });
  }

  return NextResponse.json({ rides: data });
}

export async function POST(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "The ride service is not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "A ride post is required." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const origin = typeof payload.origin === "string" ? payload.origin.trim() : "";
  const destination = typeof payload.destination === "string" ? payload.destination.trim() : "";
  const departureAt = typeof payload.departureAt === "string" ? payload.departureAt : "";
  const seatsNeeded = payload.seatsNeeded;
  const departureTimestamp = Date.parse(departureAt);

  if (origin.length < 2 || origin.length > 160 || destination.length < 2 || destination.length > 160) {
    return NextResponse.json({ error: "Enter a starting point and destination between 2 and 160 characters." }, { status: 400 });
  }
  if (!Number.isFinite(departureTimestamp) || departureTimestamp <= Date.now()) {
    return NextResponse.json({ error: "Choose a departure time in the future." }, { status: 400 });
  }
  if (!Number.isInteger(seatsNeeded) || Number(seatsNeeded) < 1 || Number(seatsNeeded) > 6) {
    return NextResponse.json({ error: "Seats needed must be between 1 and 6." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("Unable to verify ride poster:", authError.message);
    return NextResponse.json({ error: "Unable to verify your account." }, { status: 401 });
  }
  if (!authData.user) {
    return NextResponse.json({ error: "Sign in to post a ride." }, { status: 401 });
  }
  if (authData.user.is_anonymous) {
    return NextResponse.json({ error: "Guest accounts can browse rides, but must sign in to post one." }, { status: 403 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", authData.user.id)
    .single();
  if (profileError) {
    console.error("Unable to load ride poster profile:", profileError.message);
    return NextResponse.json({ error: "Your profile is not ready yet. Please try again." }, { status: 500 });
  }

  const authorName = profile.full_name.trim() || authData.user.email;
  if (!authorName) {
    return NextResponse.json({ error: "Add a name to your profile before posting a ride." }, { status: 400 });
  }

  const { data: ride, error } = await supabase
    .from("rides")
    .insert({
      user_id: authData.user.id,
      author_name: authorName,
      origin,
      destination,
      departure_at: new Date(departureTimestamp).toISOString(),
      seats_needed: Number(seatsNeeded),
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create ride post:", error.message);
    return NextResponse.json({ error: "Unable to publish your ride. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ride }, { status: 201 });
}
