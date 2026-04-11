import { Suspense } from "react";
import { BuyClient } from "./buy-client";

export default function BuyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-white/50">Loading...</p></div>}>
      <BuyClient />
    </Suspense>
  );
}
