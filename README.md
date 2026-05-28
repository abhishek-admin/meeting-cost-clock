# ⏱ Meeting Cost Clock

> **Every second you're in this meeting, money is leaving the building.**
> Set your team size and average salary. Start the clock. Watch the real cost tick up in dollar and cents precision — with Gemini commentary at each milestone.

<div align="center">

[![Chrome MV3](https://img.shields.io/badge/Chrome-Manifest_V3-14b8a6?style=for-the-badge&logo=google-chrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.0_Flash-D4AF37?style=for-the-badge&logo=google-gemini&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)
[![Streak](https://img.shields.io/badge/Day-14_/_180-vanilla?style=for-the-badge&logo=github&logoColor=white)](https://x.com/happy_ships)

</div>

---

## 📖 The Problem & The Solution

**Every company says meetings are expensive. Nobody makes it visceral.**

The standard pitch: "A 1-hour meeting with 12 people costs $X." But a sentence is easy to ignore. A dollar counter ticking up in real time while you're sitting in the meeting is not.

**Meeting Cost Clock makes the cost undeniable.** Set attendees and average salary, hit Start, and watch the counter tick up in real time using `performance.now()` + `requestAnimationFrame` for sub-millisecond precision. At the 2, 5, 15, and 30-minute marks, Gemini drops a sardonic one-liner about what this meeting has cost so far — what that amount could buy, what it's equivalent to.

![Demo](meetclock.gif)

---

## ⚡ Core Features

- 💰 **Live Cost Counter** — Dollar and cents precision, updating at 60fps via `requestAnimationFrame`.
- 👥 **Configurable** — Set attendees (1–100) and average annual salary. Rate tiles update live as you type.
- 📊 **Rate Display** — Shows cost per minute and cost per hour as you adjust inputs.
- ⏸ **Full Timer Controls** — Start / Pause / Resume / Reset.
- 🤖 **Gemini Insights** — At the 2, 5, 15, and 30-minute marks, Gemini generates a sardonic one-liner about what this meeting has actually cost.
- 💾 **Session Persistence** — Elapsed time survives popup close and reopen within the browser session.

---

## 🛠 Getting Started

### 1. Load the Extension
1. Clone this repository locally.
2. Open Chrome and navigate to `chrome://extensions`.
3. Toggle on **Developer mode** in the top right.
4. Click **Load unpacked** and select the `meeting-cost-clock` folder.

### 2. Configure Your Keys
On first launch, the extension shows an onboarding screen:
- **Gemini Key** — Get one free at [aistudio.google.com](https://aistudio.google.com/app/apikey).
- **OpenRouter Key** — Get one at [openrouter.ai](https://openrouter.ai) *(optional fallback)*.

*To update your keys later, click the **⚙** gear icon in the popup header.*

### 3. Start the Clock
1. Click the extension icon at the start of any meeting.
2. Set **Attendees** and **Avg. Salary ($/yr)** for your team.
3. Hit **▶ Start Clock** — the counter begins ticking immediately.
4. Pause or reset at any time. Reopen the popup and elapsed time is restored.

---

## 🧠 Engineering Highlight: 60fps with `performance.now()`

The cost counter updates every animation frame. A naive implementation uses `Date.now()` inside `setInterval` — but `Date.now()` resolves only to 1ms precision and is affected by system clock adjustments. Under CPU load, `setInterval` callbacks drift, producing a stuttering counter that slowly falls behind.

The fix: `performance.now()` records the start timestamp. Each `requestAnimationFrame` callback computes elapsed time as `performance.now() - startTimestamp + pausedElapsed`. No accumulation, no drift — just a monotonic subtraction that stays accurate even under throttle.

```js
function tick() {
  if (!running) return;
  const elapsedMs = pausedElapsed + (performance.now() - startTimestamp);
  updateDisplay(elapsedMs);
  rafId = requestAnimationFrame(tick);
}
```

> [!NOTE]
> `requestAnimationFrame` automatically pauses when the tab is hidden (per the Page Visibility API), so the timer runs only when the user is actively looking — the right behavior for a meeting cost tool.

---

## 🔧 Technical Stack

- **Extension Framework**: Chrome Extension Manifest V3
- **Timer Engine**: `performance.now()` + `requestAnimationFrame` — 60fps, drift-free
- **Primary AI Model**: Gemini 2.0 Flash via Gemini API
- **Fallback Engine**: OpenRouter API (multi-model cascade)
- **State**: `chrome.storage.session` — elapsed time persists across popup close/reopen
- **Client Implementation**: Pure Vanilla JS — zero build steps, zero dependencies

---

## 📅 180 Days of Building

This project is part of a larger developer journey: shipping one useful AI tool every day for 180 days.

This release is **Day 14 of 180**, powered by **Gemini 2.0 Flash**.

Follow along for daily releases and tech-stack deep dives:
- **Twitter / X**: [@happy_ships](https://x.com/happy_ships)
- **Day**: `14 / 180`

---

*Licensed under the [MIT License](LICENSE).*
