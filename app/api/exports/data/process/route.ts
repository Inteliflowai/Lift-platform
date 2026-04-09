import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import archiver from "archiver";

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { request_id } = await req.json();
  if (!request_id) {
    return NextResponse.json({ error: "Missing request_id" }, { status: 400 });
  }

  const { data: request } = await supabaseAdmin
    .from("data_export_requests")
    .select("*")
    .eq("id", request_id)
    .single();

  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const tenantId = request.tenant_id;
  const cycleId = request.cycle_id;

  // Update status
  await supabaseAdmin
    .from("data_export_requests")
    .update({ status: "processing", started_at: new Date().toISOString() })
    .eq("id", request_id);

  try {
    // Get tenant + admin info
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .single();

    const { data: admin } = await supabaseAdmin
      .from("users")
      .select("full_name, email")
      .eq("id", request.requested_by)
      .single();

    // --- Pull data ---
    const candidateFilter = supabaseAdmin
      .from("candidates")
      .select("*, invites(sent_at)")
      .eq("tenant_id", tenantId);
    if (cycleId) candidateFilter.eq("cycle_id", cycleId);
    const { data: candidates } = await candidateFilter;

    const candidateIds = (candidates ?? []).map((c) => c.id);
    const safeCandidateIds = candidateIds.length > 0 ? candidateIds : ["none"];

    const { data: sessions } = await supabaseAdmin
      .from("sessions")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("candidate_id", safeCandidateIds);

    const { data: profiles } = await supabaseAdmin
      .from("insight_profiles")
      .select("*, learning_support_signals(support_indicator_level)")
      .eq("tenant_id", tenantId)
      .eq("is_final", true)
      .in("candidate_id", safeCandidateIds);

    const { data: reviews } = await supabaseAdmin
      .from("evaluator_reviews")
      .select("*, users:reviewer_id(full_name)")
      .eq("tenant_id", tenantId)
      .in("candidate_id", safeCandidateIds);

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: auditLogs } = await supabaseAdmin
      .from("audit_logs")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("occurred_at", ninetyDaysAgo)
      .order("occurred_at", { ascending: false })
      .limit(1000);

    // Build candidate name map
    const nameMap: Record<string, string> = {};
    for (const c of candidates ?? []) {
      nameMap[c.id] = `${c.first_name} ${c.last_name}`;
    }

    // --- Generate CSVs ---
    const candidateCsv = toCsv(
      ["id", "first_name", "last_name", "grade_applying_to", "grade_band", "date_of_birth", "preferred_language", "status", "created_at"],
      (candidates ?? []).map((c) => ({
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        grade_applying_to: c.grade_applying_to,
        grade_band: c.grade_band,
        date_of_birth: c.date_of_birth,
        preferred_language: c.preferred_language,
        status: c.status,
        created_at: c.created_at,
      }))
    );

    const sessionCsv = toCsv(
      ["id", "candidate_id", "candidate_name", "grade_band", "status", "started_at", "completed_at", "completion_pct", "session_duration_minutes"],
      (sessions ?? []).map((s) => {
        const dur =
          s.created_at && s.completed_at
            ? Math.round((new Date(s.completed_at).getTime() - new Date(s.created_at).getTime()) / 60000)
            : null;
        return {
          id: s.id,
          candidate_id: s.candidate_id,
          candidate_name: nameMap[s.candidate_id] ?? "",
          grade_band: s.grade_band,
          status: s.status,
          started_at: s.created_at,
          completed_at: s.completed_at,
          completion_pct: s.completion_pct,
          session_duration_minutes: dur,
        };
      })
    );

    const profileCsv = toCsv(
      ["candidate_id", "candidate_name", "tri_score", "tri_label", "tri_confidence", "reading_score", "writing_score", "reasoning_score", "reflection_score", "persistence_score", "support_seeking_score", "overall_confidence", "support_indicator_level", "requires_human_review", "generated_at"],
      (profiles ?? []).map((p) => {
        const ls = p.learning_support_signals as unknown as { support_indicator_level: string }[] | null;
        return {
          candidate_id: p.candidate_id,
          candidate_name: nameMap[p.candidate_id] ?? "",
          tri_score: p.tri_score,
          tri_label: p.tri_label,
          tri_confidence: p.tri_confidence,
          reading_score: p.reading_score,
          writing_score: p.writing_score,
          reasoning_score: p.reasoning_score,
          reflection_score: p.reflection_score,
          persistence_score: p.persistence_score,
          support_seeking_score: p.support_seeking_score,
          overall_confidence: p.overall_confidence,
          support_indicator_level: ls?.[0]?.support_indicator_level ?? "",
          requires_human_review: p.requires_human_review,
          generated_at: p.generated_at,
        };
      })
    );

    const evalCsv = toCsv(
      ["candidate_id", "candidate_name", "evaluator_name", "recommendation_tier", "notes", "created_at"],
      (reviews ?? []).map((r) => {
        const u = r.users as unknown as { full_name: string } | null;
        return {
          candidate_id: r.candidate_id,
          candidate_name: nameMap[r.candidate_id] ?? "",
          evaluator_name: u?.full_name ?? "",
          recommendation_tier: r.recommendation_tier,
          notes: ((r.notes as string) ?? "").slice(0, 500),
          created_at: r.created_at,
        };
      })
    );

    const auditCsv = toCsv(
      ["occurred_at", "action", "actor_id", "candidate_id", "details"],
      (auditLogs ?? []).map((a) => ({
        occurred_at: a.occurred_at,
        action: a.action,
        actor_id: a.actor_id,
        candidate_id: a.candidate_id,
        details: JSON.stringify(a.payload ?? {}).slice(0, 500),
      }))
    );

    const counts = {
      candidates: (candidates ?? []).length,
      sessions: (sessions ?? []).length,
      profiles: (profiles ?? []).length,
      evaluations: (reviews ?? []).length,
      audit_logs: (auditLogs ?? []).length,
    };

    const readme = [
      "LIFT Data Export",
      `School: ${tenant?.name ?? "Unknown"}`,
      `Export date: ${new Date().toISOString().split("T")[0]}`,
      `Export type: ${request.export_type}`,
      `Generated by: ${admin?.full_name ?? "Admin"}`,
      "",
      "Files included:",
      `candidates.csv — ${counts.candidates} records — All candidate records`,
      `sessions.csv — ${counts.sessions} records — Session data`,
      `profiles.csv — ${counts.profiles} records — AI-generated insight profiles`,
      `evaluations.csv — ${counts.evaluations} records — Evaluator reviews`,
      `audit_log.csv — ${counts.audit_logs} records — System activity (last 90 days)`,
      "",
      "This export is provided in compliance with FERPA data portability requirements.",
      `All data is owned by ${tenant?.name ?? "the school"} and managed by LIFT — Inteliflow AI.`,
      "For questions: lift@inteliflowai.com",
    ].join("\n");

    // --- Create ZIP ---
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));

    archive.append(readme, { name: "README.txt" });
    archive.append(candidateCsv, { name: "candidates.csv" });
    archive.append(sessionCsv, { name: "sessions.csv" });
    archive.append(profileCsv, { name: "profiles.csv" });
    archive.append(evalCsv, { name: "evaluations.csv" });
    archive.append(auditCsv, { name: "audit_log.csv" });

    await archive.finalize();

    // Wait for all data to be collected
    await new Promise<void>((resolve) => archive.on("end", resolve));

    const zipBuffer = Buffer.concat(chunks);
    const dateStr = new Date().toISOString().split("T")[0];
    const storagePath = `${tenantId}/exports/${request_id}/lift-export-${dateStr}.zip`;

    // Upload to Supabase Storage
    await supabaseAdmin.storage
      .from("lift-exports")
      .upload(storagePath, zipBuffer, {
        contentType: "application/zip",
        upsert: true,
      });

    // Generate signed URL (7 days)
    const { data: signedData } = await supabaseAdmin.storage
      .from("lift-exports")
      .createSignedUrl(storagePath, 7 * 24 * 60 * 60);

    const downloadUrl = signedData?.signedUrl ?? null;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Update request
    await supabaseAdmin
      .from("data_export_requests")
      .update({
        status: "complete",
        storage_path: storagePath,
        download_url: downloadUrl,
        download_url_expires_at: expiresAt,
        file_size_bytes: zipBuffer.length,
        record_counts: counts,
        completed_at: new Date().toISOString(),
      })
      .eq("id", request_id);

    // Send email
    if (admin?.email) {
      const { sendLiftEmail } = await import("@/lib/emails/send");
      const { emailGreeting, emailParagraph, emailButton, emailCallout, emailSignature } = await import("@/lib/emails/templates/base");

      await sendLiftEmail({
        to: admin.email,
        subject: "Your LIFT data export is ready",
        tenantId,
        content: [
          emailGreeting(admin.full_name?.split(" ")[0] ?? "there"),
          emailCallout(`Your data export for <strong>${tenant?.name}</strong> is ready to download.`, "success"),
          emailParagraph(`The ZIP file contains ${counts.candidates} candidates, ${counts.sessions} sessions, and ${counts.profiles} insight profiles.`),
          downloadUrl ? emailButton("Download Export", downloadUrl) : emailParagraph("Download link will appear in your settings."),
          emailParagraph('<span style="color:#9ca3af;font-size:13px;">This download link expires in 7 days.</span>'),
          emailSignature(),
        ].join(""),
        options: { previewText: "Your data export is ready to download", showUnsubscribe: false },
      });
    }

    await writeAuditLog(supabaseAdmin, {
      tenant_id: tenantId,
      actor_id: request.requested_by,
      action: "data_export_completed",
      payload: { request_id, counts, file_size: zipBuffer.length },
    });

    return NextResponse.json({ ok: true, status: "complete" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Export failed";
    console.error("Data export failed:", err);

    await supabaseAdmin
      .from("data_export_requests")
      .update({ status: "failed", error_message: msg, completed_at: new Date().toISOString() })
      .eq("id", request_id);

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
