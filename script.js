inputField = document.getElementById('user-input');
sendBtn = document.getElementById('send-button');
messagesContainer = document.getElementById('messages');

function sendMessage() {
    let message  = inputField.value;
    message = message.trim();
    if (message === '') {
        messagesContainer.innerHTML += '<div class="warning-message"> Please enter a message </div>';
    } else {
        messagesContainer.innerHTML += '<div class="message"> User: ' + message + '</div>';
    }
    inputField.value = '';

}

sendBtn.addEventListener('click', sendMessage);

inputField.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
