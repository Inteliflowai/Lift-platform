export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { sendCandidateInvite } from "@/lib/invitations/trigger";

export async function POST(req: NextRequest) {
  const { tenantId, user } = await getTenantContext();
  const { candidateIds } = await req.json();

  if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
    return NextResponse.json({ error: "candidateIds array required" }, { status: 400 });
  }

  if (candidateIds.length > 200) {
    return NextResponse.json({ error: "Max 200 candidates per batch" }, { status: 400 });
  }

  const results: { candidateId: string; success: boolean; error?: string; alreadySent?: boolean }[] = [];

  for (const candidateId of candidateIds) {
    const result = await sendCandidateInvite({
      candidateId,
      tenantId,
      triggerType: "bulk_send",
      triggeredByUserId: user.id,
    });
    results.push({ candidateId, ...result });

    // Small delay to avoid hammering SMTP
    if (result.success) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  const sent = results.filter((r) => r.success).length;
  const skipped = results.filter((r) => r.alreadySent).length;
  const failed = results.filter((r) => !r.success && !r.alreadySent).length;

  return NextResponse.json({ sent, skipped, failed, results });
}
