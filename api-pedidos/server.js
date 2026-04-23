import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import pedidosRoutes from "./routes/pedidos.js";

import { createServer } from "http";
import { Server } from "socket.io";

const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// 🔌 MongoDB (com tratamento)
mongoose.connect("mongodb+srv://adminpedidos:Hi0wdCWVD0NOJDVM@cluster0.x5budt4.mongodb.net/?appName=Cluster0")
  .then(() => console.log("🟢 MongoDB conectado"))
  .catch(err => console.error("❌ Erro Mongo:", err));

// 🌐 rotas
app.use("/pedidos", pedidosRoutes);

// ⚡ WebSocket
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// disponibiliza o io nas rotas
app.set("io", io);

// conexão socket
io.on("connection", (socket) => {
  console.log("🔌 Cliente conectado:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Cliente desconectado:", socket.id);
  });
});

// 🚀 start
server.listen(3000, () => {
  console.log("🚀 API rodando em http://localhost:3000");
});