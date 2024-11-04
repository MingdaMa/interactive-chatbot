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

// --------------------- Markdown Editor ---------------------
const previewTab = document.getElementById('preview-tab');
const editorTab = document.getElementById('editor-tab');
const markdownPreview = document.getElementById('markdown-preview');
const markdownEditor = document.getElementById('markdown-editor');

// --------------------- Resizable Divider ---------------------
const divider = document.getElementById('divider');
const leftPanel = document.getElementById('left-panel');
const rightPanel = document.getElementById('right-panel');

let isDragging = false;

const participantID = localStorage.getItem('participantID');
if (!participantID) {
    alert('Please enter a participant ID.');
    window.location.href = '/';
}

// --------------------- Chat Functionality ---------------------

// Function to process bot responses with Markdown
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
        const escapedRawMarkdown = DOMPurify.sanitize(markdownText);

        htmlContent += `
            <br>
            <div class="markdown-snippet border-solid border-4 border-gray-400 prose m-6 px-6 py-10 relative" data-raw="${encodeURIComponent(escapedRawMarkdown)}" data-mode="rendered">
                <div class="button-container absolute top-2 right-2 space-x-1 mb-2">
                    <button class="toggle-markdown text-xs px-2 py-1 bg-gray-300 rounded hover:bg-gray-400">View Raw Syntax</button>
                    <button class="copy-markdown text-xs px-2 py-1 bg-gray-300 rounded hover:bg-gray-400">Copy</button>
                </div>
                <div class="content">${DOMPurify.sanitize(renderedMarkdown)}</div>
            </div>
            <br>
        `;

        lastIndex = mdSnippetRegex.lastIndex;
    }

    const remainingText = response.substring(lastIndex).trim();
    if (remainingText) {
        htmlContent += `<span class="m-6">${DOMPurify.sanitize(remainingText)}</span>`;
    }

    return htmlContent;
}

// Event Listener for Toggle and Copy Buttons
messagesContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('toggle-markdown')) {
        const snippetDiv = e.target.closest('.markdown-snippet');
        const contentDiv = snippetDiv.querySelector('.content');
        const rawMarkdown = decodeURIComponent(snippetDiv.getAttribute('data-raw'));
        const currentMode = snippetDiv.getAttribute('data-mode');

        if (currentMode === 'rendered') {
            // Switch to raw markdown
            contentDiv.innerHTML = `<pre class="whitespace-pre-wrap">${rawMarkdown}</pre>`;
            snippetDiv.setAttribute('data-mode', 'raw');
            e.target.textContent = 'View Rendered Markdown';
        } else {
            // Switch to rendered markdown
            const renderedMarkdown = marked.parse(rawMarkdown);
            contentDiv.innerHTML = DOMPurify.sanitize(renderedMarkdown);
            snippetDiv.setAttribute('data-mode', 'rendered');
            e.target.textContent = 'View Raw Syntax';
        }
    }

    if (e.target.classList.contains('copy-markdown')) {
        const snippetDiv = e.target.closest('.markdown-snippet');
        const rawMarkdown = decodeURIComponent(snippetDiv.getAttribute('data-raw'));
        
        // Copy to clipboard
        navigator.clipboard.writeText(rawMarkdown).then(() => {
            // Provide feedback to the user
            const originalText = e.target.textContent;
            e.target.textContent = 'Copied!';
            e.target.disabled = true;
            setTimeout(() => {
                e.target.textContent = originalText;
                e.target.disabled = false;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy markdown.');
        });
    }
});

// Function to create message elements
const createMessageElement = (text, sender) => {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('max-w-fit', 'p-3', 'rounded-lg', 'mb-2');

    if (sender === 'user') {
        messageDiv.classList.add('bg-blue-200');
        messageDiv.textContent = text;
    } else {
        messageDiv.classList.add('bg-gray-200');
        
        const processedContent = processBotResponse(text);
        messageDiv.innerHTML = processedContent;
    }
    return messageDiv;
}

// Function to send messages
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
        console.log('data after response:', data);

        // Add user input and bot response to the conversation history
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
    logEvent('click', 'Send Button');
});

inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// --------------------- Event Logging ---------------------

// Event Logging Function
function logEvent(type, element) {
    fetch('/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: type, elementName: element, timestamp: new Date(), participantID: participantID })
    });
}

// Click event listener
sendBtn.addEventListener('click', () => {
    logEvent('click', 'Send Button');
});


// Mouseover event listener
inputField.addEventListener('mouseover', () => {
    logEvent('hover', 'User Input');
});

// Keypress event listener
inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        logEvent('enter', 'User Input');
    }
});

// Focus event listener
inputField.addEventListener('focus', () => {
    logEvent('focus', 'User Input');
});

// --------------------- Load Conversation History ---------------------

// Function to fetch and load existing conversation history
async function loadConversationHistory() {
    try {
        const response = await fetch('/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participantID })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load history: ${response.statusText}`);
        }

        // Parse the response
        const data = await response.json();
        
        // Display conversation history
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
    } catch (error) {
        console.error('Error loading conversation history:', error);
    }
}

// Load conversation history when the window loads
window.onload = loadConversationHistory;

// --------------------- Multi-Select Dropdown ---------------------

const selectedTags = document.getElementById("selectedTags");
const optionsDropdown = document.getElementById("optionsDropdown");
const caretIcon = document.getElementById("caretIcon");

