# Content-Leads Consulting Plattform

Interne SaaS-Plattform für LinkedIn-Consulting mit drei Nutzergruppen: **Admin**, **Berater**, **Kunde**.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **Hosting:** Vercel (SPA)
- **AI:** Anthropic Claude + OpenAI (Fallback) + Google Gemini (Echtzeit)
- **Telefonie:** Twilio Voice SDK
- **Payments:** Stripe
- **E-Mail:** Resend + Custom SMTP

## Setup

### 1. Repo klonen

```bash
git clone https://github.com/FelixZoepp/Content-Leads-Plattform.git
cd Content-Leads-Plattform
```

### 2. Dependencies installieren

```bash
npm install
```

### 3. Environment Variables

```bash
cp .env.example .env
```

Fülle die Werte in `.env` aus. Benötigte Variablen:

| Variable | Beschreibung |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Projekt-URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Anon Key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase Projekt-ID |

### 4. Lokaler Dev-Server

```bash
npm run dev
```

App läuft auf `http://localhost:8080`.

## Deployment

Push auf `main` → automatisches Vercel-Deployment auf `content-leads-platform.vercel.app`.

## Projektstruktur

```
src/
├── design-system/       # Gold Design-System (Tokens + 15 Komponenten)
├── components/          # React-Komponenten
│   ├── ui/              # shadcn/ui (50 Basis-Komponenten)
│   ├── layout/          # DashboardLayout, Sidebar, TopBar
│   ├── admin/           # Admin-spezifisch
│   ├── advisor/         # Berater: Checklisten, Templates
│   ├── customer/        # Kunden: ServiceProgress, ChecklistProgress
│   └── ai/              # KI-Bot-Framework
├── pages/               # Route-Pages
│   ├── admin/           # PromptManager, AuditLogViewer
│   ├── training/        # AcademyPage, CoursePage, LessonPage
│   ├── ai/              # ToneOfVoice, ContentGenerator, Library
│   ├── consulting/      # KPIs, Finance, Reports, Assets
│   └── outreach/        # Gesperrt (Outreach-Modul)
├── hooks/               # React Hooks (useAuth, useDashboardData, etc.)
├── services/            # Service-Layer (geplant)
├── contexts/            # React Context (SubscriptionContext)
└── integrations/        # Supabase Client

supabase/
├── migrations/          # SQL-Migrationen (Schema-Versionierung)
├── config.toml          # Supabase-Konfiguration
└── functions/           # 57+ Edge Functions
    ├── _shared/         # Gemeinsame Helpers (cors, audit, ai)
    └── [functions]/     # AI, Auth, Billing, CRM, Email, Sync...
```

## Rollen

| Rolle | Beschreibung |
|---|---|
| Admin | Systemverwaltung, alle Kunden sehen, Prompt-Editor, Audit-Log |
| Berater | Betreut zugewiesene Kunden, Checklisten, Profiloptimierung |
| Kunde | Self-Service (Akademie, KI-Bots, KPI-Eingabe), sieht Berater-Fortschritt |

## Dokumentation

| Datei | Inhalt |
|---|---|
| `REVIEW.md` | Bestandsanalyse + Gap-Matrix + Risiken |
| `PLAN.md` | Zielarchitektur, ERD, Rollenmatrix |
| `BACKLOG.md` | Alle Tickets mit Akzeptanzkriterien |
| `PROGRESS.md` | Fortschrittsprotokoll pro Ticket |
| `DATA-FLOWS.md` | KI-Datenflüsse + Drittanbieter |
| `ASSUMPTIONS.md` | Getroffene Annahmen |
| `BLOCKERS.md` | Echte Blocker |

## Supabase Edge Functions

Secrets werden über das Supabase Dashboard oder CLI gesetzt:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
```

Vollständige Liste der benötigten Secrets: siehe `.env.example`.
