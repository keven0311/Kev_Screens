// Get references to DOM elements
const chatInput = document.getElementById('chat-input');
const chatSendButton = document.getElementById('chat-send-button');
const theMessageDiv = document.getElementById('message');

// Send message on button click
chatSendButton.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (message && roomId) {
        socket.emit('chat-room', { message, roomId,nickName});
        appendMessage('outgoing', {message, nickName:"You"});
        chatInput.value = '';
    }
});

// Append message to the chat
function appendMessage(type, data) {
    const messageDiv = document.createElement('div');
    const messageUsername = document.createElement('h5');
    const theMessage = document.createElement("span");
    messageDiv.className = `${type}-message-box`;
    messageUsername.className = `${type}-message-username`;
    messageUsername.textContent = `${data.nickName}:`
    theMessage.className = `${type}-message`;
    theMessage.textContent = data.message;
    
    messageDiv.appendChild(messageUsername);
    messageDiv.appendChild(theMessage);
    
    theMessageDiv.appendChild(messageDiv);
}

// Listen for incoming messages
socket.on('chat-message', (data) => {
    appendMessage('incoming', data);
});
