/** Brand artwork shared by the auth screens (extracted unchanged from the Login page). */
export function ChatIllustration({ className = "" }) {
  return (
    <svg
      viewBox="0 0 480 440"
      width="480"
      height="440"
      className={className}
      role="img"
      aria-label="Chat bubbles illustrating a messaging app"
    >
      <style>{`
        @keyframes textme-dot { 0%,80%,100% { opacity:.3 } 40% { opacity:1 } }
        .textme-dot { animation: textme-dot 1.2s infinite ease-in-out; }
        .textme-dot:nth-of-type(2) { animation-delay: .15s; }
        .textme-dot:nth-of-type(3) { animation-delay: .3s; }
        @media (prefers-reduced-motion: reduce) { .textme-dot { animation:none; opacity:.7 } }
      `}</style>

      {/* Backdrop circle */}
      <circle cx="240" cy="220" r="190" className="fill-search-bar stroke-divider" strokeWidth="1.5" />

      {/* Incoming bubble 1 */}
      <rect x="70" y="95" width="210" height="62" rx="26" className="fill-pill" />
      <path d="M92 150 L78 172 L116 154 Z" className="fill-pill" />
      <rect x="94" y="115" width="140" height="9" rx="4.5" className="fill-fg-muted" />
      <rect x="94" y="133" width="96" height="9" rx="4.5" className="fill-fg-muted" opacity=".6" />

      {/* Outgoing bubble */}
      <rect x="170" y="190" width="240" height="70" rx="28" className="fill-accent" />
      <path d="M388 252 L406 278 L360 258 Z" className="fill-accent" />
      <rect x="196" y="211" width="168" height="9" rx="4.5" className="fill-fg" />
      <rect x="196" y="231" width="110" height="9" rx="4.5" className="fill-fg" opacity=".7" />

      {/* Incoming bubble 2 */}
      <rect x="70" y="290" width="150" height="54" rx="24" className="fill-pill" />
      <path d="M92 338 L78 360 L112 342 Z" className="fill-pill" />
      <rect x="94" y="311" width="100" height="9" rx="4.5" className="fill-fg-muted" />

      {/* Typing indicator */}
      <rect x="244" y="318" width="86" height="44" rx="22" className="fill-pill" />
      <circle className="textme-dot fill-fg-faint" cx="272" cy="340" r="5" />
      <circle className="textme-dot fill-fg-faint" cx="287" cy="340" r="5" />
      <circle className="textme-dot fill-fg-faint" cx="302" cy="340" r="5" />

      {/* Online dot + unread badge */}
      <circle cx="376" cy="108" r="9" className="fill-status-active" />
      <circle cx="420" cy="170" r="14" className="fill-badge-alert" />
      <text x="420" y="175" textAnchor="middle" fontSize="14" fontWeight="600" className="fill-fg">
        3
      </text>
    </svg>
  );
}

export function Logo({ className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V16h-.5A2.5 2.5 0 0 1 4 13.5v-7Z"
            className="fill-fg"
          />
        </svg>
      </span>
      <span className="text-xl font-semibold tracking-tight text-fg">Text-ME</span>
    </div>
  );
}
