// ============================================
// POPUP.JS — Meeting Cost Clock (Premium Animated)
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const mainContent = document.getElementById('main-content');
  const loading = document.getElementById('loading');
  const result = document.getElementById('result');
  const error = document.getElementById('error');
  const errorMessage = document.getElementById('error-message');

  const settingsBtn = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const settingsClose = document.getElementById('settings-close');
  const geminiKeyInput = document.getElementById('gemini-key-input');
  const openrouterKeyInput = document.getElementById('openrouter-key-input');
  const saveKeysBtn = document.getElementById('save-keys-btn');
  const clearKeysBtn = document.getElementById('clear-keys-btn');
  const toggleGeminiKey = document.getElementById('toggle-gemini-key');
  const toggleOpenrouterKey = document.getElementById('toggle-openrouter-key');

  const peopleInput = document.getElementById('people-input');
  const salaryInput = document.getElementById('salary-input');
  const startBtn = document.getElementById('start-btn');
  const resetBtn = document.getElementById('reset-btn');
  const costDollars = document.getElementById('cost-dollars');
  const costCents = document.getElementById('cost-cents');
  const elapsedTime = document.getElementById('elapsed-time');
  const statRate = document.getElementById('stat-rate');
  const statHourly = document.getElementById('stat-hourly');
  const insightArea = document.getElementById('insight-area');
  const costDisplay = document.getElementById('cost-display');
  const costRing = document.getElementById('cost-ring');
  const progressBar = document.getElementById('progress-bar');
  const floatingToggle = document.getElementById('floating-toggle');

  let running = false;
  let startTimestamp = null;
  let pausedElapsed = 0;
  let rafId = null;
  let insightGenerated = false;
  let insightMinutes = [2, 5, 15, 30, 60];
  let displayCost = 0;
  let lastMinute = -1;
  let lastDollarMilestone = -1;
  let prevDollarsStr = '';

  // ---- Smooth digit rendering with roll effect ----
  function renderCost(cost) {
    const dollars = Math.floor(cost);
    const cents = Math.floor((cost - dollars) * 100);
    const newDollarsStr = dollars.toLocaleString();

    if (newDollarsStr !== prevDollarsStr) {
      costDollars.style.transition = 'none';
      costDollars.style.transform = 'translateY(-4px)';
      costDollars.style.opacity = '0.6';
      requestAnimationFrame(() => {
        costDollars.style.transition = 'transform 0.15s ease-out, opacity 0.15s ease-out';
        costDollars.style.transform = 'translateY(0)';
        costDollars.style.opacity = '1';
      });
      prevDollarsStr = newDollarsStr;
    }
    costDollars.textContent = newDollarsStr;
    costCents.textContent = cents.toString().padStart(2, '0');
  }

  // ---- Cost color tiers ----
  function updateCostTier(cost) {
    costDisplay.classList.remove('cost-tier-low', 'cost-tier-mid', 'cost-tier-high');
    if (cost >= 500) {
      costDisplay.classList.add('cost-tier-high');
    } else if (cost >= 100) {
      costDisplay.classList.add('cost-tier-mid');
    } else {
      costDisplay.classList.add('cost-tier-low');
    }
  }

  // ---- Progress ring (fills over 60 min) ----
  function updateRing(elapsedMs) {
    const maxMs = 60 * 60 * 1000;
    const progress = Math.min(elapsedMs / maxMs, 1);
    const circumference = 283;
    const offset = circumference - (progress * circumference);
    costRing.style.strokeDashoffset = offset;
  }

  // ---- Bottom progress bar ----
  function updateProgressBar(elapsedMs) {
    const maxMs = 60 * 60 * 1000;
    const pct = Math.min((elapsedMs / maxMs) * 100, 100);
    progressBar.style.width = pct + '%';
  }

  // ---- Sparkle burst on dollar milestones ----
  function spawnSparkles() {
    const container = costDisplay;
    const rect = container.getBoundingClientRect();
    for (let i = 0; i < 8; i++) {
      const sparkle = document.createElement('div');
      sparkle.className = 'sparkle';
      const angle = (i / 8) * Math.PI * 2;
      const distance = 30 + Math.random() * 25;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      sparkle.style.cssText = `
        position: absolute;
        left: 50%; top: 50%;
        margin-left: ${x}px; margin-top: ${y}px;
        width: ${3 + Math.random() * 3}px;
        height: ${3 + Math.random() * 3}px;
        animation-delay: ${Math.random() * 0.15}s;
        animation-duration: ${0.5 + Math.random() * 0.3}s;
      `;
      container.appendChild(sparkle);
      setTimeout(() => sparkle.remove(), 900);
    }
  }

  // ---- Milestone pop + sparkles ----
  function checkMilestone(cost) {
    const dollarMark = Math.floor(cost);
    const milestones = [1, 5, 10, 25, 50, 100, 200, 500, 1000];
    for (const m of milestones) {
      if (dollarMark >= m && lastDollarMilestone < m) {
        lastDollarMilestone = m;
        const amountEl = costDisplay.querySelector('.cost-amount');
        amountEl.classList.remove('milestone-pop');
        void amountEl.offsetWidth;
        amountEl.classList.add('milestone-pop');
        spawnSparkles();
        setTimeout(() => amountEl.classList.remove('milestone-pop'), 600);
        break;
      }
    }
  }

  // ---- Ambient glow activation ----
  function setAmbient(active) {
    document.querySelector('.container').classList.toggle('ambient-active', active);
  }

  // ---- Onboarding ----
  const onboarding = document.getElementById('onboarding');
  const onboardGeminiInput = document.getElementById('onboard-gemini-input');
  const onboardOpenrouterInput = document.getElementById('onboard-openrouter-input');
  const onboardSaveBtn = document.getElementById('onboard-save-btn');

  function showOnboarding() {
    onboarding.classList.remove('hidden');
    mainContent.classList.add('hidden');
  }
  function hideOnboarding() { onboarding.classList.add('hidden'); }

  document.getElementById('onboard-toggle-gemini').addEventListener('click', () => {
    onboardGeminiInput.type = onboardGeminiInput.type === 'password' ? 'text' : 'password';
  });
  document.getElementById('onboard-toggle-openrouter').addEventListener('click', () => {
    onboardOpenrouterInput.type = onboardOpenrouterInput.type === 'password' ? 'text' : 'password';
  });

  onboardSaveBtn.addEventListener('click', () => {
    const gk = onboardGeminiInput.value.trim(), ok = onboardOpenrouterInput.value.trim();
    if (!gk && !ok) {
      onboardSaveBtn.textContent = '⚠️ Enter at least one key';
      setTimeout(() => { onboardSaveBtn.textContent = 'Get Started →'; }, 2000);
      return;
    }
    const updates = {};
    if (gk) updates.gemini_api_key = gk;
    if (ok) updates.openrouter_api_key = ok;
    chrome.storage.local.set(updates, () => { hideOnboarding(); initApp(); });
  });

  // ---- Init ----
  function initApp() {
    mainContent.classList.remove('hidden');
    updateStats();
    chrome.storage.local.get(['mcc_running', 'mcc_start_time', 'mcc_elapsed', 'mcc_people', 'mcc_salary', 'mcc_floating'], (data) => {
      if (data.mcc_people) peopleInput.value = data.mcc_people;
      if (data.mcc_salary) salaryInput.value = data.mcc_salary;
      if (data.mcc_floating) floatingToggle.checked = !!data.mcc_floating;

      pausedElapsed = data.mcc_elapsed || 0;

      if (data.mcc_running) {
        running = true;
        startTimestamp = data.mcc_start_time || Date.now();
        startBtn.textContent = '⏸ Pause';
        startBtn.classList.add('running');
        mainContent.classList.add('clock-running');
        setAmbient(true);
        updateStats();
        rafId = requestAnimationFrame(tick);
      } else {
        running = false;
        if (pausedElapsed > 0) {
          updateDisplay(pausedElapsed);
          startBtn.textContent = '▶ Resume';
        } else {
          updateDisplay(0);
          startBtn.textContent = '▶ Start Clock';
        }
      }
    });
  }

  chrome.storage.local.get(['gemini_api_key', 'openrouter_api_key'], (keys) => {
    if (!keys.gemini_api_key && !keys.openrouter_api_key) showOnboarding();
    else initApp();
  });

  // ---- Cost calculation ----
  function getCostPerMs() {
    const people = parseInt(peopleInput.value) || 1;
    const annualSalary = parseFloat(salaryInput.value) || 100000;
    const workingHoursPerYear = 2080;
    const costPerHour = (annualSalary / workingHoursPerYear) * people;
    return costPerHour / 3600000;
  }

  function updateStats() {
    const costPerMs = getCostPerMs();
    const perMin = costPerMs * 60000;
    const perHour = costPerMs * 3600000;
    statRate.textContent = `$${perMin.toFixed(2)}`;
    statHourly.textContent = `$${Math.round(perHour).toLocaleString()}`;
  }

  function updateDisplay(elapsedMs, snapCost = true) {
    const totalCost = elapsedMs * getCostPerMs();

    if (snapCost) {
      displayCost = totalCost;
      renderCost(totalCost);
    }

    updateCostTier(totalCost);
    updateRing(elapsedMs);
    updateProgressBar(elapsedMs);
    checkMilestone(totalCost);

    const totalSec = Math.floor(elapsedMs / 1000);
    const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    const timeStr = `${h}:${m}:${s}`;
    const dot = elapsedTime.querySelector('.live-dot');
    elapsedTime.textContent = timeStr;
    if (dot) elapsedTime.prepend(dot);

    const minutesElapsed = Math.floor(elapsedMs / 60000);
    if (minutesElapsed !== lastMinute) {
      lastMinute = minutesElapsed;
      elapsedTime.classList.add('minute-tick');
      setTimeout(() => elapsedTime.classList.remove('minute-tick'), 600);
    }

    const nextMilestone = insightMinutes.find(m => m <= minutesElapsed);
    if (nextMilestone && !insightGenerated) {
      insightGenerated = true;
      generateInsight(totalCost, minutesElapsed);
    }
  }

  // ---- Timer loop ----
  function tick() {
    if (!running) return;
    const elapsedMs = pausedElapsed + (Date.now() - startTimestamp);
    const realCost = elapsedMs * getCostPerMs();
    displayCost += (realCost - displayCost) * 0.08;
    renderCost(displayCost);
    updateDisplay(elapsedMs, false);
    rafId = requestAnimationFrame(tick);
  }

  // ---- Start / Pause ----
  startBtn.addEventListener('click', () => {
    if (!running) {
      running = true;
      startTimestamp = Date.now();
      insightGenerated = false;
      lastMinute = -1;
      startBtn.textContent = '⏸ Pause';
      startBtn.classList.add('running');
      mainContent.classList.add('clock-running');
      setAmbient(true);
      updateStats();

      // Save to local storage
      chrome.storage.local.set({
        mcc_running: true,
        mcc_start_time: startTimestamp,
        mcc_elapsed: pausedElapsed,
        mcc_people: peopleInput.value,
        mcc_salary: salaryInput.value
      });

      // Notify floating widget
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'syncFloatingWidget' }, (res) => {
            if (chrome.runtime.lastError) { /* Silent discard on restricted pages */ }
          });
        }
      });

      rafId = requestAnimationFrame(tick);
    } else {
      running = false;
      pausedElapsed += Date.now() - startTimestamp;
      cancelAnimationFrame(rafId);
      startBtn.textContent = '▶ Resume';
      startBtn.classList.remove('running');
      mainContent.classList.remove('clock-running');
      setAmbient(false);

      // Save to local storage
      chrome.storage.local.set({
        mcc_running: false,
        mcc_elapsed: pausedElapsed,
        mcc_people: peopleInput.value,
        mcc_salary: salaryInput.value
      });

      // Notify floating widget
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'syncFloatingWidget' }, (res) => {
            if (chrome.runtime.lastError) { /* Silent discard on restricted pages */ }
          });
        }
      });
    }
  });

  resetBtn.addEventListener('click', () => {
    running = false;
    cancelAnimationFrame(rafId);
    pausedElapsed = 0;
    displayCost = 0;
    insightGenerated = false;
    lastMinute = -1;
    lastDollarMilestone = -1;
    prevDollarsStr = '';
    startTimestamp = null;
    startBtn.textContent = '▶ Start Clock';
    startBtn.classList.remove('running');
    mainContent.classList.remove('clock-running');
    setAmbient(false);
    renderCost(0);
    const dot = elapsedTime.querySelector('.live-dot');
    elapsedTime.textContent = '00:00:00';
    if (dot) elapsedTime.prepend(dot);
    insightArea.innerHTML = '';
    costRing.style.strokeDashoffset = 283;
    progressBar.style.width = '0%';
    costDisplay.classList.remove('cost-tier-low', 'cost-tier-mid', 'cost-tier-high');

    // Clear relevant keys in local storage
    chrome.storage.local.remove(['mcc_running', 'mcc_start_time', 'mcc_elapsed']);

    // Notify floating widget
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'syncFloatingWidget' }, (res) => {
          if (chrome.runtime.lastError) { /* Silent discard on restricted pages */ }
        });
      }
    });

    updateStats();
  });

  peopleInput.addEventListener('input', () => {
    updateStats();
    chrome.storage.local.set({ mcc_people: peopleInput.value });
    // Notify floating widget
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'syncFloatingWidget' }, (res) => {
          if (chrome.runtime.lastError) { /* Silent discard on restricted pages */ }
        });
      }
    });
  });

  salaryInput.addEventListener('input', () => {
    updateStats();
    chrome.storage.local.set({ mcc_salary: salaryInput.value });
    // Notify floating widget
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'syncFloatingWidget' }, (res) => {
          if (chrome.runtime.lastError) { /* Silent discard on restricted pages */ }
        });
      }
    });
  });

  floatingToggle.addEventListener('change', () => {
    const val = floatingToggle.checked;
    console.log("[MCC Popup] Checkbox toggled. Checked =", val);
    chrome.storage.local.set({ mcc_floating: val }, () => {
      console.log("[MCC Popup] mcc_floating saved to storage.");
      // Broadcast floating change to active tab content script
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        console.log("[MCC Popup] Active tabs query result:", tabs);
        if (tabs[0]) {
          console.log("[MCC Popup] Sending toggle message to tab:", tabs[0].id);
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'toggleFloatingWidget',
            floating: val
          }, (res) => {
            if (chrome.runtime.lastError) {
              console.log("[MCC Popup] Message send error (page might be restricted or unrefreshed):", chrome.runtime.lastError.message);
            } else {
              console.log("[MCC Popup] Content script response:", res);
            }
          });
        } else {
          console.log("[MCC Popup] No active tab found to message.");
        }
      });
    });
  });

  // ---- Gemini insight ----
  function generateInsight(totalCost, minutes) {
    insightArea.innerHTML = `<div class="insight-card"><div class="insight-label">Gemini Insight</div><span class="insight-loading">Generating insight...</span></div>`;

    const people = parseInt(peopleInput.value) || 1;
    const salary = parseFloat(salaryInput.value) || 100000;

    const prompt = `A meeting just hit ${minutes} minutes with ${people} people (avg salary $${salary.toLocaleString()}/yr). Total cost so far: $${totalCost.toFixed(2)}.

Write ONE punchy, slightly sardonic insight about this in 1-2 sentences. Make it specific to the cost and time. Give concrete context (e.g., what $${totalCost.toFixed(0)} could buy). Be direct and memorable. No emojis. No "well" or "so" openers.`;

    chrome.runtime.sendMessage(
      {
        action: 'callGeminiBackground',
        prompt,
        options: { temperature: 0.7, maxTokens: 100 },
      },
      (response) => {
        if (response?.success) {
          insightArea.innerHTML = `<div class="insight-card"><div class="insight-label">Gemini Insight</div>${escapeHtml(response.data.trim())}</div>`;
        } else {
          insightArea.innerHTML = '';
        }
      }
    );
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ---- Settings panel ----
  function openSettings() {
    settingsPanel.classList.remove('hidden', 'settings-slide-in');
    void settingsPanel.offsetWidth;
    settingsPanel.classList.add('settings-slide-in');
    chrome.storage.local.get(['gemini_api_key', 'openrouter_api_key'], (data) => {
      geminiKeyInput.value = data.gemini_api_key || '';
      openrouterKeyInput.value = data.openrouter_api_key || '';
    });
  }
  function closeSettings() {
    settingsPanel.classList.add('hidden');
    settingsPanel.classList.remove('settings-slide-in');
  }

  settingsBtn.addEventListener('click', openSettings);
  settingsClose.addEventListener('click', closeSettings);
  toggleGeminiKey.addEventListener('click', () => { geminiKeyInput.type = geminiKeyInput.type === 'password' ? 'text' : 'password'; });
  toggleOpenrouterKey.addEventListener('click', () => { openrouterKeyInput.type = openrouterKeyInput.type === 'password' ? 'text' : 'password'; });

  saveKeysBtn.addEventListener('click', () => {
    const updates = {};
    const gk = geminiKeyInput.value.trim(), ok = openrouterKeyInput.value.trim();
    if (gk) updates.gemini_api_key = gk;
    if (ok) updates.openrouter_api_key = ok;
    if (!Object.keys(updates).length) return;
    chrome.storage.local.set(updates, () => {
      saveKeysBtn.textContent = '✅ Saved';
      setTimeout(() => { saveKeysBtn.textContent = 'Save Keys'; }, 1500);
    });
  });

  clearKeysBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['gemini_api_key', 'openrouter_api_key'], () => {
      geminiKeyInput.value = '';
      openrouterKeyInput.value = '';
      clearKeysBtn.textContent = '✅ Cleared';
      setTimeout(() => { clearKeysBtn.textContent = 'Clear All Keys'; }, 1500);
    });
  });
});
