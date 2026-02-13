"use client";

import { useState } from "react";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeedbackButtonProps {
  userEmail?: string;
}

export function FeedbackButton({ userEmail }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState(userEmail || "");
  const [feedbackType, setFeedbackType] = useState<"bug" | "feature" | "other">("feature");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setIsSubmitting(true);

    try {
      // Send feedback via API
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: feedbackType,
          message: feedback,
          email: email || undefined,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          setIsOpen(false);
          setSubmitted(false);
          setFeedback("");
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Feedback Button - Dark theme */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-full shadow-lg transition-all hover:scale-105 group"
        aria-label="Send feedback"
      >
        <MessageSquare className="w-5 h-5 text-cyan-400" />
        <span className="text-sm font-medium text-zinc-300 hidden sm:inline group-hover:text-white transition-colors">
          Feedback
        </span>
      </button>

      {/* Feedback Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div>
                <h3 className="text-lg font-semibold text-white">Send Feedback</h3>
                <p className="text-sm text-zinc-400">Help us improve Stageside</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {submitted ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <span className="text-3xl">🎉</span>
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">Thanks!</h4>
                <p className="text-zinc-400">Your feedback helps us build a better experience.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {/* Feedback Type */}
                <div className="flex gap-2">
                  {[
                    { value: "bug", label: "🐛 Bug", desc: "Something broken" },
                    { value: "feature", label: "✨ Feature", desc: "New idea" },
                    { value: "other", label: "💬 Other", desc: "General" },
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFeedbackType(type.value as typeof feedbackType)}
                      className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                        feedbackType === type.value
                          ? "border-cyan-500 bg-cyan-500/10"
                          : "border-zinc-700 hover:border-zinc-600 bg-zinc-800/50"
                      }`}
                    >
                      <div className="text-sm font-medium text-white">{type.label}</div>
                      <div className="text-xs text-zinc-500">{type.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Message */}
                <div>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder={
                      feedbackType === "bug"
                        ? "What went wrong? Steps to reproduce..."
                        : feedbackType === "feature"
                        ? "What would make Stageside better for you?"
                        : "What's on your mind?"
                    }
                    className="w-full h-32 px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 resize-none focus:outline-none focus:border-cyan-500 transition-colors"
                    required
                  />
                </div>

                {/* Email (optional) */}
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email (optional, for follow-up)"
                    className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isSubmitting || !feedback.trim()}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {isSubmitting ? "Sending..." : "Send Feedback"}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
