import mongoose from "mongoose";

const PedidoSchema = new mongoose.Schema({
  pedido: String,
  data: String,
  entregador: String,
  recebido: String,
  pronto: String,
  chamei: String,
  saiu: String,
  observacao: String
}, { timestamps: true });

export default mongoose.model("Pedido", PedidoSchema);