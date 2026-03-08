interface SendEmailOptions {
    to: string;
    toName: string;
    subject: string;
    html: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
    const { to, toName, subject, html } = options;

    const res = await fetch("https://api.useplunk.com/v1/send", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.PLUNK_API_KEY}`,
        },
        body: JSON.stringify({ to, toName, subject, body: html }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Plunk error: ${res.status} — ${err}`);
    }
}

export function buildInterviewInviteEmail(params: {
    candidateName: string;
    jobTitle: string;
    companyName: string;
    interviewType: string;
    interviewLink: string;
    expiryDate: string;
    customIntro?: string | null;
    logoUrl?: string | null;
}): { subject: string; html: string } {
    const { candidateName, jobTitle, companyName, interviewType, interviewLink, expiryDate, customIntro, logoUrl } = params;

    const typeLabel = interviewType === "screening" ? "Screening Round" :
        interviewType === "technical" ? "Technical Round" : "HR Final Round";

    const subject = `Interview Invitation: ${jobTitle} at ${companyName}`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="background:#0a0a0f;color:#e2e2ef;font-family:Inter,sans-serif;margin:0;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:#111118;border:1px solid #1e1e2e;border-radius:12px;overflow:hidden;">
    ${logoUrl ? `<div style="padding:24px 24px 0;"><img src="${logoUrl}" alt="${companyName}" style="height:40px;object-fit:contain;"></div>` : ""}
    <div style="padding:32px 24px;">
      <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px;">Hi ${candidateName},</h1>
      ${customIntro ? `<p style="color:#e2e2ef;margin:0 0 16px;">${customIntro}</p>` : ""}
      <p style="color:#8b8b9e;margin:0 0 24px;line-height:1.6;">You have been invited to complete an AI-powered interview for the <strong style="color:#e2e2ef;">${jobTitle}</strong> position at <strong style="color:#e2e2ef;">${companyName}</strong>.</p>
      
      <div style="background:#0a0a0f;border:1px solid #1e1e2e;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="color:#8b8b9e;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Interview Details</p>
        <p style="color:#e2e2ef;margin:4px 0;"><span style="color:#8b8b9e;">Type:</span> ${typeLabel}</p>
        <p style="color:#e2e2ef;margin:4px 0;"><span style="color:#8b8b9e;">Format:</span> AI Voice Interview</p>
        <p style="color:#e2e2ef;margin:4px 0;"><span style="color:#8b8b9e;">Expires:</span> ${expiryDate}</p>
      </div>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="${interviewLink}" style="display:inline-block;background:linear-gradient(135deg,#6c47ff,#7c3aed);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">
          Start Your Interview →
        </a>
      </div>

      <p style="color:#8b8b9e;font-size:13px;margin:0;">This link expires on <strong style="color:#e2e2ef;">${expiryDate}</strong>. Make sure you are in a quiet environment with a working microphone.</p>
    </div>
    <div style="padding:16px 24px;border-top:1px solid #1e1e2e;text-align:center;">
      <p style="color:#8b8b9e;font-size:11px;margin:0;">This interview is powered by <strong style="color:#6c47ff;">HireFlow AI</strong></p>
    </div>
  </div>
</body>
</html>`;

    return { subject, html };
}
