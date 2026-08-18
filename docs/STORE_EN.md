# Hachibu — English Store Listing (App Store & Google Play)

> Copy-paste source for US / English store submissions.
> Related: [PLAY_STORE.md](./PLAY_STORE.md) (JP Play Store) · [VOICE.md](./VOICE.md) · [PRD.md](./PRD.md)
>
> Brand voice in one line: neutral, short, declarative. Never cheerleading. Never scolding.
> English tagline: **"Roughly is enough."**

---

## 1. App Identity

| Field | Value |
|---|---|
| App name | Hachibu |
| Bundle ID / Package | `app.akizony.hachibu` |
| Category (primary) | Health & Fitness |
| Contact email | contact@akizony.com |
| Privacy policy URL | *(Vercel published URL)* |
| Support URL | *(Vercel about page URL)* |

---

## 2. Apple App Store (iOS)

### 2-1. App Name (30 chars max)

```
Hachibu
```

(7 chars)

### 2-2. Subtitle (30 chars max)

```
Meal Log & Body Type Tracker
```

(28 chars)

**Alternatives**

| Option | Copy | Chars | Notes |
|---|---|---|---|
| A *(recommended)* | `Meal Log & Body Type Tracker` | 28 | Clear, searchable |
| B | `Quick Meal Log · Body Awareness` | 31 | ✗ over limit |
| C | `Body & Meal Log, Roughly Right` | 31 | ✗ over limit |
| D | `Log Meals. Know Your Body.` | 27 | Punchy, action-led |

### 2-3. Promotional Text (170 chars max)
*(Shown above the description. Can be updated any time without a new app version — ideal for events or seasonal messaging.)*

```
Nine buttons to log a meal. One tap is enough. No measuring, no searching, no deciding. Try free for 7 days.
```

(108 chars)

### 2-4. Keywords (100 chars max, comma-separated)

```
meal tracker,food diary,calorie,macro,body type,weight,nutrition,quick log,health,fitness
```

(89 chars)

> **Tip:** Do not repeat words already in the app name or subtitle — Apple's algorithm already indexes those. Rotate seasonal variants (e.g. swap "fitness" for "new year goal") without a new build.

### 2-5. Description (4000 chars max)

```
The biggest enemy of meal tracking is trying to track it perfectly.

Hachibu is built around the opposite idea: roughly is enough.

■ Nine buttons, one tap (Quick Log)
Tap a category button — kcal and macros logged instantly. Ingredient tab or dish tab, nine buttons each. Your most-logged foods rise to the top automatically. No database to search. No measuring. No deciding.

■ More time? Hold for detail
Long-press the same button to add type, cooking method, and amount. Log as much or as little as you feel like — the app doesn't care either way.

■ A goal that fits
Enter your stats, pick a direction. Get a daily calorie and macro target — realistic pace, not a crash diet.

■ No streaks, no score
Miss a day — the app won't mention it.

7-day free trial. Everything stays on your device.

Hachibu (八分) — the Japanese practice of stopping at 80% full. Roughly is enough.
```

*(~145 words)*

---

## 3. Google Play Store (Android)

### 3-1. Short Description (80 chars max)

```
Just tap a button. Quick, rough logging — the meal log that sticks.
```

(67 chars)

### 3-2. Full Description (4000 chars max)

```
The biggest enemy of meal tracking is trying to track it perfectly.

Hachibu is built around the opposite idea: roughly is enough.

■ Nine buttons, one tap (Quick Log)
Tap a category button — kcal and macros logged instantly. Ingredient tab or dish tab, nine buttons each. Your most-logged foods rise to the top automatically. No database to search. No measuring. No deciding.

■ More time? Hold for detail
Long-press the same button to add type, cooking method, and amount. Log as much or as little as you feel like — the app doesn't care either way.

■ A goal that fits
Enter your stats, pick a direction. Get a daily calorie and macro target — realistic pace, not a crash diet.

■ No streaks, no score
Miss a day — the app won't mention it.

7-day free trial. Everything stays on your device.

Hachibu (八分) — the Japanese practice of stopping at 80% full. Roughly is enough.
```

*(~145 words)*

---

## 4. Shared Assets Checklist

| Asset | Spec | Status |
|---|---|---|
| App icon | 1024×1024 PNG (App Store) / 512×512 PNG (Play) | ✅ |
| Feature graphic (Play) | 1024×500 PNG/JPEG | ✅ |
| Screenshots — English UI | iPhone 6.9" (1320×2868) min 3, max 10 | ⬜ needs English build |
| Screenshots — Android | 1080×1920 recommended, min 2, max 8 | ⬜ needs English build |
| Preview video (optional) | 15–30 s, 1080p | — |

> **Screenshot order suggestion (both stores):**
> 1. Home / My Status — daily summary
> 2. Quick Log — 9 tiles, one-tap moment
> 3. Body type selection — 3×3 grid
> 4. Goal planner — 3-month projection
> 5. Weekly review / trend chart

---

## 5. App Store — Additional Fields

### 5-1. Age Rating

**4+** — No objectionable content. Meal and weight logging; no violence, no adult content.

> The JP store uses "18+ recommended (diet context)." The App Store rating system works differently — 4+ is correct as a technical rating. Add a health disclaimer in the description instead (already included above).

### 5-2. Categories

- Primary: **Health & Fitness**
- Secondary: **Food & Drink** *(optional, helps discoverability)*

### 5-3. What's New (version release notes, 4000 chars max)

Template for first English release:

```
Hachibu is now available in English.

· UI language follows your device language setting
· Food region (Japanese dishes vs. US dishes) follows your device region
· Unit system (kg/cm or lbs/ft·in) follows your device measurement setting
· All settings can be changed manually in Settings

Feedback welcome: contact@akizony.com
```

---

## 6. Google Play — Additional Fields

### 6-1. Content Rating (IARC questionnaire)

Same as JP version — answers unchanged:
- Violence / sexual content / strong language / drugs / gambling: **None**
- User-to-user interaction: **None**
- Location sharing: **None**
- Expected rating: **IARC Everyone / ESRB Everyone / PEGI 3**

### 6-2. Target Audience

**18 and over** (diet/nutrition context; same policy as JP listing)

### 6-3. Release Notes (What's New)

```
Hachibu is now available in English.

• Language follows your device language (English / Japanese)
• Food database region follows your device region (US / Japan)
• Units follow your device measurement system (lbs & ft·in / kg & cm)
• All three can be changed independently in Settings

Questions or feedback: contact@akizony.com
```

---

## 7. Subscription Products — English Labels

*(Play Console / App Store Connect product display names and descriptions)*

| Product | Display name | Description |
|---|---|---|
| Monthly | Hachibu Monthly | Access all premium features, billed monthly. |
| Annual | Hachibu Annual | Access all premium features, billed annually. Best value. |

> Prices are set per-region in App Store Connect / Play Console. Do not hard-code a price in the description — Apple and Google prohibit it.

---

## 8. Pre-Launch Checklist (English Release)

- [ ] English screenshots captured with device in English + US region
- [ ] App Store Connect listing filled (name / subtitle / keywords / promo text / description / what's new)
- [ ] Play Console listing filled (short desc / full desc / release notes)
- [ ] Privacy policy URL live and accessible (same URL as JP — policy now renders in English)
- [ ] Subscription products created in App Store Connect with English display names
- [ ] RevenueCat product IDs match App Store / Play Console entries
- [ ] TestFlight / Internal Testing build distributed with `uiLanguage='en-US'` default
- [ ] Tested: onboarding in English, units in lbs/ft·in, US dish buckets visible
- [ ] Tested: switching language/region/units manually in Settings works
