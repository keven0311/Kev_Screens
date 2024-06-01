const peerConfiguration = window.peerConfig.config;
const BASE_URL = window.env.BASE_URL;
const PORT = window.env.PORT;

// element selecting:
const localVideoElement = document.querySelector("#local-video");
const roomNumberEl = document.querySelector("#room-number");
const roomNumberInputDiv = document.querySelector("#room-number-input-div");
const roomNumberInput = document.querySelector("#room-number-input");
const displaySelectMenu = document.getElementById("selectMenu");
const getSourcesButton = document.getElementById("getSourcesButton");

// variables initializing:
let socket;
let roomId;
let localStream;
let peerConnectionMap = new Map();

// main functions:
async function startStreaming(){
    if (!roomId) {
        alert("Please enter a room number first, before start streaming...");
        return;
    }
    await fetchUserMedia();
    connectSocketIo();
    setupSocketListeners();

    // join socket room:
    socket.emit("join-room",roomId);
    console.log("streamer joined room: ", roomId, socket.id)
    // start&stop button toggle:
    startButton.disabled = true;
    stopButton.disabled = false;
}

async function fetchUserMedia(){
    const sourceId = displaySelectMenu.value;
  if (!sourceId) {
    alert("Please select a screen or window first!");
    console.error("Please select a screen or window first!");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: sourceId,
        },
      },
      audio: false,
    });
    localVideoElement.srcObject = stream;
    localStream = stream;
    // HTML element dispaly toggle:
    roomNumberEl.style.display = "block";
    roomNumberInputDiv.style.display = "none";
  } catch (err) {
    console.error(err);
  }
}

function connectSocketIo(){
    socket = io.connect(`https://${BASE_URL}:${PORT}`);
}

async function createPeerConnection(peerId){
    const pc = new RTCPeerConnection(peerConfiguration);

    // Add local stream to the new PeerConnection:
    localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
    });
    // handle ICE candidate:
    pc.onicecandidate = e => {
        if(e.candidate){
            socket.emit("icecandidate",{
                type:"icecandidate",
                candidate: e.candidate,
                peerId: peerId,
                roomId: roomId
            })
        }
    }
    // handle connection state changes
    pc.onconnectionstatechange = () => {
        if(pc.connectionState === 'connected'){
            console.log(`Peer ${peerId} is connected.`)
        }
    }
    // returing the PeerConnection object:
    return pc;
}

async function connectToPeer(peerId){
    const pc = await createPeerConnection(peerId);
    // setting PeerConnection to the MAP:
    peerConnectionMap.set(peerId,pc);

    //create offer and emit offer:
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("offer",{
        type:"offer",
        offer:offer,
        peerId: peerId,
        roomId:roomId
    })
}



// PeerConnection even handling:
async function handleOffer(peerId, offer){
    const pc = await createPeerConnection(peerId);
    // adding new pc to the MAP:
    peerConnectionMap.set(peerId, pc);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    // create and emit answer:
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("answer",{
        type:"answer",
        answer:answer,
        peerId: peerId,
        roomId:roomId
    })
}

async function handleAnswer(peerId, answer){
    const pc = peerConnectionMap.get(peerId);
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

async function handleIceCandidate(peerId, candidate){
    const pc = peerConnectionMap.get(peerId);
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
}

function handlePeerDisconnection(peerId){
    const pc = peerConnectionMap.get(peerId);
    if(pc){
        pc.close();
        peerConnectionMap.delete(peerId);
        console.log(`Peer ${peerId} disconnected...`);
    }
}

// socketIO events:
function setupSocketListeners(){
    socket.on("peer-joined", async (data) => {
        await connectToPeer(data.socketId);
    })

    socket.on("offer", async (data) => {
        await handleOffer(data.socketId, data.offer);
    })
    
    socket.on("answer", async (data) => {
        await handleAnswer(data.socketId, data.answer);
    })
    
    socket.on("icecandidate", async (data) => {
        await handleIceCandidate(data.socketId, data.candidate);
    })

    socket.on('peer-disconnected',(data) => {
        handlePeerDisconnection(data.socketId);
    })
}


// element event handling:
    // room number elements handling:
roomNumberInput.addEventListener("change", (e) => {
  roomNumberEl.innerHTML = `Room Number: ${e.target.value}`;
  roomId = e.target.value;
});
roomNumberEl.addEventListener("click", (e) => {
  if (roomId) {
    navigator.clipboard
      .writeText(roomId)
      .then(() => {
        alert("Room number copied to clipboard!");
      })
      .catch((err) => console.error("Failed to copy room number: ", err));
  }
});

    // start button:
const startButton = document.getElementById("startButton");
startButton.onclick = startStreaming;

    // stop button:
const stopButton = document.getElementById("stopButton");
stopButton.onclick = () => {
    if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        localVideoElement.srcObject = null;
        startButton.disabled = false;
        stopButton.disabled = true;
        roomId = null;
        roomNumberInput.value = null;
        roomNumberEl.style.display = "none";
        roomNumberInputDiv.style.display = null;
    
        // Close and clean up all peer connections
        peerConnectionMap.forEach((pc, peerId) => {
            pc.close();
            peerConnectionMap.delete(peerId);
        });
    
        // Disconnect from socket
        if (socket) {
            socket.disconnect();
            socket = null;
        }
      }
};

    // getSource button:
getSourcesButton.onclick = getVideoSource;

// electron ultis:
    // stream window options:
async function getVideoSource() {
  console.log("getVideoSource called");
  const inputSources = await window.ipcRenderer.invoke("getSources");
  inputSources.forEach((source) => {
    const element = document.createElement("option");
    element.value = source.id;
    element.innerHTML = source.name;
    displaySelectMenu.appendChild(element);
  });
}