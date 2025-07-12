// server/app.js
import express from "express";
import cors from "cors";
import { getFilteredItems } from "./sheetsService.js";

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

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log(`Servidor backend escuchando en http://localhost:${PORT}`));
