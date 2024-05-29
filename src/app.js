const {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  dialog,
} = require("electron");
const path = require("path");

// CA certificate:
const rootCaCertPath = path.join(__dirname, "certs/ca.crt");

// Configure Electron to trust the root CA certificate
app.commandLine.appendSwitch("ignore-certificate-errors", "true");
app.commandLine.appendSwitch("allow-insecure-localhost", "true"); // Allow insecure localhost
// Load the root CA certificate
app.commandLine.appendSwitch("certificate-subject-name", "*/192.168.1.55");
// Trust the root CA certificate
// app.commandLine.appendSwitch(
//   "ignore-certificate-errors-spki-list",
//   "291ab130e1f94324297c6ce3beb3690c2f36ed54d6e2459e48c278fc43401a77"
// );

// create home window:
const createHomeWindow = () => {
  dialog
    .showMessageBox(null, {
      type: "info",
      message:
        "Kev Screens would like to capture the screen. Do you grant permission?",
      buttons: ["Grand", "Deny"],
      defaultId: 0,
    })
    .then(({ response }) => {
      if (response === 0) {
        const homeWindow = new BrowserWindow({
          width: 1920,
          height: 1080,
          webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
          },
          // autoHideMenuBar: true
        });
        homeWindow.loadFile("./src/pages/home.html");
        homeWindow.webContents.openDevTools();
      } else {
        console.log("User denied permission to capture screen.");
        app.quit();
      }
    })
    .catch((err) => {
      console.error("Error displaying permission dialog: ", err);
    });
};

// create room window:
const createRoomWindow = () => {
  console.log(" Room Window creating...");
  const roomWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    // autoHideMenuBar: true
  });
  roomWindow.loadFile("./src/pages/room.html");
  roomWindow.webContents.openDevTools();
};

// creating application main window:
// const createMainWindow = () => {
//     dialog.showMessageBox(null,{
//         type:"info",
//         message:"Kev Screens would like to capture the screen. Do you grant permission?",
//         buttons:['Grand','Deny'],
//         defaultId:0
//     }).then( ({ response }) => {
//         if(response === 0){
//             const mainWindow = new BrowserWindow({
//                 width:1920,
//                 height:1080,
//                 webPreferences:{
//                     nodeIntegration:true,
//                     contextIsolation:false
//                 },
//                 // autoHideMenuBar: true
//             });
//             mainWindow.loadFile("./pages/main.html");
//         }else{
//             console.log("User denied permission to capture screen.");
//             app.quit();
//         }
//     }).catch( err => {
//         console.error('Error displaying permission dialog: ', err);
//     })
// }

app.on("ready", createHomeWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createHomeWindow();
  }
});

ipcMain.handle("getSources", async () => {
  return await desktopCapturer.getSources({ types: ["window", "screen"] });
});

ipcMain.on("create-room", () => {
  createRoomWindow();
});

ipcMain.on("join-room", () => {
    createRoomWindow();
})
