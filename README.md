# RealCRM: Real Estate Lead Management

An internal CRM for a real estate company with Pre-Sales and Sales teams working leads across projects. Built with Next.js (App Router), TypeScript, Tailwind CSS and Firebase (Authentication + Realtime Database). Lead lists, dashboards and activity timelines update live with no page refresh.

## Features

- **Role-based access**: Admin, Pre-Sales, Sales and Department Head, enforced in the UI (routes, sidebar, actions), in the `/api/users` routes, and in Realtime Database security rules.
- **Dashboard**: total, new today, assigned to me, open, won, lost, follow-ups due today and overdue; breakdowns by status, source, project, department and user; recent leads and recent activity. Filterable by date range, project, department, user, status, source and sub-source.
- **Leads**: search by name, email or phone; filters; sorting by created date, name, status and last activity; pagination; CSV export; row actions (view, edit, assign, add activity, change status, delete).
- **Create Lead drawer**: slides in from the right, closes on Cancel, X or Escape, inline validation, "Save & create another", success toast. The assignee list is filtered by department and project access, and sub-sources are filtered by source.
- **Lead details**: lead, project, source and assignee info, status history, live activity timeline, add-activity form, plus change status, assign and edit actions.
- **Activity log**: 16 activity types. Status changes, assignments, wins and losses are logged automatically with old and new values.
- **Admin screens**: Entities, Projects, Departments, Users (creates real Firebase Auth logins), Lead Statuses, Sources and Sub-Sources. Each supports add, edit, activate/deactivate and delete. Deleting a record that is still in use is blocked, with an offer to deactivate it instead.
- **Reports**: team performance (leads, open/won/lost, conversion, overdue follow-ups, activities logged), source performance and project summary, with CSV export.
- **Notifications**: a bell in the header shows lead assignments plus your follow-ups due today or overdue.
- **UI**: collapsible sidebar (an overlay drawer on mobile), global search (Ctrl/⌘ K), loading skeletons, empty and error states, and responsive layouts from 360px phones to wide desktops.

## Roles

| | Admin | Department Head | Pre-Sales / Sales |
|---|---|---|---|
| See leads | All | Their department | Assigned to them |
| Create leads | Yes | For their department | Only if enabled by Admin (self-assigned) |
| Edit leads, change status, log activity | All | Department leads | Own leads |
| Assign / reassign | Anyone | Within department | No |
| Delete leads | Yes | No | No |
| Masters, projects, departments, entities, users | Yes | No | No |
| Reports | Company | Department | No |

## Getting started

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2a. Run against a real Firebase project

1. Create a Firebase project. Enable **Authentication → Email/Password** and create a **Realtime Database**.
2. Add a Web app and copy its config into the `NEXT_PUBLIC_FIREBASE_*` values in `.env.local`.
3. Create a service account key (Project settings → Service accounts) and fill in `FIREBASE_ADMIN_*`. The user management API and the seed script need it.
4. Deploy the security rules and seed the data:

   ```bash
   npx firebase-tools login
   npx firebase-tools use <your-project-id>
   npm run rules:deploy
   npm run seed
   ```

5. `npm run dev` and sign in with one of the seeded accounts below.

### 2b. Run fully offline with the Firebase Emulator Suite

Requires Java 11+.

1. In `.env.local`, uncomment the emulator block at the bottom of `.env.example`.
2. Start the emulators in one terminal: `npm run emulators`
3. In another terminal: `npm run seed -- --reset`, then `npm run dev`

### Seeded accounts

All seeded users get the password from `SEED_DEFAULT_PASSWORD` (default `ChangeMe@123`). Change it after first login.

| Role | Name | Email |
|---|---|---|
| Admin | Arjun Mehta | admin@realcrm.test |
| Pre-Sales (can create leads) | Priya Nair | priya.presales@realcrm.test |
| Pre-Sales | Rahul Verma | rahul.presales@realcrm.test |
| Sales (can create leads) | Sneha Iyer | sneha.sales@realcrm.test |
| Sales | Vikram Rao | vikram.sales@realcrm.test |
| Department Head (Sales) | Meera Joshi | meera.saleshead@realcrm.test |

