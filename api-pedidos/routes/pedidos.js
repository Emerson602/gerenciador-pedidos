import express from "express";
import Pedido from "../models/Pedido.js";

const router = express.Router();

// LISTAR
router.get("/", async (req, res) => {
  const pedidos = await Pedido.find().sort({ createdAt: -1 });
  res.json(pedidos);
});

// CRIAR
router.post("/", async (req, res) => {
  const novo = new Pedido(req.body);
  await novo.save();

  req.app.get("io").emit("pedidosAtualizados");

  res.json(novo);
});

// SYNC (vem do seu script.js)
router.post("/sync", async (req, res) => {
  const pedidos = req.body;

  try {
    for (const p of pedidos) {
      await Pedido.findOneAndUpdate(
        { pedido: p.pedido },
        p,
        { upsert: true, new: true }
      );
    }

    // 🔥 ESSENCIAL para tempo real
    req.app.get("io").emit("pedidosAtualizados");

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ATUALIZAR
router.put("/:id", async (req, res) => {
  const atualizado = await Pedido.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  req.app.get("io").emit("pedidosAtualizados");

  res.json(atualizado);
});

// DELETAR
router.delete("/:id", async (req, res) => {
  await Pedido.findByIdAndDelete(req.params.id);

  req.app.get("io").emit("pedidosAtualizados");

  res.json({ ok: true });
});

export default router;