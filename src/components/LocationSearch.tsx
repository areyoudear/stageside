"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Popular cities for quick selection
const POPULAR_CITIES = [
  { name: "Los Angeles", lat: 34.0522, lng: -118.2437 },
  { name: "New York", lat: 40.7128, lng: -74.006 },
  { name: "Chicago", lat: 41.8781, lng: -87.6298 },
  { name: "Austin", lat: 30.2672, lng: -97.7431 },
  { name: "Nashville", lat: 36.1627, lng: -86.7816 },
  { name: "San Francisco", lat: 37.7749, lng: -122.4194 },
  { name: "Miami", lat: 25.7617, lng: -80.1918 },
  { name: "Seattle", lat: 47.6062, lng: -122.3321 },
];

export interface Location {
  name: string;
  lat: number;
  lng: number;
}

interface LocationSearchProps {
  value: Location | null;
  onChange: (location: Location | null) => void;
  className?: string;
}

export function LocationSearch({ value, onChange, className }: LocationSearchProps) {
  const [inputValue, setInputValue] = useState(value?.name || "");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [filteredCities, setFilteredCities] = useState(POPULAR_CITIES);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter cities based on input
  useEffect(() => {
    if (inputValue) {
      const filtered = POPULAR_CITIES.filter((city) =>
        city.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredCities(filtered.length > 0 ? filtered : POPULAR_CITIES);
    } else {
      setFilteredCities(POPULAR_CITIES);
    }
  }, [inputValue]);

  // Use browser geolocation
  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Try to reverse geocode to get city name
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();
          const cityName =
            data.address?.city ||
            data.address?.town ||
            data.address?.municipality ||
            "Current Location";

          onChange({
            name: cityName,
            lat: latitude,
            lng: longitude,
          });
          setInputValue(cityName);
        } catch {
          // Fallback to generic name
          onChange({
            name: "Current Location",
            lat: latitude,
            lng: longitude,
          });
          setInputValue("Current Location");
        }

        setIsLoadingLocation(false);
        setIsOpen(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to get your location. Please select a city manually.");
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCitySelect = (city: (typeof POPULAR_CITIES)[0]) => {
    onChange(city);
    setInputValue(city.name);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);

    // If input is cleared, clear the selection
    if (!newValue) {
      onChange(null);
    }
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Enter city or use your location"
          className="pl-10 pr-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-zinc-500 hover:text-white"
          onClick={handleUseMyLocation}
          disabled={isLoadingLocation}
        >
          {isLoadingLocation ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
          {/* Use Location Button */}
          <button
            type="button"
            onClick={handleUseMyLocation}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-800 transition-colors border-b border-zinc-700"
          >
            <Navigation className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400">Use my current location</span>
          </button>

          {/* City List */}
          <div className="max-h-64 overflow-y-auto">
            <div className="px-3 py-2 text-xs text-zinc-500 uppercase tracking-wider">
              Popular Cities
            </div>
            {filteredCities.map((city) => (
              <button
                key={city.name}
                type="button"
                onClick={() => handleCitySelect(city)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-800 transition-colors text-left"
              >
                <MapPin className="w-4 h-4 text-zinc-500" />
                <span className="text-white">{city.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
