import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Upgraded to newer stable model per request
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Retry helper: tries Gemini first, falls back to Groq llama on 503 (overload) or 429 (quota exceeded)
async function generateWithRetry(prompt: string): Promise<string> {
    try {
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (err: unknown) {
        const errObj = err as any;
        const status = errObj?.status;
        const message = errObj?.message || "";

        // Catch BOTH 503 High Demand and 429 Quota Exceeded errors
        if (status === 503 || status === 429 || message.includes("503") || message.includes("429") || message.includes("Quota")) {
            console.warn(`Gemini API failed with ${status || 'rate limit/quota'}. Falling back to Groq llama-3.3-70b...`);
            const completion = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
            });
            return completion.choices[0]?.message?.content?.trim() ?? "";
        }
        throw err;
    }
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface JobDescription {
    title: string;
    type: string;
    location: string;
    salary_min: number;
    salary_max: number;
    description: string;
    responsibilities: string;
    requirements: string;
}

export interface MatchResult {
    candidate_id: string;
    match_score: number;
    match_reason: string;
}

export interface CandidateProfile {
    full_name: string;
    email: string;
    phone: string;
    location: string;
    current_role: string;
    years_experience: number;
    skills: string[];
    linkedin_url: string;
}

export interface TranscriptItem {
    role: "ai" | "candidate";
    text: string;
    timestamp: string;
}

export interface InterviewContext {
    jobTitle: string;
    jobDescription: string;
    companyName: string;
    interviewType: string;
    questionCount: number;
    customPrompt?: string;
    interviewerName: string;
    tone: string;
    transcript: TranscriptItem[];
}

export interface InterviewReport {
    overall_score: number;
    communication_score: number;
    technical_score: number;
    strengths: string[];
    concerns: string[];
    ai_summary: string;
    ai_recommendation: "strong_yes" | "yes" | "maybe" | "no";
    key_highlights: string[];
}

// ─── 1. Generate Job Description ─────────────────────────────────────────────
export async function generateJobDescription(title: string): Promise<JobDescription> {
    const prompt = `Generate a comprehensive, professional job description for the role: "${title}".
Return ONLY a JSON object with exactly these fields:
{
  "title": "exact job title",
  "type": "Full-time" | "Part-time" | "Contract" | "Remote",
  "location": "realistic city or Remote",
  "salary_min": number (annual USD, no commas),
  "salary_max": number (annual USD, no commas),
  "description": "500+ word detailed job description covering role overview, team, impact",
  "responsibilities": "7-10 specific responsibilities as a numbered list",
  "requirements": "7-10 specific requirements/qualifications as a numbered list"
}
Make it realistic, detailed and appealing to top candidates.`;

    const text = await generateWithRetry(prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse job description from AI");
    return JSON.parse(jsonMatch[0]);
}

// ─── 2. Match Candidates to Job ───────────────────────────────────────────────
export async function matchCandidatesToJob(
    job: { title: string; description: string; requirements: string | null },
    candidates: Array<{ id: string; full_name: string; resume_text: string | null; skills: string[] | null; current_role: string | null; years_experience: number | null }>
): Promise<MatchResult[]> {
    if (candidates.length === 0) return [];

    const candidatesSummary = candidates.map(c => ({
        id: c.id,
        name: c.full_name,
        role: c.current_role,
        experience: c.years_experience,
        skills: c.skills?.join(", "),
        resume: c.resume_text?.slice(0, 500),
    }));

    const prompt = `You are an expert recruiter. Evaluate each candidate for the following job.

JOB TITLE: ${job.title}
JOB DESCRIPTION: ${job.description?.slice(0, 800)}
REQUIREMENTS: ${job.requirements?.slice(0, 500)}

CANDIDATES:
${JSON.stringify(candidatesSummary, null, 2)}

Return ONLY a JSON array with match results for each candidate:
[{ "candidate_id": "uuid", "match_score": 0-100, "match_reason": "2-3 sentence explanation" }]
Sort by match_score descending. Be realistic and strict.`;

    const text = await generateWithRetry(prompt);
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Failed to parse match results from AI");
    return JSON.parse(jsonMatch[0]);
}

// ─── 3. Parse Resume ──────────────────────────────────────────────────────────
export async function parseResume(resumeText: string): Promise<CandidateProfile> {
    const prompt = `Extract structured candidate information from this resume text.
Return ONLY a JSON object:
{
  "full_name": "string",
  "email": "string",
  "phone": "string",
  "location": "city, state/country",
  "current_role": "most recent job title",
  "years_experience": number,
  "skills": ["skill1", "skill2", ...],
  "linkedin_url": "string or empty string"
}

RESUME TEXT:
${resumeText.slice(0, 3000)}`;

    const text = await generateWithRetry(prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse resume from AI");
    return JSON.parse(jsonMatch[0]);
}

// ─── 4. Generate Next Interview Question ──────────────────────────────────────
export async function generateNextQuestion(ctx: InterviewContext): Promise<string | null> {
    const answeredCount = ctx.transcript.filter(t => t.role === "candidate").length;

    if (answeredCount >= ctx.questionCount) return null;

    const isFirst = ctx.transcript.length === 0;

    const prompt = `You are ${ctx.interviewerName}, an AI interviewer conducting a ${ctx.interviewType} interview for the role of ${ctx.jobTitle} at ${ctx.companyName}.
Interview tone: ${ctx.tone}.
${ctx.customPrompt ? `Additional instructions: ${ctx.customPrompt}` : ""}

JOB DESCRIPTION (brief): ${ctx.jobDescription?.slice(0, 400)}

CONVERSATION SO FAR:
${ctx.transcript.map(t => `${t.role === "ai" ? ctx.interviewerName : "Candidate"}: ${t.text}`).join("\n")}

Questions answered: ${answeredCount} of ${ctx.questionCount}.

${isFirst
            ? `Start with a warm, professional introduction as ${ctx.interviewerName}, welcome the candidate, and ask your first interview question covering their background.`
            : answeredCount >= ctx.questionCount - 1
                ? "This is the LAST question. Ask a thoughtful closing question and thank them for their time. Signal this is the final question."
                : "Ask the next contextually relevant interview question based on the conversation. Keep it focused and professional."
        }

Respond with ONLY the question/statement text. No labels, no explanations. Keep it concise (2-4 sentences max).`;

    return generateWithRetry(prompt);
}

// ─── 5. Generate Interview Report ─────────────────────────────────────────────
export async function generateInterviewReport(
    transcript: TranscriptItem[],
    jobTitle: string,
    interviewType: string
): Promise<InterviewReport> {
    const prompt = `Analyze this ${interviewType} interview for the role of ${jobTitle} and generate a comprehensive evaluation report.

TRANSCRIPT:
${transcript.map(t => `${t.role === "ai" ? "AI Interviewer" : "Candidate"}: ${t.text}`).join("\n\n")}

Return ONLY a JSON object:
{
  "overall_score": 0-100,
  "communication_score": 0-100,
  "technical_score": 0-100,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "concerns": ["concern 1", "concern 2"],
  "ai_summary": "2-3 paragraph comprehensive evaluation of the candidate",
  "ai_recommendation": "strong_yes" | "yes" | "maybe" | "no",
  "key_highlights": ["highlight 1", "highlight 2", "highlight 3"]
}

Be objective, fair, and detailed. Base all scores on actual performance in the interview.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse interview report from AI");
    return JSON.parse(jsonMatch[0]);
}
