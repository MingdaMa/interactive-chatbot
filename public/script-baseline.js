const inputField = document.getElementById('user-input');
const sendBtn = document.getElementById('send-button');
const messagesContainer = document.getElementById('messages');
let conversationHistory = [];

const sendMessage = async () => {
  const userInput  = inputField.value.trim();

  if (userInput === '') {
    alert('Please enter a message');
  } else {
      messagesContainer.innerHTML += '<div class="message"> User: ' + userInput + '</div>';
  }

  

  const payload = conversationHistory.length === 0 
  ? { input: userInput, participantID } 
  : { history: conversationHistory, input: userInput, participantID };

  const response = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload) // pass payload instead of only user input
  });

  const data = await response.json();

  // add user input and bot response to the conversation history
  conversationHistory.push({ role: 'user', content: userInput });
  conversationHistory.push({ role: 'assistant', content: data.botResponse});

  if (data.searchResults && data.searchResults.length > 0) {
    const searchResultsDiv = document.createElement('div');
    data.searchResults.forEach(result => {
      const resultDiv = document.createElement('div');
      resultDiv.innerHTML = `<a href="${result.url}"
      target="_blank">${result.title}</a><p>${result.snippet}</p>`;
      searchResultsDiv.appendChild(resultDiv);
    });
    document.getElementById('messages').appendChild(searchResultsDiv); 
  }

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

function logEvent(type, element) {
  fetch('/log-event', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ eventType: type, elementName: element, timestamp: new Date(), participantID: participantID })
  });
}


sendBtn.addEventListener('click', () => {
  logEvent('click', 'Send Button');});

inputField.addEventListener('mouseover', () => {
  logEvent('hover', 'User Input');
});

inputField.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    logEvent('enter', 'User Input');
  }
});

inputField.addEventListener('focus', () => {
  logEvent('focus', 'User Input');
});

const participantID = localStorage.getItem('participantID');
if (!participantID) {
  alert('Please enter a participant ID.');
  window.location.href = '/';
}

// Function to fetch and load existing conversation history
async function loadConversationHistory() {
  const response = await fetch('/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantID }) // Send participantID to the server
  });
  const data = await response.json();


  if (data.interactions && data.interactions.length > 0) {
    data.interactions.forEach(interaction => {
      const userMessageDiv = document.createElement('div');
      userMessageDiv.textContent = `You: ${interaction.userInput}`;
      document.getElementById('messages').appendChild(userMessageDiv);
      const botMessageDiv = document.createElement('div');
      botMessageDiv.textContent = `Bot: ${interaction.botResponse}`;
      document.getElementById('messages').appendChild(botMessageDiv);
    // Add to conversation history
      conversationHistory.push({ role: 'user', content: interaction.userInput });
      conversationHistory.push({ role: 'assistant', content: interaction.botResponse });
    });
  }
}
  // Load history when agent loads
  window.onload = loadConversationHistory;