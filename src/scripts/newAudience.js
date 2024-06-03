const peerConfiguration = window.peerConfig.config;
const BASE_URL = window.env.BASE_URL;
const PORT = window.env.PORT;

// Element selection
const videoElement = document.querySelector("#videoElement");
const roomNumberInfo = document.querySelector("#room-number-info");
const roomNumberDisplay = document.querySelector("#room-number-display");
const roomNumberInput = document.querySelector("#room-number-input");
const joinBtn = document.querySelector("#join-button");
const chatRoom = document.querySelector("#chat-room");
const refreshBtn = document.querySelector("#refresh-available-rooms");
const roomSelectEl = document.querySelector("#room-select");

// Variables
let socket;
let roomId;
let availabelRooms;
let pc;

// Event listeners
roomNumberInput.addEventListener("change", (e) => {
  roomId = e.target.value;
  roomNumberDisplay.innerHTML = e.target.value;
});

roomSelectEl.addEventListener("change", (e) => {
    console.log("roomSelectEl event 'change': ", e.target.value)
    roomSelectEl.value = e.target.value;
    roomId = e.target.value
})

refreshBtn.addEventListener("click", async (e) =>{
    connectSocketIo();
    socket.emit("availabelrooms");
    await updateRoomSelect();
})

joinBtn.addEventListener("click", handleJoinRoom);

// Socket.io connection
function connectSocketIo() {
  socket = io.connect(`https://${BASE_URL}:${PORT}`);

  socket.on('connect', () => {
    console.log(`Connected to server with socket ID: ${socket.id}`);
    // TODO: dynanmic roomId && userName here with availabel room id:
    // socket.emit("availabelrooms")
  });

  socket.on('joined-room', (data) => {
    console.log("joined-room event: ",data.roomId)
  })

  // reciving availabel streaming rooms from server:
  socket.on("availabelrooms", async (data) => {
    availabelRooms = await JSON.parse(data);
    await updateRoomSelect();
    console.log("GET availabelrooms from server: ", availabelRooms)
  })

  socket.on('disconnect', () => {
    console.log(`Disconnected from server with socket ID: ${socket.id}`);
  });

  socket.on("icecandidate", async (data) => {
    console.log("Audience receiving ICE candidate: ", data.candidate);
    if(data.role == "audience") return;
    await addNewIceCandidate(data.candidate);
  });

  socket.on("offer", async (data) => {
    console.log("Audience receiving offer");
    const { socketId , offer, role, roomId } = data;
    if(role === 'audience') return;
    await handleOffer( offer); 
  });

  socket.on("answer", async (data) => {
    console.log('Receiving answer from server: ', data.answer);
    const { socketId, answer, role } = data;
    if(role === "audience") return;
    await handleAnswer(answer);
  });

  socket.on('peer-joined', async (data) => {
    console.log('Peer joined the room');
    const { socketId } = data;
    // await sendOffer(socketId);
  });

//   socket.on('peer-disconnected', (data) => {
//     console.log(`Peer ${data.socketId} disconnected`);
//     handlePeerDisconnection(data.socketId);
//   });
}

// connect to server upon rendered:


// Main functions
async function handleJoinRoom() {
    roomId = roomSelectEl.value;
    console.log("handleJoinRoom roomId: ", roomId);
  if (!roomId) {
    alert("Please select a room to join!");
    return;
  }
  socket.emit("join-room", {roomId , userName: "shabi", role: "audience"});
  console.log(" audience joining room: ", roomId)
  roomNumberInfo.style.display = "flex";
}

function createPeerConnection(socketId) {
    return new Promise((resolve) => {

        pc = new RTCPeerConnection(peerConfiguration);
      
        pc.ontrack = e => {
            console.log("recived track...");
            videoElement.srcObject = e.streams[0];
        }
        
        pc.onicecandidate = e => {
            if(e.candidate){
                socket.emit("icecandidate", { candidate:e.candidate, roomId, socketId: socket.id, role:"audience"})
                console.log("audience icecandidate sent...")
            }else{
                console.log("onicecandidate event triggered, but NO candidate!")
            }
        }

        pc.onicegatheringstatechange = e => {
            console.log("onicegatheringstatechange event triggerd!!!")
            // if(pc.iceGatheringState === 'complete'){
            //     pc.createOffer()
            //         .then(offer => pc.setLocalDescription(offer))
            //         .then(() => {
            //             socket.emit("offer", {offer: pc.localDescription, roomId, socketId: socket.id})
            //         })
            //         .catch(err => console.error("Error creating offer in onicegaheringstatechange event: ",err))
            // }
        }

        pc.onnegotiationneeded = async () =>{
            console.log("...onnegotiationneed event trigged...",pc)
            // if(!pc.localDescription){
            //     const offer = await pc.createOffer();
            //     await pc.setLocalDescription(new RTCSessionDescription(offer));
            //     socket.emit("offer", {offer: pc.localDescription, roomId, socketId:socket.id})
            //     console.log("localDES: ",pc.localDescription,"remoteDES: ",pc.remoteDescription)
            // }else{
            //     socket.emit("offer", {offer: pc.localDescription, roomId, socketId:socket.id})
            //     console.log("localDES: ",pc.localDescription,"remoteDES: ",pc.remoteDescription)
            // }
        }
        
        console.log("NEW PeerConnection created.",pc)
        resolve();
    })
  
}

async function sendOffer(socketId) {  
    try {
        let pc = await createPeerConnection(socketId)
        const offer = await pc.createOffer();
        await pc.setLocalDescription(new RTCSessionDescription(offer))
        socket.emit("offer", { offer: pc.localDescription, roomId, socketId:socket.id})
        console.log(" offer emitted...(sendOffer)",`localDES: ${pc.localDescription} &&&& remoteDES: ${pc.remoteDescription}`)
    } catch (err) {
        console.error("Erroring sending offer: ",err)
    } 
}

async function handleOffer( offer) {
    try {
        await createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { answer:pc.localDescription,roomId, socketId: socket.id, role: "audience" });
        console.log("answer emited...")
    } catch (err) {
        console.error("Error handleOffer: ",err);
    }
}

async function handleAnswer( answer) {
    try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("audience recived answer, set to remoteDES: ", pc.remoteDescription)
    } catch (err) {
        console.error("Erroring handleAnswer: ",err);
    }
}


// ultis:
async function addNewIceCandidate( candidate) {
 try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate))
    console.log("ICE candidate added!")
 } catch (err) {
    console.error("Erro adding ICE candidate: ",err)
 }
}

function updateRoomSelect(){
    console.log("updateRoomSelect logging: ",availabelRooms)
    roomSelectEl.innerHTML = '';
    return new Promise((resolve) => {
        availabelRooms.forEach( r =>{
            const optionEl = document.createElement("option");
            console.log("logging or r: ",r)
            optionEl.value = r.roomId;
            optionEl.innerHTML = r.host;
            roomSelectEl.appendChild(optionEl);
        })
        if(roomSelectEl.options.length === 1){
            roomSelectEl.value = roomSelectEl.options[0].value
        }
        resolve();
    })
}


