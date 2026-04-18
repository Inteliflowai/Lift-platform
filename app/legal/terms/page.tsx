import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — LIFT by Inteliflow",
  description: "LIFT Terms of Service governing access to and use of the LIFT platform.",
};

export default function TermsPage() {
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
          LIFT Terms of Service
        </h1>
        <p style={{ fontSize: 14, color: "#99f6e4", marginBottom: 16 }}>
          Effective Date: April 17, 2026 &middot; Last Updated: April 17, 2026
        </p>
        <p style={{ fontSize: 15, lineHeight: 1.8, color: "#d1fae5", marginBottom: 48 }}>
          These Terms of Service (&ldquo;<strong>Terms</strong>&rdquo;) govern access to and use of the LIFT platform at lift.inteliflowai.com (the &ldquo;<strong>Service</strong>&rdquo;), operated by Inteliflow Corporation, a Wyoming corporation (&ldquo;<strong>Inteliflow</strong>,&rdquo; &ldquo;<strong>we</strong>,&rdquo; &ldquo;<strong>us</strong>&rdquo;).
        </p>
        <p style={{ fontSize: 14, color: "#99f6e4", background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)", borderRadius: 8, padding: "12px 16px", marginBottom: 48, lineHeight: 1.7 }}>
          <strong>For Schools:</strong> these Terms are supplemented by your Order Form and Data Protection Addendum (DPA), which together form the &ldquo;Agreement.&rdquo; In case of conflict, the Order Form controls, then the DPA, then these Terms.
        </p>

        <div style={{ fontSize: 15, lineHeight: 1.8, color: "#d1fae5" }}>
          <Section title="1. What LIFT Is (and Isn't)">
            <p>LIFT is an <strong>independent student assessment layer</strong> for grades 6&ndash;11 admissions at independent, boarding, and therapeutic schools. LIFT evaluates applicants directly through proctored or unproctored assessment tasks. LIFT is <strong>not</strong> an admissions workflow tool and does not replace tools like Ravenna or Blackbaud. LIFT sits alongside those tools and produces evaluative outputs for Schools&rsquo; admissions decisions.</p>
            <p><strong>Schools retain sole authority over admissions decisions.</strong> LIFT outputs (scores, signals, narratives) are decision-support, not decisions.</p>
          </Section>

          <Section title="2. Eligibility and Accounts">
            <ul>
              <li>LIFT is licensed to Schools for evaluation of applicants.</li>
              <li>Evaluators, interviewers, committee members, and School administrators receive accounts provisioned by the School.</li>
              <li>Parents/guardians create family accounts at the School&rsquo;s invitation to complete assessment tasks with applicants.</li>
              <li>Account credentials must be kept confidential. Accounts are non-transferable.</li>
            </ul>
          </Section>

          <Section title="3. Subscription, Trial, and Fees">
            <ul>
              <li><strong>30-day full trial</strong> &mdash; no session cap &mdash; available to qualified Schools. The trial grants full Service functionality.</li>
              <li><strong>Paid tiers</strong> (current as of the Effective Date; controlling pricing is in your Order Form):
                <ul>
                  <li>Professional &mdash; $12,000 per year</li>
                  <li>Enterprise &mdash; $18,000 per year</li>
                </ul>
              </li>
              <li><strong>Annual contracts</strong>, September-aligned where possible.</li>
              <li><strong>Payment:</strong> Invoiced annually in advance, payable net 30 unless otherwise stated. Stripe processing available.</li>
              <li><strong>Taxes:</strong> Exclusive of taxes. Customer is responsible for applicable taxes other than Inteliflow&rsquo;s income taxes.</li>
              <li><strong>Non-payment:</strong> Accounts more than 30 days past due may be suspended after written notice.</li>
            </ul>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree not to:</p>
            <ul>
              <li>Use LIFT for purposes other than legitimate admissions evaluation</li>
              <li>Share or redistribute assessment content, tasks, or scoring rubrics</li>
              <li>Reverse engineer the assessment instrument or signal detectors to game results</li>
              <li>Resell, sublicense, or white-label LIFT without written agreement</li>
              <li>Use LIFT to train third-party AI models</li>
              <li>Use LIFT in a manner that violates applicable anti-discrimination laws</li>
            </ul>
            <p>Schools are responsible for ensuring their evaluators, interviewers, and committee members use LIFT consistent with these Terms and with applicable anti-discrimination and admissions laws.</p>
          </Section>

          <Section title="5. Applicant Voice and Media">
            <p>Where a School enables voice features, applicants or their parents/guardians may be asked to provide voice responses on non-reading tasks. By proceeding with such tasks, the applicant or guardian consents to the recording, transmission, storage, and processing of the voice input for evaluation purposes as described in the Privacy Policy.</p>
          </Section>

          <Section title="6. AI and Signal Outputs">
            <ul>
              <li>LIFT uses AI models to assist scoring, generate narrative report sections, and derive behavioral signals.</li>
              <li><strong>AI outputs are suggestions.</strong> School personnel review and adjust as needed.</li>
              <li><strong>Behavioral signals are observational, not diagnostic.</strong> LIFT signals do not constitute psychological, medical, or educational diagnoses and must not be represented as such.</li>
              <li>Admissions decisions based on LIFT outputs must comply with applicable law. Inteliflow does not warrant compliance of School admissions decisions.</li>
            </ul>
          </Section>

          <Section title="7. Intellectual Property">
            <ul>
              <li>The Service, including assessment instruments, signal detectors, scoring rubrics, and Inteliflow&rsquo;s pedagogical frameworks, is owned by Inteliflow or its licensors.</li>
              <li>Assessment content is confidential. Unauthorized redistribution is a material breach.</li>
              <li>Schools and users retain ownership of their own inputs (School data, applicant responses, interviewer notes). They grant Inteliflow a limited license to host and process those inputs to operate the Service.</li>
              <li>Feedback may be used by Inteliflow without restriction.</li>
            </ul>
          </Section>

          <Section title="8. Integrations">
            <p>LIFT integrates with third-party services including Stripe (payments), HighLevel (CRM), Resend (email), and optionally with Inteliflow&rsquo;s CORE platform via CORE Bridge. Third-party services are subject to their own terms.</p>
          </Section>

          <Section title="9. Confidentiality">
            <p>Both parties will protect each other&rsquo;s Confidential Information with reasonable care and use it only for the purposes of the Agreement. Assessment content, signal methodologies, and applicant personal information are each Confidential Information.</p>
          </Section>

          <Section title="10. Privacy and Data Protection">
            <p>Our <a href="/legal/privacy" style={linkStyle}>Privacy Policy</a> and School DPA describe how we handle personal information and are incorporated by reference.</p>
          </Section>

          <Section title="11. Suspension and Termination">
            <ul>
              <li>We may suspend for material breach, non-payment, or legal reasons.</li>
              <li>Schools may terminate for convenience at the end of the current term as specified in the Order Form.</li>
              <li>On termination we will delete or return School data within 60 days, except where retention is legally required.</li>
              <li>Provisions regarding IP, confidentiality, liability, indemnification, governing law, and miscellaneous survive termination.</li>
            </ul>
          </Section>

          <Section title="12. Warranties and Disclaimers">
            <p>We warrant we will provide the Service in a professional and workmanlike manner.</p>
            <p style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "12px 16px", fontSize: 13, lineHeight: 1.7, marginTop: 12 }}>
              EXCEPT FOR THE EXPRESS WARRANTIES IN THESE TERMS, THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE.&rdquo; INTELIFLOW DISCLAIMS ALL OTHER WARRANTIES, EXPRESS OR IMPLIED. LIFT OUTPUTS DO NOT CONSTITUTE AND SHOULD NOT BE REPRESENTED AS PSYCHOLOGICAL, MEDICAL, OR EDUCATIONAL DIAGNOSES. INTELIFLOW MAKES NO WARRANTY THAT LIFT OUTPUTS ARE CORRELATED WITH ANY ADMISSIONS OUTCOME.
            </p>
          </Section>

          <Section title="13. Limitation of Liability">
            <p style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, padding: "12px 16px", fontSize: 13, lineHeight: 1.7 }}>
              NEITHER PARTY WILL BE LIABLE FOR INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, LOST REVENUE, OR LOSS OF DATA. INTELIFLOW&rsquo;S TOTAL AGGREGATE LIABILITY UNDER THE AGREEMENT WILL NOT EXCEED THE FEES PAID OR PAYABLE BY THE SCHOOL IN THE 12 MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM.
            </p>
            <p style={{ marginTop: 12 }}>Exclusions do not apply to breaches of confidentiality, indemnification obligations, data protection obligations, or liability that cannot be excluded by law.</p>
          </Section>

          <Section title="14. Indemnification">
            <ul>
              <li><strong>Inteliflow</strong> will defend the School against third-party claims that the Service, as provided by Inteliflow and used as authorized, infringes a U.S. patent, copyright, or trademark.</li>
              <li><strong>The School</strong> will defend Inteliflow against claims arising from (a) admissions decisions based on LIFT outputs; (b) the School&rsquo;s failure to obtain consents; (c) User Content the School provides; or (d) the School&rsquo;s violation of law or these Terms.</li>
            </ul>
          </Section>

          <Section title="15. Governing Law and Disputes">
            <p>Governed by the laws of the State of Wyoming, without regard to conflict-of-laws rules. Exclusive venue: Laramie County, Wyoming. Public-entity Schools: the Order Form may specify alternative governing law.</p>
          </Section>

          <Section title="16. Changes">
            <p>We may update these Terms. For material changes affecting paid subscriptions, we will give at least 30 days&rsquo; notice.</p>
          </Section>

          <Section title="17. Miscellaneous">
            <p>Entire agreement clause; assignment requires consent (successor exception applies); force majeure; notices to <a href="mailto:legal@inteliflowai.com" style={linkStyle}>legal@inteliflowai.com</a>; severability; no waiver by inaction.</p>
          </Section>

          <Section title="Contact">
            <p><strong>Inteliflow Corporation</strong></p>
            <p><a href="mailto:legal@inteliflowai.com" style={linkStyle}>legal@inteliflowai.com</a></p>
            <p>9398 Isles Cay Drive, Delray Beach, FL 33446</p>
          </Section>
        </div>
      </div>
    </div>
  );
}

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
