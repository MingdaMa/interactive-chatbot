// Select DOM elements
const inputField = document.getElementById('user-input');
const sendBtn = document.getElementById('send-button');
const messagesContainer = document.getElementById('messages');
let conversationHistory = [];

// Function to sanitize HTML (basic example, consider using a library like DOMPurify for better security)
function sanitizeHTML(html) {
    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;
}

// Function to create message elements
function createMessageElement(content, sender) {
  const messageDiv = document.createElement('div');
  const isUser = sender === 'user';

  // Container styling
  messageDiv.classList.add('flex', isUser ? 'justify-end' : 'justify-start');

  // Message bubble styling
  const bubble = document.createElement('div');
  
  // Define classes based on the sender
  const bubbleClasses = isUser 
      ? ['bg-blue-500', 'text-white'] 
      : ['bg-gray-200', 'text-gray-800'];
  
  // Add classes individually
  bubble.classList.add(
      'max-w-xs', 
      'p-3', 
      'rounded-lg', 
      'shadow',
      ...bubbleClasses // Spread the array to pass as separate arguments
  );

  // Render markdown to HTML
  const renderedContent = marked.parse(content);
  bubble.innerHTML = renderedContent;

  // Make code blocks scrollable horizontally
  const codeBlocks = bubble.querySelectorAll('pre');
  codeBlocks.forEach(pre => {
      pre.classList.add('overflow-x-auto');
  });

  messageDiv.appendChild(bubble);
  return messageDiv;
}

// Function to send a message
const sendMessage = async () => {
    const userInput = inputField.value.trim();

    if (userInput === '') {
        alert('Please enter a message');
        return;
    }

    // Display user message
    const userMessage = createMessageElement(userInput, 'user');
    messagesContainer.appendChild(userMessage);

    // Scroll to the latest message
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Prepare payload
    const payload = conversationHistory.length === 0 
        ? { input: userInput, participantID } 
        : { history: conversationHistory, input: userInput, participantID };

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        // Add to conversation history
        conversationHistory.push({ role: 'user', content: userInput });
        conversationHistory.push({ role: 'assistant', content: data.botResponse });

        // Display AI message
        const aiMessage = createMessageElement(data.botResponse, 'ai');
        messagesContainer.appendChild(aiMessage);

        // Handle search results if any
        if (data.searchResults && data.searchResults.length > 0) {
            const searchResultsDiv = document.createElement('div');
            searchResultsDiv.classList.add('mt-2', 'space-y-2');
            data.searchResults.forEach(result => {
                const resultDiv = document.createElement('div');
                resultDiv.classList.add('p-2', 'border', 'border-gray-300', 'rounded-md', 'bg-gray-50');
                resultDiv.innerHTML = `
                    <a href="${sanitizeHTML(result.url)}" target="_blank" class="text-blue-600 hover:underline">${sanitizeHTML(result.title)}</a>
                    <p class="text-sm text-gray-600">${sanitizeHTML(result.snippet)}</p>
                `;
                searchResultsDiv.appendChild(resultDiv);
            });
            messagesContainer.appendChild(searchResultsDiv);
        }

        // Scroll to the latest message
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

    } catch (error) {
        console.error('Error:', error);
        alert('There was an error sending your message. Please try again.');
    }

    // Clear input field
    inputField.value = '';
};

// Event listeners for sending messages
sendBtn.addEventListener('click', sendMessage);

inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Event logging functions (unchanged)
function logEvent(type, element) {
    fetch('/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: type, elementName: element, timestamp: new Date(), participantID: participantID })
    });
}

sendBtn.addEventListener('click', () => {
    logEvent('click', 'Send Button');
});

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

// Participant ID handling (unchanged)
const participantID = localStorage.getItem('participantID');
if (!participantID) {
    alert('Please enter a participant ID.');
    window.location.href = '/';
}

// Function to fetch and load existing conversation history
async function loadConversationHistory() {
    try {
        const response = await fetch('/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participantID }) // Send participantID to the server
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        if (data.interactions && data.interactions.length > 0) {
            data.interactions.forEach(interaction => {
                // User message
                const userMessage = createMessageElement(interaction.userInput, 'user');
                messagesContainer.appendChild(userMessage);

                // AI message
                const aiMessage = createMessageElement(interaction.botResponse, 'ai');
                messagesContainer.appendChild(aiMessage);

                // Add to conversation history
                conversationHistory.push({ role: 'user', content: interaction.userInput });
                conversationHistory.push({ role: 'assistant', content: interaction.botResponse });
            });

            // Scroll to the latest message
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    } catch (error) {
        console.error('Error loading conversation history:', error);
    }
}

// Load history when the window loads
window.onload = loadConversationHistory;
