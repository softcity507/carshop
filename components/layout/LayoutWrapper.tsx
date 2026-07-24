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

  return <>{children}</>;
}