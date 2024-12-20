const inputField = document.getElementById('user-input');
const sendBtn = document.getElementById('send-button');
const quickStartBtn = document.getElementById('quick-start-button');
const quickStartForm = document.getElementById('quick-start');
const multiSelect = document.getElementById('multiselect');
const closeBtn = document.getElementById('close-btn');
const cancelBtn = document.getElementById('cancel-btn');
const submitBtn = document.getElementById('submit-btn');
const messagesContainer = document.getElementById('messages');

const viewMarkdownBtn = document.getElementById('view-markdown-btn');
const copyMarkdownBtn = document.getElementById('copy-markdown-btn');

let conversationHistory = [];

// --------------------- Markdown Editor ---------------------
const previewTab = document.getElementById('preview-tab');
const editorTab = document.getElementById('editor-tab');
const markdownPreview = document.getElementById('markdown-preview');
const markdownEditor = document.getElementById('markdown-editor');

// --------------------- Download Buttons ---------------------
const downloadMarkdownBtn = document.getElementById('downloadMarkdownBtn');

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
                    <button id='view-markdown-btn' class="toggle-markdown text-xs px-2 py-1 bg-gray-300 rounded hover:bg-gray-400">View Raw Syntax</button>
                    <button id='copy-markdown-btn' class="copy-markdown text-xs px-2 py-1 bg-gray-300 rounded hover:bg-gray-400">Copy</button>
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

// --------------------- Multi-input Dropdown ---------------------
const authorNamesContainer = document.getElementById("authorNamesContainer");
const authorNamesInput = document.getElementById("authorNamesInput");
const authorNames = document.getElementById("authorNames");

const githubHandlesContainer = document.getElementById("githubHandlesContainer");
const githubHandlesInput = document.getElementById("githubHandlesInput");
const githubHandles = document.getElementById("githubHandles");

const environmentVariablesContainer = document.getElementById("environmentVariablesContainer");
const environmentVariablesInput = document.getElementById("environmentVariablesInput");
const environmentVariables = document.getElementById("environmentVariables");

// Array to store author names tag
const authorTags = new Set();
const githubHandlesTags = new Set();
const environmentVariablesTags = new Set();

// Function to add a new tag element
function addTag(tagText, tagsSet, tagsContainer) {
  if (!tagsSet.has(tagText)) {
    tagsSet.add(tagText);

    // Create the tag element
    const tagElement = document.createElement("span");
    tagElement.classList.add("bg-gray-200", "text-gray-700", "px-2", "py-1", "rounded-full", "flex", "items-center", "gap-1");
    tagElement.innerText = tagText;

    // Create the remove button for each tag
    const removeButton = document.createElement("button");
    removeButton.classList.add("text-gray-500", "hover:text-gray-700", "focus:outline-none");
    removeButton.innerHTML = "&times;";
    removeButton.onclick = () => removeTag(tagText, tagElement, tagsSet);

    // Append remove button to tag element and tag element to the authornames container
    tagElement.appendChild(removeButton);
    tagsContainer.appendChild(tagElement);
  }
}

// Function to handle the Enter key press
function handleKeyDown(event, inputElement, tagsSet, tagsContainer) {
  if (event.key === "Enter" && inputElement.value.trim() !== "") {
    event.preventDefault(); // Prevent form submission or default behavior

    // Add tag to the tags array and clear the input
    const tagText = inputElement.value.trim();
    addTag(tagText, tagsSet, tagsContainer);
    inputElement.value = ""; // Clear the input field
  }
}

// Function to remove a tag
function removeTag(tagText, tagElement, tagsSet) {
  if (tagsSet.has(tagText)) {
    tagsSet.delete(tagText); // Remove from tags Set
    tagElement.remove(); // Remove the element from the DOM
  }
}

