"use client";

import dynamic from 'next/dynamic';
import { X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

// Dynamically import the map component with SSR disabled
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-500">Loading map...</div>
});

const subscribeToNothing = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (address: string, location: { lat: number; lng: number }) => void;
  title: string;
  enableCurrentLocation?: boolean;
}

export default function MapModal({ isOpen, onClose, onSelect, title, enableCurrentLocation = false }: MapModalProps) {
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mounted = useSyncExternalStore(subscribeToNothing, getClientSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-6" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="map-modal-title" className="flex h-[min(88vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 p-4">
          <h2 id="map-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close map" className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        <div className="relative flex-1 bg-gray-100 dark:bg-gray-800">
          <MapComponent
            onLocationSelect={(lat, lng, address) => {
              setSelectedAddress(address);
              setSelectedLocation({ lat, lng });
            }}
            allowCurrentLocation={enableCurrentLocation}
          />
          <div className={`absolute left-4 z-[1000] max-w-[calc(100%-2rem)] rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-gray-700 shadow-md dark:bg-gray-900/95 dark:text-gray-300 ${enableCurrentLocation ? "top-16 sm:left-1/2 sm:top-4 sm:max-w-none sm:-translate-x-1/2 sm:px-6" : "top-4 sm:left-1/2 sm:-translate-x-1/2 sm:px-6"}`}>
            {enableCurrentLocation ? "Click or tap the map to choose a point, or use your current location" : "Click or tap the map to choose a point"}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex-1 truncate pr-4 text-sm font-medium text-gray-700 dark:text-gray-300">
            {selectedAddress ? (
              <span className="text-blue-700 dark:text-purple-300">Selected: {selectedAddress}</span>
            ) : (
              "No location selected yet."
            )}
          </div>
          <button 
            onClick={() => {
              if (selectedAddress && selectedLocation) {
                onSelect(selectedAddress, selectedLocation);
                onClose();
              }
            }}
            disabled={!selectedAddress || !selectedLocation}
            className="rounded-lg bg-blue-600 dark:bg-primary px-6 py-2.5 font-semibold text-white hover:bg-blue-700 dark:hover:bg-primary-strong disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  , document.body);
}
