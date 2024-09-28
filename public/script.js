const inputField = document.getElementById('user-input');
const sendBtn = document.getElementById('send-button');
const messagesContainer = document.getElementById('messages');

const sendMessage = async () => {
  let message  = inputField.value.trim();
  if (message === '') {
      alert('Please enter a message');
  } else {
      messagesContainer.innerHTML += '<div class="message"> User: ' + message + '</div>';
  }

  const response = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userMsg: message })
  });

  const data = await response.json();

  console.log(data);

  messagesContainer.innerHTML += '<div class="message"> Bot: ' + data.message + '</div>';

  inputField.value = '';
}

sendBtn.addEventListener('click', async () => {
  sendMessage();
});

inputField.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
});
