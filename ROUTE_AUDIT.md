# Route Audit - Black Screen Fix

## Root Causes Found & Fixed

| # | Problem | Fix |
|---|---------|-----|
| 1 | `useDashboardData()` throws without `DashboardDataProvider` | Wrapped all consulting routes in `<WithDashboardData>` |
| 2 | `useAuth` missing `tenantId` and `accountId` | Added fields + `fetchProfile` fetches from profiles + tenants |
| 3 | `SubscriptionContext` missing fields (`subscribed`, `productId`, etc.) | Extended shim with all required fields |
| 4 | Feature pages import `@/components/landing/` instead of `@/components/outreach/landing/` | Fixed import paths |
| 5 | Missing `use-mobile.tsx` hook | Copied from consulting repo |
| 6 | `DailyChecklist` imports from `@/pages/client/TodayPage` | Fixed to `@/pages/consulting/TodayPage` |
| 7 | No ErrorBoundary = unhandled crash = white/black screen | Added `ErrorBoundary` component wrapping all routes |

## Route Status

| Route | Page | Status | Notes |
|-------|------|--------|-------|
| `/auth` | Auth | ✅ | Login works |
| `/dashboard` | Dashboard | ✅ | Widgets with gradients |
| `/dashboard/calendar` | Calendar | ✅ | |
| `/dashboard/today` | TodayPage | ✅ Fixed | Needs DashboardDataProvider |
| `/dashboard/kpis` | KPITrackingPage | ✅ Fixed | Needs DashboardDataProvider |
| `/dashboard/overview` | OverviewPage | ✅ Fixed | Needs DashboardDataProvider |
| `/dashboard/marketing` | MarketingPage | ✅ Fixed | Needs DashboardDataProvider |
| `/dashboard/sales` | SalesPage | ✅ Fixed | Needs DashboardDataProvider |
| `/dashboard/finance` | FinancePage | ✅ Fixed | Needs DashboardDataProvider |
| `/dashboard/ai` | AIPage | ✅ Fixed | Needs DashboardDataProvider |
| `/dashboard/reports` | ReportsPage | ✅ Fixed | Needs DashboardDataProvider |
| `/dashboard/csat` | CSATPage | ✅ Fixed | Needs DashboardDataProvider |
| `/dashboard/assets/:assetType` | AssetPage | ✅ Fixed | Needs DashboardDataProvider |
| `/dashboard/content/calendar` | ContentCalendarPage | ✅ Fixed | Needs DashboardDataProvider |
| `/dashboard/outreach/tracking` | OutreachKPI | ✅ | Real Salesflow |
| `/dashboard/outreach/contacts` | Contacts | ✅ | Real Salesflow |
| `/dashboard/outreach/linkedin` | Contacts | ✅ | Same as contacts |
| `/dashboard/outreach/instagram` | Instagram | ✅ | Locked placeholder |
| `/dashboard/outreach/email` | EmailCampaigns | ✅ | Real Salesflow |
| `/dashboard/outreach/pipeline` | Pipeline | ✅ | Real Salesflow with DnD |
| `/dashboard/outreach/campaigns` | Campaigns | ✅ | Real Salesflow |
| `/dashboard/outreach/sequences` | Sequences | ✅ | Real Salesflow |
| `/dashboard/outreach/dialer` | PowerDialer | ✅ | Real Salesflow |
| `/dashboard/outreach/leads` | LeadSearch | ✅ | Real Salesflow |
| `/dashboard/outreach/email-templates` | EmailTemplates | ✅ | Real Salesflow |
| `/dashboard/outreach/scripts` | CallScript | ✅ | Real Salesflow |
| `/dashboard/outreach/objections` | ObjectionLibrary | ✅ | Real Salesflow |
| `/dashboard/outreach/analytics` | DealAnalytics | ✅ | Real Salesflow |
| `/dashboard/outreach/import` | ImportLeads | ✅ | Real Salesflow |
| `/dashboard/outreach/team` | TeamArena | ✅ | Real Salesflow |
| `/dashboard/outreach/landing-pages` | LandingPageBuilder | ✅ | Real Salesflow |
| `/dashboard/outreach/activity` | ActivityLog | ✅ | Real Salesflow |
| `/dashboard/outreach/video` | VideoNote | ✅ | Real Salesflow |
| `/dashboard/outreach/integrations` | Integrations | ✅ | Real Salesflow |
| `/dashboard/outreach/dashboard` | SalesflowDashboard | ✅ | Real Salesflow |
| `/dashboard/outreach/today` | OutreachToday | ✅ | Real Salesflow |
| `/dashboard/outreach/api` | ApiKeys | ✅ | Real Salesflow |
| `/dashboard/outreach/billing` | Billing | ✅ Fixed | SubscriptionContext shim |
| `/dashboard/outreach/profile` | OutreachProfile | ✅ | Real Salesflow |
| `/dashboard/outreach/partner` | Partner | ✅ | Real Salesflow |
| `/dashboard/outreach/partner-dashboard` | PartnerDashboard | ✅ | Real Salesflow |
| `/dashboard/outreach/video-admin` | VideoNoteAdmin | ✅ | Real Salesflow |
| `/dashboard/outreach/upgrade` | Upgrade | ✅ | Real Salesflow |
| `/dashboard/outreach/lead-page/:slug` | LeadPagePreview | ✅ | Real Salesflow |
| `/dashboard/outreach/master-admin` | MasterAdmin | ✅ | Real Salesflow |
| `/dashboard/crm` | Pipeline | ✅ | Maps to Salesflow Pipeline |
| `/dashboard/crm/contacts` | Contacts | ✅ | Maps to Salesflow Contacts |
| `/dashboard/crm/pipeline` | Pipeline | ✅ | Maps to Salesflow Pipeline |
| `/dashboard/content/management` | Locked | ✅ | Feature locked |
| `/dashboard/content/generator` | Locked | ✅ | Feature locked |
| `/dashboard/content/analytics` | Locked | ✅ | Feature locked |
| `/dashboard/assistant` | Locked | ✅ | Feature locked |
| `/dashboard/sales-reviewer` | CallScript | ✅ | Maps to Salesflow |
| `/dashboard/live` | Locked | ✅ | Feature locked |
| `/dashboard/games` | TeamArena | ✅ | Maps to Salesflow |
| `/dashboard/training` | Training | ✅ | Sprint Roadmap |
| `/dashboard/community` | Community | ✅ | Community page |
| `/dashboard/admin` | AdminDashboard | ✅ | Portfolio + Health Scores |
| `/dashboard/settings` | Settings | ✅ | Settings page |
| `/dashboard/support` | Support | ✅ | Support page |

**Total: 55 routes, all ✅**
