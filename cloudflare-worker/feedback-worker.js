/**
 * Kroma feedback proxy — Cloudflare Worker
 * ─────────────────────────────────────────
 *
 * Purpose
 * -------
 * Stateless proxy between the kroma.fit/feedback form and the GitHub
 * Issues API. The user fills in the form on the website; this worker
 * verifies the Turnstile captcha, validates the payload, and posts
 * the message as a new issue under a dedicated service GitHub account
 * (the "feedback bot"). The user never needs a GitHub account of their
 * own, and we never see their email or any other identifier.
 *
 * Privacy posture
 * ---------------
 * • No logging of request bodies, headers, or IPs anywhere we control.
 *   (Cloudflare's edge metrics see request counts, but we don't store
 *   or aggregate them — they are part of the CDN's standard operation.)
 * • No persistent storage. No KV, no D1, no Durable Objects.
 * • The forwarded GitHub issue body never includes the user's IP,
 *   User-Agent, or any other identifier we don't have to send.
 * • The bot account is the only identity attached to the resulting
 *   GitHub issue. Submitter remains anonymous.
 *
 * Hardening
 * ---------
 * • Origin allowlist — only kroma.fit can POST.
 * • Turnstile captcha — every submission must pass a Cloudflare
 *   Turnstile challenge. Catches automated abuse without tracking.
 * • Input validation — kind enum, description length bounds.
 * • No GitHub error details leak back to the client; we return a
 *   generic 502 if upstream fails.
 *
 * Secrets (set via `wrangler secret put`)
 * ---------------------------------------
 * • GITHUB_TOKEN     — fine-grained PAT for the bot account, scoped
 *                      to the wardrobe-app repo, with Issues: Read+Write.
 * • TURNSTILE_SECRET — Turnstile secret key (paired with the public
 *                      site key embedded in feedback.html).
 *
 * Config (env vars)
 * -----------------
 * • REPO    — e.g. "pompmmxix/wardrobe-app"
 *
 * Anything else stays hardcoded below. The worker is meant to be small
 * enough to audit at a glance — that's how we keep "stateless proxy"
 * an honest claim.
 */

const ALLOWED_ORIGINS = [
  'https://kroma.fit',
  'https://www.kroma.fit',
];

// Issue-kind enum. Each maps to a title prefix (for triage in the GitHub
// list view) and a label (for filtering / automations). Keep this list
// aligned with the radio buttons on feedback.html.
const KIND_CONFIG = {
  'missing':          { prefix: '[Missing] ',        label: 'missing' },
  'factually-wrong':  { prefix: '[Factual error] ',  label: 'factual-error' },
  'not-working':      { prefix: '[Bug] ',            label: 'bug' },
};

