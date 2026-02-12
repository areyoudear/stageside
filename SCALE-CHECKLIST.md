# Stageside Scale Checklist

When Stageside hits milestones, upgrade these before they become problems.

---

## 🎯 At 1,000 MAU

### Infrastructure
- [ ] **Supabase** — Review free tier limits (500MB DB, 1GB storage, 2M edge function invocations)
- [ ] **Vercel** — Check bandwidth usage, consider Pro ($20/mo) if hitting limits

### Business Setup
- [ ] **Google Workspace** — Get proper `@getstageside.com` or `@areyoudear.com` email
- [ ] **Migrate Google OAuth** — Move credentials from personal Gmail to business account
- [ ] **Privacy Policy / ToS** — Proper legal pages (can use Termly or similar)

---

## 🚀 At 10,000 MAU

### Infrastructure
- [ ] **Supabase Pro** ($25/mo) — 8GB DB, 100GB storage, daily backups
- [ ] **Vercel Pro** ($20/mo) — Better analytics, more bandwidth
- [ ] **Error tracking** — Add Sentry or similar
- [ ] **Analytics** — Upgrade from basic to Mixpanel/Amplitude if needed

### Operations
- [ ] **Monitoring/Alerts** — Set up uptime monitoring (Checkly, Better Uptime)
- [ ] **Database backups** — Verify backup strategy
- [ ] **Rate limiting** — Ensure API rate limits are in place

---

## 💰 At 50,000+ MAU (Revenue Time)

### Infrastructure
- [ ] **Supabase Team** ($599/mo) or dedicated — SOC2, priority support
- [ ] **CDN** — Consider CloudFlare for static assets
- [ ] **Database optimization** — Review indexes, query performance

### Business
- [ ] **LLC/Business entity** — If not already done
- [ ] **Stripe Atlas** or proper payment setup
- [ ] **Dedicated support email** — Not forwarding to personal
- [ ] **CPA review** — Tax implications of revenue

### Legal
- [ ] **Proper ToS review** — Lawyer review
- [ ] **GDPR compliance** — If EU users
- [ ] **Data retention policy**

---

## Current Free Tier Limits (Reference)

| Service | Free Limit | Paid Starts |
|---------|-----------|-------------|
| Supabase | 500MB DB, 1GB storage, 50K MAU auth | $25/mo |
| Vercel | 100GB bandwidth, 100K function invocations | $20/mo |
| Google OAuth | Unlimited (free) | N/A |
| Spotify API | Rate limited but free | N/A |

---

*Last updated: 2026-02-12*
