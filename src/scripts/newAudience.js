let PORT;
let BASE_URL;
let peerConfiguration;
async function getEnv() {
  await window.ipcRenderer
    .invoke("env")
    .then((res) => {
      PORT = res.port;
      BASE_URL = res.base_url;
    })
    .catch((err) => console.error(err));
}
async function getPeerConfig() {
  await window.ipcRenderer
    .invoke("peerConfiguration")
    .then((res) => {
      peerConfiguration = res;
    })
    .catch((err) => console.error(err));
}

// Element selection
const videoElement = document.querySelector("#videoElement");
const nickNameInfo = document.querySelector("#nick-name-info");
const nickNameDisplay = document.querySelector("#nick-name-display");
const nickNameInput = document.querySelector("#nick-name-input");
const joinBtn = document.querySelector("#join-button");
const chatRoom = document.querySelector("#chat-room");
const refreshBtn = document.querySelector("#refresh-available-rooms");
const roomSelectEl = document.querySelector("#room-select");
const leaveBtn = document.querySelector("#leave-button");

// Variables
let socket;
let nickName;
let roomId;
let streamerSocketId;
let availabelRooms;
let peerConnectionMap = new Map();

// DOM elements event listeners:
nickNameInput.addEventListener("change", (e) => {
  nickName = e.target.value;
});

roomSelectEl.addEventListener("change", (e) => {
  console.log("roomSelectEl event 'change': ", e.target.value);
  roomSelectEl.value = e.target.value;
  roomId = e.target.value;
});

refreshBtn.addEventListener("click", async (e) => {
  try {
    const data = await emitWithPromise(socket, "availabelrooms");
    availabelRooms = JSON.parse(data);
    await updateRoomSelect();
  } catch (err) {
    console.error("Error reciving available rooms: ", err);
  }
});

leaveBtn.addEventListener("click", (e) => {
  try {
    const pc = peerConnectionMap.get(streamerSocketId);
    // emit socket server and leave current room
    socket.emit("leave-room", { roomId, role: "audience" });
    console.log(`audience id: ${socket.id} left room: ${roomId}`);
    // close currernt RTCPeerConnection
    if (pc) {
      pc.close();
    }
    peerConnectionMap.delete(streamerSocketId);
    console.log(`audience PC closed: `, pc);
  } catch (err) {
    console.error("Error leaving room: ", err);
  }
});

joinBtn.addEventListener("click", handleJoinRoom);
// ------------------------------------------------------------------------------

// Socket.io connection
async function connectSocketIo() {
  await getEnv();
  await getPeerConfig();
  socket = io.connect(`https://${BASE_URL}:${PORT}`);

  socket.on("connect", () => {
    console.log(`Connected to server with socket ID: ${socket.id}`);
    // TODO: dynanmic roomId && userName here with availabel room id:
    socket.emit("availabelrooms");
  });

  socket.on("joined-room", (data) => {
    console.log("joined-room event: ", data.roomId);
  });

  // reciving availabel streaming rooms from server:
  socket.on("availabelrooms", async (data) => {
    availabelRooms = await JSON.parse(data);
    console.log("GET availabelrooms from server: ", availabelRooms);
  });

  socket.on("disconnect", () => {
    console.log(`Disconnected from server with socket ID: ${socket.id}`);
    peerConnectionMap.delete(socket.id);
  });

  socket.on("icecandidate", async (data) => {
    console.log("Audience receiving ICE candidate: ", data.candidate);
    if (data.role != "streamer") {
      return;
    } else {
      await addNewIceCandidate(data.socketId, data.candidate);
    }
  });

  socket.on("streameroffer", async (data) => {
    console.log("Audience receiving offer");
    const { socketId, offer, role, roomId } = data;
    if (peerConnectionMap.get(socketId)) {
      console.log("already connected to streamer.... skipping this offer");
      return;
    } else {
      streamerSocketId = data.socketId;
      await handleOffer(socketId, offer);
    }
  });

  socket.on("answer", async (data) => {
    console.log("Receiving answer from server: ", data.answer);
    const { socketId, answer, role } = data;
    if (role != "streamer") {
      return;
    } else {
      await handleAnswer(socket.id, answer);
    }
  });

  // Listen for incoming messages
  socket.on("chat-message", (data) => {
    appendMessage("incoming", data);
  });
}
// ------------------------------------------------------------------------------

