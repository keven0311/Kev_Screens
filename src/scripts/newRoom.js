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
        audio:false
    //   audio: {
    //     mandatory:{
    //         chromeMediaSource: "desktop",
    //         chromeMediaSourceId: sourceId,
    //     }
    //   },
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
    setupSocketListeners();
    // join socket room:
    socket.on('connect', () => {
        socket.emit("join-room",{roomId, userName:"streamer", role:"streamer"});
        console.log("streamer joined room: ", roomId, socket.id);
    })
}

function createPeerConnection(){
    const pc = new RTCPeerConnection(peerConfiguration);

    // Add local stream to the new PeerConnection:
    localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
    });
    // handle ICE candidate:
    pc.onicecandidate = e => {
        console.log("event in onicecandidate: ", e)
        if(e.candidate){
            socket.emit("icecandidate",{
                candidate: e.candidate,
                roomId: roomId,
                socketId: socket.id,
                role: "streamer"
            })
            console.log("streamer ICE sent.")
        }else{
            console.log("onicecandidate event triggered, but NO candidate!")
        }
    }
    // handle connection state changes
    pc.onconnectionstatechange = (e) => {
        if(pc.connectionState === 'connected'){
            console.log(`Peer is connected.`,e)
        }
    }

    // add stream to viewers event:
    // pc.onnegotiationneeded = async () =>{
    //     if(!pc.localDescription || !pc.remoteDescription){
    //         await pc.setLocalDescription(await pc.createOffer());
    //         socket.emit("offer", {offer: pc.localDescription, roomId, socketId:socket.id})
    //     }
    //     console.log("signalingState in onnegotiationneeded event: ", pc.signalingState)
    //     console.log("streamer emitted offer in onnegotiationneeded event: ","remoteDES: ",pc.remoteDescription)
    // }

    // checking recived track:
    pc.ontrack = e => {
        console.log("Streamer recived track: ", e.track? e.track: null)
    }
    // returing the PeerConnection object:
    console.log("NEW PeerConnection created.",pc)
    return pc;
}

async function connectToPeer(socketId){
    console.log("connectToPeer function called")
    const pc = createPeerConnection();
    // setting PeerConnection to the MAP:
    peerConnectionMap.set(socketId,pc);

    // create offer and emit offer:
    const offer = await pc.createOffer();
    await pc.setLocalDescription(new RTCSessionDescription(offer));

    socket.emit("offer",{
        offer:pc.localDescription,
        socketId: socket.id,
        roomId:roomId
    })
}



// PeerConnection even handling:
async function handleOffer(socketId, offer){
    try {
        let pc = peerConnectionMap.get(socketId);
        // adding new pc to the MAP:
        if(!pc){
            pc = createPeerConnection();
            peerConnectionMap.set(socketId, pc);
        }
    
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log("Streamer recived offer set to remoteDES: ", pc.remoteDescription);
        // create and emit answer:
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(new RTCSessionDescription(answer));
        socket.emit("answer",{
            answer:pc.localDescription,
            socketId: socket.id,
            roomId:roomId,
            role:"streamer"
        })
        console.log("Streamer created, set, and emitted localDes: ",pc.localDescription)
    } catch (err) {
        console.error("Error handleOffer: ",err)
    }
}

async function handleAnswer(socketId, answer){
    try {
        let pc = peerConnectionMap.get(socketId);
        if(!pc){
            pc = createPeerConnection();
            peerConnectionMap.set(socketId,pc)
        }
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("pc in handleAnswer after setRemoteDes: ",pc)
    } catch (err) {
        console.error("Erro handleAnswer: ", err)
    }
}

async function handleIceCandidate(socketId, candidate){
    try {
        const pc = peerConnectionMap.get(socketId);
        if(pc){
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("streamer recieved ICE, PC in map: ", candidate)
        }else{
            console.log("Peer connection not found for socketId: ", socketId);
        }
    } catch (err) {
        console.error("Error handleIceCandidate: ",err)
    }
}

function handlePeerDisconnection(socketId){
    const pc = peerConnectionMap.get(socketId);
    if(pc){
        pc.close();
        peerConnectionMap.delete(socketId);
        console.log(`Peer ${socketId} disconnected...`);
    }
}

// socketIO events:
function setupSocketListeners(){
    socket.on("peer-joined", async (data) => {
        await connectToPeer(data.socketId);
    })

    socket.on("offer", async (data) => {
        console.log("reciving offer from server...:",data.offer)
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
        peerConnectionMap.forEach((pc, socketId) => {
            pc.close();
            peerConnectionMap.delete(socketId);
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
