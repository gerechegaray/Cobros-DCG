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

// Devuelve el nombre de la hoja más reciente que empieza con el prefijo dado
async function getLatestSheetName(prefix) {
  const client = await auth.getClient();
  const res = await sheets.spreadsheets.get({
    auth: client,
    spreadsheetId
  });
  const sheetsList = res.data.sheets.map(s => s.properties.title);
  // Filtrar por prefijo y extraer fecha
  const filtered = sheetsList
    .filter(name => name.startsWith(prefix))
    .map(name => ({
      name,
      date: (name.match(/(\d{2}-\d{2}-\d{2})/) || [])[1] || "00-00-00"
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
  return filtered.length > 0 ? filtered[0].name : null;
}

export async function getLatestClientes() {
  const sheetName = await getLatestSheetName("Clientes");
  if (!sheetName) return [];
  const client = await auth.getClient();
  const res = await sheets.spreadsheets.values.get({
    auth: client,
    spreadsheetId,
    range: `'${sheetName}'!A2:Z`
  });
  const rows = res.data.values;
  if (!rows?.length) return [];
  // Mapear: id = primera columna, razonSocial = segunda columna
  return rows.map(([id, razonSocial, ...rest]) => ({
    id,
    razonSocial,
    extra: rest
  }));
}

export async function getLatestProductos() {
  // Usar hoja fija y rango fijo para evitar errores de nombre
  const sheetName = 'Lista al 03-07-25';
  const client = await auth.getClient();
  const range = `'${sheetName}'!A2:J`;
  console.log('Leyendo hoja:', sheetName, 'con rango:', range);
  const res = await sheets.spreadsheets.values.get({
    auth: client,
    spreadsheetId,
    range
  });
  const rows = res.data.values;
  console.log('Cantidad de filas leídas:', rows?.length);
  if (rows?.length) console.log('Primera fila:', rows[0]);
  if (!rows?.length) return [];
  // Filtrar filas vacías o sin código/producto
  return rows
    .filter(cols => cols && cols[0] && cols[1])
    .map((cols) => ({
      id: cols[0],
      producto: cols[1],
      extra: cols.slice(2)
    }));
}
