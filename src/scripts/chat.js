// Get references to DOM elements
const chatInput = document.getElementById('chat-input');
const chatSendButton = document.getElementById('chat-send-button');
const incomingMessageDiv = document.getElementById('incoming-message-div');
const outgoingMessageDiv = document.getElementById('outgoing-message-div');

// Send message on button click
chatSendButton.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (message && roomId) {
        socket.emit('chat-room', { message, roomId});
        appendMessage('outgoing', message);
        chatInput.value = '';
    }
});

// Append message to the chat
function appendMessage(type, message) {
    const messageElement = document.createElement('div');
    messageElement.className = `${type}-message`;
    messageElement.textContent = message;

    if (type === 'incoming') {
        incomingMessageDiv.appendChild(messageElement);
    } else {
        outgoingMessageDiv.appendChild(messageElement);
    }
}

// Listen for incoming messages
socket.on('chat-message', (data) => {
    appendMessage('incoming', data.message);
});
