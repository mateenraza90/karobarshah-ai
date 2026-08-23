# KarobarShah AI — Architecture, Gap Analysis & Development Roadmap
### Prepared as Technical Co-Founder / Lead Architect review of PRD V1.0
### Status: DRAFT — awaiting your approval before any code is written

---

## 0. Critical Finding — Read This First

The uploaded document is a **section skeleton**, not a completed PRD. Every heading (Executive Summary, Vision, Market Research, AI Employees, Voice Agent, Workflows, Dashboard, System Architecture, Tech Stack, Database Overview, Integrations, MVP Scope, Pricing, GTM, etc.) contains a single one-line summary, duplicated under "Detail 1" and "Detail 2," followed by identical placeholder text asking for future documentation. Appendices 1–24 are all reserved-but-empty.

This means: there are no real user stories, no acceptance criteria, no field-level schema, no API contracts, no wireframes anywhere in the source file. What you have is a **scope outline** — genuinely useful for telling me *what* to build, but not *how*.

I'm treating your one-liners as the authoritative scope (I will not silently invent new product direction), and everything below that goes deeper than one line — architecture, schema, roadmap, feature specs — is me doing the PRD-completion work you asked for. Anywhere I made a judgment call instead of pulling from your doc, I've marked it **[ASSUMPTION]** so you can correct me before we build.

---

## 1. Product Understanding — Summary

KarobarShah AI is a **multi-tenant SaaS platform that sells "AI Employees"** — modular, task-specific AI agents — to service businesses that run on appointments and repeat customer contact. Each AI Employee automates one job function a small business currently either does manually or not at all: answering the phone/WhatsApp, booking appointments, following up on leads, managing the CRM, requesting reviews, and reporting on performance.

The MVP vertical is **clinics in Pakistan**. The architecture must be industry-agnostic from day one so the same core product can be re-skinned (via configuration, not forked code) for real estate agencies, restaurants, salons, gyms, and law firms later — this is your explicit long-term vision and it has real architectural consequences (see §7).

The product is **WhatsApp-first and voice-capable**, must work in English, Urdu, and Roman Urdu, and must support Pakistani payment rails (Easypaisa, JazzCash, PayFast, bank transfer) rather than defaulting to Stripe, while staying flexible enough to add Stripe later for GCC/international expansion.

## 2. Vision, In My Own Words

You're not building a chatbot vendor or a booking widget — you're building **staffing infrastructure**. The pitch to a clinic owner isn't "install our software," it's "hire an AI receptionist for less than one human salary." That framing matters architecturally: each AI Employee needs to feel like a discrete, ownable "hire" with its own on/off switch, its own activity log, and its own personality — not a settings toggle buried in a dashboard. The platform-level bet is that once a business has 2–3 AI Employees running on live customer data, switching cost becomes very high, which is what turns this from a tool into a platform.

## 3. Modules & Features Identified