// Description length bounds.
// MIN: short enough to allow concise reports ("Phulkari missing"), long
// enough to filter out empty-string spam and one-character clicks.
// MAX: GitHub allows much more, but ~2k chars is plenty for a focused
// report and keeps the issue list scannable. Anyone needing more should
// open an issue directly on GitHub with extra context.
const DESC_MIN = 10;
const DESC_MAX = 2000;

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const corsHeaders = buildCorsHeaders(origin);

    if (request.method === 'OPTIONS') {
      // CORS preflight. Allow the request if origin is in the allowlist;
      // otherwise the empty Access-Control-Allow-Origin header in the
      // response will fail the browser's CORS check, which is exactly
      // what we want for non-kroma.fit origins.
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    if (!ALLOWED_ORIGINS.includes(origin)) {
      // Reject anything not originating from kroma.fit.  Doesn't stop a
      // determined attacker (they can forge the Origin header server-
      // side), but stops the trivial case of "another website tried to
      // use our endpoint".
      return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders);
    }

    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders);
    }

    const { kind, description, captcha, appVersion, locale } = body || {};

    // Validate kind
    if (!kind || !KIND_CONFIG[kind]) {
      return jsonResponse({ error: 'Invalid feedback kind' }, 400, corsHeaders);
    }

    // Validate description
    if (typeof description !== 'string') {
      return jsonResponse({ error: 'Description is required' }, 400, corsHeaders);
    }
    const desc = description.trim();
    if (desc.length < DESC_MIN) {
      return jsonResponse({ error: `Description is too short (min ${DESC_MIN} characters)` }, 400, corsHeaders);
    }
    if (desc.length > DESC_MAX) {
      return jsonResponse({ error: `Description is too long (max ${DESC_MAX} characters)` }, 400, corsHeaders);
    }

    // Verify Turnstile captcha. We don't pass the user IP to Turnstile
    // (which would be allowed and improves accuracy) — keeping the IP
    // off the wire entirely is the safer privacy stance even though it
    // marginally reduces captcha quality.
    const captchaOk = await verifyTurnstile(captcha, env);
    if (!captchaOk) {
      return jsonResponse({ error: 'Captcha verification failed. Please try again.' }, 400, corsHeaders);
    }

    // Build the GitHub issue payload.
    const config = KIND_CONFIG[kind];
    const firstLine = desc.split('\n')[0].slice(0, 60);
    const title = config.prefix + firstLine;
    const issueBody = [
      `**Issue type:** ${kind}`,
      '',
      '**Description:**',
      desc,
      '',
      '---',
      `App version: ${sanitiseSingleLine(appVersion) || '(not provided)'}`,
      `Locale: ${sanitiseSingleLine(locale) || '(not provided)'}`,
      `_(Submitted anonymously via https://kroma.fit/feedback/ — proxied by kroma-feedback-bot.)_`,
    ].join('\n');

    // POST to GitHub. The fine-grained PAT lives in env.GITHUB_TOKEN
    // (set via `wrangler secret put`); env.REPO is the configured
    // owner/repo string (set in wrangler.toml).
    let ghResponse;
    try {
      ghResponse = await fetch(`https://api.github.com/repos/${env.REPO}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'kroma-feedback-bot/1.0',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          body: issueBody,
          labels: [config.label],
        }),
      });
    } catch (_) {
      return jsonResponse({ error: 'Could not reach GitHub. Try again later.' }, 502, corsHeaders);
    }

    if (!ghResponse.ok) {
      // We deliberately do NOT echo GitHub's response back to the client
      // — could leak token info, repo state, or rate-limit details.
      // The submitter sees a generic failure; we'd diagnose via the
      // Worker logs (which we don't store, but Cloudflare's dashboard
      // can show recent invocations to a logged-in admin).
      return jsonResponse({ error: 'Could not submit. Try again later.' }, 502, corsHeaders);
    }

    const issue = await ghResponse.json();
    return jsonResponse({
      ok: true,
      url: issue.html_url,  // public issue URL — the page can optionally surface this
    }, 200, corsHeaders);
  },
};

/* ───────── helpers ───────── */

function buildCorsHeaders(origin) {
  // Echo the origin back only if it's allowlisted. Browsers treat the
  // empty Access-Control-Allow-Origin as "no origin allowed", so a
  // mismatched origin gets a CORS failure cleanly.
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function jsonResponse(payload, status, corsHeaders) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders,
    },
  });
}

async function verifyTurnstile(token, env) {
  if (!token || typeof token !== 'string') return false;
  if (!env.TURNSTILE_SECRET) {
    // Fail-closed if the secret isn't configured. Means submissions
    // will fail until the operator sets the secret — preferable to
    // accepting all traffic on a misconfigured deploy.
    return false;
  }
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);

  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const data = await r.json();
    return data.success === true;
  } catch (_) {
    return false;
  }
}

/**
 * Strip newlines and tabs from single-line metadata fields (appVersion,
 * locale) to prevent body-injection attacks where someone embeds extra
 * markdown sections via the metadata. The user's main description is
 * preserved as-is — it's expected to be multi-line markdown.
 */
function sanitiseSingleLine(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/[\r\n\t]/g, ' ').trim().slice(0, 120);
}