The seed also creates Default Entity, Project A and Project B, the Pre-Sales and Sales departments, 9 lead statuses, 7 sources with 2–3 sub-sources each, and 10 leads with realistic activity histories. Some leads have follow-ups due today or overdue.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev server, production build, production server |
| `npm run lint` / `typecheck` | ESLint and TypeScript checks |
| `npm run seed` | Upserts seed data (safe to re-run). Add `-- --reset` to wipe the database first |
| `npm run rules:build` | Regenerates `database.rules.json` from `scripts/generate-rules.mjs` |
| `npm run rules:deploy` | Deploys the rules to the Firebase project |
| `npm run emulators` | Starts the Auth and Realtime Database emulators |
| `npm run test:rules` | Signs in as each role against the emulators and checks 42 allow/deny cases |

## Security model

- **Database rules** (`database.rules.json`) are the source of truth. Reps can only run `orderByChild('assignedTo').equalTo(<own uid>)` on `/leads`, and department heads only `orderByChild('departmentId').equalTo(<own department>)`. Reps can't reassign leads, change their department or audit fields, edit other users, or touch master data. Activities are append-only and must be written by their author. Every record is schema-validated, and unknown fields are rejected.
- The rules are generated from `scripts/generate-rules.mjs` because Realtime Database rules have no functions. Edit that file, then run `npm run rules:build`.
- **User management** goes through `/api/users`. Those routes verify the caller's Firebase ID token server-side, check that the caller is an active Admin, and use the Admin SDK to create, update, disable or delete Auth accounts. Admins can't demote, deactivate or delete themselves, and users who still own leads can't be deleted.
- **Route protection** happens in the client: `RequireAuth` wraps every authenticated page, `RequirePermission` wraps admin pages, and the sidebar and actions are filtered through `lib/auth/permissions.ts`. Because all data access goes through the rules, a user who bypasses the UI still can't read or write anything they shouldn't.
- Deactivated users are blocked by the rules immediately, and their Auth account is disabled with its sessions revoked.

## Data model

```
entities/{id}        name, description, status, audit
projects/{id}        name, entityId, location, description, status, audit
departments/{id}     name, description, status, audit
users/{uid}          fullName, email, phone, role, departmentId, projectIds{}, canCreateLeads, status, audit
leadStatuses/{id}    name, color, order, category (open|won|lost), status, audit
sources/{id}         name, description, status, audit
subSources/{id}      name, sourceId, description, status, audit
leads/{id}           contact fields, projectId, departmentId, assignedTo, statusId, sourceId, subSourceId,
                     followUpDate, budget, preferredLocation, notes, remarks, createdBy, createdAt, updatedAt, lastActivityAt
activities/{id}      leadId, departmentId, type, description, old/newStatusId, old/newAssignedTo, createdBy, createdAt
notifications/{uid}/{id}  title, body, leadId, read, createdBy, createdAt
settings/app         companyName, defaultCanCreateLeads
```

Lead changes and their activity entries are written in one atomic multi-path update.

## Project structure

```
app/                  Routes. (app)/ holds authenticated pages; api/users holds admin user management
components/
  ui/                 Buttons, inputs, drawer, modal, dropdown, badges, skeletons, states
  layout/             App shell, header, sidebar, global search, notifications, user menu
  leads/              Lead table, filters, form, create/edit drawers, action dialogs, timeline, detail view
  dashboard/          Stat cards, breakdown charts, dashboard view
  masters/            Generic CRUD page and the master-data screens
  users/ reports/ settings/
hooks/                Activity feeds, notifications, overlay presence
lib/
  firebase/           Client SDK and server-only Admin SDK setup
  auth/               Auth context, permissions, route guards, server-side admin check
  database/           Paths, CRUD helpers, lead operations, live data provider, users API client
  validation.ts       Zod schemas shared by forms and the API
store/                Zustand UI state (sidebar, create-lead drawer)
types/                Domain types
utils/                Formatting, CSV export, lead filtering and sorting, errors
scripts/              Seed script, rules generator, rules tests
database.rules.json   Generated security rules
```

## Notes and limits

- Leads visible to a user are loaded and kept in sync on the client. Search, filtering and metrics run in the browser, which works well up to tens of thousands of leads. Beyond that, add server-side aggregation (for example Cloud Functions that maintain counters).
- Reps see a live activity feed by subscribing to each of their assigned leads, because that's the only query shape the rules allow them. Admins and department heads read indexed feeds.
- Password reset uses Firebase's built-in email. Customise the template under Authentication → Templates.
