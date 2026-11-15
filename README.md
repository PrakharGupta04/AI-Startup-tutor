# Corporate Startup Tutor

## Overview
Corporate Startup Tutor is a single-group web application designed to support corporate innovation cohorts through structured reflection, curated collaboration news, and an AI-assisted tutor interaction log. The application provides a focused learning and interaction hub for cohort members and instructors without external bloat or unnecessary dependencies.

## Prerequisites
- Node.js 22.x or later
- npm (Node Package Manager)

## Setup
1. Install project dependencies:
   ```bash
   npm install
   ```
2. Create local environment configuration:
   ```bash
   copy .env.example .env.local
   ```
3. Generate a secure 32-byte secret for `AUTH_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Open `.env.local` and configure `AUTH_SECRET`, `GROUP_JOIN_CODE`, and `INSTRUCTOR_CODE`.
4. Apply database migrations:
   ```bash
   npm run db:migrate
   ```
5. Start the local development server:
   ```bash
   npm run dev
   ```

## User Onboarding and First-Instructor Setup
1. **First Instructor Onboarding**:
   - Navigate to `/register` in your browser.
   - Provide your name, email, chosen password (8–72 characters), and the `INSTRUCTOR_CODE` configured in `.env.local`.
   - The application creates your account with the `INSTRUCTOR` role and signs you in.
2. **Cohort Member Registration**:
   - Share the `GROUP_JOIN_CODE` from `.env.local` (or from `/settings/members`) with cohort participants.
   - Participants navigate to `/register`, enter their details, and provide the `GROUP_JOIN_CODE`.
   - The application creates their account with the `MEMBER` role.
3. **Direct Member Addition**:
   - Instructors can also navigate to `/settings/members` and add members directly using the "Add New Member" form.

## Password Management and Recovery
1. **User Self-Service (Authenticated)**:
   - Any signed-in user can change their password under `/settings`.
2. **Instructor Password Reset**:
   - Instructors can reset any cohort member's password from the Members management page at `/settings/members`.
3. **Emergency CLI Password Reset**:
   - If an instructor or user is locked out, run the CLI recovery script:
     ```bash
     npm run set-password -- <email> <newPassword>
     ```
   - This directly updates the user's password hash in the database.

## Reflections
Class reflections allow cohort members to capture and structure their session learnings:
- **Workflow**: Write notes → save draft → optionally structure with AI → review and edit → submit.
- **Privacy and Visibility**: Drafts are completely private to their author (not visible to peers or instructors). Submitted reflections are visible to all authenticated group members.
- **Integrity**: Raw notes are persisted before any AI processing runs, and AI structuring never overwrites or modifies your original notes.

## AI Tutor and Shared Log
The AI Tutor provides interactive innovation coaching with a shared log accessible to the entire cohort:
- **Shared by Default**: All questions, AI answers, and follow-up notes are visible to every authenticated group member, creating a cumulative knowledge base.
- **Reliable Persistence**: Every question is written to the database before the AI request begins. If an AI call times out, exceeds quota, or fails, the question is never lost and displays a clear error state.
- **Author Retry**: If an interaction fails, the author can trigger a retry with a single click.
- **Community Group Notes**: Cohort members can append follow-up notes, context, or corrections to any interaction. Group notes are visually separated from the AI response and clearly attributed.
- **Permissions and Moderation**: Question prompts and AI responses cannot be altered. Instructors can permanently delete any interaction (which automatically cascades to all associated notes). Notes can be edited only by their author, and can be deleted by either the author or an instructor.

## Collaboration news
Instructors curate and publish corporate–startup collaboration news manually:
- **Instructor Manual Curation**: Instructors add news items by entering the headline, companies involved, source name, verifiable link (HTTP/HTTPS), and article text.
- **AI Summarization**: The AI works strictly from the pasted article text and never fetches or opens external links. Pasted text is saved to the database before the AI request runs.
- **Separated Reporting and Interpretation**: Every news item displays reported facts (from the source) and interpretation (why it matters for collaboration) in separate blocks.
- **Role-Based Visibility**: Raw article text is visible strictly to instructors. Cohort members only see published news items.
- **Publishing Safeguards**: Items can only be published once both the factual summary and interpretation fields are populated.

## Environment Variables
The following environment variables are supported in `.env.example` and validated via Zod:

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | SQLite file connection string (e.g., `file:./data/app.db`) or LibSQL remote URL. |
| `DATABASE_AUTH_TOKEN` | Optional authentication token for remote LibSQL / Turso databases. |
| `AUTH_SECRET` | Secret key used for signing session tokens (must be at least 32 characters). |
| `GROUP_NAME` | Display name for the cohort group (defaults to `"My Group"`). |
| `GROUP_JOIN_CODE` | Secret code required for member onboarding (minimum 6 characters). |
| `INSTRUCTOR_CODE` | Secret code required for instructor onboarding (minimum 6 characters, distinct from join code). |
| `AI_PROVIDER` | AI engine selection: `"gemini"` or `"demo"` (defaults to `"gemini"`). |
| `GEMINI_API_KEY` | Optional Google Gemini API key used for structuring reflections and AI tutor answers. |
| `GEMINI_MODEL` | Gemini model name identifier (defaults to `"gemini-3.6-flash"`). |

## AI provider (Gemini free tier)
- **Free Tier Setup**: Google's free tier needs no payment method. Create an API key in Google AI Studio and set `GEMINI_API_KEY` in `.env.local`.
- **Verification**: Run `npm run ai-check` to verify the configuration and test connectivity.
- **Rate and Quota Limits**: Limits are shown in Google AI Studio and change over time, so users should check them there.
- **Privacy and Data Usage**: Free-tier content may be used by Google to improve its products. Users must not enter personal or confidential information.
- **Demo Mode**: Setting `AI_PROVIDER=demo` produces clearly labelled placeholder output that is not real AI.
- **Graceful Degradation**: Without an API key, AI features show a clear message while all non-AI features continue working.
- **Troubleshooting**: If `ai-check` reports a configuration error, check the API key and the exact `GEMINI_MODEL` ID shown in AI Studio.

## Scripts
The following npm scripts are defined in `package.json`:

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `next dev` | Starts the Next.js local development server. |
| `npm run build` | `next build` | Compiles and builds the production application. |
| `npm run start` | `next start` | Runs the compiled production build. |
| `npm run lint` | `eslint` | Runs ESLint static analysis across the codebase. |
| `npm run typecheck` | `tsc --noEmit` | Validates TypeScript types across all source files. |
| `npm run test` | `vitest run` | Runs the test suite via Vitest. |
| `npm run db:generate` | `drizzle-kit generate` | Generates SQL migrations from schema definitions. |
| `npm run db:migrate` | `tsx --env-file=.env.local scripts/migrate.ts` | Applies SQL migrations to the target SQLite database. |
| `npm run db:studio` | `drizzle-kit studio` | Starts the Drizzle Studio visual database inspector. |
| `npm run set-password` | `tsx --env-file=.env.local scripts/set-password.ts` | Resets a user password via command-line interface. |
| `npm run ai-check` | `tsx --env-file=.env.local scripts/ai-check.ts` | Verifies AI provider configuration and runs connectivity diagnostics. |

## Inspecting the Database
To inspect the database graphically in your browser, run:
```bash
npm run db:studio
```
> **Note**: SQL Server Management Studio (SSMS) cannot open SQLite database files. Use Drizzle Studio, the SQLite CLI, or an SQLite-compatible desktop viewer.

## No Sample Data
This application ships strictly with zero sample or seed data. There are no placeholder users, sample reflections, synthetic interactions, or mock news articles pre-populated in the database. All application data is created dynamically through verified UI workflows and user actions.

## Known Limitations and Future Enhancements

### Known Limitations
- No login-attempt limiting.
- Session cookie is Secure in production builds, so serve over HTTPS or use localhost.
- Dates on the Members page are shown in UTC.

### Future Enhancements
The following items are intentionally deferred for subsequent phases and future architecture iterations:
- Idle session timeout
- Session and token revocation mechanisms
- Stronger session management and rotation
- Email-based self-service password reset
- Multi-group and multi-tenant partitioning

## Project Status
Phase 6 of 7 complete: collaboration news
