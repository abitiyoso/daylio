# Email invitations and access

Owner/manager → Akun & hak akses → recipient email, role, linked child for parent → Kirim undangan email. Existing invitations remain stored if delivery fails; Kirim ulang email rotates the invitation token and requests another email. Revocation and expiry are checked at acceptance. Owner alone can invite a manager or deactivate/reactivate another member. Invitation role does not replace an existing membership; change existing access separately.

The backend calls the configured Supabase `/auth/v1/otp` endpoint with email/create_user and a fixed application-origin `/auth/complete?invitation=...` redirect. No admin service-role secret is required. This deliberately emails a verification link, not a password. Provider acceptance is recorded as `invitation.email_requested`; it is not a delivery receipt. No external emails were sent in local testing.

The default Supabase magic-link ConfirmationURL verifies email and returns access/refresh tokens in the fragment. The callback immediately removes the fragment/query from browser history, posts tokens to the same-origin server, verifies both identities with Supabase, and sets HTTP-only cookies. The invitation then activates only for the matching verified email. Recipient chooses a private password. Invalid/used provider proof, expired/revoked invitation and wrong email fail closed. The existing `/auth/confirm` token-hash endpoint remains available for custom templates.

## Hosted configuration and acceptance

Set APP_ORIGIN, SUPABASE_URL, SUPABASE_ANON_KEY, DATABASE_URL over the deployment's secure environment settings. Configure SMTP in Supabase, sender domain and Confirm email. Set Site URL to the application origin; allow the `/auth/complete` redirect including its invitation query (and use the same host as APP_ORIGIN). Keep the standard magic-link template containing ConfirmationURL. Recovery also redirects through `/auth/complete`. Follow [Supabase passwordless email documentation](https://supabase.com/docs/guides/auth/auth-email-passwordless) and [email template documentation](https://supabase.com/docs/guides/auth/auth-email-templates).

Before production acceptance, test a real invitation in a fresh browser and on another device, spam folder/delivery, existing-account invitation, resend and old link rejection, expiry/revocation, password creation/login, and password recovery. Production provider access and SMTP were not supplied here, so actual mailbox receipt is an outstanding gate.

## Local evidence

`node scripts/dev-sandbox.mjs`, then `node scripts/browser-access-test.mjs`. The identity fixture listens only on localhost and captures test emails only for @daylio.test; its mailbox is not part of the application API or deployed code. Application data, invitation acceptance, membership checks and audit use the persistent sandbox database. Never deploy the sandbox launcher or its auth fixture. Evidence is in evidence/access-browser-results.json and evidence/screenshots/access/.
