// ============================================
// CONTENT.JS TEMPLATE
// Injected into web pages.
// Handles: extracting page content, injecting UI.
// Modify per project.
// ============================================
console.log("[MCC Content Script] Loaded successfully on " + window.location.href);

// --- Extract Page Content ---
function extractPageContent() {
  // Get main text content (strips nav, footer, ads as much as possible)
  const article = document.querySelector('article') || document.querySelector('main') || document.body;

  // Clean extraction
  const clone = article.cloneNode(true);

  // Remove scripts, styles, nav, footer, aside
  const remove = clone.querySelectorAll('script, style, nav, footer, aside, header, iframe, .ad, [role="navigation"]');
  remove.forEach((el) => el.remove());

  const text = clone.innerText
    .replace(/\n{3,}/g, '\n\n')  // Collapse multiple newlines
    .trim()
    .slice(0, 15000);  // Gemini context limit safety (1.5 Flash handles 1M tokens but keep prompts focused)

  return {
    title: document.title,
    url: window.location.href,
    text: text,
    metaDescription: document.querySelector('meta[name="description"]')?.content || '',
  };
}

// --- Inject Sidebar UI ---
function injectSidebar(content) {
  // Remove existing sidebar if present
  const existing = document.getElementById('gemini-sidebar');
  if (existing) existing.remove();

  const sidebar = document.createElement('div');
  sidebar.id = 'gemini-sidebar';
  sidebar.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      right: 0;
      width: 360px;
      height: 100vh;
      background: #0a0a0f;
      color: #e0e0e8;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      z-index: 999999;
      box-shadow: -4px 0 24px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    ">
      <div style="
        padding: 14px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255,255,255,0.06);
      ">
        <span style="font-size: 14px; font-weight: 600;">✦ Gemini Analysis</span>
        <button id="gemini-sidebar-close" style="
          background: none;
          border: none;
          color: #8888a0;
          font-size: 18px;
          cursor: pointer;
          padding: 4px 8px;
        ">✕</button>
      </div>
      <div id="gemini-sidebar-content" style="
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        font-size: 13px;
        line-height: 1.6;
        white-space: pre-wrap;
      ">${content}</div>
      <div style="
        padding: 10px 16px;
        border-top: 1px solid rgba(255,255,255,0.06);
        font-size: 10px;
        color: #555568;
        text-align: center;
      ">Built by @happy_ships · Powered by Gemini</div>
    </div>
  `;

  document.body.appendChild(sidebar);

  // Close button
  document.getElementById('gemini-sidebar-close').addEventListener('click', () => {
    sidebar.remove();
  });

  // ESC key closes
  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') {
      sidebar.remove();
      document.removeEventListener('keydown', handler);
    }
  });
}

// --- Message Listener ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[MCC Content Script] Received message:", message);
  if (message.action === 'extractContent') {
    const content = extractPageContent();
    sendResponse(content);
  }

  if (message.action === 'showSidebar') {
    injectSidebar(message.content);
    sendResponse({ success: true });
  }

  if (message.action === 'geminiAction') {
    // Context menu triggered — extract content and show loading sidebar
    injectSidebar('<div style="text-align:center;color:#6c8aff;padding-top:40px;"><div style="width:24px;height:24px;border:2px solid rgba(108,138,255,0.15);border-top-color:#6c8aff;border-radius:50%;animation:spin 0.7s linear infinite;margin:0 auto;"></div><p style="margin-top:12px;font-size:12px;">Thinking with Gemini...</p></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>');

    // Get content and call Gemini
    const pageContent = extractPageContent();
    const selectedText = message.selectedText;

    const prompt = selectedText
      ? `Analyze this selected text from the page "${pageContent.title}":\n\n"${selectedText}"\n\nProvide a clear, concise analysis.`
      : `Analyze this webpage:\n\nTitle: ${pageContent.title}\nURL: ${pageContent.url}\n\nContent:\n${pageContent.text.slice(0, 8000)}\n\nProvide: 1) Summary 2) Key Points 3) Notable claims or data`;

    // Send to background for Gemini call
    chrome.runtime.sendMessage(
      { action: 'callGeminiBackground', prompt, options: { temperature: 0.5 } },
      (response) => {
        if (response?.success) {
          const sidebarContent = document.getElementById('gemini-sidebar-content');
          if (sidebarContent) {
            sidebarContent.textContent = response.data;
          }
        } else {
          const sidebarContent = document.getElementById('gemini-sidebar-content');
          if (sidebarContent) {
            sidebarContent.innerHTML = `<p style="color:#ff6b6b;">Error: ${response?.error || 'Unknown error'}</p>`;
          }
        }
      }
    );
  }
  if (message.action === 'toggleFloatingWidget') {
    renderFloatingWidget(message.floating);
    sendResponse({ success: true });
  }

  if (message.action === 'syncFloatingWidget') {
    chrome.storage.local.get(['mcc_floating'], (data) => {
      if (data.mcc_floating) {
        renderFloatingWidget(true);
      }
    });
    sendResponse({ success: true });
  }
});

// --- Floating Widget Overlay ---
let mccWidgetInterval = null;

function renderFloatingWidget(show) {
  console.log("[MCC Content Script] renderFloatingWidget called. show =", show);
  const existing = document.getElementById('mcc-floating-widget');
  if (existing) existing.remove();
  const stylesExisting = document.getElementById('mcc-widget-styles');
  if (stylesExisting) stylesExisting.remove();

  if (mccWidgetInterval) {
    clearInterval(mccWidgetInterval);
    mccWidgetInterval = null;
  }

  if (!show) return;

  const widget = document.createElement('div');
  widget.id = 'mcc-floating-widget';

  widget.innerHTML = `
    <span class="mcc-label">Meeting Cost:</span>
    <span id="mcc-widget-cost" class="mcc-cost">$0.00</span>
    <span id="mcc-widget-time" class="mcc-time">(00:00:00)</span>
    <span id="mcc-widget-dot" class="mcc-dot"></span>
  `;

  // Drag and drop support
  let isDragging = false;
  let offsetX = 0, offsetY = 0;
  widget.addEventListener('mousedown', (e) => {
    isDragging = true;
    widget.style.cursor = 'grabbing';
    offsetX = e.clientX - widget.getBoundingClientRect().left;
    offsetY = e.clientY - widget.getBoundingClientRect().top;
  });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    widget.style.left = `${x}px`;
    widget.style.top = `${y}px`;
    widget.style.bottom = 'auto';
    widget.style.right = 'auto';
  });
  document.addEventListener('mouseup', () => {
    isDragging = false;
    widget.style.cursor = 'grab';
  });

  if (document.body) {
    document.body.appendChild(widget);
  } else {
    document.documentElement.appendChild(widget);
  }

  function tickWidget() {
    // Self-healing: Check if extension context was invalidated
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
      if (mccWidgetInterval) {
        clearInterval(mccWidgetInterval);
        mccWidgetInterval = null;
      }
      return;
    }

    try {
      chrome.storage.local.get(['mcc_running', 'mcc_start_time', 'mcc_elapsed', 'mcc_people', 'mcc_salary'], (data) => {
        if (chrome.runtime.lastError) {
          // Context might have been invalidated during async fetch
          if (mccWidgetInterval) {
            clearInterval(mccWidgetInterval);
            mccWidgetInterval = null;
          }
          return;
        }

        const running = !!data.mcc_running;
        const startTimestamp = data.mcc_start_time || Date.now();
        const pausedElapsed = data.mcc_elapsed || 0;
        const people = parseInt(data.mcc_people) || 1;
        const salary = parseFloat(data.mcc_salary) || 100000;

        const elapsedMs = pausedElapsed + (running ? (Date.now() - startTimestamp) : 0);

        // Cost calculation
        const workingHoursPerYear = 2080;
        const costPerHour = (salary / workingHoursPerYear) * people;
        const costPerMs = costPerHour / 3600000;
        const totalCost = elapsedMs * costPerMs;

        // Update text
        const costEl = document.getElementById('mcc-widget-cost');
        const timeEl = document.getElementById('mcc-widget-time');
        const dotEl = document.getElementById('mcc-widget-dot');

        if (costEl) costEl.textContent = `$${totalCost.toFixed(2)}`;
        
        const totalSec = Math.floor(elapsedMs / 1000);
        const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
        const s = (totalSec % 60).toString().padStart(2, '0');
        if (timeEl) timeEl.textContent = `(${h}:${m}:${s})`;

        if (dotEl) {
          dotEl.style.display = running ? 'inline-block' : 'none';
        }
      });
    } catch (e) {
      if (mccWidgetInterval) {
        clearInterval(mccWidgetInterval);
        mccWidgetInterval = null;
      }
    }
  }

  tickWidget();
  mccWidgetInterval = setInterval(tickWidget, 500);
}

// Automatically check on load
console.log("[MCC Content Script] Checking initial storage values on page load...");
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
  try {
    chrome.storage.local.get(['mcc_floating'], (data) => {
      if (chrome.runtime?.lastError) return;
      console.log("[MCC Content Script] Initial storage data.mcc_floating =", data.mcc_floating);
      if (data.mcc_floating) {
        renderFloatingWidget(true);
      }
    });
  } catch (e) {
    // Ignore invalidation
  }
}

// Listen for storage changes to sync state instantly across all tabs
chrome.storage.onChanged.addListener((changes, namespace) => {
  // Self-healing check
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) return;

  console.log("[MCC Content Script] Storage onChanged fired. changes =", changes, "namespace =", namespace);
  if (namespace !== 'local') return;

  if (changes.mcc_floating) {
    renderFloatingWidget(changes.mcc_floating.newValue);
  } else {
    // If the widget is active, trigger an immediate re-render on run-state changes to keep in perfect sync
    try {
      chrome.storage.local.get(['mcc_floating'], (data) => {
        if (chrome.runtime?.lastError) return;
        if (data.mcc_floating && document.getElementById('mcc-floating-widget')) {
          renderFloatingWidget(true);
        }
      });
    } catch (e) {
      // Ignore invalidation
    }
  }
});
