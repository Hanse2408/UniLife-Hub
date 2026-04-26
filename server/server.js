require("dotenv").config();
const mongoose = require("mongoose");
const http = require("http");

const app = require("./app");
const { initializeSocket } = require("./src/sockets");

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    const server = http.createServer(app);
    initializeSocket(server);

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use.`);
        console.error("Run `npm run dev` to replace a stale local server, or stop the other process using port 5000.");
      } else {
        console.error("Server failed to start:", error);
      }

      mongoose.disconnect().catch(() => null).finally(() => {
        process.exit(1);
      });
    });

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });