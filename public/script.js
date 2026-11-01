const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

// riwayat percakapan, dikirim utuh tiap request
const conversation = [];

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  appendMessage('user', userMessage);
  conversation.push({ role: 'user', text: userMessage });
  input.value = '';

  // pesan sementara
  const botEl = appendMessage('bot', 'Gemini is thinking...');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.error || response.statusText);
    }

    const data = await response.json();

    if (data && data.result) {
      botEl.textContent = data.result;
      conversation.push({ role: 'model', text: data.result });
    } else {
      botEl.textContent = 'Sorry, no response received.';
    }
  } catch (error) {
    console.error('Error fetching response:', error);
    botEl.textContent = 'Failed to get response from server.';
  } finally {
    chatBox.scrollTop = chatBox.scrollHeight;
  }
});

function appendMessage(sender, text) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg; // dikembalikan agar bisa diupdate
}