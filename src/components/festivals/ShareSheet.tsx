"use client";

import { useState } from "react";
import {
  Share2,
  MessageCircle,
  Copy,
  Check,
  X,
  Link2,
  Mail,
  Twitter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// WhatsApp icon component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// iMessage/Messages icon
const MessagesIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2 22l5.003-1.338A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.657 0-3.216-.5-4.51-1.36l-3.14.84.84-3.14A7.963 7.963 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8z"/>
  </svg>
);

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  text: string;
  url: string;
  type: "agenda" | "crew-invite";
}

export function ShareSheet({ isOpen, onClose, title, text, url, type }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const fullUrl = typeof window !== "undefined" 
    ? `${window.location.origin}${url}` 
    : url;

  const shareMessage = type === "crew-invite"
    ? `${text}\n\nJoin here: ${fullUrl}`
    : `${text}\n\n${fullUrl}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(whatsappUrl, "_blank");
    onClose();
  };

  const handleMessages = () => {
    // SMS/iMessage - works on iOS and macOS
    const smsUrl = `sms:?&body=${encodeURIComponent(shareMessage)}`;
    window.open(smsUrl, "_self");
    onClose();
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(shareMessage);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
    onClose();
  };

  const handleTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(fullUrl)}`;
    window.open(twitterUrl, "_blank");
    onClose();
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: fullUrl,
        });
        onClose();
      } catch (error) {
        // User cancelled or error
        console.log("Share cancelled");
      }
    }
  };

  const canNativeShare = typeof navigator !== "undefined" && navigator.share;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-50"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-zinc-900 rounded-t-2xl border-t border-zinc-800 p-6 max-w-lg mx-auto">
          {/* Handle */}
          <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-6" />

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Share options */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <ShareButton
              icon={<WhatsAppIcon className="w-6 h-6" />}
              label="WhatsApp"
              onClick={handleWhatsApp}
              color="bg-[#25D366]"
            />
            <ShareButton
              icon={<MessagesIcon className="w-6 h-6" />}
              label="Messages"
              onClick={handleMessages}
              color="bg-[#34C759]"
            />
            <ShareButton
              icon={<Mail className="w-6 h-6" />}
              label="Email"
              onClick={handleEmail}
              color="bg-zinc-600"
            />
            <ShareButton
              icon={<Twitter className="w-6 h-6" />}
              label="Twitter"
              onClick={handleTwitter}
              color="bg-[#1DA1F2]"
            />
          </div>

          {/* Copy link */}
          <div className="flex items-center gap-2 p-3 bg-zinc-800 rounded-lg">
            <Link2 className="w-5 h-5 text-zinc-400 flex-shrink-0" />
            <span className="flex-1 text-sm text-zinc-300 truncate">{fullUrl}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="flex-shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Native share (if available) */}
          {canNativeShare && (
            <Button
              className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700"
              onClick={handleNativeShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              More options...
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function ShareButton({
  icon,
  label,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2"
    >
      <div className={cn(
        "w-14 h-14 rounded-full flex items-center justify-center text-white",
        color
      )}>
        {icon}
      </div>
      <span className="text-xs text-zinc-400">{label}</span>
    </button>
  );
}

// Quick share button that opens the sheet
export function QuickShareButton({
  title,
  text,
  url,
  type = "agenda",
  className,
}: {
  title: string;
  text: string;
  url: string;
  type?: "agenda" | "crew-invite";
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <Share2 className="w-4 h-4 mr-1.5" />
        Share
      </Button>
      <ShareSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        text={text}
        url={url}
        type={type}
      />
    </>
  );
}
