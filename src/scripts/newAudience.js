const peerConfiguration = window.peerConfig.config;
const BASE_URL = window.env.BASE_URL;
const PORT = window.env.PORT;

// Element selection
const videoElement = document.querySelector("#videoElement");
const roomNumberInfo = document.querySelector("#room-number-info");
const roomNumberDisplay = document.querySelector("#room-number-display");
const roomNumberInput = document.querySelector("#room-number-input");
const joinBtn = document.querySelector("#join-button");

// Variables
let socket;
let roomId;
const peerConnections = new Map();

// Event listeners
roomNumberInput.addEventListener("change", (e) => {
  roomId = e.target.value;
  roomNumberDisplay.innerHTML = e.target.value;
});

joinBtn.addEventListener("click", handleJoinRoom);

// Socket.io connection
function connectSocketIo() {
  socket = io.connect(`https://${BASE_URL}:${PORT}`);

  socket.on('connect', () => {
    console.log(`Connected to server with socket ID: ${socket.id}`);
    socket.emit("join-room", roomId);
    console.log("Joining room: ", roomId, socket.id);
  });

  socket.on('disconnect', () => {
    console.log(`Disconnected from server with socket ID: ${socket.id}`);
  });

  socket.on("icecandidate", async (data) => {
    console.log("Audience receiving ICE candidate: ", data.candidate);
    await addNewIceCandidate(data.socketId, data.candidate);
  });

  socket.on("offer", async (data) => {
    console.log("Audience receiving offer");
    const { socketId , offer } = data;
    await handleOffer( socketId, offer);
    
  });

  socket.on("answer", async (data) => {
    console.log('Receiving answer from server: ', data.answer);
    const { socketId, answer } = data;
    await handleAnswer(socketId, answer);
  });

  socket.on('peer-joined', async (data) => {
    console.log('Peer joined the room');
    const { socketId } = data;
    await sendOffer(socketId);
  });

  socket.on('peer-disconnected', (data) => {
    console.log(`Peer ${data.socketId} disconnected`);
    handlePeerDisconnection(data.socketId);
  });
}

// Main functions
async function handleJoinRoom() {
  if (!roomId) {
    alert("Please enter a room number to join!");
    return;
  }
  connectSocketIo();
  roomNumberInfo.style.display = "flex";
}

function createPeerConnection(socketId) {
  const pc = new RTCPeerConnection(peerConfiguration);

  pc.ontrack = e => {
    videoElement.srcObject = e.streams[0];
    console.log("recived track...")
  }

  pc.onicecandidate = e => {
    if(e.candidate){
        socket.emit("icecandidate", { candidate:e.candidate, roomId, socketId: socket.id})
        console.log("audience icecandidate sent...")
    }
  }

  peerConnections.set(socketId, pc);
  return pc;
}

async function sendOffer(socketId) {  
    try {
        if(!peerConnections.get(socketId)){
            const pc = createPeerConnection(socketId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(new RTCSessionDescription(offer));
            socket.emit("offer", {offer: pc.localDescription, roomId, socketId: socket.id})
        }else{
            const pc = peerConnections.get(socketId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(new RTCSessionDescription(offer));
            socket.emit("offer", {offer: pc.localDescription, roomId, socketId: socket.id})
        }
    } catch (err) {
        console.error("Erroring sending offer: ",err)
    } 
}

async function handleOffer(socketId, offer) {
    try {
        const pc = createPeerConnection(socketId);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { answer:pc.localDescription,roomId, socketId: socket.id, });
        console.log("answer emited...")
    } catch (err) {
        console.log("Error handleOffer: ",err);
    }
}

async function handleAnswer(socketId, answer) {
    try {
        const pc = peerConnections.get(socketId);
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
        console.error("Erroring handleAnswer: ",err);
    }
}

async function addNewIceCandidate(socketId, candidate) {
 try {
    const pc = peerConnections.get(socketId);
    await pc.addIceCandidate(new RTCIceCandidate(candidate))
    console.log("ICE candidate added!")
 } catch (err) {
    console.error("Erro adding ICE candidate: ",err)
 }
}

function handlePeerDisconnection(socketId) {
  const peerConnection = peerConnections.get(socketId);
  if (peerConnection) {
    peerConnection.close();
    peerConnections.delete(socketId);
    console.log(`Peer ${socketId} disconnected and peer connection closed.`);
  }
}
