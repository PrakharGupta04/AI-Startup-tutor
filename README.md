# Corporate Startup Tutor

## Overview
Corporate Startup Tutor is a single-group web application designed to support corporate innovation cohorts. The platform is organized around three foundational learning pillars:
1. **Class Reflections**: Private note-taking, AI-assisted structuring, and shared cohort reflections.
2. **Collaboration News**: Instructor-curated news on corporate–startup partnerships with separate fact reporting and strategic interpretation.
3. **AI Tutor and Shared Log**: Interactive AI tutor coaching with a transparent shared question log and community follow-up notes.

The system enforces role-based access for cohort **Members** and **Instructors**, and ships strictly with **no sample data**—all data is created dynamically through verified application workflows.

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

## Demo Walkthrough
Follow this step-by-step walkthrough to test the core features across roles:
1. Register the instructor with `INSTRUCTOR_CODE`.
2. Register a member with `GROUP_JOIN_CODE` in a second browser.
3. Member writes reflection notes, structures them with AI, edits and submits; the instructor reads it.
4. Member asks the tutor a question; the instructor adds a note.
5. Instructor adds a news item with a real source link and pasted article text, generates the AI summary, edits and publishes; the member opens the News page.

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
| `npm run set-password:prod` | `tsx --env-file=.env.production.local scripts/set-password.ts` | Resets a user password on the production database. |
| `npm run ai-check` | `tsx --env-file=.env.local scripts/ai-check.ts` | Verifies AI provider configuration and runs connectivity diagnostics. |
| `npm run db:migrate:prod` | `tsx --env-file=.env.production.local scripts/migrate.ts` | Applies SQL migrations to the production database. |
| `npm run db:check` | `tsx --env-file=.env.local scripts/db-check.ts` | Checks schema, tables, and row counts on the local database. |
| `npm run db:check:prod` | `tsx --env-file=.env.production.local scripts/db-check.ts` | Checks schema, tables, and row counts on the production database. |
| `npm run db:backup` | `tsx --env-file=.env.local scripts/db-backup.ts` | Backs up all tables from the local database to a timestamped JSON file. |
| `npm run db:backup:prod` | `tsx --env-file=.env.production.local scripts/db-backup.ts` | Backs up all tables from the production database to a timestamped JSON file. |

## Deployment (Vercel Hobby + Turso Free)

### Overview
The application can be deployed using a split cloud architecture: **Vercel Hobby** for Next.js frontend and serverless compute, paired with **Turso Free** for hosted libSQL/SQLite database storage.

### Production Environment Variables
All production secrets and codes must be freshly generated, secure random strings. In production (`NODE_ENV=production`), `AUTH_SECRET` must be at least 32 characters, and both `GROUP_JOIN_CODE` and `INSTRUCTOR_CODE` must be at least 12 characters and distinct from each other.

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Turso remote database URL (e.g. `libsql://your-db-org.turso.io`). |
| `DATABASE_AUTH_TOKEN` | Turso authorization token generated via the Turso CLI or dashboard. |
| `AUTH_SECRET` | Fresh random string of 32+ characters for signing session cookies. |
| `GROUP_NAME` | Cohort or organization display name (e.g. `Acme Innovation Cohort`). |
| `GROUP_JOIN_CODE` | Secure random code of at least 12 characters for cohort member onboarding. |
| `INSTRUCTOR_CODE` | Secure random code of at least 12 characters for instructor account registration. |
| `AI_PROVIDER` | Set to `gemini` for live Google Gemini models, or `demo` for offline placeholder summaries. |
| `GEMINI_API_KEY` | Google AI Studio Gemini API key. |
| `GEMINI_MODEL` | Gemini model identifier (e.g. `gemini-3.6-flash`). |

### Deployment Steps
1. **Create Turso Database**:
   - Create a database in your Turso account in the desired cloud region.
   - Note the database URL (`libsql://...`) and generate an auth token.
2. **Configure Local Production Environment File**:
   - Create `.env.production.local` locally (this file is git-ignored and must never be committed):
     ```bash
     DATABASE_URL=libsql://<your-database-name>-<org>.turso.io
     DATABASE_AUTH_TOKEN=<your-turso-token>
     AUTH_SECRET=<fresh-random-32-chars>
     GROUP_NAME=Acme Innovation
     GROUP_JOIN_CODE=<fresh-random-12-chars>
     INSTRUCTOR_CODE=<fresh-random-12-chars>
     AI_PROVIDER=gemini
     GEMINI_API_KEY=<your-gemini-key>
     GEMINI_MODEL=gemini-3.6-flash
     ```
3. **Run Production Migrations and Verification**:
   - Run the production migration script from your local terminal:
     ```bash
     npm run db:migrate:prod
     ```
   - Verify that all tables were created and foreign key checks pass:
     ```bash
     npm run db:check:prod
     ```
4. **Deploy to Vercel**:
   - Connect your Git repository to Vercel.
   - Configure the environment variables listed in the table above in Vercel Project Settings > Environment Variables.
   - Deploy the project.
5. **Region Alignment**:
   - For optimal database query latency, align your Vercel Serverless Function region with your Turso database location (e.g., both in US East or both in Europe West).
6. **Initial Instructor Onboarding**:
   - After deployment finishes, open your deployed app in a browser and navigate to `/register`.
   - Register the first instructor account using the configured `INSTRUCTOR_CODE`.

### Operations and Maintenance
- **Database Backups**:
  Run `npm run db:backup:prod` locally with `.env.production.local` to snapshot all five application tables to a timestamped JSON file under `backups/`.
- **Emergency Password Recovery**:
  If an instructor or member is locked out on production, reset their password from your local CLI:
  ```bash
  npm run set-password:prod -- <email> <newPassword>
  ```

### Limitations and Operational Considerations
- **Vercel Hobby Tier**: Subject to Vercel's fair-use and non-commercial terms.
- **Shared Free Gemini Quota**: Google AI Studio's free tier has rate limits, and prompts may take up to 30 seconds during periods of high demand.
- **AI Privacy**: Free-tier content may be used by Google to improve its models; users should avoid entering confidential or proprietary company data.
- **Authentication Safeguards**: Currently, no login-attempt rate-limiting is implemented, and active sessions are not immediately invalidated when a password is reset.
- **Turso Free Terms**: Storage and read/write quotas on the Turso Free tier may evolve according to Turso service terms.

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
- Sessions are not revoked on password change.
- No login-attempt limiting.
- The free Gemini tier has rate limits and AI answers can be slow (up to about 30 seconds).
- Free-tier content may be used by Google to improve its products; users must not enter personal or confidential information.
- Dates are shown in UTC.
- The tutor does not browse the web and the news AI works only from pasted text.
- Session cookie is Secure in production builds, so serve over HTTPS or use localhost.

### Future Enhancements
The following items are intentionally deferred for subsequent phases and future architecture iterations:
- Idle session timeout
- Session and token revocation mechanisms
- Stronger session management and rotation
- Email-based self-service password reset
- Multi-group and multi-tenant partitioning

## Project Status
Phase 7 of 7 complete: first version
