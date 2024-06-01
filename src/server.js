require('dotenv').config();
const fs = require('fs');
const https = require('https')
const path = require('path')
const express = require('express');
const socketio = require('socket.io');
const corsConfig = require('./config/corsConfig')

const PORT = process.env.PORT;
const BASE_URL = process.env.BASE_URL || "localhost";

const app = express();
app.use(express.static(path.join(__dirname,'pages')))

// key and cert for running HTTPS:
const key = fs.readFileSync('./certs/cert.key');
const cert = fs.readFileSync('./certs/cert.crt');

// express server running on HTTPS with the key and cert
const expressServer = https.createServer({key, cert}, app);

const io = socketio(expressServer,corsConfig);

expressServer.listen(PORT, () => {
    console.log( `Express server running on https://${BASE_URL}:${PORT}`)
});


io.on('connection',(socket)=>{
    console.log("Someone has connected",socket.id);
    // const userName = socket.handshake.auth.userName;
    // const password = socket.handshake.auth.password;

    // if(password !== "x"){
    //     socket.disconnect(true);
    //     return;
    // }

    socket.on("join-room", (roomId) => {
        socket.join(roomId);
        console.log(`${socket.id} is joined the room : ${roomId}...`);
        socket.emit('room-joined');
        socket.to(roomId).emit("room-joined")
    });

    //getting offer from streamer, and send data to all audiences
    socket.on("offer", (data) =>{
        console.log(`Recived offer from ${data.socketId} in room ${data.roomId}`)
        socket.to(data.roomId).emit('offer', {socketId: socket.id, ...data});
    });

    socket.on("answer", (data) => {
        console.log(`Recivied answer of:  ${data.socketId} in room ${data.roomId}`)
        socket.to(data.roomId).emit("answer",{socketId: socket.id, ...data});
    });

    socket.on("icecandidate", (data) => {
        console.log(`Recived ICECandidate of:  from ${data.socketId} in room ${data.roomId}`)
        socket.to(data.roomId).emit('icecandidate',{socketId: socket.id, ...data});
    });

    socket.on("disconnect", () => {
        console.log("User disconnected: ",socket.id)
    });

});