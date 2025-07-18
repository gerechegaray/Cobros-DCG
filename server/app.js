// server/app.js
import express from "express";
import cors from "cors";
import { getFilteredItems, getLatestClientes, getLatestProductos } from "./sheetsService.js";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/items", async (req, res) => {
  const userRole = req.query.role;
  if (!userRole) return res.status(400).json({ error: "Role is required" });

  try {
    const items = await getFilteredItems(userRole);
    res.json(items);
  } catch (err) {
    console.error("Error al obtener ítems:", err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Eliminar imports y endpoints relacionados con sheetsService y /api/sheets/*

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log(`Servidor backend escuchando en http://localhost:${PORT}`));
