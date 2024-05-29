const peerConfiguration = require("../config/peerConfiguration");

require("dotenv").config();
const BASE_URL = process.env.BASE_URL;
const PORT = process.env.PORT;

let roomId;
let peerConnection;
const videoElement = document.querySelector("#videoElement");

const socket = io.connect(`https://${BASE_URL}:${PORT}`);

// room number event:
const roomNumberInput = document.querySelector("#room-number-input");
roomNumberInput.addEventListener("change", (e) => {
  roomId = e.target.value;
  console.log("roomId onChange: ", roomId);
});

const handleJoinRoom = () => {
  if (!roomId) {
    alert("Please enter a room number to join!");
    return;
  }
  socket.emit("join-room", roomId);
  console.log("Joining room: ", roomId)

  peerConnection = new RTCPeerConnection(peerConfiguration);

  peerConnection.ontrack = (e) => {
    videoElement.srcObject = e.streams[0];
    console.log("audience reciving track...")
  };

  peerConnection.onicecandidate = (e) => {
    if (e.candidate) {
        console.log("Sending ICE candidate...")
      socket.emit("icecandidate", { candidate: e.candidate, roomId });
    }
  };

  socket.on("offer", async (data) => {
    try {
        console.log("audience reciving offer: ", data)
        await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit("answer", {
        answer: peerConnection.localDescription,
        roomId,
      });
    } catch (err) {
      console.error("Error handling offer: ", err);
    }
  });

  socket.on("icecandidate", (data) => {
    try {
        console.log("audience reciving icecandidate: ", data)
        if(data.candidate){
            peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    } catch (err) {
      console.error("Erro adding recieved ICE candidate: ", err);
    }
  });

};

// join button event:
const joinBtn = document.querySelector("#join-button");
joinBtn.addEventListener("click", handleJoinRoom);
