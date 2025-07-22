// server/app.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

// Importo el servicio de Alegra
import { getAlegraInvoices } from "./alegraService.js";

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint para obtener facturas de venta de Alegra
app.get("/api/alegra/invoices", async (req, res) => {
  try {
    const facturas = await getAlegraInvoices();
    res.json(facturas);
  } catch (error) {
    console.error("Error al obtener facturas de Alegra:", error);
    res.status(500).json({ error: error.message });
  }
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log(`Servidor backend escuchando en http://localhost:${PORT}`));
