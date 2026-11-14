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
Phase 2 of 7 complete: authentication and members
