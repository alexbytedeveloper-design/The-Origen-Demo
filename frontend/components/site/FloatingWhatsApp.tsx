import { whatsappUrl } from "@/lib/contact";
import type { Dict } from "@/messages/es";

export function FloatingWhatsApp({ dict }: { dict: Dict }) {
  return (
    <a
      className="wa-float"
      href={whatsappUrl(dict.whatsapp.message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={dict.whatsapp.label}
      title={dict.whatsapp.label}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5Z" />
        <path d="M8.5 8.8c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.1-.1.3 0 .5.5.9 1.3 1.7 2.2 2.2.2.1.4.1.5 0l.6-.6c.2-.1.4-.2.6-.1l1.6.7c.3.1.4.3.4.5v.5c0 .3 0 .5-.4.7-.4.2-1 .3-1.6.1-1.1-.3-2.2-.9-3.1-1.8-.9-.9-1.5-2-1.8-3.1-.2-.6-.1-1.2.1-1.6Z" />
      </svg>
    </a>
  );
}
