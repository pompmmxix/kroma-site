# Kroma feedback worker

A small Cloudflare Worker that proxies submissions from
`kroma.fit/feedback` to GitHub Issues, so users can give us feedback
without needing a GitHub account or sharing any contact details.

It is intentionally stateless: it receives the form POST, verifies a
Cloudflare Turnstile captcha, validates input, and forwards the
message to the GitHub API. No logging, no storage, no PII collection.

```
User on kroma.fit/feedback
         │
         │  (form POST + Turnstile token)
         ▼
   Cloudflare Worker  ──  Turnstile siteverify
         │
         │  (POST /repos/<owner>/<repo>/issues)
         ▼
   GitHub Issues API
         │
         ▼
   Public issue posted by kroma-feedback-bot
```

The user sees a thank-you on `kroma.fit/feedback`. The submission is
visible on the public feedback repo but attributed to the bot account,
not the user.

## Architecture note: two repos

The main Kroma app code lives in a **private** repo
(`pompmmxix/wardrobe-app`). Private issues can't be a public feedback
list — submitters wouldn't be able to see what's been raised, and the
"public, transparent" promise on the website wouldn't hold.

So feedback issues land in a **separate, public** repo owned by the bot
account itself: `kroma-feedback-bot/kroma-feedback`. The bot's
fine-grained PAT is scoped to that single repo. Cross-account
permission gymnastics are avoided because the bot owns its own repo.

You (the maintainer) get Admin-collaborator access on the bot's repo
from your usual GitHub account so you can read, label, and close issues
without having to log in as the bot.

## Setup checklist

### 1. Create the bot GitHub account

Sign up at github.com with a new account. Suggestions:

- Username: something neutral like `kroma-feedback-bot` (must be unique on GitHub; if taken, pick a variant — but match it consistently in the steps below).
- Email: a separate inbox you don't otherwise use. ProtonMail or a forwarding alias works well; avoid Gmail (their signup loop conflates new-account creation with existing-account sign-in).
- **Enable 2FA on the bot account.** The PAT permissions are narrow, but 2FA prevents anyone who got hold of the email from password-resetting the account and replacing the PAT.

### 2. Create the public feedback repo (as the bot)

Signed in as the bot:

- New repo: `kroma-feedback` (any name is fine; just match it in step 6 and the wrangler config).
- Visibility: **Public**.
- Initialise with a README — anything, e.g. one line describing the repo.
- Confirm Issues is enabled (Settings → Features → Issues — on by default).

### 3. Add yourself as Admin collaborator

Still signed in as the bot, on the new repo:

- Settings → Collaborators → Add people
- Add your own GitHub account with **Admin** permission.

Now you can log in as yourself and triage issues in the bot's repo
without ever needing to sign back in as the bot.

### 4. (Optional but recommended) Add issue templates

Copy the files in `cloudflare-worker/issue-templates/` into the bot's
new repo at `.github/ISSUE_TEMPLATE/`. These provide a clean form for
anyone who lands directly on the issues page rather than coming via
`kroma.fit/feedback`. The Worker doesn't use these templates — it
generates its own issue body — but direct visitors benefit.

### 5. Generate a fine-grained PAT (as the bot)

While signed in as the bot:

- Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token
- Token name: `kroma-feedback-worker`
- Expiry: 1 year (set a calendar reminder to rotate before then)
- Resource owner: the bot account (selected automatically since the bot owns the target repo)
- Repository access: **Only select repositories** → `kroma-feedback`
- Permissions:
  - Repository permissions → **Issues — Read and write**
  - Everything else: no access
- Generate. Copy the token immediately — it's only shown once.

### 6. Set up Cloudflare Turnstile

