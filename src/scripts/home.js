const createRoomBtn = document.getElementById("create-room-button");
const audienceBtn = document.getElementById("audience-button");

// let userName = "";
// let password = "x";
let roomNumber;

createRoomBtn.addEventListener("click", () => {
  window.ipcRenderer.send("create-room");
  socket.emit("create-room", roomNumber);
});

audienceBtn.addEventListener("click", () => {
  window.ipcRenderer.send("audience-room");
});

// const socket = io.connect(`https://${BASE_URL}:${PORT}`, {
//   auth: {
//     userName,
//     password,
//   },
// });
