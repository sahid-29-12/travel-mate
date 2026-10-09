"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, Clock3, MapPin, MessageCircle, Plus, Users } from "lucide-react";
import MapModal from "@/components/MapModal";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/env";

type Ride = {
  id: string;
  user_id: string;
  author_name: string;
  origin: string;
  destination: string;
  departure_at: string;
  seats_needed: number;
  created_at: string;
};

type FormTarget = "source" | "destination";
type UserMode = "checking" | "guest" | "member" | "signed-out";

function formatDeparture(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function readResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || "The request could not be completed.");
  }
  return data;
}

async function requestRides() {
  const response = await fetch("/api/rides", { cache: "no-store" });
  return readResponse<{ rides: Ride[] }>(response);
}

export default function RideSharePage() {
  const router = useRouter();
  const backendConfigured = hasSupabaseConfig();
  const [userMode, setUserMode] = useState<UserMode>(backendConfigured ? "checking" : "signed-out");
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(backendConfigured);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [pageError, setPageError] = useState(
    backendConfigured ? "" : "Supabase is not configured. Add the project URL and public key to .env.local, then restart the dev server.",
  );
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [departureAt, setDepartureAt] = useState("");
  const [seatsNeeded, setSeatsNeeded] = useState(1);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [mapTarget, setMapTarget] = useState<FormTarget | null>(null);

  useEffect(() => {
    if (!backendConfigured) return;
    let cancelled = false;
    void requestRides()
      .then((data) => {
        if (!cancelled) setRides(data.rides);
      })
      .catch((error: unknown) => {
        if (!cancelled) setPageError(error instanceof Error ? error.message : "Unable to load ride posts.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backendConfigured]);

  useEffect(() => {
    if (!backendConfigured) return;
    let cancelled = false;
    void createClient().auth.getUser()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setPageError(error.message);
          setUserMode("signed-out");
          return;
        }
        setUserMode(data.user?.is_anonymous ? "guest" : data.user ? "member" : "signed-out");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPageError(error instanceof Error ? error.message : "Unable to check your sign-in status.");
        setUserMode("signed-out");
      });
    return () => {
      cancelled = true;
    };
  }, [backendConfigured]);

  const openMap = (target: FormTarget) => {
    setMapTarget(target);
    setMapModalOpen(true);
  };

  const handleLocationSelect = (address: string) => {
    if (mapTarget === "source") setSource(address);
    if (mapTarget === "destination") setDestination(address);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      const response = await fetch("/api/rides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: source,
          destination,
          departureAt: new Date(departureAt).toISOString(),
          seatsNeeded,
        }),
      });
      const data = await readResponse<{ ride: Ride }>(response);
      setRides((current) => [...current, data.ride].sort(
        (left, right) => Date.parse(left.departure_at) - Date.parse(right.departure_at),
      ));
      setSource("");
      setDestination("");
      setDepartureAt("");
      setSeatsNeeded(1);
      setShowCreateForm(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to publish your ride.");
    } finally {
      setSubmitting(false);
    }
  };

  const startConversation = async (ride: Ride) => {
    setActiveConversation(ride.id);
    setPageError("");
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId: ride.user_id, rideId: ride.id }),
      });
      const data = await readResponse<{ conversationId: string }>(response);
      router.push(`/messages?conversationId=${encodeURIComponent(data.conversationId)}`);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to start a conversation.");
    } finally {
      setActiveConversation(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <MapModal
        key={mapModalOpen ? mapTarget ?? "closed" : "closed"}
        isOpen={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        onSelect={handleLocationSelect}
        enableCurrentLocation={mapTarget === "source"}
        title={mapTarget === "source" ? "Select Pickup on Map" : "Select Destination on Map"}
      />

      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary dark:text-purple-300">Go further, together</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Find your ride share
          </h1>
          <p className="mt-2 max-w-xl text-gray-600 dark:text-gray-400">
            Find a travelling companion or share where you’re headed. Your posts are saved to your TravelMate account.
          </p>
        </div>
        {userMode === "member" ? (
          <button
            type="button"
            onClick={() => {
              setShowCreateForm((open) => !open);
              setFormError("");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:bg-primary-strong"
          >
            <Plus className="h-5 w-5" />
            {showCreateForm ? "Close form" : "Post a ride"}
          </button>
        ) : userMode === "checking" ? (
          <button type="button" disabled className="rounded-xl bg-gray-300 px-5 py-3 font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            Checking account...
          </button>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:bg-primary-strong"
          >
            Sign in to post a ride
          </Link>
        )}
      </header>

      {userMode === "guest" && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100 sm:flex-row sm:items-center sm:justify-between">
          <span>You’re browsing as a guest. Public rides are visible, but posting or messaging requires a full account.</span>
          <Link href="/login" className="shrink-0 font-bold underline">Sign in to participate</Link>
        </div>
      )}

      {showCreateForm && userMode === "member" && (
        <section className="mb-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-xl shadow-gray-900/5 dark:border-gray-800 dark:bg-gray-900 sm:p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Share your upcoming trip</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Sign in is required to publish a ride.</p>
          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">Pickup point</span>
              <span className="flex gap-2">
                <input
                  required
                  minLength={2}
                  maxLength={160}
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  placeholder="Pickup point"
                  className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <button type="button" onClick={() => openMap("source")} className="rounded-xl border border-gray-200 px-3 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800" aria-label="Choose pickup point on map">
                  <MapPin className="h-5 w-5" />
                </button>
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">Going to</span>
              <span className="flex gap-2">
                <input
                  required
                  minLength={2}
                  maxLength={160}
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder="Destination"
                  className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <button type="button" onClick={() => openMap("destination")} className="rounded-xl border border-gray-200 px-3 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800" aria-label="Choose destination on map">
                  <MapPin className="h-5 w-5" />
                </button>
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">Departure time</span>
              <input
                required
                type="datetime-local"
                value={departureAt}
                onChange={(event) => setDepartureAt(event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">People needed</span>
              <select
                value={seatsNeeded}
                onChange={(event) => setSeatsNeeded(Number(event.target.value))}
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                {[1, 2, 3, 4, 5, 6].map((seats) => (
                  <option key={seats} value={seats}>{seats} {seats === 1 ? "person" : "people"}</option>
                ))}
              </select>
            </label>
            {formError && <p role="alert" className="sm:col-span-2 text-sm font-medium text-red-600 dark:text-red-400">{formError}</p>}
            <button
              type="submit"
                  disabled={submitting || !backendConfigured}
              className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 font-bold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary dark:hover:bg-primary-strong"
            >
              {submitting ? "Publishing..." : "Publish ride"}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </section>
      )}

      {pageError && (
        <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <span>{pageError}</span>
          <button
            type="button"
            disabled={!backendConfigured}
            onClick={() => {
              if (!backendConfigured) return;
              setLoading(true);
              setPageError("");
              void requestRides()
                .then((data) => setRides(data.rides))
                .catch((error: unknown) => setPageError(error instanceof Error ? error.message : "Unable to load ride posts."))
                .finally(() => setLoading(false));
            }}
            className="shrink-0 font-bold underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            Retry
          </button>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upcoming rides</h2>
        {!loading && !pageError && <span className="text-sm text-gray-500 dark:text-gray-400">{rides.length} {rides.length === 1 ? "ride" : "rides"}</span>}
      </div>

      {loading ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          Loading available rides...
        </div>
      ) : pageError ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          Ride listings are unavailable until the backend request succeeds.
        </div>
      ) : rides.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center dark:border-gray-700 dark:bg-gray-900">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-primary dark:bg-purple-900/40 dark:text-purple-300">
            <Users className="h-7 w-7" />
          </span>
          <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">No rides posted yet</h3>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Be the first to share a journey with your community.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rides.map((ride) => (
            <article key={ride.id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Posted by <span className="text-gray-900 dark:text-gray-200">{ride.author_name}</span>
                  </p>
                  <h3 className="mt-2 break-words text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                    {ride.origin} <span className="text-primary">to</span> {ride.destination}
                  </h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {formatDeparture(ride.departure_at)}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      <Clock3 className="h-4 w-4 text-primary" />
                      Looking for {ride.seats_needed} {ride.seats_needed === 1 ? "person" : "people"}
                    </span>
                  </div>
                </div>
                {userMode === "member" ? (
                  <button
                    type="button"
                    onClick={() => void startConversation(ride)}
                    disabled={activeConversation === ride.id}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 font-bold text-primary-strong transition-colors hover:bg-purple-100 disabled:cursor-wait disabled:opacity-60 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-200 dark:hover:bg-purple-900/60"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {activeConversation === ride.id ? "Opening..." : "Message"}
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 font-bold text-primary-strong transition-colors hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-200 dark:hover:bg-purple-900/60"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Sign in to message
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
