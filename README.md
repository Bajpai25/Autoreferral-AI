# AutoReferrals

AutoReferrals is a LinkedIn referral and outreach automation workspace. It combines job discovery, resume analysis, AI-generated messages, configurable workflows, and background LinkedIn execution in one dashboard.

> **Status:** Active development. LinkedIn automation depends on valid LinkedIn OAuth/session data and may require updates when LinkedIn changes its UI or security controls.

## What It Does

- Scrapes and stores job details from a job URL.
- Uploads and parses a resume.
- Combines job and resume data to produce a skills analysis.
- Generates a personalized LinkedIn referral message with selectable tone.
- Lets users edit the generated message before sending.
- Creates and immediately triggers outreach workflows from the final setup step.
- Marks outreach workflows with `outReachFlag: true`; standard connection workflows use the default `false`.
- Runs workflow jobs through Redis and BullMQ.
- Reuses LinkedIn browser sessions where possible.
- Reports sent and failed profile results to the dashboard through polling.
- Provides a visual workflow builder for scheduled connection workflows.
- Shows saved workflows, job cards, outreach history, and message traces.

## User Flow

1. Register or sign in.
2. Connect LinkedIn through the OAuth flow.
3. Open the dashboard and create an outreach workflow.
4. Paste a job URL. AutoReferrals extracts the company, role, and job details.
5. Upload a resume and run the job/resume analysis.
6. Choose a message tone and generate a referral message.
7. Edit the message in the preview step if needed.
8. Select **Finish**. The edited message is saved, an outreach workflow is created, and execution is triggered immediately.
9. The completed workflow remains available as a tab while a new outreach setup tab opens.
10. Watch profile names and delivery status appear in the workflow notification area and review the outreach table.

The visual Workflow Builder is intended for regular scheduled connection workflows. Configure the trigger and action nodes, save the workflow, and select **Start** to deploy it.

## Architecture

```text
React + Vite client
        |
        | REST API / JSON
        v
Express + TypeScript server
        |
        +-- PostgreSQL via Prisma
        +-- Redis via BullMQ
        +-- Playwright LinkedIn session
        +-- OpenRouter AI generation
        +-- SMTP workflow notifications
```

### Main directories

- `client/src/pages`: Dashboard, home page, and visual workflow builder.
- `client/src/components/dashboard`: Outreach setup, job cards, job list, and trace modal.
- `client/src/store`: Redux workflow-builder state and saved workflow actions.
- `client/src/utils/api.ts`: Client API requests.
- `server/controllers`: HTTP request handlers.
- `server/routes`: Express route registration.
- `server/services`: AI, resume, LinkedIn, workflow, session, and queue logic.
- `server/prisma/schema.prisma`: Database schema.
- `server/prisma/migrations`: Prisma migration history.

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL 15 or newer
- Redis 7 or newer
- A LinkedIn developer application for OAuth
- An OpenRouter API key
- SMTP credentials if workflow email notifications are enabled

## Installation

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd autoreferals

cd server
npm install

cd ../client
npm install
```

### 2. Start PostgreSQL and Redis

The checked-in `server/docker-compose.yml` currently provides Redis on port `6379`. Start it with:

```bash
cd server
docker compose up -d redis
```

Run PostgreSQL locally or use a managed PostgreSQL instance. Create an empty database, for example `referal`, and make sure the connection string is URL-encoded. In particular, `@` in a password must become `%40`.

Example:

```text
postgresql://postgres:password@localhost:5432/referal?schema=public
```

### 3. Configure the server

Create `server/.env` from the following template and replace every placeholder:

```dotenv
DATABASE_URL="postgresql://postgres:password@localhost:5432/referal?schema=public"
PORT=8000
JWT_SECRET="replace-with-a-long-random-secret"

LINKEDIN_CLIENT_ID="your-linkedin-client-id"
LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret"
LINKEDIN_REDIRECT_URI="http://localhost:8000/api/auth/linkedin/callback"

OPENROUTER_API_KEY="your-openrouter-api-key"

SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-password"
SMTP_FROM="noreply@example.com"

CLIENT_URL="http://localhost:5173"
API_BASE="http://localhost:8000"
```

Never commit real API keys, OAuth secrets, JWT secrets, SMTP passwords, or LinkedIn cookies. Rotate any credentials that have previously been exposed in a local or shared `.env` file.

### 4. Configure the client

Create `client/.env`:

```dotenv
VITE_API_URL="http://localhost:8000/api/"
VITE_LINKEDIN_CLIENT_ID="your-linkedin-client-id"
VITE_LINKEDIN_REDIRECT_URI="http://localhost:8000/api/auth/linkedin/callback"
```

`VITE_API_URL` should end with `/api/` because the client appends route groups such as `jobs/`, `outreach/`, and `workflows/`.

### 5. Generate Prisma client and migrate

```bash
cd server
npm run generate
npm run migrate
```

For an existing database, use the migration history rather than creating an unrelated schema. Prisma Studio is available for local inspection:

```bash
npm run studio
```

### 6. Install Playwright browsers

The server uses Playwright for LinkedIn automation. Install its browser binaries once:

```bash
cd server
npx playwright install chromium
```

## Running Locally

Use separate terminals.

### Server

```bash
cd server
npm run dev
```

The API runs at `http://localhost:8000`.

