import {
    pgTable,
    uuid,
    varchar,
    text,
    integer,
    boolean,
    timestamp,
    jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── users ────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email", { length: 255 }).unique().notNull(),
    password_hash: varchar("password_hash", { length: 255 }),
    full_name: varchar("full_name", { length: 255 }).notNull(),
    avatar_url: varchar("avatar_url", { length: 500 }),
    role: varchar("role", { length: 50 }).default("recruiter").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// ─── jobs ─────────────────────────────────────────────────────────────────────
export const jobs = pgTable("jobs", {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    recruiter_id: uuid("recruiter_id")
        .references(() => users.id, { onDelete: "cascade" })
        .notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    type: varchar("type", { length: 100 }).notNull(),
    location: varchar("location", { length: 255 }).notNull(),
    salary_min: integer("salary_min"),
    salary_max: integer("salary_max"),
    description: text("description").notNull(),
    responsibilities: text("responsibilities"),
    requirements: text("requirements"),
    status: varchar("status", { length: 50 }).default("draft").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// ─── candidates ───────────────────────────────────────────────────────────────
export const candidates = pgTable("candidates", {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    recruiter_id: uuid("recruiter_id")
        .references(() => users.id, { onDelete: "cascade" })
        .notNull(),
    full_name: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    location: varchar("location", { length: 255 }),
    current_role: varchar("current_role", { length: 255 }),
    years_experience: integer("years_experience"),
    skills: text("skills").array(),
    resume_url: varchar("resume_url", { length: 500 }),
    resume_text: text("resume_text"),
    linkedin_url: varchar("linkedin_url", { length: 500 }),
    notes: text("notes"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// ─── job_candidate_matches ────────────────────────────────────────────────────
export const job_candidate_matches = pgTable("job_candidate_matches", {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    job_id: uuid("job_id")
        .references(() => jobs.id, { onDelete: "cascade" })
        .notNull(),
    candidate_id: uuid("candidate_id")
        .references(() => candidates.id, { onDelete: "cascade" })
        .notNull(),
    match_score: integer("match_score").notNull(),
    match_reason: text("match_reason").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── interview_invites ────────────────────────────────────────────────────────
export const interview_invites = pgTable("interview_invites", {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    job_id: uuid("job_id")
        .references(() => jobs.id, { onDelete: "cascade" })
        .notNull(),
    candidate_id: uuid("candidate_id")
        .references(() => candidates.id, { onDelete: "cascade" })
        .notNull(),
    recruiter_id: uuid("recruiter_id")
        .references(() => users.id, { onDelete: "cascade" })
        .notNull(),
    interview_type: varchar("interview_type", { length: 100 }).notNull(),
    status: varchar("status", { length: 50 }).default("pending").notNull(),
    interview_link: varchar("interview_link", { length: 255 }).unique().notNull(),
    email_sent_at: timestamp("email_sent_at"),
    expires_at: timestamp("expires_at").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── interview_sessions ───────────────────────────────────────────────────────
export const interview_sessions = pgTable("interview_sessions", {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    invite_id: uuid("invite_id")
        .references(() => interview_invites.id, { onDelete: "cascade" })
        .notNull(),
    candidate_name: varchar("candidate_name", { length: 255 }).notNull(),
    job_id: uuid("job_id")
        .references(() => jobs.id, { onDelete: "cascade" })
        .notNull(),
    candidate_id: uuid("candidate_id")
        .references(() => candidates.id, { onDelete: "cascade" })
        .notNull(),
    started_at: timestamp("started_at").defaultNow().notNull(),
    completed_at: timestamp("completed_at"),
    duration_seconds: integer("duration_seconds"),
    total_questions: integer("total_questions").notNull(),
    questions_answered: integer("questions_answered").default(0).notNull(),
    transcript: jsonb("transcript"),
    overall_score: integer("overall_score"),
    communication_score: integer("communication_score"),
    technical_score: integer("technical_score"),
    strengths: text("strengths").array(),
    concerns: text("concerns").array(),
    ai_summary: text("ai_summary"),
    ai_recommendation: varchar("ai_recommendation", { length: 50 }),
    key_highlights: text("key_highlights").array(),
    created_at: timestamp("created_at").defaultNow().notNull(),
});

// ─── app_settings ─────────────────────────────────────────────────────────────
export const app_settings = pgTable("app_settings", {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    recruiter_id: uuid("recruiter_id")
        .references(() => users.id, { onDelete: "cascade" })
        .unique()
        .notNull(),
    company_name: varchar("company_name", { length: 255 }),
    company_logo_url: varchar("company_logo_url", { length: 500 }),
    ai_interviewer_name: varchar("ai_interviewer_name", { length: 100 }).default("Alex"),
    ai_voice_id: varchar("ai_voice_id", { length: 100 }).default("en-US-Neural2-F"),
    interview_tone: varchar("interview_tone", { length: 50 }).default("professional"),
    evaluation_strictness: varchar("evaluation_strictness", { length: 50 }).default("balanced"),
    screening_question_count: integer("screening_question_count").default(5),
    technical_question_count: integer("technical_question_count").default(6),
    hr_question_count: integer("hr_question_count").default(4),
    silence_timeout_seconds: integer("silence_timeout_seconds").default(3),
    custom_ai_prompt: text("custom_ai_prompt"),
    invite_expiry_days: integer("invite_expiry_days").default(7),
    reply_to_email: varchar("reply_to_email", { length: 255 }),
    custom_email_intro: text("custom_email_intro"),
    email_notifications_enabled: boolean("email_notifications_enabled").default(true),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Types ────────────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Candidate = typeof candidates.$inferSelect;
export type NewCandidate = typeof candidates.$inferInsert;
export type JobCandidateMatch = typeof job_candidate_matches.$inferSelect;
export type InterviewInvite = typeof interview_invites.$inferSelect;
export type InterviewSession = typeof interview_sessions.$inferSelect;
export type AppSettings = typeof app_settings.$inferSelect;
