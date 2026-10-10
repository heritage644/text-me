import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-screen p-8 text-center text-fg">
      <p>This page no dey o. Go back.</p>
      <Link to="/" className="font-medium text-accent hover:underline">
        Take me home
      </Link>
    </main>
  );
}