// Attach the keydown event listener to the input
authorNamesInput.addEventListener("keydown", (e) => handleKeyDown(e, authorNamesInput, authorTags, authorNames));
githubHandlesInput.addEventListener("keydown", (e) => handleKeyDown(e, githubHandlesInput, githubHandlesTags, githubHandles));
environmentVariablesInput.addEventListener("keydown", (e) => handleKeyDown(e, environmentVariablesInput, environmentVariablesTags, environmentVariables));
 
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
    const authorNames = Array.from(authorTags);
    const githubUsernames = Array.from(githubHandlesTags);
    const githubRepo = document.getElementById("githubRepo").value;
    const license = document.getElementById("license").value;
    const programmingLanguages = Array.from(selected);
    const environmentVariables = Array.from(environmentVariablesTags);
    const description = document.getElementById("description").value;
    const fileName = document.getElementById("fileName").value;
    const fileContent = document.getElementById("fileContent").value;

    const response = await fetch("/project-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, programmingLanguages, authorNames, githubUsernames, githubRepo, license, environmentVariables, description, configFile: { name: fileName, content: fileContent }, participantID }),
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
    renderMarkdown();
});

editorTab.addEventListener('click', () => {
    switchTab('editor');
});

// Function to render Markdown in real-time
const renderMarkdown = () => {
    const markdownText = markdownEditor.value;
    const rendered = marked.parse(markdownText);
    const renderedMarkdownDiv = document.getElementById('rendered-markdown');
    renderedMarkdownDiv.innerHTML = DOMPurify.sanitize(rendered);
}

markdownEditor.addEventListener('input', renderMarkdown);

switchTab('editor');

// --------------------- Download Buttons ---------------------

// Markdown Download Function
downloadMarkdownBtn.addEventListener("click", function () {
  const markdownContent = markdownEditor.value;
  // Create a Blob with the Markdown content
  const blob = new Blob([markdownContent], { type: "text/markdown" });
  // Create a link for the download
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "README.md";
  link.click();
});

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

function getAIAgentByParticipantID() {
  if (participantID % 2 === 0) {
    window.location.href = '/chat-enhanced.html';
  } else {
    window.location.href = '/chat-baseline.html';
  }
}

// Function to handle redirect to Qualtrics
function redirectToQualtrics(surveyCategory) {
  fetch('/redirect-to-survey', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantID, surveyCategory })  // participantID from localStorage
  })
  .then(response => response.text())  // Get the URL from the response
  .then(url => {
    // Log the redirect event if you're using event logging
    logEvent('redirect', 'Qualtrics Survey');
    // Redirect to the survey
    window.location.href = url;
  })
  .catch(error => {
    console.error('Error redirecting to survey:', error);
    alert('There was an error redirecting to the survey. Please try again.');
  });
}

function redirectToGoogleDoc() {
  if (participantID % 2 === 0) {
    window.location.href = 'https://docs.google.com/document/d/1XjoGnTelt-qI_SsXLf7HIARfeDYznNG3q--tygWtCYs/edit?usp=sharing'
  } else {
    window.location.href = 'https://docs.google.com/document/d/1y9GimJixtfUsLVKwCZJQzlEAZHC1AmnWKkukVpv_pE0/edit?tab=t.0'
  }
}

// --------------------- Event Logging ---------------------

// Event Logging Function
function logEvent(type, model, element) {
  fetch('/log-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: type, model, elementName: element, timestamp: new Date(), participantID: participantID })
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
  logEvent('focus', 'enhanced', 'User Input');
});

// Copy markdonw button event listener
copyMarkdownBtn.addEventListener('click', () => {
  logEvent('click', 'enhanced', 'Copy Markdown Button');
});

// View markdown button event listener
viewMarkdownBtn.addEventListener('click', () => {
  logEvent('click', 'enhanced', 'View Markdown Button');
});

// Editor tab event listener
editorTab.addEventListener('click', () => {
  logEvent('click', 'enhanced', 'Editor Tab');
});

// Preview tab event listener
previewTab.addEventListener('click', () => {
  logEvent('click', 'enhanced', 'Preview Tab');
});

// Download markdown button event listener
downloadMarkdownBtn.addEventListener('click', () => {
  logEvent('click', 'enhanced', 'Download Markdown Button');
});

// Text editor event listener
markdownEditor.addEventListener('click', () => {
  logEvent('click', 'enhanced', 'Markdown Editor');
});

markdownEditor.addEventListener('paste', (e) => {
  logEvent('paste', 'enhanced', 'Paste markdown');
});