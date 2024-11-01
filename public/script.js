const inputField = document.getElementById('user-input');
const sendBtn = document.getElementById('send-button');
const quickStartBtn = document.getElementById('quick-start-button');
const quickStartForm = document.getElementById('quick-start');
const multiSelect = document.getElementById('multiselect');
const closeBtn = document.getElementById('close-btn');
const cancelBtn = document.getElementById('cancel-btn');
const submitBtn = document.getElementById('submit-btn');
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

quickStartBtn.addEventListener('click', () => {
  quickStartForm.removeAttribute('style');
})

sendBtn.addEventListener('click', async () => {
    sendMessage();
    logEvent('click', 'Send Button');
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

function closeQuickStartForm() {
    quickStartForm.attributeStyleMap.set('display', 'none');
}

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

closeBtn.addEventListener('click', () => {
  closeQuickStartForm();
});

cancelBtn.addEventListener('click', () => {
  closeQuickStartForm();
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
        quickStartBtn.disabled = true;
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

const selectedTags = document.getElementById("selectedTags");
const optionsDropdown = document.getElementById("optionsDropdown");
const caretIcon = document.getElementById("caretIcon");

const options = ["JavaScript", "HTML/CSS", "Python", "TypeScript", "Bash/Shell", "Java", "C#", "C++", "C", "PHP", "Go", "Rust", "Kotlin", "Ruby", "Swift"];
const selected = new Set();

function toggleDropdown() {
  optionsDropdown.classList.toggle("hidden");
  caretIcon.classList.toggle("rotate-180");
}

function addOption(option) {
  if (selected.has(option)) return;
  selected.add(option);
  const tag = document.createElement("span");
  tag.className = "bg-gray-200 text-gray-700 px-2 py-1 rounded-full flex items-center space-x-1 mr-1 mb-1";
  tag.innerHTML = `${option} <button onclick="removeOption('${option}')">×</button>`;
  selectedTags.appendChild(tag);
  updatePlaceholder();
}

function removeOption(option) {
  selected.delete(option);
  Array.from(selectedTags.children).forEach(child => {
    if (child.textContent.includes(option)) child.remove();
  });
  updatePlaceholder();
}

function updatePlaceholder() {
  const input = document.querySelector("#multiSelect input");
  input.placeholder = selected.size ? "" : "Select programming languages...";
}

document.addEventListener("DOMContentLoaded", () => {
  const ul = document.getElementById("optionsList");
  options.forEach(option => {
    const li = document.createElement("li");
    li.className = "px-4 py-2 hover:bg-gray-100 cursor-pointer";
    li.innerText = option;
    li.onclick = () => addOption(option);
    ul.appendChild(li);
  });
});

quickStartForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const projectName = document.getElementById("projectName").value;
  const programmingLanguages = Array.from(selected);
  const fileName = document.getElementById("fileName").value;
  const fileContent = document.getElementById("fileContent").value;

  if (!projectName || programmingLanguages.length === 0 || !fileName || !fileContent) {
    alert("Please fill in all fields.");
    return;
  }

  const response = await fetch("/project-info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectName, programmingLanguages, configFile: { name: fileName, content: fileContent } }),
  });

  if (response.ok) {
    closeQuickStartForm();
    projectName.value = "";
    selected.clear();
    fileName.value = "";
    fileContent.value = "";
    quickStartBtn.disabled = true;
    alert("Project information saved successfully.");
  }

  const data = await response.json();
  console.log(data.message);
})

window.onload = loadConversationHistory;