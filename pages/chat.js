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

  function render() {
    const suggestions = AIService.getSuggestions();

    const suggestionsHtml = suggestions.map(s => `
      <div class="chat-suggestion" onclick="ChatPage.sendSuggested('${s.replace(/'/g, "\\'")}')">${s}</div>
    `).join('');

    const messagesHtml = messages.map(m => `
      <div class="chat-message ${m.role}">
        <div class="chat-avatar">${m.role === 'ai' ? '⚡' : '👤'}</div>
        <div class="chat-bubble">${m.text.replace(/\n/g, '<br>')}</div>
      </div>
    `).join('');

    return `
      <div class="page-container">
        <div class="page-header" style="margin-bottom: 20px;">
          <div>
            <h1>AI Revenue Copilot</h1>
            <p>Ask questions about your telemetry, churn risks, dunning tactics, and recovery health.</p>
          </div>
        </div>

        <div class="chat-container">
          <div class="chat-messages" id="chatMessages">
            ${messagesHtml}
          </div>

          <div class="chat-suggestions">
            ${suggestionsHtml}
          </div>

          <div class="chat-input-area">
            <input type="text" class="chat-input" id="chatInput" placeholder="Ask anything about your revenue metrics..." onkeydown="if(event.key==='Enter') ChatPage.send()">
            <button class="chat-send-btn" onclick="ChatPage.send()">➤</button>
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
          if (lastBubble) lastBubble.innerHTML = partialText.replace(/\n/g, '<br>');
          box.scrollTop = box.scrollHeight;
        }
      },
      (finalResponse) => {
        tempAiMsg.text = finalResponse.text;
        App.render();
      }
    );
  }

  return { render, init, send, sendSuggested };
})();
