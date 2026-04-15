# Environment Variables & Secrets Setup

## Vercel (Frontend)
Already configured:
- `VITE_SUPABASE_URL` = https://ciimklroqbmzcblnbgdk.supabase.co
- `VITE_SUPABASE_PUBLISHABLE_KEY` = (anon key)
- `VITE_SUPABASE_PROJECT_ID` = ciimklroqbmzcblnbgdk

## Supabase Edge Function Secrets

Set via Supabase Dashboard → Edge Functions → Secrets
OR via CLI:
```bash
supabase secrets set KEY=value --project-ref ciimklroqbmzcblnbgdk
```

### Required for AI Features
| Secret | Used by | How to get |
|--------|---------|------------|
| `ANTHROPIC_API_KEY` | ai-chat, generate-asset, generate-summary | https://console.anthropic.com/settings/keys |
| `OPENAI_API_KEY` | ai-chat (fallback) | https://platform.openai.com/api-keys |

### Required for Payments
| Secret | Used by |
|--------|---------|
| `STRIPE_SECRET_KEY` | create-checkout, stripe-webhook, check-subscription |
| `STRIPE_WEBHOOK_SECRET` | stripe-webhook |

### Required for Telephony
| Secret | Used by |
|--------|---------|
| `TWILIO_ACCOUNT_SID` | twilio-voice, twilio-token |
| `TWILIO_AUTH_TOKEN` | twilio-voice, twilio-token |
| `TWILIO_TWIML_APP_SID` | twilio-token |

### Required for Email
| Secret | Used by |
|--------|---------|
| `RESEND_API_KEY` | send-email, process-email-queue, invite-customer |

### Optional
| Secret | Used by |
|--------|---------|
| `GOOGLE_GEMINI_API_KEY` | realtime-objection-handler |
| `REWARDFUL_API_KEY` | rewardful-affiliate |

## Quick Setup (minimum for AI features)

```bash
# Set your Anthropic API key (enables AI Chat + Asset Generation)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here --project-ref ciimklroqbmzcblnbgdk
```

## 58 Deployed Edge Functions

ai-chat, generate-asset, generate-summary, calculate-health,
admin-create-user, admin-stripe-stats, analyze-objections, api-leads,
auth-email-hook, check-domain-allowed, check-subscription, create-api-key,
create-checkout, create-team-slot-checkout, customer-portal, customize-lead-template,
download-from-drive, enrich-lead, fire-webhook, generate-html-block,
generate-landing-page, get-checkout-customer, import-leads, invite-advisor,
invite-customer, invite-team-member, list-customers, list-invoices,
manage-credits, power-dialer-log, power-dialer-next, process-email-campaign,
process-email-queue, realtime-objection-handler, realtime-session,
reset-password, rewardful-affiliate, search-leads, send-email,
serve-lead-page, stripe-webhook, summarize-call, sync-all-tables,
sync-contact-single, sync-contacts-external, sync-sheet, sync-table-single,
telephony-webhook, track-email, track-lead-event, track-video-view,
transcribe-audio, twilio-token, twilio-voice, update-campaign-video,
update-lead-video, upgrade-subscription, verify-domain
