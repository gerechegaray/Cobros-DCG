// server/app.js
import express from "express";
import cors from "cors";
import { getFilteredItems } from "./sheetsService.js";
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

// Cache en memoria para clientes de Alegra
let alegraContactsCache = null;
let alegraContactsCacheTimestamp = 0;
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutos

app.get("/api/alegra/contacts", async (req, res) => {
  const now = Date.now();
  if (alegraContactsCache && (now - alegraContactsCacheTimestamp) < CACHE_DURATION_MS) {
    console.log('Sirviendo clientes de Alegra desde cache');
    return res.json(alegraContactsCache);
  }
  const email = process.env.VITE_ALEGRA_API_EMAIL;
  const apiKey = process.env.VITE_ALEGRA_API_KEY;
  console.log("EMAIL:", email);
  console.log("API KEY:", apiKey);
  if (!email || !apiKey) {
    return res.status(500).json({ error: "Faltan credenciales de Alegra en el backend" });
  }
  const auth = Buffer.from(`${email}:${apiKey}`).toString("base64");
  let allContacts = [];
  let start = 0;
  const limit = 30; // máximo permitido por Alegra
  let hasMore = true;
  try {
    while (hasMore) {
      const url = `https://api.alegra.com/api/v1/contacts?start=${start}&limit=${limit}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return res.status(500).send("Respuesta no es JSON: " + text);
      }
      // Manejo de rate limit
      if (data && data.code === 429) {
        const waitSeconds = data.headers && data.headers['x-rate-limit-reset'] ? parseInt(data.headers['x-rate-limit-reset'], 10) : 60;
        console.log(`Rate limit alcanzado. Esperando ${waitSeconds} segundos antes de continuar...`);
        await sleep(waitSeconds * 1000);
        continue; // Reintenta la misma página
      }
      console.log(`Iteración start=${start}: recibidos ${Array.isArray(data) ? data.length : 0} clientes`);
      if (Array.isArray(data) && data.length > 0) {
        allContacts = allContacts.concat(data);
        console.log(`Total acumulado: ${allContacts.length}`);
        start += data.length;
        hasMore = data.length > 0;
        await sleep(1000); // Espera 1 segundo entre peticiones
      } else {
        console.log(`Respuesta de Alegra cuando start=${start}:`, text);
        hasMore = false;
      }
    }
    console.log(`Total final de clientes enviados al frontend: ${allContacts.length}`);
    alegraContactsCache = allContacts;
    alegraContactsCacheTimestamp = Date.now();
    res.json(allContacts);
  } catch (err) {
    console.error("Error al consultar Alegra:", err);
    res.status(500).json({ error: "Error interno al consultar Alegra" });
  }
});

// Cache en memoria para productos de Alegra
let alegraItemsCache = null;
let alegraItemsCacheTimestamp = 0;
const ITEMS_CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutos

app.get("/api/alegra/items", async (req, res) => {
  const now = Date.now();
  if (alegraItemsCache && (now - alegraItemsCacheTimestamp) < ITEMS_CACHE_DURATION_MS) {
    console.log('Sirviendo productos de Alegra desde cache');
    return res.json(alegraItemsCache);
  }
  const email = process.env.VITE_ALEGRA_API_EMAIL;
  const apiKey = process.env.VITE_ALEGRA_API_KEY;
  if (!email || !apiKey) {
    return res.status(500).json({ error: "Faltan credenciales de Alegra en el backend" });
  }
  const auth = Buffer.from(`${email}:${apiKey}`).toString("base64");
  let allItems = [];
  let start = 0;
  const limit = 30;
  let hasMore = true;
  try {
    while (hasMore) {
      const url = `https://api.alegra.com/api/v1/items?start=${start}&limit=${limit}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return res.status(500).send("Respuesta no es JSON: " + text);
      }
      if (data && data.code === 429) {
        const waitSeconds = data.headers && data.headers['x-rate-limit-reset'] ? parseInt(data.headers['x-rate-limit-reset'], 10) : 60;
        console.log(`Rate limit alcanzado (items). Esperando ${waitSeconds} segundos antes de continuar...`);
        await sleep(waitSeconds * 1000);
        continue;
      }
      console.log(`Iteración start=${start}: recibidos ${Array.isArray(data) ? data.length : 0} productos`);
      if (Array.isArray(data) && data.length > 0) {
        // Mapear el stock correctamente
        const mapped = data.map(item => ({
          ...item,
          stock: item.inventory && typeof item.inventory.quantity === 'number' ? item.inventory.quantity : 0
        }));
        allItems = allItems.concat(mapped);
        console.log(`Total acumulado: ${allItems.length}`);
        start += data.length;
        hasMore = data.length > 0;
        await sleep(1000);
      } else {
        console.log(`Respuesta de Alegra cuando start=${start}:`, text);
        hasMore = false;
      }
    }
    console.log(`Total final de productos enviados al frontend: ${allItems.length}`);
    alegraItemsCache = allItems;
    alegraItemsCacheTimestamp = Date.now();
    res.json(allItems);
  } catch (err) {
    console.error("Error al consultar productos de Alegra:", err);
    res.status(500).json({ error: "Error interno al consultar productos de Alegra" });
  }
});

app.post("/api/alegra/quotation", async (req, res) => {
  console.log("[ALEGRA] Recibida petición para crear cotización", req.body);
  const email = process.env.VITE_ALEGRA_API_EMAIL;
  const apiKey = process.env.VITE_ALEGRA_API_KEY;
  if (!email || !apiKey) {
    return res.status(500).json({ error: "Faltan credenciales de Alegra en el backend" });
  }
  const auth = Buffer.from(`${email}:${apiKey}`).toString("base64");
  const { cliente, items, fecha, condicion, observaciones, vendedor } = req.body;
  try {
    // Mapear los ítems al formato de Alegra
    const alegraItems = items.map((item) => ({
      id: item.producto, // id del producto en Alegra
      quantity: item.cantidad,
      discount: item.descuento || 0
    }));
    const quotation = {
      client: cliente, // id del cliente en Alegra
      items: alegraItems,
      date: fecha ? new Date(fecha).toISOString().slice(0, 10) : undefined,
      notes: observaciones || undefined,
      seller: vendedor || undefined,
      terms: condicion || undefined
    };
    const response = await fetch("https://api.alegra.com/api/v1/quotations", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(quotation)
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || "Error al crear cotización en Alegra" });
    }
    res.json(data);
  } catch (err) {
    console.error("Error al crear cotización en Alegra:", err);
    res.status(500).json({ error: "Error interno al crear cotización en Alegra" });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log(`Servidor backend escuchando en http://localhost:${PORT}`));