const options = ["JavaScript", "HTML/CSS", "Python", "TypeScript", "Bash/Shell", "Java", "C#", "C++", "C", "PHP", "Go", "Rust", "Kotlin", "Ruby", "Swift"];
const selected = new Set();

// Function to toggle the dropdown
function toggleDropdown() {
    optionsDropdown.classList.toggle("hidden");
    caretIcon.classList.toggle("rotate-180");
}

// Function to close the dropdown
function closeQuickStartForm() {
    quickStartForm.attributeStyleMap.set('display', 'none');
}

// Function to update the placeholder text
function updatePlaceholder() {
    const input = document.querySelector("#multiSelect input");
    input.placeholder = selected.size ? "" : "Select programming languages...";
}

// Function to add an option to the selected tags
function addOption(option) {
    if (selected.has(option)) return;
    selected.add(option);
    const tag = document.createElement("span");
    tag.className = "bg-gray-200 text-gray-700 px-2 py-1 rounded-full flex items-center space-x-1 mr-1 mb-1";
    tag.innerHTML = `${option} <button onclick="removeOption('${option}')">×</button>`;
    selectedTags.appendChild(tag);
    updatePlaceholder();
}

// Function to remove an option from the selected tags
function removeOption(option) {
    selected.delete(option);
    Array.from(selectedTags.children).forEach(child => {
        if (child.textContent.includes(option)) child.remove();
    });
    updatePlaceholder();
}

// Event Listeners for Multi-Select Dropdown
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

// Event Listener for Quick Start Form submission
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
        body: JSON.stringify({ projectName, programmingLanguages, configFile: { name: fileName, content: fileContent }, participantID }),
    });

    if (response.ok) {
        closeQuickStartForm();
        projectName.value = "";
        selected.clear();
        fileName.value = "";
        fileContent.value = "";
        quickStartBtn.disabled = true;
    }

    const { userInput, botResponse } = await response.json();

    const userMessageElement = createMessageElement(userInput, 'user');
    messagesContainer.appendChild(userMessageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    const botMessageElement = createMessageElement(botResponse, 'bot');
    messagesContainer.appendChild(botMessageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
})

// Event Listeners for closing the Quick Start Form
closeBtn.addEventListener('click', () => {
    closeQuickStartForm();
});

// Event Listeners for closing the Quick Start Form
cancelBtn.addEventListener('click', () => {
    closeQuickStartForm();
});

quickStartBtn.addEventListener('click', () => {
    quickStartForm.removeAttribute('style');
})

// --------------------- Markdown Editor Functionality ---------------------

// Function to switch tabs
const switchTab = (tab) => {
    if (tab === 'preview') {
        markdownPreview.classList.remove('hidden');
        markdownEditor.classList.add('hidden');
        previewTab.classList.add('bg-gray-200');
        editorTab.classList.remove('bg-gray-200');
    } else if (tab === 'editor') {
        markdownEditor.classList.remove('hidden');
        markdownPreview.classList.add('hidden');
        editorTab.classList.add('bg-gray-200');
        previewTab.classList.remove('bg-gray-200');
    }
}

// Event Listeners for Tab Switching
previewTab.addEventListener('click', () => {
    switchTab('preview');
});

editorTab.addEventListener('click', () => {
    switchTab('editor');
});

// Function to render Markdown in real-time
const renderMarkdown = () => {
    const markdownText = markdownEditor.value;
    const rendered = marked.parse(markdownText);
    markdownPreview.innerHTML = DOMPurify.sanitize(rendered);
}

// Event Listener for Real-time Rendering
markdownEditor.addEventListener('input', renderMarkdown);

// Initialize Tabs (Show Preview by default)
switchTab('editor');

// --------------------- Resizable Divider ---------------------

// Function to handle mouse down on the divider
const onMouseDown = (e) => {
    e.preventDefault();
    isDragging = true;
    document.body.classList.add('no-select');

    // Add event listeners for mouse move and mouse up
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

// Function to handle mouse move when dragging
const onMouseMove = (e) => {
    if (!isDragging) return;

    // Calculate the new widths based on mouse position
    const containerOffsetLeft = document.getElementById('chat-container').getBoundingClientRect().left;
    let pointerRelativeXpos = e.clientX - containerOffsetLeft;

    // Define minimum and maximum widths (in pixels)
    const minLeftWidth = 200;
    const minRightWidth = 200;
    const containerWidth = document.getElementById('chat-container').clientWidth;

    // Calculate new widths in percentage
    let leftWidth = pointerRelativeXpos;
    let rightWidth = containerWidth - leftWidth - divider.offsetWidth;

    // Enforce minimum widths
    if (leftWidth < minLeftWidth) {
        leftWidth = minLeftWidth;
        rightWidth = containerWidth - leftWidth - divider.offsetWidth;
    } else if (rightWidth < minRightWidth) {
        rightWidth = minRightWidth;
        leftWidth = containerWidth - rightWidth - divider.offsetWidth;
    }

    // Convert to percentage
    const leftWidthPercent = (leftWidth / containerWidth) * 100;
    const rightWidthPercent = (rightWidth / containerWidth) * 100;

    // Apply the new widths
    leftPanel.style.width = `${leftWidthPercent}%`;
    rightPanel.style.width = `${rightWidthPercent}%`;
}

// Function to handle mouse up when dragging ends
const onMouseUp = () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.classList.remove('no-select');

    // Remove the event listeners
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
}

// Attach the mouse down event to the divider
divider.addEventListener('mousedown', onMouseDown);
