import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interview_invites, candidates, jobs, app_settings } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/middleware";
import { eq } from "drizzle-orm";
import { sendEmail, buildInterviewInviteEmail } from "@/lib/email/plunk";

export async function POST(req: NextRequest) {
    const { user, response } = requireAuth(req);
    if (response) return response;

    try {
        const { jobId, candidateIds, interviewType } = await req.json();
        if (!jobId || !candidateIds?.length || !interviewType) {
            return NextResponse.json({ error: "jobId, candidateIds, and interviewType required" }, { status: 400 });
        }

        // Get job
        const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
        if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

        // Get settings for email customization
        const [settings] = await db.select().from(app_settings)
            .where(eq(app_settings.recruiter_id, user!.userId));

        const companyName = settings?.company_name || "Our Company";
        const expiryDays = settings?.invite_expiry_days || 7;
        const customIntro = settings?.custom_email_intro;
        const logoUrl = settings?.company_logo_url;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        const results = [];

        for (const candidateId of candidateIds) {
            const [candidate] = await db.select().from(candidates).where(eq(candidates.id, candidateId));
            if (!candidate) continue;

            const token = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
            const interviewLink = `${appUrl}/interview/${token}`;

            // Save invite to DB
            const [invite] = await db.insert(interview_invites).values({
                job_id: jobId,
                candidate_id: candidateId,
                recruiter_id: user!.userId,
                interview_type: interviewType,
                interview_link: token,
                expires_at: expiresAt,
                status: "pending",
            }).returning();

            // Send email
            try {
                const { subject, html } = buildInterviewInviteEmail({
                    candidateName: candidate.full_name,
                    jobTitle: job.title,
                    companyName,
                    interviewType,
                    interviewLink,
                    expiryDate: expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
                    customIntro,
                    logoUrl,
                });

                await sendEmail({ to: candidate.email, toName: candidate.full_name, subject, html });

                // Mark email sent
                await db.update(interview_invites)
                    .set({ email_sent_at: new Date() })
                    .where(eq(interview_invites.id, invite.id));

                results.push({ candidateId, status: "sent", inviteId: invite.id });
            } catch (emailErr) {
                console.error("Email send failed:", emailErr);
                results.push({ candidateId, status: "failed" });
            }
        }

        return NextResponse.json({ results, sent: results.filter(r => r.status === "sent").length });
    } catch (error) {
        console.error("Send invites error:", error);
        return NextResponse.json({ error: "Failed to send invites" }, { status: 500 });
    }
}
