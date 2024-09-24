const inputField = document.getElementById('user-input');
const sendBtn = document.getElementById('send-button');
const messagesContainer = document.getElementById('messages');

function sendMessage() {
    let message  = inputField.value.trim();
    if (message === '') {
        alert('Please enter a message');
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
