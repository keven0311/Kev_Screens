require("dotenv").config();
const BASE_URL = process.env.BASE_URL;

const corsConfig = {
  cors: {
    origin: [
      `https://${BASE_URL}`,
      // 'https://LOCAL-DEV-IP-HERE' //if using a phone or another computer
      `https://192.168.1.55`,
    ],
    methods: ["GET", "POST"],
  },
};

module.exports = corsConfig;
