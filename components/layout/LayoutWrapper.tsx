"use client";

import { useEffect, useState } from "react";
import GlobalLoader from "@/components/mini/GlobalLoader";
import { useAuth } from "@/hooks/useAuth";

/** The loader is on screen for this long even when everything is already in hand. */
const MINIMUM_MS = 1000;

/** If Firebase never answers, show the site anyway rather than spinning forever. */
const GIVE_UP_AFTER_MS = 8000;

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth is the gate: almost every screen renders differently depending on who is signed in, and
  // it is the one fetch that has to finish before anything can be drawn. Page-level data loads
  // behind each page's own skeleton, so it does not hold this loader up.
  const { isAuthReady } = useAuth();

  const [minimumPassed, setMinimumPassed] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    const minimum = setTimeout(() => setMinimumPassed(true), MINIMUM_MS);
    const giveUp = setTimeout(() => setGaveUp(true), GIVE_UP_AFTER_MS);

    return () => {
      clearTimeout(minimum);
      clearTimeout(giveUp);
    };
  }, []);

  // One second normally; longer only while the session is still being fetched.
  const stillLoading = !minimumPassed || !isAuthReady;

  if (stillLoading && !gaveUp) {
    return <GlobalLoader />;
  }

  // `flex-1` claims whatever height the header leaves, and the inner `flex flex-col` passes that
  // height on to the page. Without this the page is not part of the body's flex chain at all, so
  // a short page can't push its footer to the bottom of the window.
  return <div className="flex flex-1 flex-col">{children}</div>;
}
