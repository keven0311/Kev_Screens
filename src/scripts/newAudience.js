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
    const { socketId, offer } = data;
    const pc = await createPeerConnection(socketId)
    await handleOffer(socketId,offer,pc)
    
  });

  socket.on("answer", async (data) => {
    console.log('Receiving answer from server: ', data.answer);
    await handleAnswer(data.socketId, data.answer);
  });

  socket.on('peer-joined', async (data) => {
    console.log('Peer joined the room');
    const pc = await createPeerConnection(data.socketId);
    console.log("pc in peer-joined event: ", pc)
    await sendOffer(data.socketId,pc);
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
  const peerConnection = new RTCPeerConnection(peerConfiguration);

//   peerConnection.ontrack = (e) => {
//     videoElement.srcObject = e.streams[0];
//     console.log("Audience receiving track...");
//   };

//   peerConnection.onicecandidate = (e) => {
//     console.log("event onicecandidate: ", e);
//     if (e.candidate) {
//       console.log("Audience emitting ICE: ", e.candidate);
//       socket.emit("icecandidate", { candidate: e.candidate, roomId, socketId });
//     } else {
//       console.log("NO candidate detected!!!");
//     }
//   };
//  peerConnections.set(socketId, peerConnection);

    return new Promise((resolve) => {
        peerConnection.ontrack = (e) =>{
            videoElement.srcObject = e.streams[0];
            console.log("Audience reiving track...")
            peerConnections.set(socketId, peerConnection);
            resolve(peerConnection);
        };
        peerConnection.onicecandidate = (e) => {
            if(e.candidate){
                socket.emit("icecandidate", {candidate: e.candidate, roomId, socketId:socket.id});
            }else{
                console.log("NO candidate detected!!!")
                peerConnections.set(socketId, peerConnection);
                resolve(peerConnection);
            }
        };
    })
  
  
}

async function sendOffer(socketId, pc) {   
  try {
    const offer = await pc.createOffer();
    console.log("Audience offer created: ", offer);
    await pc.setLocalDescription(offer);
    socket.emit("offer", { offer: pc.localDescription, roomId, socketId: socket.id });
    console.log("Audience offer sent!");
  } catch (err) {
    console.error("Error creating offer (audience): ", err);
  }
}

async function handleOffer(socketId, offer,pc) {
//   const peerConnection = peerConnections.get(socketId);
//   try {
//     await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
//     console.log("Audience received offer set to remote description: ", offer);
//     const answer = await peerConnection.createAnswer();
//     await peerConnection.setLocalDescription(answer);
//     socket.emit("answer", { answer: answer, roomId, socketId: socket.id });
//     console.log("Audience emitted answer: ", answer);
//   } catch (err) {
//     console.error("Error handling offer: ", err);
//   }
    try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        console.log("Audience received offer set to remoteDes: ", offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer",{ answer:answer, roomId, socketId: socket.id})
    } catch (err) {
        
    }
}

async function handleAnswer(socketId, answer) {
//   if (peerConnections.get(socketId)) {
    const peerConnection = peerConnections.get(socketId);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    console.log('Set received answer, set to remote description...TRUE');
//   } else {
//     createPeerConnection(socketId);
//     const peerConnection = peerConnections.get(socketId);
//     await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
//     console.log('Set received answer, set to remote description...FALSE');
//   }
}

async function addNewIceCandidate(socketId, iceCandidate) {
  const peerConnection = peerConnections.get(socketId);
  try {
    console.log("Adding ICE candidate: ", iceCandidate);
    await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
    console.log("Added ICE Candidate!", iceCandidate);
  } catch (err) {
    console.error("Error adding ICE candidate: ", err);
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
