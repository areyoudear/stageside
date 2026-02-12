"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, Navigation, ChevronDown } from "lucide-react";
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
  { name: "Denver", lat: 39.7392, lng: -104.9903 },
  { name: "Atlanta", lat: 33.749, lng: -84.388 },
  { name: "Boston", lat: 42.3601, lng: -71.0589 },
  { name: "Portland", lat: 45.5152, lng: -122.6784 },
  { name: "Phoenix", lat: 33.4484, lng: -112.074 },
  { name: "Dallas", lat: 32.7767, lng: -96.797 },
  { name: "San Diego", lat: 32.7157, lng: -117.1611 },
];

// Radius options in miles
export const RADIUS_OPTIONS = [
  { value: 10, label: "10 mi" },
  { value: 25, label: "25 mi" },
  { value: 50, label: "50 mi" },
  { value: 100, label: "100 mi" },
];

export interface Location {
  name: string;
  lat: number;
  lng: number;
}

interface LocationSearchProps {
  value: Location | null;
  onChange: (location: Location | null) => void;
  radius?: number;
  onRadiusChange?: (radius: number) => void;
  showRadius?: boolean;
  className?: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

export function LocationSearch({ 
  value, 
  onChange, 
  radius = 50,
  onRadiusChange,
  showRadius = true,
  className 
}: LocationSearchProps) {
  const [inputValue, setInputValue] = useState(value?.name || "");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [showRadiusDropdown, setShowRadiusDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const radiusRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (radiusRef.current && !radiusRef.current.contains(event.target as Node)) {
        setShowRadiusDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search for locations using Nominatim (OpenStreetMap)
  const searchLocations = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=8&featuretype=city`,
        {
          headers: {
            "User-Agent": "Stageside/1.0 (https://getstageside.com)",
          },
        }
      );
      
      if (!response.ok) throw new Error("Search failed");
      
      const data: NominatimResult[] = await response.json();
      
      // Filter and transform results to cities/towns
      const locations: Location[] = data
        .filter((r) => 
          r.type === "city" || 
          r.type === "town" || 
          r.type === "village" ||
          r.type === "administrative" ||
          r.address?.city ||
          r.address?.town
        )
        .map((r) => {
          const cityName = r.address?.city || r.address?.town || r.address?.village || r.address?.municipality;
          const state = r.address?.state;
          const country = r.address?.country;
          
          let displayName = cityName || r.display_name.split(",")[0];
          if (state && country === "United States") {
            displayName = `${displayName}, ${state}`;
          } else if (country && country !== "United States") {
            displayName = `${displayName}, ${country}`;
          }
          
          return {
            name: displayName,
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lon),
          };
        })
        .slice(0, 6);

      setSearchResults(locations);
    } catch (error) {
      console.error("Location search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (inputValue && inputValue !== value?.name) {
      debounceRef.current = setTimeout(() => {
        searchLocations(inputValue);
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [inputValue, value?.name, searchLocations]);

  // Filter popular cities based on input
  const filteredPopularCities = inputValue
    ? POPULAR_CITIES.filter((city) =>
        city.name.toLowerCase().includes(inputValue.toLowerCase())
      )
    : POPULAR_CITIES;

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

        // Reverse geocode to get city name
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            {
              headers: {
                "User-Agent": "Stageside/1.0 (https://getstageside.com)",
              },
            }
          );
          const data = await response.json();
          const cityName =
            data.address?.city ||
            data.address?.town ||
            data.address?.municipality ||
            data.address?.village ||
            "Current Location";

          const state = data.address?.state;
          const displayName = state ? `${cityName}, ${state}` : cityName;

          onChange({
            name: displayName,
            lat: latitude,
            lng: longitude,
          });
          setInputValue(displayName);
        } catch {
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

  const handleLocationSelect = (location: Location) => {
    onChange(location);
    setInputValue(location.name);
    setIsOpen(false);
    setSearchResults([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);

    if (!newValue) {
      onChange(null);
      setSearchResults([]);
    }
  };

  const handleRadiusSelect = (newRadius: number) => {
    onRadiusChange?.(newRadius);
    setShowRadiusDropdown(false);
  };

  return (
    <div className={cn("flex gap-2", className)}>
      {/* Location Input */}
      <div ref={wrapperRef} className="relative flex-1">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            placeholder="Enter any city..."
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

            {/* Search Results */}
            {isSearching && (
              <div className="px-4 py-3 flex items-center gap-2 text-zinc-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching...</span>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="border-b border-zinc-700">
                <div className="px-3 py-2 text-xs text-zinc-500 uppercase tracking-wider">
                  Search Results
                </div>
                {searchResults.map((location, idx) => (
                  <button
                    key={`search-${idx}`}
                    type="button"
                    onClick={() => handleLocationSelect(location)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-800 transition-colors text-left"
                  >
                    <MapPin className="w-4 h-4 text-green-500" />
                    <span className="text-white">{location.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Popular Cities */}
            {!isSearching && searchResults.length === 0 && (
              <div className="max-h-64 overflow-y-auto">
                <div className="px-3 py-2 text-xs text-zinc-500 uppercase tracking-wider">
                  Popular Cities
                </div>
                {filteredPopularCities.slice(0, 8).map((city) => (
                  <button
                    key={city.name}
                    type="button"
                    onClick={() => handleLocationSelect(city)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-800 transition-colors text-left"
                  >
                    <MapPin className="w-4 h-4 text-zinc-500" />
                    <span className="text-white">{city.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Radius Selector */}
      {showRadius && onRadiusChange && (
        <div ref={radiusRef} className="relative">
          <Button
            type="button"
            variant="outline"
            className="h-10 px-3 bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:text-white min-w-[85px]"
            onClick={() => setShowRadiusDropdown(!showRadiusDropdown)}
          >
            <span>{radius} mi</span>
            <ChevronDown className="w-4 h-4 ml-1 text-zinc-500" />
          </Button>

          {showRadiusDropdown && (
            <div className="absolute z-50 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden min-w-[100px]">
              {RADIUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleRadiusSelect(option.value)}
                  className={cn(
                    "w-full px-4 py-2 text-left hover:bg-zinc-800 transition-colors",
                    radius === option.value
                      ? "text-green-400 bg-zinc-800"
                      : "text-white"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
