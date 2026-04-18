import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — LIFT by Inteliflow",
  description: "LIFT Privacy Policy. How we collect, use, and protect student and school data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a1419",
      color: "#ecfdf5",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "48px 24px 80px" }}>
        <a href="/lift" style={{ color: "#2dd4bf", fontSize: 14, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 32 }}>
          ← Back to LIFT
        </a>

        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 36, fontWeight: 800, marginBottom: 8, color: "#fff" }}>
          LIFT Privacy Policy
        </h1>
        <p style={{ fontSize: 14, color: "#99f6e4", marginBottom: 48 }}>
          Effective Date: April 17, 2026 &middot; Last Updated: April 17, 2026
        </p>

        <div style={{ fontSize: 15, lineHeight: 1.8, color: "#d1fae5" }}>
          <p>
            Inteliflow Corporation, a Wyoming corporation (&ldquo;<strong>Inteliflow</strong>,&rdquo; &ldquo;<strong>we</strong>,&rdquo; &ldquo;<strong>us</strong>,&rdquo; or &ldquo;<strong>our</strong>&rdquo;) operates the LIFT platform at lift.inteliflowai.com (the &ldquo;<strong>Service</strong>&rdquo;). LIFT is an independent student assessment layer used by independent, boarding, and therapeutic schools for grades 6&ndash;11 admissions evaluation.
          </p>
          <p>
            This Privacy Policy explains how we collect, use, disclose, and protect information about students, families, school administrators, evaluators, interviewers, and committee members who use LIFT.
          </p>

          <Section title="1. Scope and Roles">
            <p>LIFT is used in two primary contexts:</p>
            <ol>
              <li><strong>School-administered assessment.</strong> A school (&ldquo;<strong>School</strong>&rdquo;) engages Inteliflow to evaluate applicants. The School is the data controller. Inteliflow is a processor / service provider / school official acting under the School&rsquo;s written instructions.</li>
              <li><strong>Family-facing assessment completion.</strong> Parents/guardians and student applicants complete assessment tasks through LIFT at the School&rsquo;s invitation.</li>
            </ol>
            <p>LIFT <strong>does not compete with admissions workflow tools</strong> (e.g., Ravenna, Blackbaud). It sits alongside them as an independent evaluative layer and does not process parent-reported application data as the source of truth &mdash; the student is evaluated directly.</p>
          </Section>

          <Section title="2. Information We Collect">
            <h4 style={subheadStyle}>2.1 From Schools</h4>
            <ul>
              <li>School and administrator contact information</li>
              <li>Application cohort metadata (names, grade levels, testing windows)</li>
              <li>Evaluator / interviewer / committee member accounts</li>
              <li>Billing contact information</li>
            </ul>

            <h4 style={subheadStyle}>2.2 From Families and Applicants</h4>
            <ul>
              <li>Applicant name, date of birth, grade applying to, demographic information the School requests</li>
              <li>Parent/guardian name, relationship, email, and phone</li>
              <li>Assessment responses across reading, math, writing, and reasoning tasks</li>
              <li>Interviewer notes entered by School personnel</li>
              <li>Interview voice recordings (where the School enables audio) &mdash; voice features are used on <strong>non-reading tasks only</strong>; no voice input is captured during reading-comprehension sections</li>
            </ul>

            <h4 style={subheadStyle}>2.3 Generated Through the Service</h4>
            <ul>
              <li>Assessment scores, task-level performance, and time-on-task</li>
              <li>Nine behavioral / learning signal detectors (persistence, self-regulation, executive function indicators, etc.) generated from assessment interactions &mdash; these are observational signals, not clinical diagnoses</li>
              <li>Family report PDFs, committee reports, class composition outputs, and CORE Bridge data where enabled</li>
              <li>Device, browser, and IP information; session logs</li>
              <li>Sentry error diagnostics (with PII scrubbed)</li>
            </ul>

            <h4 style={subheadStyle}>2.4 Payment Information</h4>
            <p>Paid features and subscriptions are processed by <strong>Stripe</strong>. We do not store full payment card numbers; Stripe handles card data under PCI DSS. We may use <strong>HighLevel</strong> for CRM, pipeline management, and transactional outreach with School personnel.</p>
          </Section>

          <Section title="3. How We Use Information">
            <ul>
              <li>To deliver the assessment experience to applicants</li>
              <li>To generate evaluator dashboards, family reports, interviewer notes, committee reports, cohort views, class composition analyses, and &mdash; where enabled &mdash; CORE Bridge handoffs</li>
              <li>To provide customer support and onboarding</li>
              <li>To bill and collect fees</li>
              <li>To secure, maintain, and improve the Service</li>
              <li>To comply with legal obligations</li>
            </ul>
            <p>We do <strong>not</strong> sell applicant or family data. We do not use applicant data for targeted advertising.</p>
          </Section>

          <Section title="4. Behavioral Signals — What They Are and Aren't">
            <p>LIFT produces observational signals derived from how an applicant engages with assessment tasks (e.g., pacing, revisions, task abandonment). <strong>These signals are not a psychological, medical, or educational diagnosis.</strong> They inform school admissions and placement decisions as one input among many. Schools retain sole decision-making authority over admissions outcomes.</p>
          </Section>

          <Section title="5. How We Share Information">
            <ul>
              <li><strong>With the School:</strong> The School has access to its applicants&rsquo; data.</li>
              <li><strong>With families:</strong> As the School directs, including family report PDFs.</li>
              <li><strong>With service providers:</strong>
                <ul>
                  <li><strong>Supabase, Inc.</strong> &mdash; database, auth, storage</li>
                  <li><strong>OpenAI, L.L.C.</strong> &mdash; LLM inference for scoring assistance and narrative generation (not used to train OpenAI models under our API terms)</li>
                  <li><strong>Anthropic, PBC</strong> &mdash; Claude inference, where enabled</li>
                  <li><strong>Stripe, Inc.</strong> &mdash; payment processing</li>
                  <li><strong>HighLevel</strong> &mdash; CRM and transactional communications</li>
                  <li><strong>Vercel Inc.</strong> &mdash; application hosting</li>
                  <li><strong>Resend</strong> &mdash; transactional email delivery</li>
                  <li><strong>Sentry</strong> &mdash; error monitoring with PII scrubbing</li>
                </ul>
              </li>
              <li><strong>For legal reasons</strong> as described in our standard School DPA</li>
              <li><strong>In connection with a corporate transaction</strong> where data protections survive</li>
            </ul>
          </Section>

          <Section title="6. AI Disclosure">
            <p>LIFT uses large language models for scoring assistance, narrative generation in reports, and signal interpretation. AI outputs are <strong>suggestions reviewed by School personnel</strong>, not autonomous decisions. Under our API agreements, OpenAI and Anthropic do not use our API inputs/outputs to train their foundation models.</p>
          </Section>

          <Section title="7. Data Security">
            <ul>
              <li>TLS in transit; encryption at rest</li>
              <li>Role-based access with Supabase Row Level Security</li>
              <li>Voice recordings encrypted and access-controlled; retained only as long as required for evaluation</li>
              <li>Audit logs of significant admin actions</li>
              <li>Automated test suite wired into the Vercel build pipeline (non-regression for critical paths)</li>
              <li>Incident response and breach notification procedures</li>
            </ul>
          </Section>

          <Section title="8. Retention and Deletion">
            <ul>
              <li><strong>Active engagement:</strong> Data retained for the School&rsquo;s current admissions cycle plus one subsequent cycle unless the School directs otherwise.</li>
              <li><strong>After contract termination or School request:</strong> Data deleted or returned within 60 days, except where retention is required by law.</li>
              <li><strong>De-identified aggregate data</strong> may be retained for service improvement.</li>
              <li><strong>Families</strong> may request deletion or correction through the School; we will facilitate such requests under the School&rsquo;s direction.</li>
            </ul>
          </Section>

          <Section title="9. Your Rights">
            <p>Depending on jurisdiction, you may have rights to access, correct, delete, port, or restrict processing of personal information. Parents/guardians may exercise these rights on behalf of minor applicants.</p>
            <ul>
              <li><strong>California residents:</strong> We do not sell or share personal information as defined under CCPA/CPRA. You may submit rights requests to <a href="mailto:privacy@inteliflowai.com" style={linkStyle}>privacy@inteliflowai.com</a>.</li>
              <li><strong>EU/UK residents:</strong> You may contact us or your School to exercise GDPR rights; for LIFT services, the School is typically the controller.</li>
              <li><strong>Applicants under 13:</strong> LIFT is designed for grades 6&ndash;11, which includes some students under 13. When used with students under 13, we operate under COPPA&rsquo;s school-authorized consent pathway.</li>
            </ul>
          </Section>

          <Section title="10. Children's Privacy">
            <p>While LIFT is intended for grades 6&ndash;11 applicants, some applicants may be under 13. We do not knowingly collect information from children under 13 except through the School&rsquo;s COPPA-compliant consent process.</p>
          </Section>

          <Section title="11. International Transfers">
            <p>We process data in the United States. Where required, we rely on Standard Contractual Clauses or equivalent transfer mechanisms.</p>
          </Section>

          <Section title="12. Changes">
            <p>Material changes will be communicated to Schools at least 30 days in advance.</p>
          </Section>

          <Section title="13. Contact">
            <p><strong>Inteliflow Corporation</strong></p>
            <p>Privacy: <a href="mailto:privacy@inteliflowai.com" style={linkStyle}>privacy@inteliflowai.com</a></p>
            <p>Legal: <a href="mailto:legal@inteliflowai.com" style={linkStyle}>legal@inteliflowai.com</a></p>
            <p>Postal: 9398 Isles Cay Drive, Delray Beach, FL 33446</p>
          </Section>
        </div>
      </div>
    </div>
  );
}

const subheadStyle = {
  fontSize: 16,
  fontWeight: 700 as const,
  color: "#fff",
  marginTop: 24,
  marginBottom: 8,
};

const linkStyle = {
  color: "#2dd4bf",
  textDecoration: "underline" as const,
  textUnderlineOffset: 3,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 40 }}>
      <h2 style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 22,
        fontWeight: 700,
        color: "#fff",
        marginBottom: 16,
        paddingBottom: 8,
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
