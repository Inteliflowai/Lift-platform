"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

export function CycleActions({
  cycleId,
  candidateCount,
  status,
}: {
  cycleId: string;
  candidateCount: number;
  status: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  async function handleDelete() {
    if (candidateCount > 0) {
      toast("Cannot delete a cycle with candidates. Archive it instead.", "error");
      return;
    }
    if (!confirm("Delete this cycle? This cannot be undone.")) return;

    const res = await fetch(`/api/school/cycles/${cycleId}`, { method: "DELETE" });
    if (res.ok) {
      toast("Cycle deleted");
      router.refresh();
    } else {
      toast("Failed to delete cycle", "error");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/school/cycles/${cycleId}`}
        className="text-xs text-primary hover:underline"
      >
        Edit
      </Link>
      {status === "draft" && candidateCount === 0 && (
        <button
          onClick={handleDelete}
          className="text-xs text-review hover:text-review/80"
        >
          Delete
        </button>
      )}
      {status !== "draft" && candidateCount === 0 && (
        <button
          onClick={handleDelete}
          className="text-xs text-muted hover:text-review"
        >
          Delete
        </button>
      )}
    </div>
  );
}
