# Meeting Cost Clock

> Watch your meeting cost tick up in real time.

**Day 12 / 180 — 180 Days of Building**

Set the number of attendees and average salary. Hit Start. Watch the dollar counter tick up every second using `performance.now()` for precision. At meeting milestones, Gemini drops a punchy insight about what this meeting has cost so far.

![Demo](meetclock.gif)

---

## What it does

- **Live cost counter** — ticks up in real time, dollar and cents precision
- **Configurable** — set attendees (1–100) and avg. annual salary
- **Cost per minute / hour** — shown live as you adjust inputs
- **Pause / Resume / Reset** — full timer controls
- **Gemini insight** — at the 2, 5, 15, 30-minute marks, Gemini generates a sardonic one-liner about what this meeting has cost
- **Session persist** — elapsed time survives popup close and reopen (within 10 min)

---

## How to use

1. Click the extension icon before or during any meeting
2. Set **attendees** and **avg. salary ($/yr)**
3. Hit **▶ Start Clock**
4. Watch the cost counter tick — pause or reset as needed

---

## Setup

### 1. Load the extension
1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked** → select the `meeting-cost-clock` folder

### 2. Add your API key (first launch)
On first open you'll see the setup screen. Enter one of:

- **Gemini API key** — free at [aistudio.google.com](https://aistudio.google.com/apikey)
- **OpenRouter API key** — free tier at [openrouter.ai](https://openrouter.ai) (used as fallback)

Only one key is required. Update or clear keys any time via ⚙.

---

## Tech stack

- Chrome Extension Manifest V3
- `performance.now()` + `requestAnimationFrame` for high-precision timing
- Gemini 2.0 Flash for milestone insights (primary) → OpenRouter fallback
- `chrome.storage.session` persists elapsed time across popup close/reopen
- Vanilla JS, no frameworks, no build step

---

## Part of 180 Days of Building

Shipping one AI Chrome extension every day for 180 days.

Follow along: [@happy_ships](https://x.com/happy_ships)