**AI Employees (the product's core unit of value):**
1. AI Receptionist — inbound WhatsApp/chat handling, FAQs, intent routing
2. AI Voice Calling Agent — inbound/outbound calls, booking, reminders, lead qualification, human escalation
3. AI Appointment Manager — calendar logic, scheduling, rescheduling, conflict handling
4. AI Follow-up Employee — automated post-visit/post-lead follow-up sequences
5. AI CRM Employee — lead/patient record keeping, pipeline stage management
6. AI Communication Employee — outbound broadcast/notification messaging
7. AI Review Employee — post-visit review requests, sentiment capture
8. AI Business Analyst — reporting, KPIs, dashboard insights

**Platform infrastructure modules:**
- Multi-tenant business/account management & onboarding
- Owner Dashboard (Overview, Calls, Appointments, CRM, Reviews, Analytics, Settings)
- Integrations layer (Google Calendar, Email/SMTP, WhatsApp Business API, Voice provider, Payments)
- Billing & subscription (Free Trial, Starter, Growth, Pro, Enterprise tiers)
- Multi-language layer (English / Urdu / Roman Urdu)
- Audit logging

## 4. Inconsistencies, Gaps & Technical Risks

**Direct contradiction — you must resolve this before Milestone 1:**
- Your uploaded doc's Tech Stack section explicitly lists **n8n** as part of the architecture. Your message to me explicitly says **do not use n8n**. I'm following your message (custom backend services, queues, and scheduled jobs instead), but flagging that this is a real scope difference from the source doc — it means more custom orchestration code, not a workflow-builder GUI. Worth knowing going in.

**Gaps the source doc leaves genuinely open (I'm making assumptions — please correct):**
- **Voice provider** isn't named. Urdu/Roman Urdu-quality STT/TTS is the single biggest technical risk in this project — most voice AI stacks (Twilio+ElevenLabs, Vapi, Retell) have weak-to-mediocre Urdu support today. **[ASSUMPTION]** I'm scoping the Voice Agent as a *later* milestone (after WhatsApp-based employees prove the AI orchestration layer) specifically so we can prototype Urdu voice quality with real Pakistani speech samples before committing budget/time to it. This should not block launch.
- **WhatsApp integration path** isn't specified — official WhatsApp Business Cloud API (Meta) vs. a BSP (Business Solution Provider) like Twilio, Gupshup, or 360dialog. **[ASSUMPTION]** I recommend a BSP for MVP (faster approval, easier Pakistan number provisioning) with an abstraction layer so we can move to Meta's direct Cloud API later without touching business logic.
- **No pricing numbers, no TAM/SAM/SOM, no competitor names** — these are business-strategy inputs, not architecture blockers, but they should exist before GTM. Not my lane to fabricate; flagging as an open item for you.
- **"Shared Business Memory"** wasn't a named concept in your source doc at all — it's in your task list to me. I'm interpreting it as: a per-tenant knowledge store (business hours, services, pricing, policies, FAQs) that every AI Employee reads from, so the Receptionist, Voice Agent, and Follow-up Employee never contradict each other. See §12.
- **Human escalation** is mentioned for the Voice Agent only. **[ASSUMPTION]** I'm extending "escalate to human" as a cross-cutting capability for every AI Employee — a clinic owner needs an emergency valve on all channels, not just calls.
- **Multi-tenant data isolation strategy** isn't addressed. This is a hard architectural decision (shared schema + row-level security vs. schema-per-tenant vs. database-per-tenant) that has to be made correctly at Milestone 0, because retrofitting it later is a rewrite. See §7.
- **No mention of consent/compliance** for outbound calling and WhatsApp messaging (Pakistan doesn't have a GDPR-equivalent yet, but WhatsApp's own commerce policy and Meta's opt-in rules are real constraints on the Follow-up and Communication Employees). Needs a decision before M5/M6.

## 5. Suggested Improvements (Keeping MVP Realistic)

- **Sequence the AI Employees by infrastructure reuse, not by "importance."** Receptionist and Follow-up both need the same conversational engine, business-memory store, and WhatsApp channel — build that once, ship two employees off it, and only then take on the Voice Agent's separate telephony stack. This is reflected in the roadmap below.
- **Ship the CRM Employee as a byproduct of the Receptionist, not a separate build.** Every conversation the Receptionist has already produces CRM data (name, phone, intent). Don't build "CRM" as its own milestone with its own data-entry UI first — build the *record*, and let the CRM dashboard just be a view over data the AI Employees are already generating.
- **Treat "AI Employee" as a first-class database entity with an on/off state per business**, not a feature flag scattered across code. This is what makes the sales pitch ("activate your AI Receptionist") literally true in the product, and it's what makes multi-industry re-skinning possible later — an employee's *behavior* is config + prompts + industry template, not new code.
- **Start Roman Urdu support at the prompt-engineering layer before the voice layer.** Text-based Roman Urdu (WhatsApp) is a solved problem for an LLM with good prompting/few-shot examples. Voice Urdu is not solved. Sequencing text-first de-risks the harder problem.
- **Local payments: don't build a custom Easypaisa/JazzCash integration in Milestone 1.** Pakistani payment gateway integrations (direct merchant accounts) involve business registration and bank approval timelines outside engineering's control. **[ASSUMPTION]** Recommend launching Starter/Growth tier billing via a Pakistani aggregator (e.g., PayFast, which already wraps Easypaisa/JazzCash/cards under one API) rather than integrating each rail individually, with manual bank-transfer as day-one fallback for Enterprise deals.

## 6. Recommended Scalable Architecture

**Pattern: Modular monolith on Next.js, multi-tenant from day one, event-driven for anything async.**

Not microservices — at your team size, microservices add operational overhead without payoff. A well-modularized monolith (clear internal module boundaries, one deployable) gets you to scale for years and is dramatically faster to build and debug solo. Split into services later only if a specific module (e.g., voice) needs independent scaling or a different runtime.

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js App (Vercel)                 │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │  Owner         │  │  Public API   │  │  Webhook      │  │
│  │  Dashboard     │  │  Routes       │  │  Receivers    │  │
│  │  (App Router)  │  │  (REST)       │  │  (WA/Voice)   │  │
│  └───────┬───────┘  └───────┬───────┘  └──────┬───────┘  │
│          │                  │                  │          │
│  ┌───────▼──────────────────▼──────────────────▼───────┐ │
│  │              Service Layer (server-only)              │ │
│  │  AI Orchestrator │ Business Memory │ Tenant Context   │ │
│  │  Booking Engine  │ CRM Engine      │ Notification Bus │ │
│  └───────┬──────────────────────────────────┬───────────┘ │
└──────────┼──────────────────────────────────┼─────────────┘
           │                                  │
   ┌───────▼────────┐                ┌────────▼─────────┐
   │   Supabase      │                │  Background Jobs  │
   │  Postgres+RLS   │                │  (Supabase cron / │
   │  Auth           │                │  Edge Functions / │
   │  Storage        │                │  queue table)      │
   │  Realtime       │                └────────┬─────────┘
   └────────┬────────┘                         │
            │                        ┌──────────▼──────────┐
            │                        │  External Providers   │
            │                        │  WhatsApp BSP │ Voice  │
            │                        │  Claude API   │ Email  │
            │                        │  Payments     │ Calendar│
            └────────────────────────┴───────────────────────┘
```

**Why no n8n:** every "workflow" in your spec (Call→AI→Appointment→Reminder→Visit→Follow-up→Review, WhatsApp→AI→FAQ→Booking) is really a state machine over a `conversation` or `appointment` record, triggered by webhooks and advanced by scheduled jobs. That's ordinary backend code — a `workflow_state` column, a jobs table, and Supabase's `pg_cron`/Edge Functions cover this without adding a second orchestration system with its own deploy target and failure modes to babysit.

## 7. Multi-Tenant Architecture (Clinics → Real Estate → Law Firms → Restaurants → Salons → Gyms)

**Isolation strategy: shared database, shared schema, Postgres Row-Level Security (RLS) on every table, `business_id` as the tenant key.**

This is the right call for your stage: schema-per-tenant or database-per-tenant give stronger isolation but make cross-tenant analytics, migrations, and Supabase's connection pooling much harder at your scale (dozens–low hundreds of tenants for the next 1-2 years). RLS gives strong logical isolation enforced at the database layer (not just application code), which matters because your AI orchestrator is going to be making a lot of automated queries and you don't want tenant leakage to depend on every developer remembering a `WHERE business_id = ...` clause.

**Making it industry-agnostic — the key design decision:**

Instead of a `clinics` table with clinic-specific columns, model the business-agnostic core as generic entities, and push industry-specific shape into **configuration + JSONB**, not schema:

- `businesses` — every tenant, with an `industry_type` (clinic, real_estate, restaurant, salon, gym, law_firm...) and an `industry_config` JSONB column
- `contacts` — replaces "Patients" — generic person record, industry-neutral
- `bookings` — replaces "Appointments" — generic time-slot entity; a clinic's "appointment," a restaurant's "table reservation," and a salon's "service slot" are the same underlying object with different `booking_type` and metadata
- `ai_employee_instances` — per-business activation state + config for each of the 8 AI Employees
- `industry_templates` — versioned config bundles (default prompts, FAQ structure, booking rules, terminology) that get applied when a business is created, and can be overridden per-tenant

This means launching "Real Estate" later is: write a new `industry_template` (prompts + terminology + booking rules), not a new set of tables or a fork of the codebase. This is the single most important architectural decision in this document, because getting it wrong means a rewrite when you expand verticals.

## 8. Technology Architecture

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 15 (App Router) + React 19 | Server Components for dashboard data, Client Components for interactive widgets |
| Styling | Tailwind CSS | Design tokens shared across dashboard + any future white-label theming |
| Backend | Next.js Route Handlers + Server Actions | No separate backend service for MVP |
| Database | Supabase Postgres | RLS for tenant isolation, `pgvector` extension for Business Memory embeddings |
| Auth | Supabase Auth | Email/OTP + phone OTP (Pakistani numbers), role-based (owner, staff, super-admin) |
| Background jobs | Supabase Edge Functions + `pg_cron` + a `jobs` table (poll/lock pattern) | Reminders, follow-up sequences, review requests — no n8n |
| AI | Claude API (Sonnet for conversation, Haiku for cheap classification/routing tasks) | All AI Employees share one orchestration service, differ by system prompt + tools |
| WhatsApp | BSP (Gupshup/360dialog/Twilio) → abstracted behind an internal `MessagingProvider` interface | Swap-in-place for Meta Cloud API later |
| Voice | Deferred to its own milestone pending Urdu STT/TTS evaluation | Candidates: Vapi, Retell, or direct Twilio+Deepgram/ElevenLabs stack — needs a spike, see §11 |
| Payments | PayFast (PK aggregator: cards, Easypaisa, JazzCash) + manual bank transfer | Abstracted behind a `PaymentProvider` interface so Stripe can be added for GCC without touching billing logic |
| Hosting | Vercel (app) + Supabase (data/auth/storage) | |
| Source control / CI | GitHub + Vercel preview deployments per PR | |
| Dev tooling | Claude Code for scaffolding/implementation once milestones are approved | |

## 9. Development Roadmap

Each milestone below is independently buildable, testable, and deployable — none depends on a *later* milestone, and each ends in a working, demoable increment. I have **not** started building any of these — awaiting your go-ahead per milestone, starting with M0.

---

### Milestone 0 — Foundation: Multi-Tenant Core & Auth

**Goal:** A deployed, empty-but-real platform: a business can sign up, log in, and land on an empty dashboard shell. No AI yet. This milestone exists so every later milestone has tenant isolation, auth, and CI/CD to build on top of — get this wrong and everything after it is compromised.

**Features:** Owner sign-up/login (email + phone OTP), business creation wizard (name, industry_type, timezone, language preference), role model (owner/staff/super-admin), empty dashboard shell with nav (Overview, Calls, Appointments, CRM, Reviews, Analytics, Settings — all empty states).

**Database changes:** `businesses`, `business_users` (join table with role), `industry_templates` (seeded with a `clinic` template), RLS policies on both tables, `audit_logs`.

**APIs:** `POST /api/businesses` (create), `GET /api/businesses/:id`, `PATCH /api/businesses/:id`, Supabase Auth handles login/signup natively.

**UI components:** Auth pages, Onboarding wizard (multi-step), Dashboard shell + sidebar nav, Settings > Business Profile page.

**AI logic:** None.

**Testing checklist:**
- [ ] Two businesses cannot see each other's data (RLS verified with a direct SQL probe, not just UI)
- [ ] OTP login works with a Pakistani phone number format
- [ ] Role permissions enforced (staff cannot access Settings > Billing)
- [ ] Onboarding wizard persists partial progress on refresh

**Definition of Done:** Deployed to Vercel, a real user can sign up, create a clinic business, and see an empty dashboard. CI runs on every PR.

---

### Milestone 1 — Business Memory & Configuration Layer

**Goal:** The "brain" every AI Employee will read from. Owner can configure business hours, services, pricing, and FAQs — this is what makes AI answers accurate instead of hallucinated.

**Features:** Business Memory editor UI (hours, services/pricing table, FAQ entries, policies), structured storage + embedding generation for semantic FAQ retrieval.

**Database changes:** `business_memory_items` (type: hours/service/faq/policy, content, embedding vector via pgvector), `business_services` (name, price, duration).

**APIs:** `POST/GET/PATCH/DELETE /api/memory-items`, `POST /api/memory-items/:id/reindex` (regenerate embedding).

**UI components:** Settings > Business Hours, Settings > Services & Pricing, Settings > FAQs (CRUD + bulk import).

**AI logic:** Embedding generation pipeline (on save, generate + store embedding); no conversational AI yet, but this is the retrieval layer the Receptionist will query in M2.

**Testing checklist:**
- [ ] Semantic search on FAQs returns relevant items for paraphrased queries
- [ ] Business hours correctly handle timezone + Friday/weekend variations (Pakistan-relevant: many clinics close Sunday, some half-day Saturday)
- [ ] Empty-state guidance nudges owner to fill minimum viable memory before activating any AI Employee

**Definition of Done:** An owner can fully configure their business's knowledge base and it's queryable via a tested retrieval function.

---

### Milestone 2 — AI Receptionist (WhatsApp, Text)

**Goal:** First live AI Employee. Handles inbound WhatsApp messages, answers FAQs from Business Memory, captures lead/contact info, and hands off to a human when unsure.

**Features:** WhatsApp inbound webhook, conversational AI Receptionist (Claude + Business Memory retrieval + tool-calling), auto-create `contacts` from conversations, "Activate/Deactivate" toggle for this AI Employee, live conversation view in dashboard.

**Database changes:** `contacts`, `conversations`, `messages`, `ai_employee_instances` (with `employee_type='receptionist'`, `status`, `config`).

**APIs:** `POST /api/webhooks/whatsapp` (inbound), internal `MessagingProvider.send()`, `GET /api/conversations`, `POST /api/ai-employees/:type/toggle`.

**UI components:** Dashboard > Calls/Conversations inbox (WhatsApp-style thread view), AI Employee activation card.

**AI logic:** System prompt template (industry-neutral core + clinic template overlay), Business Memory RAG retrieval as a tool call, escalation-to-human tool call, language detection (English/Urdu/Roman Urdu) to respond in-kind. **[ASSUMPTION]** escalation = flags a conversation + notifies owner via WhatsApp/push, doesn't require a live agent handoff UI in this milestone.

**Testing checklist:**
- [ ] Roman Urdu input produces Roman Urdu output (not English or Urdu script) unless the business owner configures a fixed reply language
- [ ] AI never invents a price/service not in Business Memory (test with adversarial prompts)
- [ ] Escalation triggers correctly on out-of-scope or distressed messages
- [ ] Deactivating the employee stops all auto-replies immediately

**Definition of Done:** A real WhatsApp number, connected to a test business, correctly answers FAQ questions and creates contact records from real conversations.

---

### Milestone 3 — AI Appointment Manager (Calendar & Booking)

**Goal:** The Receptionist can now actually book something, not just talk.

**Features:** Calendar/slot model, availability rules, booking via conversation (Receptionist gains a booking tool), reschedule/cancel flows, Google Calendar sync.

**Database changes:** `bookings`, `booking_slots`/`availability_rules`, `calendar_connections` (OAuth tokens).

**APIs:** `POST /api/bookings`, `PATCH /api/bookings/:id`, `GET /api/availability`, `POST /api/integrations/google-calendar/connect`.

**UI components:** Dashboard > Appointments calendar view, Settings > Availability rules editor, Settings > Google Calendar connect.

**AI logic:** Booking tool exposed to the Receptionist (check availability → propose slots → confirm → write booking), conflict-resolution logic (double-booking prevention at the DB layer via exclusion constraint, not just app logic).

**Testing checklist:**
- [ ] Concurrent booking requests for the same slot can't both succeed (race condition test)
- [ ] Google Calendar sync reflects bookings made via WhatsApp and vice versa
- [ ] Reschedule via conversation correctly updates the existing booking, doesn't create a duplicate

**Definition of Done:** A patient can book, reschedule, and cancel an appointment entirely through WhatsApp conversation with the AI Receptionist, and it's correctly reflected in the dashboard and connected Google Calendar.

---

### Milestone 4 — CRM Employee & Pipeline View

**Goal:** Turn the contact/conversation/booking data already being generated into a usable CRM, and add the "AI CRM Employee" as an active, visible entity (auto-tagging, stage progression, duplicate detection).

**Features:** Contact detail pages (full history: conversations, bookings, notes), pipeline/stage view (New Lead → Contacted → Booked → Visited → Follow-up), manual notes/tags, AI-driven auto-tagging (e.g., "high intent," "price-sensitive") and duplicate contact merging.

**Database changes:** `contacts` gains `stage`, `tags` (array or join table), `contact_notes`, `contact_merge_log`.

**APIs:** `GET/PATCH /api/contacts/:id`, `POST /api/contacts/:id/notes`, `POST /api/contacts/merge`.

**UI components:** Dashboard > CRM (Kanban-style pipeline board + list view), Contact detail drawer.

**AI logic:** Post-conversation classification job (tags + stage suggestion), fuzzy-match duplicate detection (phone number normalization + name similarity).

**Testing checklist:**
- [ ] Stage auto-advances correctly on booking creation/visit completion
- [ ] Duplicate detection doesn't false-merge two different people with similar names
- [ ] Manual stage override by staff is respected and not overwritten by AI on next message

**Definition of Done:** Owner can see every lead's full journey and current pipeline stage without leaving the dashboard, with AI doing the classification busywork.

---

### Milestone 5 — AI Follow-up Employee & Scheduled Jobs Infrastructure

**Goal:** Automated, scheduled outreach — the first fully proactive (not reactive) AI Employee, and the milestone that builds real background-job infrastructure.

**Features:** Configurable follow-up sequences (e.g., "24h after visit, ask how it went"; "if no-show, re-engage in 2 days"), scheduled job runner, opt-out/consent handling.

**Database changes:** `follow_up_sequences` (template config), `scheduled_messages` (queue table: contact, sequence step, send_at, status), `contact_consent` (opt-in/opt-out state per channel).

**APIs:** `POST /api/sequences`, internal job runner (Edge Function on cron, polls `scheduled_messages` where `send_at <= now() and status = 'pending'`).

**UI components:** Settings > Follow-up sequence builder (trigger + delay + message template), Dashboard > scheduled messages log.

**AI logic:** Message personalization per contact using Business Memory + contact history at send time (not pre-baked at schedule time, so it stays current).

**Testing checklist:**
- [ ] Jobs are idempotent — a crashed/retried job doesn't double-send
- [ ] Opted-out contacts are never queued
- [ ] Sequences correctly cancel if the triggering condition becomes false (e.g., patient rebooked before the "no-show" follow-up fired)

**Definition of Done:** A configured follow-up sequence reliably fires on schedule for real contacts, respects opt-out, and the send log is auditable in the dashboard.

---

### Milestone 6 — AI Review Employee

**Goal:** Close the loop — post-visit review requests and sentiment capture, reusing the Follow-up infrastructure from M5.

**Features:** Auto-triggered review request (via the M5 sequence engine) after visit completion, in-chat sentiment capture (thumbs/rating via WhatsApp), routing negative sentiment to owner privately before it becomes a public review, optional link-out to Google Reviews for positive sentiment.

**Database changes:** `review_requests`, `review_responses` (rating, sentiment, raw text).

**APIs:** `POST /api/reviews/request` (usually triggered internally, not user-facing), `GET /api/reviews`.

**UI components:** Dashboard > Reviews (list + sentiment breakdown), negative-review alert.

**AI logic:** Sentiment classification on free-text responses, smart-routing logic (rating threshold → internal alert vs. public review prompt).

**Testing checklist:**
- [ ] Negative sentiment never gets routed to the public review link
- [ ] Review request doesn't fire twice for the same visit
- [ ] Sentiment classification tested against Roman Urdu input specifically

**Definition of Done:** Post-visit review requests go out automatically, negative feedback reaches the owner privately, and positive sentiment is funneled toward public reviews.

---

### Milestone 7 — AI Business Analyst & Analytics Dashboard

**Goal:** Turn every milestone's data into the owner-facing insight layer.

**Features:** KPI dashboard (leads, bookings, no-show rate, response time, review sentiment trend, AI Employee activity/cost), natural-language query ("how many bookings last week vs. the week before?") answered by the Analyst employee.

**Database changes:** Materialized views / aggregation tables for performance (don't run analytics queries live against transactional tables at scale), `analyst_query_log`.

**APIs:** `GET /api/analytics/overview`, `POST /api/analytics/query` (NL query).

**UI components:** Dashboard > Overview (charts), Dashboard > Analytics (drill-down + NL query box).

**AI logic:** NL-to-structured-query translation (constrained to a safe query builder, not raw SQL generation, for security), summary generation.

**Testing checklist:**
- [ ] NL query results match a hand-verified SQL query for the same question
- [ ] Analyst cannot access or leak another business's data even via crafted queries
- [ ] Dashboard load time acceptable with a realistic 6-month data volume

**Definition of Done:** Owner gets an accurate, fast performance snapshot and can ask follow-up questions in plain English/Urdu.

---

### Milestone 8 — Billing & Local Payments

**Goal:** Monetization. Subscription tiers, PayFast integration, manual bank-transfer fallback.

**Features:** Pricing tiers (Free Trial, Starter, Growth, Pro, Enterprise) with feature/usage gating tied to `ai_employee_instances`, PayFast checkout, invoice generation, manual bank-transfer confirmation flow for Enterprise.

**Database changes:** `subscriptions`, `invoices`, `payment_transactions`, `plan_limits`.

**APIs:** `POST /api/billing/checkout`, `POST /api/webhooks/payfast`, `GET /api/billing/invoices`.

**UI components:** Settings > Billing & Plan, upgrade/downgrade flow, invoice history.

**AI logic:** None (deliberately — billing should be boring and deterministic).

**Testing checklist:**
- [ ] Webhook signature verification on PayFast callbacks (prevent forged "payment succeeded" events)
- [ ] Downgrade correctly deactivates AI Employees over the new plan's limit, with owner warning first
- [ ] Failed payment gracefully degrades (grace period) rather than instant lockout

**Definition of Done:** A business can subscribe, get billed via a local payment method, and plan limits are enforced.

---

### Milestone 9 — AI Voice Calling Agent

**Goal:** Deliberately last because it's the highest-risk, most novel infrastructure (telephony + real-time speech), and every other AI Employee's orchestration/memory/CRM plumbing is reused here rather than rebuilt.

**Pre-milestone spike (required before scoping this fully):** evaluate 2–3 voice AI stacks specifically for Urdu/Roman Urdu accent and code-switching quality with real Pakistani speech samples, before committing to a provider. I'd recommend doing this spike as its own short, throwaway-code exercise — not part of the production milestone — so a bad provider choice doesn't get baked into the architecture.

**Features:** Inbound call answering, outbound calling (reminders, follow-up), booking via voice, human escalation/transfer.

**Database changes:** `calls` (recording URL, transcript, duration, outcome), extends `ai_employee_instances`.

**APIs:** `POST /api/webhooks/voice` (inbound call), `POST /api/calls/outbound`.

**UI components:** Dashboard > Calls (recordings + transcripts), live-call indicator.

**AI logic:** Real-time STT → Claude → TTS pipeline, reuses Business Memory + booking tools from M1/M3, latency-optimized prompt design (voice needs much faster turnaround than chat).

**Testing checklist:**
- [ ] End-to-end call latency acceptable for natural conversation (target: sub-1.5s response)
- [ ] Urdu/Roman Urdu/English code-switching within a single call handled gracefully
- [ ] Call transfer to a human number works reliably mid-call

**Definition of Done:** A test phone number, answered by the AI Voice Agent, can complete a booking end-to-end in a natural-sounding call.

---

### Milestone 10 — Multi-Industry Template System

**Goal:** Prove the multi-tenant architecture from §7 by launching a second vertical without touching core code — this is the milestone that validates (or disproves) the whole architectural bet.

**Features:** Industry template authoring tool (internal, not customer-facing), a second live template (real estate — chosen since you already have market connections there), industry-specific terminology mapping in the UI (e.g., "Patients" → "Leads" → "Prospective Buyers").

**Database changes:** None beyond what M0's `industry_templates` already supports — this milestone is the test of that design.

**APIs:** Internal template CRUD only.

**UI components:** Terminology now pulled dynamically from `industry_config` rather than hardcoded strings anywhere in the dashboard.

**AI logic:** New industry's system prompt overlay + FAQ seed set.

**Testing checklist:**
- [ ] A real-estate business onboarded end-to-end with zero code changes, only template configuration
- [ ] No hardcoded "clinic"/"patient" strings remain anywhere in shared UI components

**Definition of Done:** Two distinct industries running on the same codebase simultaneously, proving the re-skinning model works before you sell it to a third vertical.

---

## 10. Recommended Folder Structure

```
karobarshah-ai/
├── app/
│   ├── (auth)/                     # login, signup, OTP
│   ├── (dashboard)/
│   │   ├── overview/
│   │   ├── conversations/          # "Calls" - unifies WA + voice threads
│   │   ├── appointments/
│   │   ├── crm/
│   │   ├── reviews/
│   │   ├── analytics/
│   │   └── settings/
│   │       ├── business-profile/
│   │       ├── memory/             # hours, services, FAQs
│   │       ├── ai-employees/       # activate/configure each employee
│   │       ├── billing/
│   │       └── integrations/
│   └── api/
│       ├── webhooks/
│       │   ├── whatsapp/
│       │   ├── voice/
│       │   └── payfast/
│       ├── conversations/
│       ├── bookings/
│       ├── contacts/
│       └── ...
├── lib/
│   ├── ai/
│   │   ├── orchestrator.ts         # shared entrypoint all employees call
│   │   ├── employees/
│   │   │   ├── receptionist.ts
│   │   │   ├── voice-agent.ts
│   │   │   ├── follow-up.ts
│   │   │   ├── crm.ts
│   │   │   ├── review.ts
│   │   │   └── analyst.ts
│   │   ├── memory/                 # Business Memory retrieval
│   │   └── tools/                  # booking tool, escalation tool, etc.
│   ├── providers/
│   │   ├── messaging/              # WhatsApp BSP abstraction
│   │   ├── voice/
│   │   ├── payments/                # PayFast abstraction, Stripe later
│   │   └── calendar/                 # Google Calendar
│   ├── db/                          # Supabase client, typed queries
│   ├── jobs/                        # scheduled job handlers
│   └── industry-templates/          # config bundles per vertical
├── supabase/
│   ├── migrations/
│   └── functions/                   # Edge Functions (cron jobs, webhooks)
└── docs/                            # this document, ADRs, per-milestone specs
```

## 11. Database Schema (Core Entities — Milestone 0–5 Scope)

```
businesses
  id, name, industry_type, industry_config (jsonb), timezone,
  default_language (en/ur/roman_ur), created_at

business_users
  id, business_id, user_id (fk auth.users), role (owner/staff/admin)

industry_templates
  id, industry_type, version, prompt_overlay, terminology_map (jsonb),
  default_booking_rules (jsonb)

business_memory_items
  id, business_id, type (hours/service/faq/policy), content, embedding (vector)

business_services
  id, business_id, name, price, duration_minutes

contacts
  id, business_id, name, phone, email, stage, tags (text[]), language_pref

conversations
  id, business_id, contact_id, channel (whatsapp/voice), status, escalated_at

messages
  id, conversation_id, sender (contact/ai/staff), content, language_detected

ai_employee_instances
  id, business_id, employee_type, status (active/inactive), config (jsonb)

bookings
  id, business_id, contact_id, booking_type, starts_at, ends_at, status

follow_up_sequences / scheduled_messages / contact_consent
  (per §Milestone 5)

review_requests / review_responses
  (per §Milestone 6)

subscriptions / invoices / payment_transactions
  (per §Milestone 8)

audit_logs
  id, business_id, actor, action, entity, entity_id, created_at
```

Every table above (except `industry_templates`, which is global) carries `business_id` with an RLS policy of the form `business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid())`.

## 12. API Architecture

- REST via Next.js Route Handlers, one resource-oriented route per entity (`/api/contacts`, `/api/bookings`, ...) — no GraphQL layer needed at this scale.
- All routes go through a shared `withTenantContext` middleware that resolves `business_id` from the authenticated session and injects it into every downstream query — this is the application-layer belt to RLS's database-layer suspenders.
- Webhooks (`/api/webhooks/*`) are unauthenticated-by-session but signature-verified per provider (WhatsApp BSP signature, PayFast signature) and resolve tenant from the provider's payload (e.g., which WhatsApp number received the message).
- Internal AI tool calls (booking, escalation, memory lookup) are function calls within the orchestrator process, not separate HTTP round-trips — keeps latency down for conversational AI.

## 13. Authentication Flow

1. Owner signs up via Supabase Auth (email or phone OTP).
2. On first login with no associated business, redirect to onboarding wizard → creates `businesses` row + `business_users` row with role `owner`.
3. Subsequent staff invited via email; they get a `business_users` row with role `staff`, scoped by RLS to that one business.
4. Every server-side data access uses the Supabase client with the user's session JWT (never the service-role key from user-facing code paths) so RLS is always enforced — service-role key reserved for background jobs/webhooks that legitimately need cross-tenant context.

## 14. AI Orchestration Architecture

One shared `orchestrator.ts` service, not eight separate AI implementations:

```
Inbound event (WhatsApp msg / voice transcript chunk / scheduled trigger)
  → resolve business_id + employee_type
  → load: industry template overlay + business memory (relevant subset via
     embedding search) + conversation history + contact record
  → build system prompt = core employee role + industry overlay + business memory context
  → call Claude with employee-specific tool set (booking, escalate, tag_contact, etc.)
  → execute any tool calls against the service layer (not directly against the DB)
  → persist message + any resulting state changes (booking, tag, escalation)
  → send response via the appropriate channel provider
```

Each "AI Employee" is therefore: a system-prompt template + a tool allowlist + a channel binding — not distinct codebases. This is what makes the 8 employees maintainable and what makes industry re-skinning (M10) config-only.

## 15. Shared Business Memory Architecture

- Source of truth: `business_memory_items`, owner-editable, versioned implicitly via `updated_at` (add explicit versioning if you need rollback later — not needed for MVP).
- Retrieval: pgvector similarity search scoped by `business_id`, top-k relevant items injected into the orchestrator's prompt per request — not the whole memory dumped every time (cost + relevance).
- Write path: any AI Employee can *propose* a memory update (e.g., Receptionist notices owner mentioned a new service in a message) but cannot write directly — proposals go to an owner-approval queue in Settings. **[ASSUMPTION]** This prevents AI hallucination from silently corrupting the shared knowledge base other employees rely on; I'd treat this as a hard rule, not a nice-to-have.

## 16. Dashboard Architecture

- Next.js Server Components fetch tenant-scoped data server-side (no client-side data leakage risk, faster initial load).
- Realtime updates (new conversation, incoming call) via Supabase Realtime subscriptions on `conversations`/`messages`, scoped by RLS automatically.
- Shared component library for cross-industry terminology: components read display labels from `industry_config.terminology_map` rather than hardcoding "Patient"/"Appointment."

## 17. Voice Agent Architecture (Deferred — Milestone 9)

Pipeline: Telephony provider (inbound/outbound PSTN) → real-time STT (Urdu/Roman Urdu/English) → orchestrator (same shared service as text, latency-optimized prompt) → TTS (needs a natural-sounding Pakistani-accented voice, not a generic South Asian English voice) → back to telephony. Human transfer = telephony provider's call-transfer API, triggered by the same `escalate` tool the text employees already use. Provider selection is explicitly gated behind the M9 spike (§Milestone 9) rather than decided now — don't want to lock in a vendor before testing real Urdu quality.

## 18. WhatsApp Architecture

- `MessagingProvider` interface with a BSP implementation (send, receive-webhook-parse, template-message support for outbound-initiated conversations per WhatsApp's 24-hour session rules).
- Inbound webhook → normalize payload → resolve `business_id` by receiving number → create/continue `conversation` → hand off to orchestrator.
- Outbound follow-ups/reminders outside the 24h window must use pre-approved WhatsApp message templates (Meta policy) — this constrains the Follow-up Employee's message design and needs template pre-approval built into the M5 sequence builder.

## 19. CRM Architecture

CRM is a **view + light workflow layer** over `contacts`/`conversations`/`bookings`, not a separate data silo — per §5's sequencing improvement. Stage transitions are driven by real events (booking created → stage='booked'; visit time passed → stage='visited') with AI-suggested tags layered on top, and staff can always override.

---

## 20. Feature Specs — MVP AI Employees (User Story / AC / Workflows / Edge Cases)

### AI Receptionist

**User Story:** As a clinic owner, I want incoming WhatsApp messages answered instantly and accurately from my own business info, so I never lose a lead to a missed reply.

**Acceptance Criteria:**
- Responds within 10 seconds of an inbound message during active hours
- Never states a price, service, or policy not present in Business Memory
- Captures name + phone into a `contacts` record on every new conversation
- Escalates to owner when confidence is low or sentiment is negative

**Backend workflow:** Webhook receives message → orchestrator resolves context → Claude call with memory-retrieval + tools → response persisted + sent → contact upserted.

**Frontend workflow:** Owner sees the conversation appear live in the Conversations inbox; can jump in and take over at any point (AI pauses for that thread once a human replies).

**Database interactions:** Insert into `messages`, upsert `contacts`, insert/update `conversations`.

**AI prompt requirements:** Core receptionist role prompt + industry overlay (clinic terminology) + top-k Business Memory items + last N messages of conversation history + explicit instruction to say "I'm not sure, let me get someone" rather than guess.

**Edge cases:** Multiple businesses sharing a WhatsApp number (not supported — one number per business, must be explicit in onboarding); message in a third language (e.g., Punjabi) — fall back to English politely rather than guess-translate; owner takes over mid-conversation — AI must not send a duplicate/conflicting reply.

### AI Appointment Manager

**User Story:** As a patient, I want to book, reschedule, or cancel an appointment just by chatting on WhatsApp, without calling the clinic.

**Acceptance Criteria:** Offers only genuinely available slots; confirms booking with a clear summary; sends a reminder before the appointment; reschedule/cancel update the same record, don't duplicate.

**Backend workflow:** Booking tool call → query `availability_rules` minus existing `bookings` → propose slots → on confirmation, insert with a DB-level exclusion constraint to prevent double-booking under concurrent requests.

**Frontend workflow:** Booking appears instantly on the Appointments calendar; owner can manually adjust/cancel.

**Database interactions:** `bookings` insert/update, `calendar_connections` sync write to Google Calendar.

**AI prompt requirements:** Booking tool schema (service, preferred time range) + today's date/timezone context (critical — LLMs get relative dates wrong without explicit grounding).

**Edge cases:** Patient requests a time outside business hours (redirect, don't silently book); Google Calendar sync failure (booking must still succeed in-app; sync retried async, not blocking); timezone ambiguity for a business with multiple branches **[ASSUMPTION — multi-branch is out of MVP scope; flag if wrong]**.

*(Remaining employees — Follow-up, CRM, Review, Analyst, Voice — follow the same spec depth and are detailed in full within their respective milestone sections above; happy to expand any of them to this same story/AC/workflow format on request before we scope that milestone in detail.)*

---

## 21. Localization Strategy

- **English/Urdu/Roman Urdu** handled at the prompt layer for all text-based employees: language auto-detected per incoming message, response generated in the same register (a message in Roman Urdu gets a Roman Urdu reply, not a script-switched Urdu reply) unless the business sets a fixed reply language in Settings.
- Dashboard UI itself: **[ASSUMPTION]** English-only for MVP (the owner/staff-facing side), since Pakistani SMB owners in your target segment are generally comfortable with English business software even when customer-facing conversation needs to be in Urdu/Roman Urdu. Flag if you want the dashboard itself localized too — that's a real scope addition (i18n framework, translated UI strings) worth deciding explicitly rather than assuming.
- Voice localization is scoped separately in Milestone 9 given the STT/TTS quality risk.

## 22. Payments Strategy

MVP: PayFast (aggregates Easypaisa, JazzCash, cards) behind a `PaymentProvider` interface + manual bank-transfer confirmation flow for Enterprise/early deals where a human sales conversation is happening anyway. Stripe added later as a second `PaymentProvider` implementation for GCC/international customers — no billing logic rewrite needed, just a new adapter.

---

## 23. What I Need From You Before Milestone 1

1. **Confirm or correct every [ASSUMPTION]** flagged above — especially: WhatsApp BSP choice, voice deferred to M9, dashboard UI staying English-only, PayFast as the payments aggregator, and multi-branch clinics being out of MVP scope.
2. **Approve the milestone sequencing** in §9 — particularly Voice Agent being last, not part of MVP-launch. If you need voice for your first paying customer, that changes the critical path significantly and I'd want to restructure the order.
3. **Green-light Milestone 0** specifically. I will not write any code — including scaffolding — until you confirm.

Once you approve, I'll start with Milestone 0 only, build it to its Definition of Done, and stop for your review before touching Milestone 1.
