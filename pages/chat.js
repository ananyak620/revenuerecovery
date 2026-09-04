/* ============================================
   ReviveAI — AI Copilot Chat Page
   ============================================ */

const ChatPage = (() => {
  let messages = [
    {
      role: 'ai',
      text: 'Hello! I am your ReviveAI Revenue Copilot. I continuously monitor your churn risk, failed payment telemetry, and revenue recovery performance.\n\nHow can I help you optimize revenue today?'
    }
  ];

  function formatMarkdown(text) {
    if (!text) return '';
    return text
      // Bold **text**
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Bullet points
      .replace(/^[•\*\-] (.*$)/gim, '<div style="margin: 4px 0 4px 12px; display: flex; align-items: flex-start; gap: 8px;"><span style="color: #38bdf8; font-weight: bold;">•</span><span>$1</span></div>')
      // Numbered lists
      .replace(/^(\d+)\. (.*$)/gim, '<div style="margin: 4px 0 4px 12px; display: flex; align-items: flex-start; gap: 8px;"><strong style="color: #38bdf8;">$1.</strong><span>$2</span></div>')
      // Paragraph breaks
      .replace(/\n\n/g, '<div style="height: 10px;"></div>')
      .replace(/\n/g, '<br>');
  }

  function render() {
    const suggestions = AIService.getSuggestions();

    const suggestionsHtml = suggestions.map(s => `
      <div class="chat-suggestion" onclick="ChatPage.sendSuggested('${s.replace(/'/g, "\\'")}')">${s}</div>
    `).join('');

    const messagesHtml = messages.map(m => `
      <div class="chat-message ${m.role}">
        <div class="chat-avatar">${m.role === 'ai' ? '⚡' : '👤'}</div>
        <div class="chat-bubble">${formatMarkdown(m.text)}</div>
      </div>
    `).join('');

    return `
      <div class="page-container" style="max-width: 1100px; margin: 0 auto;">
        <div class="page-header" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
          <div>
            <h1>AI Revenue Copilot</h1>
            <p>Ask questions about your telemetry, churn risks, smart retries, and recovery strategy.</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="ChatPage.clear()" style="display: flex; align-items: center; gap: 6px;">
            <span>🔄 Clear Chat</span>
          </button>
        </div>

        <div class="chat-container">
          <div class="chat-messages" id="chatMessages">
            ${messagesHtml}
          </div>

          <div class="chat-suggestions">
            ${suggestionsHtml}
          </div>

          <div class="chat-input-area">
            <input type="text" class="chat-input" id="chatInput" placeholder="Ask about retry rates, recovery strategies, or churn predictions..." onkeydown="if(event.key==='Enter') ChatPage.send()">
            <button class="chat-send-btn" onclick="ChatPage.send()" title="Send Message">➤</button>
          </div>
        </div>
      </div>
    `;
  }

  function init() {
    const box = document.getElementById('chatMessages');
    if (box) box.scrollTop = box.scrollHeight;
  }

  function sendSuggested(text) {
    const input = document.getElementById('chatInput');
    if (input) input.value = text;
    send();
  }

  function clear() {
    messages = [
      {
        role: 'ai',
        text: 'Hello! I am your ReviveAI Revenue Copilot. I continuously monitor your churn risk, failed payment telemetry, and revenue recovery performance.\n\nHow can I help you optimize revenue today?'
      }
    ];
    App.render();
  }

  async function send() {
    const input = document.getElementById('chatInput');
    if (!input || !input.value.trim()) return;

    const query = input.value.trim();
    input.value = '';

    messages.push({ role: 'user', text: query });
    App.render();

    const tempAiMsg = { role: 'ai', text: 'Analyzing your revenue telemetry...' };
    messages.push(tempAiMsg);
    App.render();

    await AIService.streamResponse(
      query,
      (partialText) => {
        tempAiMsg.text = partialText;
        const box = document.getElementById('chatMessages');
        if (box) {
          const lastBubble = box.querySelector('.chat-message.ai:last-child .chat-bubble');
          if (lastBubble) lastBubble.innerHTML = formatMarkdown(partialText);
          box.scrollTop = box.scrollHeight;
        }
      },
      (finalResponse) => {
        tempAiMsg.text = finalResponse.text;
        App.render();
      }
    );
  }

  return { render, init, send, sendSuggested, clear };
})();
