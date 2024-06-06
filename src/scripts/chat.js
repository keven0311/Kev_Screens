// Get references to DOM elements
const chatInput = document.getElementById('chat-input');
const chatSendButton = document.getElementById('chat-send-button');
const theMessageDiv = document.getElementById('message');

// Send message on button click
function sendMessage(){
    const message = chatInput.value.trim();
    if (message && roomId) {
        socket.emit('chat-room', { message, roomId,nickName});
        appendMessage('outgoing', {message, nickName:"You"});
        chatInput.value = '';
    }
}
chatSendButton.addEventListener('click', sendMessage);

// Send message on 'Enter' key press:
chatInput.addEventListener('keydown',(e) => {
    if(e.key === 'Enter'){
        sendMessage();
    }
})


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
    autoScroll();
}

// Auto-scroll to the bottom of the message div
function autoScroll() {
    theMessageDiv.scrollTop = theMessageDiv.scrollHeight;
}

