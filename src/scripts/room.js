const { ipcRenderer } = require("electron");
const peerConfiguration = require("../config/peerConfiguration");

require("dotenv").config();
const BASE_URL  = process.env.BASE_URL || "localhost";
const PORT = process.env.PORT || 8080;
const userName = "kev-" + Math.floor(Math.random() * 100);
const password = "x";
const roomId = 1;
document.querySelector("#username").innerHTML = userName;
document.querySelector('#room-number').innerHTML = roomId;

const socket = io.connect(`https://${BASE_URL}:${PORT}`, {
  auth: {
    userName,
    password,
  }
});

const localVideoElement = document.querySelector("#local-video");
const remoteVideoContainer = document.querySelector("#remote-video-container");

let localStream;
let remoteStream;
let peerConnection;

// google stun server:
// TODO: may need create one????
// let peerConfiguration = {
//     iceServers:[
//         {
//             urls:[
//               'stun:stun.l.google.com:19302',
//               'stun:stun1.l.google.com:19302'
//             ]
//         }
//     ]
// }

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
  try {
    await createPeerConnection();

    peerConnection.addEventListener("icecandidate", (e) => {
      if (e.candidate) {
        socket.emit("signal", {
          type: "candidate",
          candidate: e.candidate,
          roomId: roomId,
        });
      }
    });

    peerConnection.addEventListener("track", (e) => {
      const videoElement = document.createElement("video");
      videoElement.srcObject = e.streams[0];
      videoElement.autoplay = true;
      videoElement.controls = true;
      remoteVideoContainer.appendChild(videoElement);
    });

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit("signal", {
      type: "offer",
      offer: peerConnection.localDescription,
      roomId: roomId,
    });
  } catch (error) {
    console.error("Error starting sharing:", error);
  }
};

// creating PEER connection:
const createPeerConnection = () => {
  peerConnection = new RTCPeerConnection(peerConfiguration);
};

// handle incoming signals:
socket.on("signal", async (data) => {
  if (!peerConnection) await createPeerConnection();

  switch (data.type) {
    case "offer":
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit("signal", {
        type: "answer",
        answer: peerConnection.localDescription,
        roomId: roomId,
      });
      break;
    case "answer":
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.answer)
      );
      break;
    case "candidate":
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      break;
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
