import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import pedidosRoutes from "./routes/pedidos.js";

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

// 🚀 start
app.listen(3000, () => {
  console.log("🚀 API rodando em http://localhost:3000");
});