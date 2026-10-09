"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, MapPin, Users, Wallet, Sparkles, Train, ChevronRight, ShieldCheck, Route, Clock3, Map } from "lucide-react";
import MapModal from "@/components/MapModal";

export default function Home() {
  const router = useRouter();
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [mapTarget, setMapTarget] = useState<"source" | "destination" | null>(null);

  const searchRoutes = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams({ source, destination });
    router.push(`/compare?${params.toString()}`);
  };

  const handleMapLocationSelect = (address: string) => {
    if (mapTarget === "source") setSource(address);
    if (mapTarget === "destination") setDestination(address);
  };

  return (
    <div className="flex flex-col items-center">
      <MapModal
        key={mapTarget ?? "closed"}
        isOpen={mapTarget !== null}
        onClose={() => setMapTarget(null)}
        onSelect={handleMapLocationSelect}
        enableCurrentLocation={mapTarget === "source"}
        title={mapTarget === "source" ? "Choose your starting point" : "Choose your destination"}
      />

      {/* Hero Section */}
      <section className="relative isolate w-full overflow-hidden px-4 pt-16 pb-24 text-center sm:px-6 sm:pt-24 lg:px-8">
        <div className="mx-auto max-w-5xl fade-in-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 px-4 py-2 text-sm font-semibold text-purple-700 dark:text-purple-300 shadow-sm transition-transform hover:scale-105">
            <Sparkles className="h-4 w-4 text-accent-warm" />
            Your city, connected beautifully
          </span>
          <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-6xl lg:text-7xl">
            Good journeys start with <br className="hidden sm:block" />
            <span className="gradient-text">better choices.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-700 dark:text-gray-300 sm:text-xl fade-in-up-delay-1">
            Find a ride buddy or compare local transit fares. Travel together,
            spend less, and make every trip feel a little easier and more enjoyable.
          </p>
          <div className="mx-auto mt-10 flex max-w-lg flex-col justify-center gap-4 sm:flex-row fade-in-up-delay-2">
            <Link
              href="/ride-share"
              className="group flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 hover:bg-primary-strong hover:shadow-xl hover:shadow-primary/30"
            >
              <Users className="h-5 w-5" />
              Find a ride share
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/compare"
              className="group flex items-center justify-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-8 py-4 font-bold text-gray-700 dark:text-white shadow-sm transition-all hover:-translate-y-1 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md"
            >
              <Train className="h-5 w-5 text-sky" />
              Explore transit
            </Link>
          </div>
        </div>
      </section>

      {/* Search Widget */}
      <section className="relative z-10 -mt-8 w-full max-w-4xl px-4 sm:px-6 lg:px-8 fade-in-up-delay-3">
        <div 
          className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 p-6 shadow-2xl shadow-purple-900/5 dark:shadow-black/50 backdrop-blur-xl sm:p-8"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
            transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.4s ease'
          }}
        >
          <div className="mb-6 flex items-center gap-3 text-sm font-bold text-gray-800 dark:text-gray-200">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300">
              <MapPin className="h-5 w-5" />
            </span>
            <span className="text-lg">Where are you headed?</span>
          </div>
          <form
            onSubmit={searchRoutes}
            className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"
          >
            <div className="relative group">
              <label>
                <span className="sr-only">Pickup point</span>
                <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary" />
                <input
                  type="text"
                  required
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  placeholder="Pickup point"
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-4 pl-12 pr-14 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </label>
              <button
                type="button"
                onClick={() => setMapTarget("source")}
                aria-label="Choose pickup point on map"
                title="Choose on map"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-primary-strong hover:bg-purple-100 focus-visible:outline-offset-2 dark:text-purple-300 dark:hover:bg-purple-900/50"
              >
                <Map className="h-5 w-5" />
              </button>
            </div>
            <div className="relative group">
              <label>
                <span className="sr-only">Destination</span>
                <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary" />
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder="Where to?"
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-4 pl-12 pr-14 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </label>
              <button
                type="button"
                onClick={() => setMapTarget("destination")}
                aria-label="Choose destination on map"
                title="Choose on map"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-primary-strong hover:bg-purple-100 focus-visible:outline-offset-2 dark:text-purple-300 dark:hover:bg-purple-900/50"
              >
                <Map className="h-5 w-5" />
              </button>
            </div>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-2xl bg-gray-900 dark:bg-primary px-8 py-4 font-bold text-white shadow-md transition-all hover:bg-gray-800 dark:hover:bg-primary-strong hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20 active:scale-95"
            >
              Compare routes
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>

      <section aria-label="TravelMate benefits" className="w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 rounded-3xl border border-gray-200/80 bg-white/70 p-5 shadow-sm backdrop-blur sm:grid-cols-3 sm:p-6 dark:border-gray-800 dark:bg-gray-900/70">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-primary dark:bg-purple-900/40 dark:text-purple-300">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold text-gray-900 dark:text-white">Choose with confidence</p>
              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">See your options side by side</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
              <Route className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold text-gray-900 dark:text-white">One place to plan</p>
              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">Compare rides and transit</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300">
              <Clock3 className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold text-gray-900 dark:text-white">A smoother commute</p>
              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">Find a route that fits your day</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center fade-in-up-delay-4">
          <p className="text-sm font-bold uppercase tracking-wider text-primary dark:text-purple-400">A smarter way around</p>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            More than just getting there
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
            One simple place to meet fellow travellers and find the option that
            works best for your day.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3 fade-in-up-delay-5">
          <article className="card-hover rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-sm">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
              <Users className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Connect & share</h3>
            <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-400">
              Meet neighbours heading your way and split the cost of a cab. Save money and make new friends.
            </p>
            <Link href="/ride-share" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary dark:text-purple-400 hover:text-primary-strong dark:hover:text-purple-300">
              Explore rides <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
          
          <article className="card-hover rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-sm">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-900/30 text-accent-warm dark:text-orange-400">
              <Wallet className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Spend thoughtfully</h3>
            <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-400">
              Compare estimated fares and travel times before choosing a route. Always get the best deal.
            </p>
            <Link href="/compare" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary dark:text-purple-400 hover:text-primary-strong dark:hover:text-purple-300">
              Compare options <ArrowRight className="h-4 w-4" />
            </Link>
          </article>

          <article className="card-hover rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-sm">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-900/30 text-sky dark:text-sky-400">
              <Train className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Every way to go</h3>
            <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-400">
              See cabs, bikes, buses, and trains side by side in one view. Make informed transit decisions.
            </p>
            <Link href="/compare" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary dark:text-purple-400 hover:text-primary-strong dark:hover:text-purple-300">
              Plan a journey <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        </div>
      </section>

      <section className="w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-gray-900 px-6 py-12 text-center shadow-2xl shadow-purple-950/15 sm:px-12 sm:py-16 dark:bg-gray-900">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-32 -z-10 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-20 -z-10 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl" />
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-purple-300">Your next trip, made simpler</p>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Better journeys begin with a better plan.
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-7 text-gray-300">
            Find someone going your way or compare your travel options before you head out.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/ride-share"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-bold text-white shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:bg-primary-strong"
            >
              Find a ride share
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 font-bold text-white hover:-translate-y-0.5 hover:bg-white/10"
            >
              Compare routes
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
