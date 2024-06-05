const createRoomBtn = document.getElementById("create-room-button");
const audienceBtn = document.getElementById("audience-button");

const { PORT, BASE_URL, peerConfiguration} = window.config;

console.log(PORT, BASE_URL, peerConfiguration);



createRoomBtn.addEventListener("click", () => {
  window.ipcRenderer.send("create-room");
});

audienceBtn.addEventListener("click", () => {
  window.ipcRenderer.send("audience-room");
});

