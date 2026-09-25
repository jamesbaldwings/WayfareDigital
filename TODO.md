# Wayfare Digital launch to-do list

Ordered so each step unblocks the next. Check items off as they're done.

## 1. Hosting and domain

- [ ] Deploy the repo on Railway (New Project, then Deploy from GitHub repo)
- [ ] Add the custom domain in Railway and the CNAME in Cloudflare DNS (DNS only until the certificate is issued)
- [ ] Set Cloudflare SSL/TLS to Full if you turn the proxy back on
- [ ] Open the live site on a phone and confirm "Add to Home Screen" shows the route-mark icon

## 2. Business email

- [ ] Pick the address people reply to, like `hello@` your domain
- [ ] Set up the mailbox (Google Workspace) or forwarding to your current inbox (Cloudflare Email Routing, free)
- [ ] Add that address to the site footer and to every outgoing email

## 3. Form backend (n8n)

Built: `automations/wayfare-forms.workflow.json` and `automations/schema.sql`. Setup steps are in `automations/README.md`.


Both forms already call `sendSubmission()` in `index.html`. Setting `FORM_ENDPOINT` is the only change the page needs.

- [ ] Create an n8n webhook workflow on the VPS that accepts POST requests with JSON
- [ ] Route on the `type` field: `audit` or `intake`
- [ ] Allow requests from the live domain (CORS)
- [ ] Put the webhook URL in `FORM_ENDPOINT` in `index.html`, commit, and push
- [ ] Add spam protection: Cloudflare Turnstile on both forms, checked in n8n
- [ ] Save every submission somewhere you can see it (a Google Sheet or n8n's data table)
- [ ] Get a Telegram alert through AviDev_bot for every new submission

## 4. SendGrid

- [ ] Create the SendGrid account and an API key with send access only
- [ ] Authenticate the domain (SPF and DKIM records in Cloudflare DNS) so email doesn't land in spam
- [ ] Store the API key in n8n credentials, never in the repo
- [ ] Add your mailing address and an unsubscribe link to marketing emails (required by CAN-SPAM)

## 5. Free site audit

- [ ] Create a Google Cloud project and enable the PageSpeed Insights API
- [ ] Create an API key and restrict it to that API. Call it from n8n only, never from the browser
- [ ] In n8n: run the audit for mobile and desktop, pull speed score, load time, mobile usability, and top issues
- [ ] Send the report email through SendGrid, including the "Want a free quote to fix it?" offer
- [ ] Handle failures: site unreachable, blocks scanners, or takes too long. Send a "we'll look at it by hand" email instead of nothing

## 6. Audit follow-up emails

- [ ] Email 1, right away: the 2 or 3 biggest issues in plain language, no pitch
- [ ] Email 2, a few days later: AI-generated mock-up of their homepage and what changed
- [ ] Email 3, a few days after that: pricing, scheduling link, discount mention if it applies
- [ ] Stop the sequence if they fill out the intake form or reply

## 7. Custom quote

- [ ] Quote logic in n8n: Pay Up Front vs. Pay Monthly, Basic vs. Managed upkeep, based on the intake answers
- [ ] Flag sites you didn't build (current site filled in, no rebuild wanted) for the Managed review at $250/month
- [ ] Apply the 10% veteran-owned or women-owned discount (needs a question on the intake form)
- [ ] Quote email template through SendGrid: exact numbers, recommendation, and the reason for it
- [ ] Copy yourself on every quote so you can follow up

## 8. Contract and e-signature

- [ ] Write the client agreement: ownership transfer, payoff and buyout at any time, missed-payment grace period, 2-hour migration cap, Managed request limit and overage rate
- [ ] Choose a signing tool (SignWell free tier or Dropbox Sign)
- [ ] Send the contract automatically once a client accepts a quote. No build starts before it's signed

## 9. Payments (Stripe)

- [ ] Create the Stripe account under Agsperience Inc. with Wayfare Digital as the public business name
- [ ] Pay Up Front: $1,500 invoice to start, $1,500 invoice at launch
- [ ] Pay Monthly: $350/month subscription that ends after 18 payments. First payment due before building starts
- [ ] Upkeep subscriptions: Basic $150/month, Managed $250/month, Managed add-on $100/month for Pay Monthly clients
- [ ] 10% discount coupon for veteran-owned and women-owned businesses, applied to upkeep only
- [ ] Payoff amount for Pay Monthly clients who want to own the site early
- [ ] Failed-payment webhook to n8n: reminder emails, grace period, then take the site offline with the buyout still open
- [ ] Payment links in the quote email

## 10. Legal pages

- [ ] Privacy policy: what the forms collect, how it's used, that it's never sold or shared
- [ ] Terms of service
- [ ] Link both in the footer

## 11. Operations (after the first clients)

Built: `automations/site-monitor.workflow.json` covers the 5-minute uptime and SSL checks with Telegram alerts.


- [ ] Daily health checks for each client site: uptime, SSL expiry, load time, broken links
- [ ] Your dashboard showing every client site's status
- [ ] Weekly plain-language status email to each client
- [ ] Change-request form for Managed clients
- [ ] Upsell triggers: 3+ requests in 30 days on Basic, or 3 straight months over the Managed cap
- [ ] Checklist for reviewing sites you didn't build: platform, admin and hosting access, who owns the domain, plugin count
- [ ] Ask happy clients for a referral and a testimonial