// Peer connection event handling:
async function handleJoinRoom() {
  roomId = roomSelectEl.value;
  if (!roomId) {
    alert("Please select a room to join!");
    return;
  }
  if (!nickName) {
    alert("Please pick a Nick Name first!");
    return;
  }
  socket.emit("join-room", { roomId, userName: nickName, role: "audience" });
  console.log(" audience joining room: ", roomId);
  nickNameInfo.style.display = "flex";
  nickNameDisplay.innerHTML = `${roomSelectEl.value}'s stream`;
}

function createPeerConnection(socketId) {
  return new Promise((resolve, rejct) => {
    if (peerConnectionMap.get(socketId)) {
      console.log("createPC function socketId: ", socketId);
      console.error(" THIS ID EXSISTS IN THE MAP!!!!!  ");
      rejct();
    }
    const pc = new RTCPeerConnection(peerConfiguration);

    pc.ontrack = (e) => {
      console.log("recived track...");
      videoElement.srcObject = e.streams[0];
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("icecandidate", {
          candidate: e.candidate,
          roomId,
          socketId: socket.id,
          role: "audience",
        });
        console.log("audience icecandidate sent...");
      } else {
        console.log("onicecandidate event triggered, but NO candidate!");
      }
    };

    pc.onicegatheringstatechange = (e) => {
      console.log("onicegatheringstatechange event triggerd!!!");
      // if(pc.iceGatheringState === 'complete'){
      //     pc.createOffer()
      //         .then(offer => pc.setLocalDescription(offer))
      //         .then(() => {
      //             socket.emit("offer", {offer: pc.localDescription, roomId, socketId: socket.id})
      //         })
      //         .catch(err => console.error("Error creating offer in onicegaheringstatechange event: ",err))
      // }
    };

    pc.onnegotiationneeded = async () => {
      console.log("...onnegotiationneed event trigged...", pc);
      // if(!pc.localDescription){
      //     const offer = await pc.createOffer();
      //     await pc.setLocalDescription(new RTCSessionDescription(offer));
      //     socket.emit("offer", {offer: pc.localDescription, roomId, socketId:socket.id})
      //     console.log("localDES: ",pc.localDescription,"remoteDES: ",pc.remoteDescription)
      // }else{
      //     socket.emit("offer", {offer: pc.localDescription, roomId, socketId:socket.id})
      //     console.log("localDES: ",pc.localDescription,"remoteDES: ",pc.remoteDescription)
      // }
    };

    peerConnectionMap.set(socketId, pc);
    console.log("NEW PeerConnection created.", pc);
    resolve(pc);
  });
}

async function sendOffer(socketId) {
  try {
    const pc = await createPeerConnection(socketId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(new RTCSessionDescription(offer));
    socket.emit("offer", {
      offer: pc.localDescription,
      roomId,
      socketId: socket.id,
    });
    console.log(
      " offer emitted...(sendOffer)",
      `localDES: ${pc.localDescription} &&&& remoteDES: ${pc.remoteDescription}`
    );
  } catch (err) {
    console.error("Erroring sending offer: ", err);
  }
}

async function handleOffer(socketId, offer) {
  try {
    console.log("handleOffer handling...");
    const pc = await createPeerConnection(socketId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answer", {
      answer: pc.localDescription,
      roomId,
      socketId: socket.id,
      role: "audience",
    });
    console.log("answer emited...");
  } catch (err) {
    console.error("Error handleOffer: ", err);
  }
}

async function handleAnswer(socketId, answer) {
  try {
    const pc = peerConnectionMap.get(socketId);
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    console.log(
      "audience recived answer, set to remoteDES: ",
      pc.remoteDescription
    );
  } catch (err) {
    console.error("Erroring handleAnswer: ", err);
  }
}
// ------------------------------------------------------------------------------

// ultis:
async function addNewIceCandidate(socketId, candidate) {
  try {
    const pc = peerConnectionMap.get(socketId);
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
    console.log("ICE candidate added!");
  } catch (err) {
    console.error("Erro adding ICE candidate: ", err);
  }
}

// handle socket event responses with a promise
function emitWithPromise(socket, event, data) {
  return new Promise((resolve) => {
    socket.emit(event, data);
    socket.on(event, (res) => {
      resolve(res);
    });
  });
}

// update available room into DOM
function updateRoomSelect() {
  roomSelectEl.innerHTML = "";
  return new Promise((resolve) => {
    availabelRooms.forEach((r) => {
      const optionEl = document.createElement("option");
      optionEl.value = r.roomId;
      optionEl.innerHTML = r.host;
      roomSelectEl.appendChild(optionEl);
    });
    if (roomSelectEl.options.length === 1) {
      roomSelectEl.value = roomSelectEl.options[0].value;
    }
    resolve();
  });
}

// connect to server upon rendered:
connectSocketIo();
