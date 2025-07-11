import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";

function CobrosList() {
  const [cobros, setCobros] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "cobranzas"), orderBy("fecha", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setCobros(data);
    });
    return () => unsubscribe();
  }, []);

  // Formatear fecha
  const formatFecha = (rowData) => {
    if (!rowData.fecha) return "";
    const date = rowData.fecha.toDate ? rowData.fecha.toDate() : new Date(rowData.fecha.seconds * 1000);
    return date.toLocaleDateString();
  };

  // Mostrar si está cargado en el sistema
  const cargadoTemplate = (rowData) => (
    <Tag value={rowData.cargado ? "Sí" : "No"} severity={rowData.cargado ? "success" : "danger"} />
  );

  return (
    <div style={{ maxWidth: 900, margin: "2rem auto" }}>
      <h2 style={{ textAlign: "center" }}>Lista de Cobranzas</h2>
      <DataTable value={cobros} paginator rows={8} responsiveLayout="scroll" emptyMessage="No hay cobranzas cargadas.">
        <Column field="fecha" header="Fecha" body={formatFecha} />
        <Column field="cliente" header="Cliente" />
        <Column field="monto" header="Monto" />
        <Column field="cobrador" header="Quién cobró" />
        <Column field="forma" header="Forma de cobro" />
        <Column field="cargado" header="¿Cargado en el sistema?" body={cargadoTemplate} />
      </DataTable>
    </div>
  );
}

export default CobrosList;