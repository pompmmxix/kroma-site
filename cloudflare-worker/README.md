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

### 7. Install Node.js (if you don't have it)

Wrangler is a Node.js tool, so you need Node.js installed first. Check
whether you already have it:

1. Press the **Windows key**, type `powershell`, hit Enter. A blue
   window opens with a `>` prompt.
2. Type the following and hit Enter:
   ```powershell
   node --version
   ```
3. If you see something like `v20.10.0` (any number is fine, as long
   as it's v18 or higher), you have Node.js. Skip to step 8.
4. If you see a red error saying "node is not recognized" or similar,
   you need to install Node.js.

To install:

1. Go to <https://nodejs.org>.
2. Click the green **LTS** button (it'll show a version number like
   "20.11.0 LTS" or similar — the exact number doesn't matter).
3. Run the downloaded installer. Click Next through everything; the
   defaults are correct. The installer takes a couple of minutes.
4. **Close and re-open PowerShell** after install — otherwise the new
   `node` command won't be available in your existing session.
5. Verify by typing `node --version` again — should show the version.

### 8. Install wrangler

In the same PowerShell window:

```powershell
npm install -g wrangler@latest
```

You'll see a stream of text as npm downloads and installs. It takes
about a minute. When it's done you'll be back at the `>` prompt with
no error message.

Verify it installed correctly:

```powershell
wrangler --version
```

You should see something like `wrangler 3.95.0` or similar.

### 9. Sign in to Cloudflare from wrangler

```powershell
wrangler login
```

This opens your default browser to a Cloudflare page asking "Allow
Wrangler to access your account?" — click **Allow**. The browser will
show "Successfully logged in" and the PowerShell window will say so too.
You can close the browser tab.

### 10. Navigate to the worker directory

This is the directory in your kroma-site repo that holds the worker
code. Type **exactly** this (replace the path if your kroma-site repo
is elsewhere; the path below is what we've been using):

```powershell
cd C:\Projects\Wardrobe\kroma-site\cloudflare-worker
```

Hit Enter. The prompt should now show that path. You're now "inside"
the cloudflare-worker directory — wrangler will read `wrangler.toml`
from your current directory, so being here matters.

To double-check, type:

```powershell
dir
```

You should see `feedback-worker.js`, `wrangler.toml`, `README.md`,
`.gitignore`, and `issue-templates/`. If you don't, you're in the
wrong directory.

### 11. Confirm the REPO setting

Open `wrangler.toml` in any text editor (Notepad will do; right-click
the file in File Explorer → Open with → Notepad). Look for the line:

```toml
REPO = "kroma-feedback-bot/kroma-feedback"
```

If your bot's GitHub username or repo name is different from
`kroma-feedback-bot/kroma-feedback`, change it now. Save and close.

### 12. Set the two secrets

Back in PowerShell, still in the `cloudflare-worker` directory, type:

```powershell
wrangler secret put GITHUB_TOKEN
```

Hit Enter. Wrangler prompts:

```
✔ Enter a secret value: ›
```

Paste your bot's fine-grained PAT (from step 5) — it'll appear as dots
or be hidden; that's fine. Hit Enter. You'll see "Success!" or similar.

Now do the second secret:

```powershell
wrangler secret put TURNSTILE_SECRET
```

Same pattern: paste the Turnstile **secret** key (from step 6, NOT the
site key — the secret is the one labelled with a "click to reveal"
toggle in the Cloudflare Turnstile dashboard). Hit Enter.

To verify both are set (you can't see the values, just that they
exist):

```powershell
wrangler secret list
```

You should see both `GITHUB_TOKEN` and `TURNSTILE_SECRET` listed.

### 13. Deploy

Same PowerShell window, same directory:

```powershell
wrangler deploy
```

Wrangler bundles the worker and uploads it. After ~15 seconds you'll
see something like:

```
Total Upload: 4.50 KiB / gzip: 1.85 KiB
Worker Startup Time: 5 ms
Uploaded kroma-feedback (3.21 sec)
Deployed kroma-feedback triggers (0.78 sec)
  https://kroma-feedback.<your-subdomain>.workers.dev
```

**Copy that `https://...workers.dev` URL** — that's your `feedback_api_url`.
You'll paste it into `_config.yml` in the next section.

### 14. (Optional) Bind a custom domain

Cleaner final URL. Cloudflare dashboard → Workers & Pages →
kroma-feedback → Triggers → Custom Domains → Add Custom Domain →
e.g. `feedback-api.kroma.fit`.

Requires `kroma.fit` to be on Cloudflare's nameservers. **Skip this
step if your DNS is on Namecheap or elsewhere** — the `.workers.dev`
URL works fine and the form on kroma.fit can post to it.

### 15. Wire the site up to the worker

The kroma-site repo's `_config.yml` has two placeholder lines around
line 55:

```yaml
feedback_api_url: ""
turnstile_site_key: ""
```

You can edit this two ways:

**Via the GitHub web UI (easiest if you've been using GitHub.com)**:

1. Go to <https://github.com/pompmmxix/kroma-site/blob/main/_config.yml>
2. Click the pencil icon (top-right of the file view).
3. Fill in the two lines with your values from steps 6 and 13:
   ```yaml
   feedback_api_url: "https://kroma-feedback.<your-subdomain>.workers.dev"
   turnstile_site_key: "0x...your-public-site-key"
   ```
4. Scroll to the bottom → Commit changes → Commit directly to the `main` branch → green button.

**Via the terminal (if you're already in the kroma-site repo locally)**:

1. Edit `_config.yml` in your text editor.
2. Fill in the two lines (same values).
3. `git add _config.yml`
4. `git commit -m "Wire feedback page to live Worker"`
5. `git push origin main`

Either way, GitHub Pages rebuilds in ~60 seconds. Visit
<https://kroma.fit/feedback/> — the "coming soon" notice should be
replaced by the live form.

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
