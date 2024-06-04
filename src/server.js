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

// variables:
const audienceList = new Map();
const availabelRoom = new Map();


io.on('connection',(socket)=>{
    console.log("Someone has connected",socket.id);
    // const currentUserName = socket.handshake.auth.userName;
    // const password = socket.handshake.auth.password;

    // if(password !== "x"){
    //     socket.disconnect(true);
    //     return;
    // }
    const currentAudience = audienceList.get(socket.io)


    // streaming room related events:
    socket.on('join-room', (data) => {
        console.log("recived data on 'join-room': ", data)
        const { roomId , role, userName } = data
        
        socket.join(roomId);
        console.log(` ${socket.id} joined room : ${roomId}`)
        socket.emit('joined-room', {roomId})
        console.log(`${socket.id} joined room: ${roomId}`)
        
        // emitting 'peer-joined' message to streamer to establish PC:
        socket.to(roomId).emit('peer-joined', { socketId: socket.id, role, userName });
        
        if(!currentAudience && role != "streamer"){
            audienceList.set(socket.id, {
                role: role,
                userName: userName,
                joinedRoom: roomId
            })
        }else if(currentAudience){
            currentAudience.joinedRoom = roomId;
        }
        
    //    console.log(`${currentAudience?.userName}: ${socket.id} joined room: ${roomId}`)
    //    console.log(`someone joined room, audienceList : ${JSON.stringify([...audienceList])}`);
    //    console.log(`availabeRooms: ${JSON.stringify([...availabelRoom])}`);
    });

    socket.on("leave-room", (data) => {
        socket.leave(data.roomId);
        // reset audience joinedRoom:
        if(currentAudience){
            currentAudience.joinedRoom = "";
        }
        // deleting the streaming room if it's a streamer:
        if(data.role == "streamer"){
            availabelRoom.delete(roomId);
        }
        console.log(`${socket.id} left room: ${roomId}`)
    })

    socket.on("createroom", (data) => {
        const { userName,role } = data;
        const currentRoom = availabelRoom.get(socket.id);
        if(!currentRoom && role === "streamer"){
            availabelRoom.set(socket.id, {
                host: userName,
                roomId: userName
                // TODO: add needed information about the room
            })
            console.log("new streamer room creted: ", `roomId : ${socket.id}`)
            socket.join(userName);
            console.log(`in createroom event, streamer joined room: ${userName}`)
        }
        console.log(`available rooms: ${JSON.stringify([...availabelRoom.values()])}`)
    })

    socket.on("availabelrooms", () => {
        // emitting available rooms to audience once connected:
        const mapValues = availabelRoom.values();
        const parsedMap = JSON.stringify([...mapValues])
        socket.emit("availabelrooms", parsedMap)
        console.log("emitted available room to : ", socket.id)
    })


    // RTCPeerConnection signling services:
    socket.on("offer", (data) =>{
        console.log(`Recived offer from ${data.socketId} in room ${data.roomId}`);
        const { role , roomId} = data;
        if(role == 'streamer'){
            // emitting streamer offer to audience
            socket.to(roomId).emit('streameroffer', data);
        }else if( role == 'audience'){
            // incase future audience need send offer out
            socket.to(roomId).emit('audienceoffer',data)
        }
    });

    socket.on("answer", (data) => {
        console.log(`Recivied answer ${data.socketId} in room ${data.roomId}`);
        socket.to(data.roomId).emit("answer",data);
    });

    socket.on("icecandidate", (data) => {
        console.log(`Recived ICECandidate from ${data.socketId} in room ${data.roomId}`)
        socket.to(data.roomId).emit('icecandidate',data);
    });


    // Chat room message singling services:
    socket.on("chat-room", (data) => {
        const { message, roomId, nickName } = data;
        socket.to(roomId).emit("chat-message", { message })
        console.log(`Recived message: ${data.message} in room:${roomId}`)
    })


    socket.on('disconnect', () => {
        const disconnectedAudience = audienceList.get(socket.id)
        // deleting audience from list && emit 'peer-disconnected' message to streamer when disconnected:
        if(disconnectedAudience){
            const { userName, joinedRoom, role } = disconnectedAudience;
            if(joinedRoom){
                socket.to(joinedRoom).emit('peer-disconnected', {socketId:socket.id});
            }
            socket.leave(joinedRoom);
            audienceList.delete(socket.id)
        }
        
        // deleting room when streamer left:
        if(availabelRoom.has(socket.id)){
            availabelRoom.delete(socket.id);
        }

        console.log(`Peer disconnected: ${socket.id}`)
        console.log(`updated available rooms: ${JSON.stringify([...availabelRoom])}`)
        console.log(`updated audience list: ${JSON.stringify([...audienceList])}`)
    });

});