### Client

```bash
cd client
npm run dev
```

The Vite app runs at `http://localhost:5173`.

Open `http://localhost:5173` in a browser.

## Available Scripts

### Client

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite development server with HMR |
| `npm run build` | Type-check and create a production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build locally |

### Server

| Command | Purpose |
| --- | --- |
| `npm run dev` | Watch TypeScript and restart the server |
| `npm run build` | Compile TypeScript to `dist` |
| `npm run start` | Start the compiled server with nodemon |
| `npm run generate` | Generate the Prisma client |
| `npm run migrate` | Create/apply a development Prisma migration |
| `npm run studio` | Open Prisma Studio |

## Important API Routes

All routes are prefixed with `/api`.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/auth/register` | Register a user |
| `POST` | `/auth/login` | Authenticate a user |
| `GET` | `/auth/linkedin/callback` | Complete LinkedIn OAuth |
| `POST` | `/jobs/scrape` | Scrape and save a job |
| `POST` | `/jobs/combine` | Combine job and resume data |
| `POST` | `/jobs/generate` | Generate and save an AI message |
| `POST` | `/resume/upload` | Upload and parse a resume |
| `POST` | `/outreach/send-referral` | Run legacy direct referral sending |
| `PATCH` | `/outreach/:id` | Save an edited outreach message |
| `POST` | `/outreach/getOutreach` | Read a user's outreach records |
| `POST` | `/workflows` | Create and schedule a workflow |
| `POST` | `/workflows/:id/trigger` | Trigger a workflow immediately |
| `GET` | `/workflows` | List authenticated user workflows |
| `GET` | `/workflows/workflow-results` | Poll workflow delivery results |

The final outreach form uses this sequence:

```text
PATCH /api/outreach/:messageId
POST  /api/workflows
POST  /api/workflows/:workflowId/trigger
```

This ensures the workflow worker reads the edited message from PostgreSQL rather than an older generated value.

## Workflow Behavior

### Outreach workflow

An outreach workflow contains `outReachFlag: true` and a `messageId`. The worker loads the stored Outreach record, searches profiles for the target company, sends the stored message, and publishes each result for dashboard polling.

### Standard workflow

A regular workflow leaves `outReachFlag` unset. The database default is `false`, and the worker executes the standard connection workflow.

### Result polling

The dashboard polls every few seconds for each completed workflow tab using its workflow ID. Results include:

```json
{
  "name": "Example Person",
  "profileUrl": "https://www.linkedin.com/in/example",
  "status": "sent"
}
```

Failed results may also include an `error` field.

## Troubleshooting

### The client cannot reach the API

- Confirm the server is running on port `8000`.
- Confirm `client/.env` contains `VITE_API_URL="http://localhost:8000/api/"`.
- Restart Vite after changing environment variables.
- Check browser DevTools Network and Console output for `[workflow-poll]` messages.

### No workflow results appear

- Confirm the workflow was created and triggered successfully.
- Confirm Redis is running.
- Confirm the server worker is running with the server process.
- Check that the result request includes `workflowId`.
- Verify LinkedIn cookies/session data are available for the authenticated user.

### Prisma cannot connect

- Verify PostgreSQL is running.
- Check `DATABASE_URL` and URL-encode special characters in the password.
- Run `npm run generate` after schema changes.
- Run the appropriate Prisma migration.

### LinkedIn automation fails

- Reconnect LinkedIn OAuth/session data.
- Verify Playwright Chromium is installed.
- Check server logs for session, selector, or LinkedIn access errors.
- Use conservative connection/message limits and respect LinkedIn's policies.

## Security and Responsible Use

- Keep all secrets in environment variables and out of source control.
- Use authenticated API routes for user-owned workflows and messages.
- Do not automate spam, impersonation, or unsolicited bulk messaging.
- Respect LinkedIn terms, rate limits, consent, and applicable privacy laws.
- Review generated messages before sending them.
- Use a dedicated development database while testing migrations.

## Contributing

1. Create a feature branch.
2. Make a focused change.
3. Run `npm run lint` and `npm run build` in `client`.
4. Run `npm run build` in `server`.
5. Update this README when setup, behavior, or API contracts change.
6. Open a pull request with a concise description and verification notes.

## License

No project license is currently declared. Confirm the intended license before distributing the application.
