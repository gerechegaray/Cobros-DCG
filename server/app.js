// server/app.js
import express from "express";
import cors from "cors";
import { getFilteredItems } from "./sheetsService.js";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());

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

app.get("/api/alegra/contacts", async (req, res) => {
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
  const limit = 100; // máximo permitido por Alegra
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
      console.log(`Respuesta cruda de Alegra (start=${start}):`, text);
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return res.status(500).send("Respuesta no es JSON: " + text);
      }
      if (Array.isArray(data) && data.length > 0) {
        allContacts = allContacts.concat(data);
        start += data.length;
        hasMore = data.length === limit;
      } else {
        hasMore = false;
      }
    }
    res.json(allContacts);
  } catch (err) {
    console.error("Error al consultar Alegra:", err);
    res.status(500).json({ error: "Error interno al consultar Alegra" });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log(`Servidor backend escuchando en http://localhost:${PORT}`));
