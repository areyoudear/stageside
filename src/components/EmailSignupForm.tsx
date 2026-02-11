"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Check, Sparkles } from "lucide-react";
import { track } from "@/lib/analytics";

interface EmailSignupFormProps {
  location?: {
    lat: number;
    lng: number;
    city: string;
  } | null;
  className?: string;
}

export function EmailSignupForm({ location, className }: EmailSignupFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const hasFocused = useRef(false);

  const handleFocus = () => {
    if (!hasFocused.current) {
      hasFocused.current = true;
      track('email_signup_started', { location: 'landing_page' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) return;

    setStatus("loading");

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          location,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage("You're in! Check your inbox for your first personalized picks.");
        setEmail("");
        track('email_signup_completed', { 
          location: 'landing_page', 
          has_location: !!location 
        });
        hasFocused.current = false;
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className={`flex items-center justify-center gap-2 text-green-400 ${className}`}>
        <Check className="w-5 h-5" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Positive framing header */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Get personalized picks weekly</h3>
        </div>
        <p className="text-sm text-zinc-500">No Spotify required. Just enter your email.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={handleFocus}
              placeholder="Enter your email"
              className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
              disabled={status === "loading"}
            />
          </div>
          <Button
            type="submit"
            disabled={status === "loading" || !email}
            className="bg-green-600 hover:bg-green-500 text-white font-medium"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Subscribing...
              </>
            ) : (
              "Subscribe"
            )}
          </Button>
        </div>
        {status === "error" && (
          <p className="mt-2 text-sm text-red-400">{message}</p>
        )}
        <p className="mt-3 text-xs text-zinc-600 text-center">
          Weekly concert recommendations based on trending shows. Unsubscribe anytime.
        </p>
      </form>
    </div>
  );
}
