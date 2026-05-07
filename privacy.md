---
layout: default
title: Privacy Policy
permalink: /privacy/
---

# Privacy Policy

**Last updated:** 1 May 2026
**Applies to:** Kroma (the "app") and [kroma.fit](https://kroma.fit) (the "site").

Kroma is a local-first wardrobe app. The short version: your wardrobe data lives on your phone. We don't run a server that stores it, we don't have user accounts, and we don't track your usage. This page explains the details — including the few places where data does leave your device, and what we do with any email you choose to send us.

If you're reading this to decide whether to use the app, the most important sentence on the page is: **nothing leaves your device unless you take an action that sends it.**

## Who we are

Kroma is operated by **Pomp Clothing**, **United Kingdom**.

For most of what the app does we don't act as a *data controller* under UK GDPR or EU GDPR — your wardrobe data lives on your device and we never receive it. Where personal data does reach us (most commonly: emails you choose to send to us), we are the controller for that data and your rights apply as set out below.

You can contact us at [hello@kroma.fit](mailto:hello@kroma.fit).

## What data the app collects about you

**Nothing on its own.**

There are no accounts, no login, no analytics SDKs, no crash reporters, no advertising IDs. The app does not send device identifiers, location, usage data, or personally identifiable information to any server we run. We don't run a server.

Everything you enter into the app — your wardrobe items, outfit photos, colour analysis results, preferences — is stored on your device. Nothing about that data is visible to us.

## Where data does leave your device

There are four places where information can leave your phone, and all of them require a deliberate action on your part. We list them here exhaustively.

### 1. The AI provider you choose (opt-in)

To use features that analyse photos (auto-tagging garments, identifying items in an outfit photo, colour analysis, body analysis, pattern detection), you provide your own API key for one of these providers:

- Google Gemini
- Anthropic Claude (if configured)
- OpenAI (if configured)
- Ollama (self-hosted — runs on your own machine, sends nothing to a third party)

When you use an AI feature, the relevant photo and prompt are sent **from your device, using your API key, directly to the provider you chose**. The data travels to their servers, not ours. The provider processes the image under their terms of service and privacy policy, which you should review:

- Google Gemini: [policies.google.com/privacy](https://policies.google.com/privacy)
- Anthropic: [anthropic.com/legal/privacy](https://www.anthropic.com/legal/privacy)
- OpenAI: [openai.com/policies/privacy-policy](https://openai.com/policies/privacy-policy)
- Ollama: runs locally, no external transmission

We strongly recommend reading your chosen provider's policy before uploading sensitive images. In particular, note whether they reserve the right to use your inputs to train future models. Most paid tiers explicitly opt out of this; most free tiers do not.

Your API key is stored only on your device. We do not have access to it.

### 2. Weather (opt-in)

The "Auto-fetch weather" setting is off by default. If you turn it on and enter a city name, the app makes **one request per morning** to **Open-Meteo** ([open-meteo.com](https://open-meteo.com)) asking for the forecast at those coordinates. Open-Meteo is a free, independently operated, no-account weather service that does not require an API key and states it does not log identifying data about callers. We do not proxy or log this request.

If "Auto-fetch weather" is off (the default), no weather requests are made. You can enter how today feels with in-app chips instead, completely offline.

### 3. Shared product pages (opt-in)

If you use the share-to-app import (e.g. sharing a product URL from Chrome or Instagram), the app fetches that URL directly from the retailer's server to read the product page (image, brand, price, fabric composition). This request is made from your device, not via our servers. We don't record the URLs you share.

### 4. Email to us (opt-in)

If you tap a **"Something off?"** or **"Know a tradition we're missing?"** link inside the app, your email client opens a pre-filled message to [hello@kroma.fit](mailto:hello@kroma.fit). Nothing is sent until **you** press send in your email app. See the *Feedback emails* section below for what happens if you do send it.

## Photos specifically

Because photos of your face and body are inherently more sensitive than wardrobe data, a few extra notes:

- You choose when to take a photo. Kroma never accesses your camera or photo library without an explicit tap.
- Profile selfies and body photos are stored locally the same way as garment photos. They're embedded in your backup when you export one.
- Face-shape analysis and body-type analysis both require a clear view of you. If that's not comfortable for you in any given context, manual mode is the right alternative — every analysis can be done by entering values yourself.
- We don't generate, store, or use face embeddings, biometric templates, or any other identifier derived from your photos. The AI provider may — check their policy.
- Before any photo is sent to a third-party AI provider, the app prompts for your explicit confirmation that you are 13 or over (or have parental permission). That confirmation is timestamped and recorded on your device for audit.

## Backup and restore

The in-app backup / export feature writes a file containing your wardrobe data to your device (Documents folder on Android, equivalent elsewhere). If you choose to share that file via your device's share sheet (email, cloud drive, AirDrop), it travels through whichever service you pick. We never see it.

Importing a backup reads a file on your device. The file contents are not transmitted anywhere by the app.

## Permissions

The app requests the following device permissions, and only uses them for the purposes described:

- **Camera** — to take garment, care-label, selfie, and body photos when you tap a photo button
- **Photo library / Files** — to import existing photos you choose, and to save backup files
- **Storage** — to persist your wardrobe data between sessions
- **Haptics** — to provide tactile feedback on button taps

No permissions are used for background tracking, location, contacts, microphone, or anything else. Kroma does not run background services.

## Feedback emails

When you email [hello@kroma.fit](mailto:hello@kroma.fit) — whether via the in-app feedback links or directly — the following happens:

- The email travels through your own email provider (Gmail, iCloud, Outlook etc.) over standard SMTP/IMAP.
- It is forwarded via **Namecheap Email Forwarding** (our domain registrar's free forwarding service), which acts as a **sub-processor** under GDPR.
- It arrives in a personal Gmail inbox operated by the data controller (see *Who we are* above).

**What we collect from the email**: the sending address (so we can reply) and the content you chose to write. The in-app feedback templates don't auto-attach any wardrobe data, device information, photos, or other identifiers — only what you type.

**What we use it for**: answering you, and referencing suggestions when adding or correcting traditions, colours, or fabrics in future app updates. If your message helps us add or fix something, we may quote the content in commit messages, release notes, or internal notes — without your email address unless you've given us specific permission.

**What we don't do with it**: sell it, share it with advertisers, feed it into training data, or cross-reference it with anything else about you (we don't have anything else about you).

**Retention**: emails are kept for as long as they're useful for answering you and informing future updates. You can request deletion at any time — see *Your rights* below.

**Lawful basis (GDPR)**: legitimate interest in answering correspondence you voluntarily initiated.

## Cookies and local storage

- The mobile app uses the device's native storage (Capacitor Filesystem on Android, equivalent elsewhere) to save your wardrobe data. No cookies are set by the app.
- The website at **kroma.fit** does not use cookies, analytics, or embedded trackers. If that ever changes, this policy will be updated before the change goes live.

## Children

The app is not directed at children under 13 (or under 16, in jurisdictions where that is the applicable age of digital consent). We do not knowingly process personal data from children. Because we do not collect data about users, we cannot identify a user's age; if you are a parent or guardian and believe your child has used the app in a way that concerns you, email us and we will help.

The app's onboarding flow asks each user whether they are 13 or over. If they answer no, AI photo features are disabled by default; the app continues to work in manual mode.

## Your rights (UK GDPR / EU GDPR)

Because we do not maintain a server-side record of you, most GDPR data subject rights are satisfied by design: we don't have data about you to access, rectify, port, restrict, or object to. The one exception is any email correspondence you have sent us.

For that correspondence specifically, you have the right to:

- **Access** — ask us to send you a copy of any email you've sent us.
- **Rectification** — ask us to correct anything in that correspondence.
- **Erasure** — ask us to delete any email you've sent us, and we'll delete it from our inbox.
- **Restriction / objection** — ask us to stop processing it.
- **Complain** — to the UK Information Commissioner's Office ([ico.org.uk](https://ico.org.uk)) or your local EU data protection authority.

To exercise any of these rights, email [hello@kroma.fit](mailto:hello@kroma.fit) with the request. We aim to respond within 30 days.

## International transfers

The app runs on your device, so data you generate with it does not transfer internationally through us.

AI providers you choose to use (see above) may process your data in regions outside your own. The provider's own privacy policy governs this, not ours. If your regulator's data-transfer rules matter to you, choose Ollama (self-hosted) and no data leaves your device at all.

Feedback emails, when forwarded through Namecheap and landing in Gmail, are processed on infrastructure primarily operated in the United States. Standard contractual clauses apply for transfers from the UK / EU to the US under those providers' published terms.

## Changes to this policy

We'll update this page if how the app treats data changes. The "Last updated" date at the top reflects the most recent change. We won't retroactively reduce protections for data already collected under an earlier version.

## Contact

[hello@kroma.fit](mailto:hello@kroma.fit?subject=Privacy%20question)

If you don't get a reply within 30 days, that's a bug — try again or contact the **Information Commissioner's Office** at [ico.org.uk/make-a-complaint](https://ico.org.uk/make-a-complaint) (UK) or your local data protection authority (EU).
