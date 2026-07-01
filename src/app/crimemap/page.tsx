"use client";

import dynamic from "next/dynamic";

const CrimeMap = dynamic(() => import("./crimemap"), { ssr: false });

export default function CrimeMapPage() {
  return <CrimeMap />;
}