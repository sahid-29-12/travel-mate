"use client";

import { LocateFixed, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { loadGoogleMapsLibraries } from "@/lib/googleMaps";

interface MapComponentProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialPos?: [number, number];
  allowCurrentLocation?: boolean;
}

const DEFAULT_POSITION: [number, number] = [19.076, 72.8777];

export default function MapComponent({
  onLocationSelect,
  initialPos = DEFAULT_POSITION,
  allowCurrentLocation = true,
}: MapComponentProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const onLocationSelectRef = useRef(onLocationSelect);
  const mapRef = useRef<google.maps.Map | null>(null);
  const selectedMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const markerLibraryRef = useRef<google.maps.MarkerLibrary | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const locationTimeoutRef = useRef<number | null>(null);
  const locationRequestIdRef = useRef(0);
  const firstLiveFixRef = useRef(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [geocodeNotice, setGeocodeNotice] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    const mapElement = mapElementRef.current;
    if (!mapElement) return;

    if (!apiKey) {
      const timer = window.setTimeout(() => setIsLoading(false), 0);
      return () => window.clearTimeout(timer);
    }

    let cancelled = false;
    let map: google.maps.Map | undefined;
    let mapClickListener: google.maps.MapsEventListener | undefined;

    const initializeMap = async () => {
      setIsLoading(true);
      setError("");
      try {
        const [mapsLibrary, markerLibrary, geocodingLibrary] = await loadGoogleMapsLibraries();
        if (cancelled) return;

        const { Map } = mapsLibrary;
        const center = { lat: initialPos[0], lng: initialPos[1] };
        map = new Map(mapElement, {
          center,
          zoom: 12,
          mapId: "DEMO_MAP_ID",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });

        mapRef.current = map;
        markerLibraryRef.current = markerLibrary;
        const geocoder = new geocodingLibrary.Geocoder();
        geocoderRef.current = geocoder;
        selectedMarkerRef.current = new markerLibrary.AdvancedMarkerElement({ map });
        mapClickListener = map.addListener("click", (event: google.maps.MapMouseEvent) => {
          const location = event.latLng;
          if (!location) return;

          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          if (locationTimeoutRef.current !== null) {
            window.clearTimeout(locationTimeoutRef.current);
            locationTimeoutRef.current = null;
          }
          setIsTrackingLocation(false);
          setError("");
          setGeocodeNotice("");
          const selectionRequestId = ++locationRequestIdRef.current;
          if (selectedMarkerRef.current) selectedMarkerRef.current.position = location;
          const coordinates = `${location.lat().toFixed(5)}, ${location.lng().toFixed(5)}`;
          void geocoder.geocode({ location })
            .then(({ results }) => {
              if (selectionRequestId !== locationRequestIdRef.current) return;
              const address = results[0]?.formatted_address;
              if (address) {
                onLocationSelectRef.current(location.lat(), location.lng(), address);
              } else {
                onLocationSelectRef.current(location.lat(), location.lng(), coordinates);
                setGeocodeNotice("No street address was found; the map coordinates will still be used for route calculations.");
              }
            })
            .catch((geocodeError: unknown) => {
              if (selectionRequestId !== locationRequestIdRef.current) return;
              onLocationSelectRef.current(location.lat(), location.lng(), coordinates);
              setGeocodeNotice(
                geocodeError instanceof Error
                  ? `Could not look up a street address. The selected map coordinates will still be used for route calculations. ${geocodeError.message}`
                  : "Could not look up a street address. The selected map coordinates will still be used for route calculations.",
              );
            });
        });
      } catch (loadError: unknown) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? `Could not load Google Maps. Check that the Maps JavaScript API is enabled and the API key is valid. ${loadError.message}`
            : "Could not load Google Maps. Check that the Maps JavaScript API is enabled and the API key is valid.",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void initializeMap();

    return () => {
      cancelled = true;
      locationRequestIdRef.current += 1;
      mapClickListener?.remove();
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (locationTimeoutRef.current !== null) {
        window.clearTimeout(locationTimeoutRef.current);
        locationTimeoutRef.current = null;
      }
      if (selectedMarkerRef.current) selectedMarkerRef.current.map = null;
      mapRef.current = null;
      geocoderRef.current = null;
      markerLibraryRef.current = null;
    };
  }, [apiKey, initialPos]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("This browser does not support location access. You can still choose a point directly on the map.");
      return;
    }
    if (!mapRef.current || !geocoderRef.current || !markerLibraryRef.current) {
      setError("The map is still loading. Please try again in a moment.");
      return;
    }

    setError("");
    setGeocodeNotice("");
    setIsLocating(true);
    firstLiveFixRef.current = true;
    locationRequestIdRef.current += 1;
    const requestId = locationRequestIdRef.current;
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (selectedMarkerRef.current) selectedMarkerRef.current.map = null;

    locationTimeoutRef.current = window.setTimeout(() => {
      if (!firstLiveFixRef.current) return;
      setIsLocating(false);
      setError("Your location is taking too long to respond. Check your device location settings or choose a pickup point manually.");
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }, 20000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const map = mapRef.current;
        const geocoder = geocoderRef.current;
        if (!map || !geocoder) return;

        setIsLocating(false);
        setIsTrackingLocation(true);
        map.setCenter(coordinates);
        map.setZoom(Math.max(map.getZoom() ?? 0, 16));

        if (firstLiveFixRef.current) {
          firstLiveFixRef.current = false;
          if (locationTimeoutRef.current !== null) {
            window.clearTimeout(locationTimeoutRef.current);
            locationTimeoutRef.current = null;
          }
          onLocationSelectRef.current(coordinates.lat, coordinates.lng, "Current location");
          void geocoder.geocode({ location: coordinates })
            .then(({ results }) => {
              if (requestId === locationRequestIdRef.current && results[0]?.formatted_address) {
                onLocationSelectRef.current(coordinates.lat, coordinates.lng, results[0].formatted_address);
              } else if (requestId === locationRequestIdRef.current) {
                setGeocodeNotice("Your live location is shown on the map, but no street address was found.");
              }
            })
            .catch(() => {
              if (requestId === locationRequestIdRef.current) {
                setGeocodeNotice("Your live location is shown on the map. The pickup field uses its coordinates because the address lookup failed.");
              }
            });
        }
      },
      (locationError) => {
        setIsLocating(false);
        setIsTrackingLocation(false);
        if (locationTimeoutRef.current !== null) {
          window.clearTimeout(locationTimeoutRef.current);
          locationTimeoutRef.current = null;
        }
        setError(
          locationError.code === locationError.PERMISSION_DENIED
            ? "Location permission was denied. Allow location access in your browser or choose a point manually on the map."
            : locationError.code === locationError.TIMEOUT
              ? "Your location could not be found before the request timed out. Please try again or choose a point on the map."
              : `Unable to get your current location. ${locationError.message} You can choose a point manually on the map.`,
        );
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        locationRequestIdRef.current += 1;
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  };

  const mapError = apiKey
    ? error
    : "Google Maps is not configured. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local and restart the app.";

  return (
    <div className="relative h-full w-full">
      <div ref={mapElementRef} className="h-full w-full" aria-label="Google map location picker" />
      {allowCurrentLocation && isTrackingLocation && (
        <div
          aria-label="Your live location on the map"
          className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center"
        >
          <span className="relative flex h-8 w-8 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-blue-500/25" />
            <span className="relative h-4 w-4 rounded-full border-[3px] border-white bg-blue-600 shadow-lg" />
          </span>
        </div>
      )}
      {allowCurrentLocation && (
      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={isLoading || !apiKey}
        className="absolute right-4 top-4 z-[1000] inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-gray-800 shadow-lg hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
      >
        {isLocating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4 text-primary" />}
        {isLocating ? "Finding you..." : isTrackingLocation ? "Live location on" : "Use my location"}
      </button>
      )}
      {(isLoading || mapError || geocodeNotice) && (
        <div
          role={mapError ? "alert" : "status"}
          className={`absolute bottom-4 left-4 right-4 z-[1000] rounded-xl px-4 py-3 text-sm shadow-lg ${
            mapError
              ? "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
              : "bg-white/95 text-gray-700 dark:bg-gray-900/95 dark:text-gray-200"
          }`}
        >
          {mapError || (isLoading ? "Loading Google Maps..." : geocodeNotice)}
        </div>
      )}
    </div>
  );
}