In the Cloudflare dashboard (your usual account, not the bot's):

- Turnstile → Add Site
- Domain: `kroma.fit`
- Widget mode: **Managed** (Cloudflare picks the appropriate challenge)
- Copy the **Site Key** (public, goes in `_config.yml`)
- Copy the **Secret Key** (private, goes into the worker as a secret)

### 7. Install wrangler

```bash
npm install -g wrangler@latest
wrangler login                        # opens a browser, authorises wrangler
```

### 8. Deploy the worker

First check the REPO value in `wrangler.toml` matches the bot's
username and repo name from steps 1 and 2. Default is
`kroma-feedback-bot/kroma-feedback` — edit if different.

Then:

```bash
cd cloudflare-worker

# Secrets — these go into Cloudflare's encrypted secret store, never
# the source tree. Each command prompts you to paste the value.
wrangler secret put GITHUB_TOKEN      # → paste the bot's fine-grained PAT
wrangler secret put TURNSTILE_SECRET  # → paste Turnstile secret key

wrangler deploy
```

Note the deployed URL — something like:

```
https://kroma-feedback.<your-cloudflare-subdomain>.workers.dev
```

### 9. (Optional) Bind a custom domain

Cleaner final URL. Cloudflare dashboard → Workers & Pages →
kroma-feedback → Triggers → Custom Domains → Add Custom Domain →
e.g. `feedback-api.kroma.fit`.

Requires `kroma.fit` to be on Cloudflare's nameservers. If you haven't
moved DNS to Cloudflare yet, skip this step — the `.workers.dev` URL
works fine.

### 10. Wire the site up to the worker

Edit `_config.yml` at the root of the kroma-site repo:

```yaml
# Replace the placeholders with the values from steps 6 and 8–9.
feedback_api_url: "https://kroma-feedback.<your-subdomain>.workers.dev"
turnstile_site_key: "0x...your-public-site-key"
```

Commit and push the kroma-site repo. The `/feedback/` page rebuilds
and starts using the live worker.

## Testing

After deploying:

1. Open `https://kroma.fit/feedback/`.
2. Fill in a "test" submission ("This is a test of the feedback worker — please ignore.").
3. Hit Send. Turnstile may show a brief challenge.
4. The page should render a thank-you with a link to the created issue.
5. Check the bot's feedback repo's Issues tab — there should be a new issue. You can view it from your own GitHub account (because you're an Admin collaborator).

If the form fails:

- **"Captcha failed"** — Turnstile keys mismatched. Check the site key in `_config.yml` and the secret key in `wrangler secret list`.
- **"Could not submit. Try again later."** — usually means the GitHub PAT is missing, expired, or scoped wrong. Common causes: token wasn't actually committed (`wrangler secret list` should show GITHUB_TOKEN); token expired; token granted permissions on the wrong repo; REPO in wrangler.toml doesn't match the bot's actual repo path.
- **CORS errors in the browser console** — the request is coming from an origin not in the worker's allowlist. Edit `ALLOWED_ORIGINS` in `feedback-worker.js` if you've moved the site.

## Rotating credentials

The GitHub PAT expires in 1 year (per the setup steps). Recommended:

- Calendar reminder for 11 months in.
- Generate a new PAT on the bot account.
- `wrangler secret put GITHUB_TOKEN` (overwrites the old one).
- Revoke the old PAT from the bot account.

Turnstile keys don't expire by default — no rotation needed unless they're suspected leaked.

## Costs

All three services have free tiers that cover small-app usage indefinitely:

- **Cloudflare Workers**: 100,000 free requests/day. We'll see ~tens.
- **Turnstile**: free, unlimited.
- **GitHub API**: 5,000 authenticated requests/hour. We'll see ~tens/day.

No paid tier is anticipated.

## Local development

```bash
wrangler dev
```

Spins up a local dev server. To test against the real form, point your
local Jekyll `_config.yml` `feedback_api_url` at `http://127.0.0.1:8787`.
You'll need to set the secrets locally too — wrangler dev reads them
from `.dev.vars` (don't commit this file; it's in `.gitignore`):

```
# .dev.vars
GITHUB_TOKEN=ghp_yourtokenhere
TURNSTILE_SECRET=0xsecret_for_dev
```

For testing the Turnstile flow locally, use Cloudflare's
[dummy test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
that always pass — they're documented on Cloudflare's site.
