"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, Check, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTicketSources, TICKET_SOURCE_COLORS, type TicketSource } from "@/lib/ticket-sources";

interface TicketSourcesDropdownProps {
  concert: {
    artists: string[];
    venue: { name: string };
    date: string;
    ticketUrl?: string;
    priceRange?: { min: number; max: number; currency: string };
  };
  isPerfectMatch?: boolean;
}

export function TicketSourcesDropdown({ concert, isPerfectMatch = false }: TicketSourcesDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { sources, cheapestSource } = formatTicketSources(concert);

  // Primary source (Ticketmaster if available, otherwise first source)
  const primarySource = sources.find(s => s.name === "Ticketmaster") || sources[0];
  const otherSources = sources.filter(s => s.name !== primarySource?.name);

  if (!primarySource) return null;

  return (
    <div className="relative">
      {/* Main Button with Dropdown Toggle */}
      <div className="flex gap-1">
        {/* Primary ticket button */}
        <Button
          asChild
          className={cn(
            "flex-1 font-semibold transition-all",
            isPerfectMatch
              ? "bg-green-600 hover:bg-green-500 text-white"
              : "bg-purple-600 hover:bg-purple-500 text-white"
          )}
        >
          <a href={primarySource.url} target="_blank" rel="noopener noreferrer">
            <Ticket className="w-4 h-4 mr-2" />
            {primarySource.price ? (
              <>From ${primarySource.price.min}</>
            ) : (
              "Get Tickets"
            )}
          </a>
        </Button>

        {/* Dropdown toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "border-zinc-700 hover:bg-zinc-800 transition-all",
            isOpen && "bg-zinc-800"
          )}
          aria-label="Show more ticket sources"
        >
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform",
            isOpen && "rotate-180"
          )} />
        </Button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden animate-slide-up z-10">
          <div className="p-2 border-b border-zinc-800">
            <p className="text-xs text-zinc-400 font-medium">Compare prices</p>
          </div>
          
          <div className="p-1">
            {sources.map((source) => (
              <a
                key={source.name}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-zinc-800 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: TICKET_SOURCE_COLORS[source.name] }}
                  />
                  <span className="text-sm text-zinc-300 group-hover:text-white">
                    {source.name}
                  </span>
                  {source.name === cheapestSource && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-500/20 text-green-400">
                      Cheapest
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {source.price ? (
                    <span className="text-sm font-medium text-white">
                      ${source.price.min}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">Check price</span>
                  )}
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-purple-400" />
                </div>
              </a>
            ))}
          </div>

          <div className="p-2 border-t border-zinc-800 bg-zinc-800/50">
            <p className="text-[10px] text-zinc-500 text-center">
              Prices may vary. Click to check current availability.
            </p>
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// Simpler inline version for cards
export function TicketSourcesInline({ concert }: TicketSourcesDropdownProps) {
  const { sources } = formatTicketSources(concert);
  
  // Just show the source dots
  return (
    <div className="flex items-center gap-1" title="Available on multiple platforms">
      {sources.slice(0, 4).map((source) => (
        <div
          key={source.name}
          className="w-2 h-2 rounded-full opacity-60"
          style={{ backgroundColor: TICKET_SOURCE_COLORS[source.name] }}
          title={source.name}
        />
      ))}
      {sources.length > 4 && (
        <span className="text-[10px] text-zinc-500">+{sources.length - 4}</span>
      )}
    </div>
  );
}
