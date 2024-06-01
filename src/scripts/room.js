const peerConfiguration = window.peerConfig.config

const BASE_URL = window.env.BASE_URL;
const PORT = window.env.PORT;

let roomId;

// room number elements handling:
const roomNumberEl = document.querySelector("#room-number");
const roomNumberInputDiv = document.querySelector("#room-number-input-div");
const roomNumberInput = document.querySelector("#room-number-input");
roomNumberInput.addEventListener("change", (e) => {
  roomNumberEl.innerHTML = `Room Number: ${e.target.value}`;
  roomId = e.target.value;
});
roomNumberEl.addEventListener("click", (e) => {
  if(roomId){
    navigator.clipboard.writeText(roomId)
                        .then(() => {
                          alert("Room number copied to clipboard!")
                        })
                        .catch(err => console.error('Failed to copy room number: ',err))
  }
})

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
  if (!roomId) {
    alert("Please enter a room number first, before start streaming...");
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

    roomNumberEl.style.display = "block";
    roomNumberInputDiv.style.display = "none";
  } catch (err) {
    console.error(err);
  }
};

// handle start screen sharing:
const startSharing = async () => {
  peerConnection = new RTCPeerConnection(peerConfiguration);

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
    console.log("streamer sending track...");
  });

  socket.emit("join-room", roomId);
  console.log("Joining room: ", roomId, socket.id)

  socket.on("room-joined", async () => {
    console.log("streamer received room join confirmation")
    peerConnection.onicecandidate = (e) => {
      if (e.candidate) {
        console.log("streamer emitting ICE: ", e.candidate);
        socket.emit("icecandidate", {
          candidate: e.candidate,
          roomId,
          socketId: socket.id,
        });
      }
    };
  })


  // if getting track from audience?
  peerConnection.ontrack = (e) => {
    console.log("get some track from audience: ", e);
  };

  try {
    const offer = await peerConnection.createOffer();
    console.log("streamer offer created: ", offer);
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", {
      offer: peerConnection.localDescription,
      roomId,
      socketId: socket.id,
    });
    console.log("streamer offer sent!")
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

// socket handle received ICE candidate:
socket.on("icecandidate", async (data) => {
  console.log("reciving icecandidate from server: ", data.candidate);
  await addNewIceCandidate(data.candidate);
});

// socket handle incoming offer
socket.on("offer", async (data) => {
  console.log("streamer reciving offer: ", data);
  try {
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.offer)
    );
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", {
      answer: peerConnection.localDescription,
      roomId,
      socketId: socket.id,
    });
    console.log("stream recived offer, emitting answer back: ", answer)
  } catch (err) {
    console.error("Error handling offer: ", err);
    console.log(peerConnection)
  }
});

// socket handle incoming answer
socket.on("answer", async (data) => {
  try {
    console.log("reciving answer from server: ", data.answer);
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
  const inputSources = await window.ipcRenderer.invoke("getSources");
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
    roomId = null;
    roomNumberInput.value = null;
    roomNumberEl.style.display = "none";
    roomNumberInputDiv.style.display = null;
  }
};
