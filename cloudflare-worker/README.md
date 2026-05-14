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
visible on GitHub but attributed to the bot account, not the user.

## Setup checklist

### 1. Create the bot GitHub account

Sign up at github.com with a new account. Suggestions:
- Username: something neutral like `kroma-feedback-bot` (must be unique on GitHub).
- Email: a separate inbox you don't otherwise use.
- 2FA: optional. The token's permissions are narrow enough that 2FA loss isn't catastrophic, but enabling 2FA is recommended.

Add the bot as a collaborator on the wardrobe-app repo:
- Wardrobe-app repo → Settings → Collaborators → Add people
- Pick the bot, give it **Write** access (needed to create issues; **Triage** is not enough on private repos but is enough on public).

### 2. Generate a fine-grained PAT

While signed in as the bot:
- Settings → Developer settings → Personal access tokens → **Fine-grained tokens**
- Token name: `kroma-feedback-worker`
- Expiry: 1 year (set a calendar reminder to rotate before then)
- Resource owner: the account that owns the wardrobe-app repo
- Repository access: **Only select repositories** → `wardrobe-app`
- Permissions: **Issues — Read and write**
- Generate, copy the token. It's only shown once.

### 3. Set up Cloudflare Turnstile

In the Cloudflare dashboard:
- Turnstile → Add Site
- Domain: `kroma.fit`
- Widget mode: **Managed** (Cloudflare picks the appropriate challenge)
- Copy the **Site Key** (public, goes in `_config.yml`)
- Copy the **Secret Key** (private, goes into the worker as a secret)

### 4. Install wrangler

```bash
npm install -g wrangler@latest
wrangler login                        # opens a browser, authorises wrangler
```

### 5. Deploy the worker

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

### 6. (Optional) Bind a custom domain

Cleaner final URL. Cloudflare dashboard → Workers & Pages →
kroma-feedback → Triggers → Custom Domains → Add Custom Domain →
e.g. `feedback-api.kroma.fit`.

Requires that `kroma.fit` is on Cloudflare's nameservers. If you haven't moved DNS to Cloudflare yet, skip this step — the `.workers.dev` URL works fine.

### 7. Wire the site up to the worker

Edit `_config.yml` at the root of the kroma-site repo:

```yaml
# Replace the placeholders with the values from steps 3 and 5–6.
feedback_api_url: "https://kroma-feedback.<your-subdomain>.workers.dev"
turnstile_site_key: "0x...your-public-site-key"
```

Commit and push the kroma-site repo. The `/feedback/` page now hits
the live worker.

## Testing

After deploying:

1. Open `https://kroma.fit/feedback/`.
2. Fill in a "test" submission ("This is a test of the feedback worker — please ignore.").
3. Hit Send. Turnstile may show a brief challenge.
4. The page should render a thank-you with a link to the created issue.
5. Check the wardrobe-app repo's Issues tab — there should be a new issue authored by the bot account.

If the form fails:

- **"Captcha failed"** — Turnstile keys mismatched. Check the site key in `_config.yml` and the secret key in `wrangler secret list`.
- **"Could not submit. Try again later."** — usually means the GitHub PAT is missing, expired, or scoped wrong. Check `wrangler secret list` (just lists names — won't show values) and confirm the PAT has Issues: Read+Write on the wardrobe-app repo.
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
