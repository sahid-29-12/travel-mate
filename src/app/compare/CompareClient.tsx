"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowRightLeft,
  Bike,
  Car,
  Check,
  CircleAlert,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Sparkles,
  Train,
} from "lucide-react";
import MapModal from "@/components/MapModal";
import { loadGoogleMapsLibraries, loadGoogleMapsRoutes } from "@/lib/googleMaps";

const RIDE_TYPES = [
  { name: "All rides", icon: Car },
  { name: "Bike", icon: Bike },
  { name: "Auto", icon: Car },
  { name: "Cab", icon: Car },
] as const;

const PROVIDERS = [
  {
    id: "uber",
    name: "Uber",
    url: "https://m.uber.com/ul/",
    mark: "U",
    markClass: "bg-gray-950 text-white dark:bg-white dark:text-gray-950",
  },
  {
    id: "ola",
    name: "Ola",
    url: "https://www.olacabs.com/",
    mark: "O",
    markClass: "bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-300",
  },
  {
    id: "rapido",
    name: "Rapido",
    url: "https://www.rapido.bike/",
    mark: "R",
    markClass: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
] as const;

type RideType = (typeof RIDE_TYPES)[number]["name"];
type VehicleType = Exclude<RideType, "All rides">;
type ProviderId = (typeof PROVIDERS)[number]["id"];
type FareRates = { baseFare: number; perKm: number; perMinute: number };
type RateTable = Record<ProviderId, Record<VehicleType, FareRates>>;
type RouteMetrics = {
  drivingDistanceKm: number;
  drivingMinutes: number;
  bikeDistanceKm: number;
  bikeMinutes: number;
};

const INITIAL_RATES: RateTable = {
  uber: {
    Bike: { baseFare: 20, perKm: 6, perMinute: 1 },
    Auto: { baseFare: 30, perKm: 12, perMinute: 1 },
    Cab: { baseFare: 50, perKm: 16, perMinute: 2 },
  },
  ola: {
    Bike: { baseFare: 15, perKm: 6, perMinute: 1 },
    Auto: { baseFare: 25, perKm: 11, perMinute: 1 },
    Cab: { baseFare: 45, perKm: 15, perMinute: 2 },
  },
  rapido: {
    Bike: { baseFare: 15, perKm: 5, perMinute: 1 },
    Auto: { baseFare: 25, perKm: 10, perMinute: 1 },
    Cab: { baseFare: 50, perKm: 16, perMinute: 2 },
  },
};

const formatRupees = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

export default function ComparePage({
  initialSource,
  initialDestination,
}: {
  initialSource?: string;
  initialDestination?: string;
}) {
  const hasSearch = !!(initialSource?.trim() && initialDestination?.trim());
  const [searched, setSearched] = useState(hasSearch);
  const [source, setSource] = useState(initialSource ?? "");
  const [destination, setDestination] = useState(initialDestination ?? "");
  const [selectedRideType, setSelectedRideType] = useState<RideType>("All rides");
  const [rates, setRates] = useState<RateTable>(INITIAL_RATES);
  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null);
  const [bikeRouteFallback, setBikeRouteFallback] = useState(false);
  const [routeStatus, setRouteStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [routeError, setRouteError] = useState("");
  const [sourceCoordinates, setSourceCoordinates] = useState<google.maps.LatLngLiteral | null>(null);
  const [destinationCoordinates, setDestinationCoordinates] = useState<google.maps.LatLngLiteral | null>(null);
  const [locationStatus, setLocationStatus] = useState<"loading" | "located" | "error" | "idle">(
    initialSource?.trim() ? "idle" : "loading",
  );
  const [locationError, setLocationError] = useState("");
  const sourceEditedRef = useRef(false);
  const destinationEditedRef = useRef(!!initialDestination?.trim());
  const initialCompareStartedRef = useRef(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [mapTarget, setMapTarget] = useState<"source" | "destination" | null>(null);

  useEffect(() => {
    if (initialSource?.trim()) return;
    if (!navigator.geolocation) {
      const timer = window.setTimeout(() => {
        if (sourceEditedRef.current) return;
        setLocationStatus("error");
        setLocationError("Location access is not supported. Enter a pickup or choose one on the map.");
      }, 0);
      return () => window.clearTimeout(timer);
    }

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (cancelled || sourceEditedRef.current) return;
        setSourceCoordinates({ lat: coords.latitude, lng: coords.longitude });
        setLocationStatus("located");
        void (async () => {
          try {
            const [, , geocodingLibrary] = await loadGoogleMapsLibraries();
            const { Geocoder } = geocodingLibrary;
            const { results } = await new Geocoder().geocode({
              location: { lat: coords.latitude, lng: coords.longitude },
            });
            if (cancelled || sourceEditedRef.current) return;
            const address = results[0]?.formatted_address;
            setSource(address || "Current location");
            if (!destinationEditedRef.current) {
              const cityResult = results.find(
                (result) =>
                  result.types.includes("locality") &&
                  result.address_components.some((component) => component.types.includes("locality")),
              );
              const city = cityResult?.address_components.find((component) =>
                component.types.includes("locality"),
              );
              if (city && cityResult) {
                setDestination(city.long_name);
                setDestinationCoordinates(cityResult.geometry.location.toJSON());
              }
            }
          } catch (error: unknown) {
            if (cancelled || sourceEditedRef.current) return;
            console.error("Unable to reverse geocode current pickup location:", error);
            setSource("Current location");
          }
        })();
      },
      (error) => {
        if (cancelled || sourceEditedRef.current) return;
        setLocationStatus("error");
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Enter a pickup or choose one on the map."
            : error.code === error.POSITION_UNAVAILABLE
              ? "Your current location is unavailable. Enter a pickup or choose one on the map."
              : "Finding your location timed out. Enter a pickup or choose one on the map.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 15_000 },
    );

    return () => {
      cancelled = true;
    };
  }, [initialSource]);

  const openMap = (target: "source" | "destination") => {
    setMapTarget(target);
    setMapModalOpen(true);
  };

  const invalidateRoute = () => {
    setSearched(false);
    setRouteMetrics(null);
    setRouteStatus("idle");
    setRouteError("");
    setBikeRouteFallback(false);
  };

  const handleLocationSelect = (address: string, coordinates: google.maps.LatLngLiteral) => {
    invalidateRoute();
    if (mapTarget === "source") {
      sourceEditedRef.current = true;
      setSource(address);
      setSourceCoordinates(coordinates);
      setLocationStatus("idle");
    }
    if (mapTarget === "destination") {
      destinationEditedRef.current = true;
      setDestination(address);
      setDestinationCoordinates(coordinates);
    }
  };

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}`;
  const selectedTypeLabel = selectedRideType === "All rides" ? "ride options" : `${selectedRideType.toLowerCase()} options`;
  const visibleRideTypes: VehicleType[] =
    selectedRideType === "All rides" ? ["Bike", "Auto", "Cab"] : [selectedRideType];

  const updateRate = (providerId: ProviderId, vehicleType: VehicleType, key: keyof FareRates, value: number) => {
    setRates((current) => ({
      ...current,
      [providerId]: {
        ...current[providerId],
        [vehicleType]: { ...current[providerId][vehicleType], [key]: value },
      },
    }));
  };

  const getFare = (providerId: ProviderId, vehicleType: VehicleType) => {
    if (!routeMetrics) return null;
    const fare = rates[providerId][vehicleType];
    const distanceKm = vehicleType === "Bike" ? routeMetrics.bikeDistanceKm : routeMetrics.drivingDistanceKm;
    const durationMinutes = vehicleType === "Bike" ? routeMetrics.bikeMinutes : routeMetrics.drivingMinutes;
    return Math.round(fare.baseFare + distanceKm * fare.perKm + durationMinutes * fare.perMinute);
  };

  const compareRides = useCallback(async () => {
    if (!source.trim() || !destination.trim()) return;
    setSearched(true);
    setRouteStatus("loading");
    setRouteError("");
    setRouteMetrics(null);
    setBikeRouteFallback(false);

    try {
      if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
        throw new Error("Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local and enable the Google Maps Routes API.");
      }
      const { Route } = await loadGoogleMapsRoutes();
      const origin = sourceCoordinates ?? source.trim();
      const destinationPoint = destinationCoordinates ?? destination.trim();
      const routeRequest = (travelMode: "DRIVING" | "TWO_WHEELER") =>
        Route.computeRoutes({
          origin,
          destination: destinationPoint,
          travelMode,
          fields: ["distanceMeters", "durationMillis"],
        }).then(({ routes }) => {
          const route = routes?.[0];
          if (!route?.distanceMeters || !route.durationMillis) {
            throw new Error("No driving route was found for those locations.");
          }
          return {
            distanceKm: route.distanceMeters / 1000,
            minutes: route.durationMillis / 60_000,
          };
        });

      const driving = await routeRequest("DRIVING");
      let bike = driving;
      let usedBikeFallback = false;
      try {
        bike = await routeRequest("TWO_WHEELER");
      } catch {
        bike = driving;
        usedBikeFallback = true;
      }

      setRouteMetrics({
        drivingDistanceKm: driving.distanceKm,
        drivingMinutes: driving.minutes,
        bikeDistanceKm: bike.distanceKm,
        bikeMinutes: bike.minutes,
      });
      setBikeRouteFallback(usedBikeFallback);
      setRouteStatus("ready");
    } catch (error) {
      setRouteStatus("error");
      setRouteError(error instanceof Error ? error.message : "Could not calculate a route. Check the locations and try again.");
    }
  }, [destination, destinationCoordinates, source, sourceCoordinates]);

  useEffect(() => {
    if (!hasSearch || initialCompareStartedRef.current) return;
    initialCompareStartedRef.current = true;
    void compareRides();
  }, [compareRides, hasSearch]);

  const fares = routeMetrics
    ? PROVIDERS.flatMap((provider) =>
        visibleRideTypes.map((vehicleType) => ({
          providerId: provider.id,
          vehicleType,
          fare: getFare(provider.id, vehicleType) ?? 0,
        })),
      )
    : [];
  const lowestFare = fares.length ? Math.min(...fares.map(({ fare }) => fare)) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <MapModal
        key={mapModalOpen ? mapTarget ?? "closed" : "closed"}
        isOpen={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        onSelect={handleLocationSelect}
        enableCurrentLocation={mapTarget === "source"}
        title={mapTarget === "source" ? "Select pickup on map" : "Select destination on map"}
      />

      <header className="mb-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-primary dark:text-purple-300">
          <Sparkles className="h-3.5 w-3.5" />
          Smarter city travel
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-950 dark:text-white sm:text-4xl">
              Compare your ride
            </h1>
            <p className="mt-2 max-w-2xl text-base text-gray-600 dark:text-gray-400">
              Check ride options across apps for your trip, then confirm the live fare with your provider.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
            No sign-in required
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-xl shadow-gray-900/[0.04] dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/20">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-purple-300">
              <MapPin className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">Plan your trip</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choose a pickup and destination to get started</p>
            </div>
          </div>
        </div>

        <form
          className="grid gap-4 p-5 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end sm:p-7"
          onSubmit={(event) => {
            event.preventDefault();
            void compareRides();
          }}
        >
          <div>
            <label htmlFor="compare-pickup" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Pickup
            </label>
            <div className="relative">
              <input
                id="compare-pickup"
                type="text"
                value={source}
                onChange={(event) => {
                  invalidateRoute();
                  sourceEditedRef.current = true;
                  setSource(event.target.value);
                  setSourceCoordinates(null);
                  setLocationStatus("idle");
                }}
                placeholder="Enter pickup location"
                autoComplete="street-address"
                className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-4 pr-12 text-sm font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:bg-gray-800"
              />
              <button
                type="button"
                onClick={() => openMap("source")}
                aria-label="Choose pickup on map"
                title="Choose on map"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-400 hover:bg-primary/10 hover:text-primary"
              >
                <MapPin className="h-4 w-4" />
              </button>
            </div>
            {locationStatus === "loading" && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400" role="status">Finding your current location…</p>
            )}
            {locationStatus === "error" && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400" role="status">
                <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {locationError}
              </p>
            )}
            {locationStatus === "located" && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400" role="status">
                <Check className="h-3.5 w-3.5" />
                Using your current location
              </p>
            )}
          </div>

          <div className="hidden h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 sm:flex">
            <ArrowRightLeft className="h-4 w-4" />
          </div>

          <div>
            <label htmlFor="compare-destination" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Destination
            </label>
            <div className="relative">
              <input
                id="compare-destination"
                type="text"
                value={destination}
                onChange={(event) => {
                  invalidateRoute();
                  destinationEditedRef.current = true;
                  setDestination(event.target.value);
                  setDestinationCoordinates(null);
                }}
                placeholder="Where are you going?"
                autoComplete="street-address"
                className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-4 pr-12 text-sm font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:bg-gray-800"
              />
              <button
                type="button"
                onClick={() => openMap("destination")}
                aria-label="Choose destination on map"
                title="Choose on map"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-400 hover:bg-primary/10 hover:text-primary"
              >
                <MapPin className="h-4 w-4" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!source.trim() || !destination.trim() || routeStatus === "loading"}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {routeStatus === "loading" ? "Calculating…" : "Compare rides"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </section>

      {searched ? (
        <section className="mt-10" aria-labelledby="results-heading">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-primary dark:text-purple-300">Your trip</p>
              <h2 id="results-heading" className="text-2xl font-extrabold tracking-tight text-gray-950 dark:text-white">
                Ride options
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Compare {selectedTypeLabel} from popular ride apps.
              </p>
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 sm:self-auto"
            >
              <Train className="h-4 w-4 text-primary dark:text-purple-300" />
              View route
              <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
            </a>
          </div>

          <div className="mb-5 flex flex-wrap gap-2" aria-label="Filter ride type">
            {RIDE_TYPES.map(({ name, icon: Icon }) => {
              const selected = selectedRideType === name;
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedRideType(name)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
                    selected
                      ? "border-primary bg-primary text-white shadow-md shadow-primary/15"
                      : "border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-purple-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {name}
                </button>
              );
            })}
          </div>

          {routeStatus === "loading" && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200" role="status">
              Calculating the route distance and travel time…
            </div>
          )}

          {routeStatus === "error" && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30" role="alert">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400" />
              <div>
                <p className="text-sm font-bold text-red-950 dark:text-red-200">Couldn’t calculate this trip</p>
                <p className="mt-1 text-sm text-red-900/80 dark:text-red-200/80">{routeError}</p>
              </div>
            </div>
          )}

          {routeStatus !== "ready" && (
            <div className="mb-6">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sample base fares</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Demo starting prices only. Distance and time charges are not included.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {PROVIDERS.flatMap((provider) =>
                  visibleRideTypes.map((vehicleType) => (
                    <article
                      key={`${provider.id}-${vehicleType}-base`}
                      className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-base font-extrabold ${provider.markClass}`}>
                          {provider.mark}
                        </span>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white">{provider.name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{vehicleType}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Base fare</p>
                        <p className="text-xl font-extrabold text-gray-900 dark:text-white">
                          {formatRupees(rates[provider.id][vehicleType].baseFare)}
                        </p>
                      </div>
                    </article>
                  )),
                )}
              </div>
            </div>
          )}

          {routeStatus === "ready" && routeMetrics && (
            <>
              <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm dark:border-gray-800 dark:bg-gray-900">
                <span className="font-bold text-gray-900 dark:text-white">Route estimate</span>
                <span className="text-gray-600 dark:text-gray-300">{routeMetrics.drivingDistanceKm.toFixed(1)} km</span>
                <span className="text-gray-600 dark:text-gray-300">Car/auto: {Math.round(routeMetrics.drivingMinutes)} min</span>
                <span className="text-gray-600 dark:text-gray-300">Bike: {Math.round(routeMetrics.bikeMinutes)} min</span>
              </div>
              {bikeRouteFallback && (
                <p className="mb-5 text-sm text-gray-500 dark:text-gray-400" role="status">
                  A two-wheeler route wasn’t available, so bike estimates use the driving route distance and time.
                </p>
              )}

              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/70 dark:bg-amber-950/30">
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
                <div>
                  <p className="text-sm font-bold text-amber-950 dark:text-amber-200">Illustrative estimates—not provider quotes</p>
                  <p className="mt-1 text-sm leading-6 text-amber-900/80 dark:text-amber-200/80">
                    Fares use your editable demo rates and a Google Maps route. They are not live prices or confirmed availability from Uber, Ola, or Rapido.
                  </p>
                </div>
              </div>

              <details className="mb-5 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <summary className="cursor-pointer px-5 py-4 text-sm font-bold text-gray-800 marker:text-primary dark:text-gray-100">
                  Edit demo rates (base fare + ₹/km + ₹/minute)
                </summary>
                <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-800">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Provider</th>
                        <th className="px-4 py-3 font-semibold">Ride type</th>
                        <th className="px-4 py-3 font-semibold">Base (₹)</th>
                        <th className="px-4 py-3 font-semibold">Per km (₹)</th>
                        <th className="px-4 py-3 font-semibold">Per min (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {PROVIDERS.flatMap((provider) =>
                        visibleRideTypes.map((vehicleType) => {
                          const fare = rates[provider.id][vehicleType];
                          const numberInputClass = "w-24 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white";
                          return (
                            <tr key={`${provider.id}-${vehicleType}`}>
                              <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100">{provider.name}</td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{vehicleType}</td>
                              {(["baseFare", "perKm", "perMinute"] as const).map((key) => (
                                <td key={key} className="px-4 py-3">
                                  <input
                                    aria-label={`${provider.name} ${vehicleType} ${key}`}
                                    className={numberInputClass}
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={fare[key]}
                                    onChange={(event) => updateRate(provider.id, vehicleType, key, Math.max(0, Number(event.target.value) || 0))}
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        }),
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400">
                  These sample values are editable for demonstration; they are not verified provider tariffs.
                </p>
              </details>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {PROVIDERS.flatMap((provider) =>
                  visibleRideTypes.map((vehicleType) => {
                    const fare = rates[provider.id][vehicleType];
                    const total = getFare(provider.id, vehicleType);
                    const isLowest = total !== null && total === lowestFare;
                    const bike = vehicleType === "Bike";
                    const distance = bike ? routeMetrics.bikeDistanceKm : routeMetrics.drivingDistanceKm;
                    const duration = bike ? routeMetrics.bikeMinutes : routeMetrics.drivingMinutes;
                    const Icon = bike ? Bike : Car;
                    return (
                      <article
                        key={`${provider.id}-${vehicleType}`}
                        className={`rounded-2xl border bg-white p-5 shadow-sm dark:bg-gray-900 ${
                          isLowest ? "border-green-300 ring-1 ring-green-200 dark:border-green-800 dark:ring-green-900" : "border-gray-200 dark:border-gray-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-base font-extrabold ${provider.markClass}`}>
                              {provider.mark}
                            </span>
                            <div>
                              <h3 className="font-bold text-gray-900 dark:text-white">{provider.name}</h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{vehicleType}</p>
                            </div>
                          </div>
                          {isLowest && (
                            <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-800 dark:bg-green-950 dark:text-green-300">
                              Lowest estimate
                            </span>
                          )}
                        </div>
                        <div className="my-5 flex items-end justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Estimated fare</p>
                            <p className="mt-1 text-3xl font-extrabold tracking-tight text-gray-950 dark:text-white">
                              {total === null ? "—" : formatRupees(total)}
                            </p>
                          </div>
                          <span className="mb-1 rounded-lg bg-gray-100 p-2 text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                            <Icon className="h-5 w-5" />
                          </span>
                        </div>
                        <div className="space-y-2 border-t border-gray-100 pt-4 text-sm dark:border-gray-800">
                          <div className="flex justify-between text-gray-600 dark:text-gray-300">
                            <span>Route</span><span>{distance.toFixed(1)} km · {Math.round(duration)} min</span>
                          </div>
                          <div className="flex justify-between text-gray-500 dark:text-gray-400">
                            <span>Base fare</span><span>{formatRupees(fare.baseFare)}</span>
                          </div>
                          <div className="flex justify-between text-gray-500 dark:text-gray-400">
                            <span>Distance charge</span><span>{formatRupees(distance * fare.perKm)}</span>
                          </div>
                          <div className="flex justify-between text-gray-500 dark:text-gray-400">
                            <span>Time charge</span><span>{formatRupees(duration * fare.perMinute)}</span>
                          </div>
                        </div>
                        <a
                          href={provider.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-800 hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-gray-700 dark:text-gray-100 dark:hover:text-purple-300"
                        >
                          Check {provider.name} app
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </article>
                    );
                  }),
                )}
              </div>

              <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs leading-5 text-gray-500 dark:text-gray-400">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Formula: base fare + (distance × rate/km) + (time × rate/min). Rounded to the nearest rupee.
              </p>
            </>
          )}

        </section>
      ) : (
        <section className="mt-10 grid gap-4 sm:grid-cols-3" aria-label="How fare comparison works">
          <div className="rounded-2xl border border-gray-200 bg-white/80 p-5 dark:border-gray-800 dark:bg-gray-900/80">
            <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-primary dark:bg-purple-900/40 dark:text-purple-300">
              <MapPin className="h-5 w-5" />
            </span>
            <h2 className="font-bold text-gray-900 dark:text-white">Set your route</h2>
            <p className="mt-1.5 text-sm leading-6 text-gray-500 dark:text-gray-400">Use your current location or select a pickup and destination on the map.</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white/80 p-5 dark:border-gray-800 dark:bg-gray-900/80">
            <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              <Bike className="h-5 w-5" />
            </span>
            <h2 className="font-bold text-gray-900 dark:text-white">Choose a ride type</h2>
            <p className="mt-1.5 text-sm leading-6 text-gray-500 dark:text-gray-400">Explore bike, auto and cab options from supported ride apps.</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white/80 p-5 dark:border-gray-800 dark:bg-gray-900/80">
            <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h2 className="font-bold text-gray-900 dark:text-white">Confirm in the app</h2>
            <p className="mt-1.5 text-sm leading-6 text-gray-500 dark:text-gray-400">Check the provider’s live fare before you book. Fares may change with demand.</p>
          </div>
        </section>
      )}
    </div>
  );
}
