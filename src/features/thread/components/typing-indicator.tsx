/** Incoming-style bubble with animated dots. The header announces who is typing. */
export function TypingIndicator() {
  return (
    <div aria-hidden="true" className="flex px-3 pt-2 md:px-4">
      <span className="flex h-9 items-center gap-1 rounded-[20px] rounded-bl-md bg-pill px-3.5">
        {[0, 150, 300].map((delay) => (
          <span key={delay} className="h-2 w-2 rounded-full bg-fg-faint animate-typing-dot" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </span>
    </div>
  );
}
