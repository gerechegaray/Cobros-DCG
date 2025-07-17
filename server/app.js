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

// Elimino cache y endpoint de productos de Alegra
// let alegraItemsCache = null;
// let alegraItemsCacheTimestamp = 0;
// const ITEMS_CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutos

// app.get("/api/alegra/items", async (req, res) => {
//   ...
// });

// Eliminar endpoint de cotización en Alegra
// app.post("/api/alegra/quotation", async (req, res) => {
//   console.log("[ALEGRA] Recibida petición para crear cotización", req.body);
//   const email = process.env.VITE_ALEGRA_API_EMAIL;
//   const apiKey = process.env.VITE_ALEGRA_API_KEY;
//   if (!email || !apiKey) {
//     return res.status(500).json({ error: "Faltan credenciales de Alegra en el backend" });
//   }
//   try {
//     const { cliente, items, fecha, condicion, observaciones, vendedor } = req.body;
//     // Mapear los ítems al formato de Alegra
//     const alegraItems = items.map((item) => ({
//       id: item.producto, // id del producto en Alegra
//       quantity: item.cantidad,
//       discount: item.descuento || 0
//     }));
//     const quotation = {
//       client: cliente, // id del cliente en Alegra
//       items: alegraItems,
//       date: fecha,
//       notes: observaciones,
//       seller: vendedor,
//       termsConditions: condicion
//     };
//     const response = await fetch("https://api.alegra.com/api/v1/quotations", {
//       method: "POST",
//       headers: {
//         "Authorization": "Basic " + Buffer.from(email + ":" + apiKey).toString("base64"),
//         "Content-Type": "application/json"
//       },
//       body: JSON.stringify(quotation)
//     });
//     const data = await response.json();
//     if (!response.ok) {
//       return res.status(response.status).json({ error: data.message || "Error al crear cotización en Alegra" });
//     }
//     res.json(data);
//   } catch (err) {
//     console.error("Error al crear cotización en Alegra:", err);
//     res.status(500).json({ error: "Error interno al crear cotización en Alegra" });
//   }
// });

app.get("/api/sheets/clientes", async (req, res) => {
  try {
    const clientes = await getLatestClientes();
    res.json(clientes);
  } catch (err) {
    console.error("Error al obtener clientes de Google Sheets:", err);
    res.status(500).json({ error: "Error al obtener clientes de Google Sheets" });
  }
});

app.get("/api/sheets/productos", async (req, res) => {
  try {
    const productos = await getLatestProductos();
    res.json(productos);
  } catch (err) {
    console.error("Error al obtener productos de Google Sheets:", err);
    res.status(500).json({ error: "Error al obtener productos de Google Sheets" });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log(`Servidor backend escuchando en http://localhost:${PORT}`));
