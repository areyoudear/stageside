"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Check } from "lucide-react";

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
        setMessage("You're subscribed! Check your email for confirmation.");
        setEmail("");
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
      <div className={`flex items-center gap-2 text-green-400 ${className}`}>
        <Check className="w-5 h-5" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email for weekly updates"
            className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
            disabled={status === "loading"}
          />
        </div>
        <Button
          type="submit"
          disabled={status === "loading" || !email}
          className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
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
      <p className="mt-2 text-xs text-zinc-500">
        Get weekly concert recommendations based on your music taste. Unsubscribe anytime.
      </p>
    </form>
  );
}
