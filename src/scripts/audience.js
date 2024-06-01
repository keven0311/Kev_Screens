const peerConfiguration = window.peerConfig.config


const BASE_URL = window.env.BASE_URL;
const PORT = window.env.PORT;

let roomId;
let peerConnection;
const videoElement = document.querySelector("#videoElement");
const roomNumberInfo = document.querySelector("#room-number-info")
const roomNumberDisplay = document.querySelector("#room-number-display")

// element event listener:
const roomNumberInput = document.querySelector("#room-number-input");
roomNumberInput.addEventListener("change", (e) => {
  roomId = e.target.value;
  roomNumberDisplay.innerHTML = e.target.value;
});

const socket = io.connect(`https://${BASE_URL}:${PORT}`);

socket.on('connect', () => {
  console.log(`Connected to server with socket ID: ${socket.id}`);
});

socket.on('disconnect', () => {
  console.log(`Disconnected from server with socket ID: ${socket.id}`);
});



const handleJoinRoom = async() => {
  if (!roomId) {
    alert("Please enter a room number to join!");
    return;
  }
  peerConnection = new RTCPeerConnection(peerConfiguration);

  peerConnection.ontrack = (e) => {
    videoElement.srcObject = e.streams[0];
    console.log("audience reciving track...")
  };

  socket.emit("join-room", roomId);
  console.log("Joining room: ", roomId, socket.id)

  socket.on("room-joined", async() => {
    console.log("audience received room join confirmation")
    peerConnection.onicecandidate = (e) => {
      if (e.candidate) {
        console.log("audience emitting ICE: ",e.candidate)
        socket.emit("icecandidate", { candidate: e.candidate, roomId, socketId: socket.id });
      }
    };
  })


  // element controls:
  roomNumberInfo.style.display = "flex";

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

// add new ICE candidate:
const addNewIceCandidate = async (iceCandidate) => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
    console.log("Added Ice Candidate!", iceCandidate);
  } catch (err) {
    console.error("Error adding ICE candidate: ", err);
  }
};

socket.on("icecandidate", async (data) => {
  console.log("audience reciving icecandidate: ", data.candidate)
  await addNewIceCandidate(data.candidate)
});

socket.on("offer", async (data) => {
  console.log("audience reciving offer")
  try {
      await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.offer)
    );
    console.log("audiece recived offer SET to remoteDes: ", data.offer)
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", {
      answer: peerConnection.localDescription,
      roomId,
      socketId: socket.id
    });
    console.log("audience emited answer: ", answer)
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
  console.log('set recived answer to remoteDes...')
} catch (err) {
  console.error("Error setting remote description: ", err);
}
});



// join button event:
const joinBtn = document.querySelector("#join-button");
joinBtn.addEventListener("click", handleJoinRoom);
