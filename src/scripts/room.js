const { ipcRenderer } = require("electron");
const peerConfiguration = require("../config/peerConfiguration");
require("dotenv").config();

const BASE_URL = process.env.BASE_URL || "localhost";
const PORT = process.env.PORT || 8080;
// const userName = "kev-" + Math.floor(Math.random() * 100);
// const password = "x";
const roomId = 1;
// document.querySelector("#username").innerHTML = userName;
document.querySelector("#room-number").innerHTML = roomId;

const socket = io.connect(`https://${BASE_URL}:${PORT}`);

const localVideoElement = document.querySelector("#local-video");

let localStream;
let peerConnection;

const fetchUserMedia = async () => {
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
    startSharing();
  } catch (err) {
    console.error(err);
  }
};

// handle start screen sharing:
const startSharing = async () => {
  peerConnection = new RTCPeerConnection(peerConfiguration);

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
    console.log("streamer sending track...")
  });

  peerConnection.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("icecandidate", { candidate: e.candidate, roomId });
    }
  };
  socket.emit("join-room", roomId);

  // if getting track from audience?
  peerConnection.ontrack = (e) => {
    console.log("get some track from audience: ", e);
  };

  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", { offer: peerConnection.localDescription, roomId });
  } catch (err) {
    console.error("Error creating offer (streamer): ", err);
  }
};

// add new ICE candidate:
const addNewIceCandidate = async (iceCandidate) => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
    console.log("Added Ice Candidate!");
  } catch (err) {
    console.error("Error adding ICE candidate: ", err);
  }
};

// socket handle received ICE candidate:
socket.on("icecandidate", async (data) => {
  await addNewIceCandidate(data.candidate);
});

// socket handle incoming offer
// socket.on('offer', async (offer) => {
//     try {
//         await createPeerConnection({offer})
//     } catch (err) {

//     }
// })

// socket handle incoming answer
socket.on("answer", async (data) => {
  try {
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.answer)
    );
  } catch (err) {
    console.error("Error setting remote description: ", err);
  }
});

// stream window options:
const displaySelectMenu = document.getElementById("selectMenu");
const getSourcesButton = document.getElementById("getSourcesButton");

async function getVideoSource() {
  console.log("getVideoSource called");
  const inputSources = await ipcRenderer.invoke("getSources");
  inputSources.forEach((source) => {
    const element = document.createElement("option");
    element.value = source.id;
    element.innerHTML = source.name;
    displaySelectMenu.appendChild(element);
  });
}

getSourcesButton.onclick = getVideoSource;

// start button:
const startButton = document.getElementById("startButton");
startButton.onclick = fetchUserMedia;

// stop button:
const stopButton = document.getElementById("stopButton");
stopButton.onclick = () => {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localVideoElement.srcObject = null;
    startButton.disabled = false;
    stopButton.disabled = true;
  }
};
