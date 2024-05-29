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
        console.log(`${socket.id} is joining the room : ${roomId}...`);
        socket.join(roomId);
    });

    socket.on("offer", (data) =>{
        console.log(`Recived offer from ${data}`)
        socket.to(data.roomId).emit('offer', data);
    });

    socket.on("answer", (data) => {
        console.log(`Recivied answer of:  ${data}`)
        socket.to(data.roomId).emit("answer",data);
    });

    socket.on("icecandidate", (data) => {
        console.log(`Recived ICECandidate of: ${data}`)
        socket.to(data.roomId).emit('icecandidate',data);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected: ",socket.id)
    });

});