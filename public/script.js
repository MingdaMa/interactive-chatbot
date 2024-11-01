const inputField = document.getElementById('user-input');
const sendBtn = document.getElementById('send-button');
const messagesContainer = document.getElementById('messages');
let conversationHistory = [];

const processBotResponse = (response) => {
    const mdSnippetRegex = /<mdsnippet>([\s\S]*?)<\/mdsnippet>/g;
    let lastIndex = 0;
    let result;
    let htmlContent = '';

    while ((result = mdSnippetRegex.exec(response)) !== null) {
        const plainText = response.substring(lastIndex, result.index);
        if (plainText) {
            htmlContent += `<span class="m-6">${DOMPurify.sanitize(plainText)}</span>`;
        }

        const markdownText = result[1];
        const sanitizedMarkdown = markdownText.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, "");
        const renderedMarkdown = marked.parse(sanitizedMarkdown);
        htmlContent += `<br><div class="markdown-snippet border-solid border-4 border-gray-400 prose m-6 p-6">${DOMPurify.sanitize(renderedMarkdown)}</div><br>`;

        lastIndex = mdSnippetRegex.lastIndex;
    }

    const remainingText = response.substring(lastIndex).trim();
    if (remainingText) {
        htmlContent += `<span class="m-6">${DOMPurify.sanitize(remainingText)}</span>`;
    }

    return htmlContent;
}

const createMessageElement = (text, sender) => {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('max-w-[70%]', 'p-3', 'rounded-lg', 'mb-2');

    if (sender === 'user') {
        messageDiv.classList.add('self-start', 'bg-blue-200');
        messageDiv.textContent = text;
    } else {
        messageDiv.classList.add('self-end', 'bg-gray-200');
        
        const processedContent = processBotResponse(text);
        messageDiv.innerHTML = processedContent;
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

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`data after response:`, data);

        // add user input and bot response to the conversation history
        conversationHistory.push({ role: 'user', content: userInput });
        conversationHistory.push({ role: 'assistant', content: data.message });

        const botMessageElement = createMessageElement(data.message, 'bot');
        messagesContainer.appendChild(botMessageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

    } catch (error) {
        console.error('Error sending message:', error);
        const errorElement = createMessageElement('Sorry, something went wrong. Please try again.', 'bot');
        messagesContainer.appendChild(errorElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
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
        body: JSON.stringify({ participantID })
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

window.onload = loadConversationHistory;