"use client";

import { useEffect, useState } from "react";
import GlobalLoader from "@/components/mini/GlobalLoader";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <GlobalLoader />;
  }

  // `flex-1` claims whatever height the header leaves, and the inner `flex flex-col` passes that
  // height on to the page. Without this the page is not part of the body's flex chain at all, so
  // a short page can't push its footer to the bottom of the window.
  return <div className="flex flex-1 flex-col">{children}</div>;
}