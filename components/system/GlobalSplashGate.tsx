"use client";

import { useEffect, useState, type ReactNode } from "react";
import SplashScreen from "@/components/system/SplashScreen";

type GlobalSplashGateProps = {
  children: ReactNode;
};

export default function GlobalSplashGate({ children }: GlobalSplashGateProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const startExitTimer = window.setTimeout(() => {
      setIsExiting(true);
    }, 300);

    const hideTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, 900);

    return () => {
      window.clearTimeout(startExitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  return (
    <>
      {children}
      {isVisible && <SplashScreen overlay exiting={isExiting} />}
    </>
  );
}
