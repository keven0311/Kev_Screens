require("dotenv").config();
const { ipcRenderer } = require("electron");
const BASE_URL = process.env.BASE_URL;
const PORT = process.env.PORT;

const nickNameInput = document.getElementById("nick-name-input");
const passwordInput = document.getElementById("password");
const createRoomBtn = document.getElementById("create-room-button");
const roomNumberInput = document.getElementById("room-number-input");
const audienceBtn = document.getElementById("audience-button");

let userName = "";
let password = "x";
let roomNumber;
nickNameInput.addEventListener("change", (e) => {
  userName = e.target.value;
});

passwordInput.addEventListener("change", (e) => {
  password = e.target.value;
});

createRoomBtn.addEventListener("click", () => {
  ipcRenderer.send("create-room");
  socket.emit("create-room", roomNumber);
});

const socket = io.connect(`https://${BASE_URL}:${PORT}`, {
  auth: {
    userName,
    password,
  },
});

audienceBtn.addEventListener("click", () => {
  ipcRenderer.send("audience-room");
});
