const inputField = document.getElementById('user-input');
const sendBtn = document.getElementById('send-button');
const messagesContainer = document.getElementById('messages');
let conversationHistory = [];

const createMessageElement = (text, sender) => {
    const messageDiv = document.createElement('div');
    if (sender === 'user') {
        messageDiv.className = 'max-w-[70%] self-start bg-blue-200 p-3 rounded-lg mb-2';
        messageDiv.textContent = `${text}`;
    } else {
        messageDiv.className = 'max-w-[70%] self-end bg-gray-200 p-3 rounded-lg mb-2';
        messageDiv.textContent = `${text}`;
    }
    return messageDiv;
}

const sendMessage = async () => {
    const userInput  = inputField.value.trim();
    inputField.value = '';

    if (userInput === '') {
        alert('Please enter a message');
        return;
    }

    const userMessageElement = createMessageElement(userInput, 'user');
    messagesContainer.appendChild(userMessageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;


    const payload = conversationHistory.length === 0 
    ? { input: userInput, participantID } 
    : { history: conversationHistory, input: userInput, participantID };

    const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload) // pass payload instead of only user input
    });


    const data = await response.json();
    console.log(`data after response ${data}`);

    // add user input and bot response to the conversation history
    conversationHistory.push({ role: 'user', content: userInput });
    conversationHistory.push({ role: 'assistant', content: data.message});

    const botMessageElement = createMessageElement(data.message, 'bot');
    messagesContainer.appendChild(botMessageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
            const userMessageDiv = createMessageElement(interaction.userInput, 'user');
            messagesContainer.appendChild(userMessageDiv);

            // Append bot response
            const botMessageDiv = createMessageElement(interaction.botResponse, 'bot');
            messagesContainer.appendChild(botMessageDiv);

            // Add to conversation history
            conversationHistory.push({ role: 'user', content: interaction.userInput });
            conversationHistory.push({ role: 'assistant', content: interaction.botResponse });
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}
  // Load history when agent loads
window.onload = loadConversationHistory;