const createRoomBtn = document.getElementById("create-room-button");
const audienceBtn = document.getElementById("audience-button");


createRoomBtn.addEventListener("click", () => {
  window.ipcRenderer.send("create-room");
});

audienceBtn.addEventListener("click", () => {
  window.ipcRenderer.send("audience-room");
});

