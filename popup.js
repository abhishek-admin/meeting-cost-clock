// ============================================
// POPUP.JS — Meeting Cost Clock
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

  let running = false;
  let startTimestamp = null;
  let pausedElapsed = 0;
  let rafId = null;
  let insightGenerated = false;
  let insightMinutes = [2, 5, 15, 30, 60]; // minutes at which to show Gemini insights

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
    if (!gk && !ok) { onboardSaveBtn.textContent = '⚠️ Enter at least one key'; setTimeout(() => { onboardSaveBtn.textContent = 'Get Started →'; }, 2000); return; }
    const updates = {};
    if (gk) updates.gemini_api_key = gk;
    if (ok) updates.openrouter_api_key = ok;
    chrome.storage.local.set(updates, () => { hideOnboarding(); initApp(); });
  });

  // ---- Init ----
  function initApp() {
    mainContent.classList.remove('hidden');
    chrome.storage.session.get(['mcc_elapsed', 'mcc_people', 'mcc_salary'], (data) => {
      if (data.mcc_elapsed) {
        pausedElapsed = data.mcc_elapsed;
        if (data.mcc_people) peopleInput.value = data.mcc_people;
        if (data.mcc_salary) salaryInput.value = data.mcc_salary;
        updateDisplay(pausedElapsed);
        updateStats();
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
    return costPerHour / 3600000; // per millisecond
  }

  function updateStats() {
    const costPerMs = getCostPerMs();
    const perMin = costPerMs * 60000;
    const perHour = costPerMs * 3600000;
    statRate.textContent = `$${perMin.toFixed(2)}`;
    statHourly.textContent = `$${Math.round(perHour).toLocaleString()}`;
  }

  function updateDisplay(elapsedMs) {
    const totalCost = elapsedMs * getCostPerMs();
    const dollars = Math.floor(totalCost);
    const cents = Math.floor((totalCost - dollars) * 100);
    costDollars.textContent = dollars.toLocaleString();
    costCents.textContent = cents.toString().padStart(2, '0');

    const totalSec = Math.floor(elapsedMs / 1000);
    const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    elapsedTime.textContent = `${h}:${m}:${s}`;

    // Trigger Gemini insight at milestone minutes
    const minutesElapsed = Math.floor(elapsedMs / 60000);
    const nextMilestone = insightMinutes.find(m => m <= minutesElapsed);
    if (nextMilestone && !insightGenerated) {
      insightGenerated = true;
      generateInsight(totalCost, minutesElapsed);
    }
  }

  // ---- Timer loop using performance.now() ----
  function tick() {
    if (!running) return;
    const elapsedMs = pausedElapsed + (performance.now() - startTimestamp);
    updateDisplay(elapsedMs);
    rafId = requestAnimationFrame(tick);
  }

  // ---- Start / Pause ----
  startBtn.addEventListener('click', () => {
    if (!running) {
      running = true;
      startTimestamp = performance.now();
      insightGenerated = false;
      startBtn.textContent = '⏸ Pause';
      startBtn.style.background = 'rgba(20,184,166,0.2)';
      startBtn.style.color = '#14b8a6';
      startBtn.style.border = '1px solid rgba(20,184,166,0.3)';
      updateStats();
      rafId = requestAnimationFrame(tick);
    } else {
      running = false;
      pausedElapsed += performance.now() - startTimestamp;
      cancelAnimationFrame(rafId);
      startBtn.textContent = '▶ Resume';
      chrome.storage.session.set({
        mcc_elapsed: pausedElapsed,
        mcc_people: peopleInput.value,
        mcc_salary: salaryInput.value,
      });
    }
  });

  resetBtn.addEventListener('click', () => {
    running = false;
    cancelAnimationFrame(rafId);
    pausedElapsed = 0;
    insightGenerated = false;
    startTimestamp = null;
    costDollars.textContent = '0';
    costCents.textContent = '00';
    elapsedTime.textContent = '00:00:00';
    startBtn.textContent = '▶ Start Clock';
    startBtn.style.cssText = '';
    insightArea.innerHTML = '';
    chrome.storage.session.clear();
    updateStats();
  });

  // Update stats when inputs change
  peopleInput.addEventListener('input', updateStats);
  salaryInput.addEventListener('input', updateStats);

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
    settingsPanel.classList.remove('hidden'); settingsPanel.classList.add('fade-in');
    chrome.storage.local.get(['gemini_api_key', 'openrouter_api_key'], (data) => {
      geminiKeyInput.value = data.gemini_api_key || '';
      openrouterKeyInput.value = data.openrouter_api_key || '';
    });
  }
  function closeSettings() { settingsPanel.classList.add('hidden'); settingsPanel.classList.remove('fade-in'); }

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
    chrome.storage.local.set(updates, () => { saveKeysBtn.textContent = '✅ Saved'; setTimeout(() => { saveKeysBtn.textContent = 'Save Keys'; }, 1500); });
  });

  clearKeysBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['gemini_api_key', 'openrouter_api_key'], () => {
      geminiKeyInput.value = ''; openrouterKeyInput.value = '';
      clearKeysBtn.textContent = '✅ Cleared'; setTimeout(() => { clearKeysBtn.textContent = 'Clear All Keys'; }, 1500);
    });
  });
});
