const peerConfiguration = window.peerConfig.config


const BASE_URL = window.env.BASE_URL;
const PORT = window.env.PORT;

let roomId;
let peerConnection;
const videoElement = document.querySelector("#videoElement");

const socket = io.connect(`https://${BASE_URL}:${PORT}`);

socket.on('connect', () => {
  console.log(`Connected to server with socket ID: ${socket.id}`);
});

socket.on('disconnect', () => {
  console.log(`Disconnected from server with socket ID: ${socket.id}`);
});

// room number event:
const roomNumberInput = document.querySelector("#room-number-input");
roomNumberInput.addEventListener("change", (e) => {
  roomId = e.target.value;
  console.log("roomId onChange: ", roomId);
});

const handleJoinRoom = async() => {
  if (!roomId) {
    alert("Please enter a room number to join!");
    return;
  }
  socket.emit("join-room", roomId);
  console.log("Joining room: ", roomId, socket.id)

  peerConnection = new RTCPeerConnection(peerConfiguration);

  peerConnection.ontrack = (e) => {
    videoElement.srcObject = e.streams[0];
    console.log("audience reciving track...")
  };

  peerConnection.onicecandidate = (e) => {
    if (e.candidate) {
        console.log("Sending ICE candidate...")
      socket.emit("icecandidate", { candidate: e.candidate, roomId, socketId: socket.id });
    }
  };

  try {
    const offer = await peerConnection.createOffer();
    console.log("audience offer created: ",offer)
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", { offer: peerConnection.localDescription, roomId, socketId: socket.id });
    console.log("audience offer sent!")
  } catch (err) {
    console.error("Error creating offer (streamer): ", err);
  }


};

socket.on("offer", async (data) => {
  console.log("audience reciving offer: ", data)
  try {
      await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.offer)
    );
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", {
      answer: peerConnection.localDescription,
      roomId,
      socketId: socket.id
    });
  } catch (err) {
    console.error("Error handling offer: ", err);
  }
});

// socket handle incoming answer
socket.on("answer", async (data) => {
try {
  console.log('reciving answer from server: ',data.answer);
  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(data.answer)
  );
} catch (err) {
  console.error("Error setting remote description: ", err);
}
});

socket.on("icecandidate", (data) => {
  console.log("audience reciving icecandidate: ", data)
  try {
      if(data.candidate){
          peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
  } catch (err) {
    console.error("Erro adding recieved ICE candidate: ", err);
  }
});

// join button event:
const joinBtn = document.querySelector("#join-button");
joinBtn.addEventListener("click", handleJoinRoom);
