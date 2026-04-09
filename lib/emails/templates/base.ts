export interface EmailTemplateOptions {
  schoolName?: string;
  schoolLogoUrl?: string;
  primaryColor?: string;
  previewText?: string;
  footerNote?: string;
  showUnsubscribe?: boolean;
  unsubscribeUrl?: string;
}

export function baseEmailTemplate(
  content: string,
  options: EmailTemplateOptions = {}
): string {
  const color = options.primaryColor || "#6366f1";
  const year = new Date().getFullYear();

  const logoHtml = options.schoolLogoUrl
    ? `<img src="${options.schoolLogoUrl}" alt="${options.schoolName || "School"}" width="140" style="max-height:44px;width:auto;display:block;margin:0 auto;" />`
    : `<div style="text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:bold;color:${color};letter-spacing:1px;">LIFT</div>
       <div style="text-align:center;font-family:Arial,sans-serif;font-size:11px;color:#9ca3af;margin-top:2px;">Learning Insight for Transitions</div>`;

  const previewHtml = options.previewText
    ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${options.previewText}</div>`
    : "";

  const unsubHtml =
    options.showUnsubscribe !== false
      ? `<p style="font-size:11px;color:#9ca3af;margin:8px 0 0;">
          <a href="${options.unsubscribeUrl || "#"}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
          &nbsp;&middot;&nbsp;
          <a href="https://admissions.inteliflowai.com/privacy" style="color:#9ca3af;text-decoration:underline;">Privacy Policy</a>
        </p>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${options.schoolName || "LIFT"}</title>
<style>
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; padding: 16px !important; }
    .email-card { padding: 24px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f8f8fc;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
${previewHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f8fc;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Top bar -->
  <tr><td style="height:4px;background:${color};border-radius:12px 12px 0 0;"></td></tr>

  <!-- Card -->
  <tr><td class="email-card" style="background:#ffffff;padding:40px;border-radius:0 0 12px 12px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">

    <!-- Logo -->
    <div style="margin-bottom:32px;">
      ${logoHtml}
    </div>

    <!-- Content -->
    ${content}

  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:24px 0;text-align:center;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">
      &copy; ${year} Inteliflow &middot; LIFT Platform
    </p>
    ${options.footerNote ? `<p style="font-size:11px;color:#9ca3af;margin:6px 0 0;">${options.footerNote}</p>` : ""}
    ${unsubHtml}
    <p style="font-size:10px;color:#c5c5d0;margin:12px 0 0;">
      LIFT is a non-diagnostic admissions insight platform. It does not diagnose any clinical or medical condition.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// Reusable email HTML components
export function emailGreeting(name: string): string {
  return `<p style="font-size:18px;font-weight:bold;color:#1c1917;font-family:Georgia,'Times New Roman',serif;margin:0 0 16px;">Hi ${name},</p>`;
}

export function emailParagraph(text: string): string {
  return `<p style="font-size:15px;line-height:1.7;color:#374151;margin:0 0 16px;">${text}</p>`;
}

export function emailButton(label: string, url: string, color?: string): string {
  const bg = color || "#6366f1";
  return `<div style="text-align:center;margin:32px 0;">
    <a href="${url}" style="background:${bg};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">${label}</a>
  </div>`;
}

export function emailDivider(): string {
  return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">`;
}

export function emailCallout(text: string, type: "info" | "warning" | "success" = "info"): string {
  const styles = {
    info: { bg: "#f0f0ff", border: "#6366f1", color: "#4338ca" },
    warning: { bg: "#fffbeb", border: "#f59e0b", color: "#92400e" },
    success: { bg: "#ecfdf5", border: "#10b981", color: "#065f46" },
  };
  const s = styles[type];
  return `<div style="background:${s.bg};border-left:4px solid ${s.border};padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
    <p style="font-size:14px;color:${s.color};margin:0;">${text}</p>
  </div>`;
}

export function emailList(items: string[]): string {
  return `<ul style="font-size:15px;line-height:1.9;color:#374151;padding-left:20px;margin:0 0 16px;">
    ${items.map((i) => `<li>${i}</li>`).join("")}
  </ul>`;
}

export function emailSignature(): string {
  return `<p style="font-size:15px;color:#374151;margin:24px 0 0;">— The LIFT Team</p>`;
}
