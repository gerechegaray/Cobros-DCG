// server/sheetsService.js
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

// ✅ ID y rango de tu Google Sheet
const spreadsheetId = "1o-RGF4gxPpUszUCMUXcZQoOVYgoS4D5rBmNzjeImys8";
const range = "'Lista al 03-07-25'!A2:J";

// ✅ Configuración del cliente de Google Sheets
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    project_id: process.env.GOOGLE_PROJECT_ID
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
});

const sheets = google.sheets("v4");

// ✅ Función principal que obtiene y filtra los datos según el rol
export async function getFilteredItems(userRole) {
  const client = await auth.getClient();

  const res = await sheets.spreadsheets.values.get({
    auth: client,
    spreadsheetId,
    range
  });

  const rows = res.data.values;
  if (!rows?.length) return [];

  return rows
    .map(
      ([
        codigo,
        nombre,
        precio,
        precioSugerido,
        categoria,
        subCategoria,
        foto,
        stock,
        pastillaOP,
        vetoOPet
      ]) => ({
        codigo,
        nombre,
        precio,
        precioSugerido,
        categoria,
        subCategoria,
        foto,
        stock,
        vetoOPet
      })
    )
    .filter((item) => {
      if (userRole === "admin") return true;
      if (item.stock?.toUpperCase() !== "SI") return false;
      if (item.vetoOPet?.toUpperCase() === "PET" && !["Santi", "Guille"].includes(userRole))
        return false;
      return true;
    });
}
