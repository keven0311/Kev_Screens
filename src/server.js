require('dotenv').config();
const fs = require('fs');
const https = require('https')
const path = require('path')
const express = require('express');
const app = express();
const socketio = require('socket.io');
const corsConfig = require('./config/corsConfig')

const PORT = process.env.PORT;
const BASE_URL = process.env.BASE_URL || "localhost";

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

const offers = [];
const connectedSockets = {};

io.on('connection',(socket)=>{
    console.log("Someone has connected",socket.id);
    const userName = socket.handshake.auth.userName;
    const password = socket.handshake.auth.password;

    if(password !== "x"){
        socket.disconnect(true);
        return;
    }
    connectedSockets[socket.id] = {
        socket,
        userName
    }

    socket.on('create-room', roomId => {
        console.log(`${userName} is creating a room...`)
        socket.join(roomId);
        socket.emit('room-created',roomId)
    });

    socket.on("join-room", (roomId) => {
        console.log(`${userName} is joining the room...`)
        socket.join(roomId);
        socket.to(roomId).emit('user-joined',socket.id);
    })

    socket.on("signal", (data) => {
        const {roomId, signalData} = data;
        socket.to(roomId).emit('signal',{
            signalData,
            socketId:socket.id
        })
    })

    socket.on("disconnect", () => {
        delete connectedSockets[socket.id]
    })

});