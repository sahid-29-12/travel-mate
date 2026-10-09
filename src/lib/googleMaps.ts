import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let configured = false;
let mapsLibrariesPromise: Promise<[
  google.maps.MapsLibrary,
  google.maps.MarkerLibrary,
  google.maps.GeocodingLibrary,
]> | null = null;
let routesLibraryPromise: Promise<google.maps.RoutesLibrary> | null = null;

function configureGoogleMaps() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Google Maps is not configured. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local.");
  }
  if (!configured) {
    setOptions({ key: apiKey, v: "weekly" });
    configured = true;
  }
}

export function loadGoogleMapsLibraries() {
  configureGoogleMaps();
  if (!mapsLibrariesPromise) {
    mapsLibrariesPromise = Promise.all([
      importLibrary("maps"),
      importLibrary("marker"),
      importLibrary("geocoding"),
    ]).catch((error: unknown) => {
      mapsLibrariesPromise = null;
      throw error;
    });
  }
  return mapsLibrariesPromise;
}

export function loadGoogleMapsRoutes() {
  configureGoogleMaps();
  if (!routesLibraryPromise) {
    routesLibraryPromise = importLibrary("routes").catch((error: unknown) => {
      routesLibraryPromise = null;
      throw error;
    });
  }
  return routesLibraryPromise;
}
