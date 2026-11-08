# Daylio decisions locked for Codex

| Topic | Decision | Not allowed |
|---|---|---|
| Codebase | Extend `abitiyoso/daylio` and reuse existing Next.js/PostgreSQL/Auth/API | Generate another standalone SaaS and throw away backend |
| Public website | Keep Daylio v4 visual and marketing flow | Redesign homepage |
| Backend UI | Use Backend v3 as target for Owner/Manager/Caregiver/Parent | Generic tables and `Lainnya` as main navigation |
| Caregiver UX | Classroom-first, present children preselected, batch record with per-child exceptions | Per-child repetitive forms for common tasks |
| Parent UX | My Child Today, Daily Story, Growth Journey, morning handover | Other children's information, invented care events |
| Manager UX | Exception-first, optional policy-based approval | Manager must approve all routine events |
| Pickup | Recurring authorized = fast; substitute = guardian authorization + policy review + staff ID check | Checkbox pretending to validate actual PIN, AI identifying picker |
| Evidence | Real staff actor/time/method/audit now; later authorized Elenio ref | Simulated CCTV screenshot as proof |
| CCTV/analytics | Defer; reuse existing Elenio backend when contract supplied | New RTSP/ONVIF gateway / VMS / analytics engine |
| CRM | Manual WhatsApp links/drafts, stage/tour/trial/enrollment persisted | Scrape personal WhatsApp or mark undelivered message as sent |
| Rapor | Educator observation → review → report → published to linked guardian | AI diagnosis or report based on meal/sleep alone |
| LEO | Scoped retrieved source-backed answers, optional future external model | Fabricated facts, automatic childcare safety decision |
| Security | RLS + server role checks + media authorization + audit | Client role selector as access control |
| Data | Synthetic fixtures in local sandbox only | Production sample data/localStorage |
| Billing | Preserve existing scaffolding; verified manual reference | One-click mock settlement or fabricated payment gateway |
