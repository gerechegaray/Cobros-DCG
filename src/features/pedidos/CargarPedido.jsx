import { useState, useEffect, useRef } from "react";
import { db } from "../../services/firebase";
import { collection, addDoc } from "firebase/firestore";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { InputTextarea } from "primereact/inputtextarea";
import { Divider } from "primereact/divider";
import { getAlegraContacts } from "../../services/alegra";

const ESTADO_RECEPCION = [
  { label: "Pendiente", value: "pendiente" },
  { label: "Recibido", value: "recibido" },
  { label: "Enviado", value: "enviado" }
];

const CONDICIONES = [
  { label: "Contado", value: "contado" },
  { label: "Cuenta Corriente", value: "cuenta_corriente" }
];

function CargarPedido({ user }) {
  const [form, setForm] = useState({
    fecha: null,
    cliente: "",
    items: [{ producto: null, cantidad: 1 }],
    estadoRecepcion: "pendiente",
    condicion: "contado",
    observaciones: ""
  });
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const toast = useRef(null);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const response = await fetch(`https://cobros-dcg.onrender.com/api/items?role=${user.role}`);
        if (!response.ok) throw new Error("Error al obtener productos");
        const data = await response.json();
        const options = data.map((item) => ({
          label: item.nombre,
          value: item.nombre
        }));
        setProductos(options);
      } catch (error) {
        console.error("Error al cargar productos:", error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: "No se pudieron cargar los productos"
        });
      } finally {
        setLoadingProductos(false);
      }
    };

    async function fetchClientes() {
      try {
        const data = await getAlegraContacts();
        const options = data.map((c) => ({ label: c.name, value: c.name }));
        setClientes(options);
      } catch (error) {
        console.error('Error al obtener clientes de Alegra:', error);
      } finally {
        setLoadingClientes(false);
      }
    }

    if (user) {
      fetchProductos();
      fetchClientes();
    }
  }, [user]);

  // ✅ Previene errores si el usuario aún no está definido
  if (!user) return <p>Cargando usuario...</p>;

  console.log("Rol del usuario:", user.role);

  const validar = () => {
    if (!form.fecha) return "La fecha es obligatoria";
    if (!form.cliente.trim()) return "El nombre del cliente es obligatorio";
    if (!form.items.length || form.items.some((i) => !i.producto || !i.cantidad || i.cantidad < 1))
      return "Debes agregar al menos un producto y cantidad válida";
    if (!form.condicion) return "La condición es obligatoria";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validar();
    if (error) {
      toast.current.show({ severity: "error", summary: "Error", detail: error });
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "pedidosClientes"), {
        fecha: form.fecha,
        cliente: form.cliente.trim(),
        items: form.items,
        estadoRecepcion: user.role === "admin" ? form.estadoRecepcion : "pendiente",
        condicion: form.condicion,
        observaciones: form.observaciones.trim(),
        cobrador: user.role === "admin" ? "admin" : user.role,
        fechaCreacion: new Date()
      });

      toast.current.show({
        severity: "success",
        summary: "Guardado",
        detail: "Pedido del cliente registrado exitosamente"
      });

      setForm({
        fecha: null,
        cliente: "",
        items: [{ producto: null, cantidad: 1 }],
        estadoRecepcion: "pendiente",
        condicion: "contado",
        observaciones: ""
      });
    } catch (err) {
      console.error("Error al guardar pedido:", err);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo guardar el pedido"
      });
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fff",
        padding: "1rem",
        "@media (min-width: 768px)": {
          padding: "2rem 1rem"
        }
      }}
    >
      <Toast ref={toast} />

      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          width: "100%"
        }}
      >
        <Card
          className="p-fluid"
          style={{
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            border: "none",
            overflow: "hidden",
            "@media (min-width: 768px)": {
              borderRadius: "20px",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.15)"
            }
          }}
        >
          {/* Header Section con gradiente */}
          <div
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              padding: "2rem 1rem",
              textAlign: "center",
              margin: "-1.5rem -1.5rem 2rem -1.5rem",
              "@media (min-width: 768px)": {
                padding: "3rem 2rem"
              }
            }}
          >
            <div
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                borderRadius: "50%",
                width: "60px",
                height: "60px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem",
                backdropFilter: "blur(10px)",
                "@media (min-width: 768px)": {
                  width: "80px",
                  height: "80px"
                }
              }}
            >
              <i
                className="pi pi-shopping-cart"
                style={{
                  fontSize: "1.5rem",
                  "@media (min-width: 768px)": {
                    fontSize: "2rem"
                  }
                }}
              ></i>
            </div>

            <h1
              style={{
                margin: "0 0 1rem 0",
                fontSize: "1.8rem",
                fontWeight: "700",
                letterSpacing: "-0.5px",
                lineHeight: "1.2",
                "@media (min-width: 768px)": {
                  fontSize: "2.2rem"
                },
                "@media (min-width: 1024px)": {
                  fontSize: "2.5rem"
                }
              }}
            >
              Cargar Pedido de Cliente
            </h1>

            <p
              style={{
                margin: "0",
                fontSize: "1rem",
                opacity: "0.9",
                fontWeight: "300",
                "@media (min-width: 768px)": {
                  fontSize: "1.1rem"
                }
              }}
            >
              Registra los pedidos que realizan los clientes
            </p>

            {user.role === "cobrador" && (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  borderRadius: "25px",
                  padding: "0.8rem 1rem",
                  margin: "1.5rem auto 0",
                  display: "inline-flex",
                  alignItems: "center",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  maxWidth: "100%",
                  "@media (min-width: 768px)": {
                    padding: "0.8rem 1.5rem"
                  }
                }}
              >
                <i
                  className="pi pi-user"
                  style={{
                    marginRight: "0.5rem",
                    fontSize: "0.9rem",
                    flexShrink: 0
                  }}
                ></i>
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "500",
                    wordBreak: "break-word",
                    "@media (min-width: 768px)": {
                      fontSize: "0.95rem"
                    }
                  }}
                >
                  Cargando como: <strong>{user.name}</strong>
                </span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ padding: "0 0.5rem" }}>
            {/* Información Básica */}
            <div className="p-mb-5">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                  padding: "0.8rem",
                  background: "#fff",
                  borderRadius: "8px",
                  color: "#212121",
                  "@media (min-width: 768px)": {
                    padding: "1rem",
                    borderRadius: "12px"
                  }
                }}
              >
                <i
                  className="pi pi-info-circle"
                  style={{
                    fontSize: "1.2rem",
                    marginRight: "0.5rem",
                    flexShrink: 0,
                    "@media (min-width: 768px)": {
                      fontSize: "1.5rem",
                      marginRight: "0.75rem"
                    }
                  }}
                ></i>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    "@media (min-width: 768px)": {
                      fontSize: "1.3rem"
                    }
                  }}
                >
                  Información Básica
                </h3>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5rem",
                  "@media (min-width: 768px)": {
                    flexDirection: "row",
                    gap: "1rem"
                  }
                }}
              >
                {/* Cliente */}
                <div className="p-col-12" style={{ marginBottom: '1.2rem' }}>
                  <label className="p-block p-mb-2 p-text-sm" style={{ fontWeight: "500", color: "#374151" }}>
                    Cliente *
                  </label>
                  <Dropdown
                    value={form.cliente}
                    options={clientes}
                    onChange={(e) => setForm((prev) => ({ ...prev, cliente: e.value }))}
                    className="p-fluid"
                    placeholder={loadingClientes ? "Cargando clientes..." : "Selecciona un cliente"}
                    filter
                    disabled={loadingClientes}
                  />
                </div>

                <div
                  style={{
                    flex: 1,
                    "@media (min-width: 768px)": {
                      marginLeft: "0.5rem"
                    }
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: "600",
                      color: "#374151",
                      fontSize: "0.9rem",
                      "@media (min-width: 768px)": {
                        fontSize: "0.95rem"
                      }
                    }}
                  >
                    Fecha del Pedido *
                  </label>
                  <Calendar
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.value })}
                    dateFormat="dd/mm/yy"
                    showIcon
                    placeholder="Selecciona la fecha"
                    style={{
                      height: "3rem",
                      borderRadius: "8px",
                      "@media (min-width: 768px)": {
                        height: "3.5rem",
                        borderRadius: "12px"
                      }
                    }}
                    inputStyle={{
                      borderRadius: "8px",
                      border: "2px solid #e5e7eb",
                      fontSize: "0.95rem",
                      "@media (min-width: 768px)": {
                        borderRadius: "12px",
                        fontSize: "1rem"
                      }
                    }}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Productos del Pedido */}
            <div className="p-mb-5">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                  padding: "0.8rem",
                  background: "#fff",
                  borderRadius: "8px",
                  color: "#212121",
                  "@media (min-width: 768px)": {
                    padding: "1rem",
                    borderRadius: "12px"
                  }
                }}
              >
                <i
                  className="pi pi-shopping-bag"
                  style={{
                    fontSize: "1.2rem",
                    marginRight: "0.5rem",
                    flexShrink: 0,
                    "@media (min-width: 768px)": {
                      fontSize: "1.5rem",
                      marginRight: "0.75rem"
                    }
                  }}
                ></i>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    "@media (min-width: 768px)": {
                      fontSize: "1.3rem"
                    }
                  }}
                >
                  Productos del Pedido *
                </h3>
              </div>

              <div className="p-mb-4">
                {form.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      marginBottom: "1.5rem",
                      padding: "1rem",
                      background: "#fff",
                      borderRadius: "12px",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
                      "@media (min-width: 768px)": {
                        padding: "1.5rem",
                        borderRadius: "16px",
                        boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)"
                      }
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                        "@media (min-width: 768px)": {
                          flexDirection: "row",
                          alignItems: "end",
                          gap: "1rem"
                        }
                      }}
                    >
                      <div
                        style={{
                          flex: 2,
                          "@media (min-width: 768px)": {
                            marginRight: "0.5rem"
                          }
                        }}
                      >
                        <label
                          style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            fontWeight: "600",
                            color: "#8b5a3c",
                            fontSize: "0.9rem",
                            "@media (min-width: 768px)": {
                              fontSize: "0.95rem"
                            }
                          }}
                        >
                          Producto
                        </label>
                        <Dropdown
                          value={item.producto}
                          options={productos}
                          onChange={(e) => {
                            const items = [...form.items];
                            items[idx].producto = e.value;
                            setForm({ ...form, items });
                          }}
                          placeholder={
                            loadingProductos ? "Cargando productos..." : "Seleccionar producto"
                          }
                          style={{
                            height: "3rem",
                            borderRadius: "8px",
                            "@media (min-width: 768px)": {
                              height: "3.5rem",
                              borderRadius: "12px"
                            }
                          }}
                          disabled={loadingProductos}
                          filter
                          className="p-dropdown-lg"
                        />
                      </div>

                      <div
                        style={{
                          flex: 1,
                          "@media (min-width: 768px)": {
                            marginRight: "0.5rem"
                          }
                        }}
                      >
                        <label
                          style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            fontWeight: "600",
                            color: "#8b5a3c",
                            fontSize: "0.9rem",
                            "@media (min-width: 768px)": {
                              fontSize: "0.95rem"
                            }
                          }}
                        >
                          Cantidad
                        </label>
                        <InputText
                          type="number"
                          min={1}
                          value={item.cantidad}
                          onChange={(e) => {
                            const items = [...form.items];
                            items[idx].cantidad = Number.parseInt(e.target.value) || 1;
                            setForm({ ...form, items });
                          }}
                          placeholder="Cantidad"
                          style={{
                            height: "3rem",
                            borderRadius: "8px",
                            border: "2px solid rgba(139, 90, 60, 0.2)",
                            fontSize: "0.95rem",
                            "@media (min-width: 768px)": {
                              height: "3.5rem",
                              borderRadius: "12px",
                              fontSize: "1rem"
                            }
                          }}
                          className="p-inputtext-lg"
                        />
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          "@media (min-width: 768px)": {
                            justifyContent: "flex-end"
                          }
                        }}
                      >
                        {form.items.length > 1 && (
                          <Button
                            icon="pi pi-trash"
                            className="p-button-danger p-button-outlined"
                            type="button"
                            onClick={() => {
                              const items = form.items.filter((_, i) => i !== idx);
                              setForm({ ...form, items });
                            }}
                            style={{
                              height: "3rem",
                              width: "3rem",
                              borderRadius: "8px",
                              "@media (min-width: 768px)": {
                                height: "3.5rem",
                                width: "3.5rem",
                                borderRadius: "12px"
                              }
                            }}
                            tooltip="Eliminar producto"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <div style={{ textAlign: "center", marginTop: "1rem" }}>
                  <Button
                    icon="pi pi-plus"
                    label="Agregar Producto"
                    type="button"
                    className="p-button-outlined"
                    onClick={() =>
                      setForm({ ...form, items: [...form.items, { producto: null, cantidad: 1 }] })
                    }
                    style={{
                      height: "3rem",
                      borderRadius: "20px",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      border: "none",
                      color: "white",
                      boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
                      padding: "0 1.5rem",
                      "@media (min-width: 768px)": {
                        height: "3.5rem",
                        borderRadius: "25px",
                        fontSize: "1rem",
                        boxShadow: "0 8px 25px rgba(102, 126, 234, 0.3)"
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Condiciones y Estado */}
            <div className="p-mb-5">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                  padding: "0.8rem",
                  background: "#fff",
                  borderRadius: "8px",
                  color: "#212121",
                  "@media (min-width: 768px)": {
                    padding: "1rem",
                    borderRadius: "12px"
                  }
                }}
              >
                <i
                  className="pi pi-cog"
                  style={{
                    fontSize: "1.2rem",
                    marginRight: "0.5rem",
                    flexShrink: 0,
                    "@media (min-width: 768px)": {
                      fontSize: "1.5rem",
                      marginRight: "0.75rem"
                    }
                  }}
                ></i>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    "@media (min-width: 768px)": {
                      fontSize: "1.3rem"
                    }
                  }}
                >
                  Condiciones y Estado
                </h3>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5rem",
                  "@media (min-width: 768px)": {
                    flexDirection: "row",
                    gap: "1rem"
                  }
                }}
              >
                <div
                  style={{
                    flex: 1,
                    "@media (min-width: 768px)": {
                      marginRight: "0.5rem"
                    }
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontWeight: "600",
                      color: "#374151",
                      fontSize: "0.9rem",
                      "@media (min-width: 768px)": {
                        fontSize: "0.95rem"
                      }
                    }}
                  >
                    Condición de Pago *
                  </label>
                  <Dropdown
                    value={form.condicion}
                    options={CONDICIONES}
                    onChange={(e) => setForm({ ...form, condicion: e.value })}
                    placeholder="Selecciona la condición"
                    style={{
                      height: "3rem",
                      borderRadius: "8px",
                      "@media (min-width: 768px)": {
                        height: "3.5rem",
                        borderRadius: "12px"
                      }
                    }}
                    className="p-dropdown-lg"
                    required
                  />
                </div>

                {user.role === "admin" && (
                  <div
                    style={{
                      flex: 1,
                      "@media (min-width: 768px)": {
                        marginLeft: "0.5rem"
                      }
                    }}
                  >
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: "600",
                        color: "#374151",
                        fontSize: "0.9rem",
                        "@media (min-width: 768px)": {
                          fontSize: "0.95rem"
                        }
                      }}
                    >
                      Estado de Recepción
                    </label>
                    <Dropdown
                      value={form.estadoRecepcion}
                      options={ESTADO_RECEPCION}
                      onChange={(e) => setForm({ ...form, estadoRecepcion: e.value })}
                      placeholder="Selecciona el estado"
                      style={{
                        height: "3rem",
                        borderRadius: "8px",
                        "@media (min-width: 768px)": {
                          height: "3.5rem",
                          borderRadius: "12px"
                        }
                      }}
                      className="p-dropdown-lg"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Observaciones */}
            <div className="p-mb-5">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                  padding: "0.8rem",
                  background: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
                  borderRadius: "8px",
                  color: "#8b5a3c",
                  "@media (min-width: 768px)": {
                    padding: "1rem",
                    borderRadius: "12px"
                  }
                }}
              >
                <i
                  className="pi pi-comment"
                  style={{
                    fontSize: "1.2rem",
                    marginRight: "0.5rem",
                    flexShrink: 0,
                    "@media (min-width: 768px)": {
                      fontSize: "1.5rem",
                      marginRight: "0.75rem"
                    }
                  }}
                ></i>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    "@media (min-width: 768px)": {
                      fontSize: "1.3rem"
                    }
                  }}
                >
                  Observaciones Adicionales
                </h3>
              </div>

              <InputTextarea
                value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                placeholder="Agrega observaciones adicionales sobre el pedido..."
                rows={4}
                style={{
                  borderRadius: "8px",
                  border: "2px solid #e5e7eb",
                  fontSize: "0.95rem",
                  resize: "vertical",
                  "@media (min-width: 768px)": {
                    borderRadius: "12px",
                    fontSize: "1rem"
                  }
                }}
                className="p-inputtextarea-lg"
              />
            </div>

            {/* Botón de Envío */}
            <div
              style={{
                textAlign: "center",
                marginTop: "2rem",
                paddingBottom: "1rem",
                "@media (min-width: 768px)": {
                  marginTop: "2.5rem",
                  paddingBottom: "2rem"
                }
              }}
            >
              <Button
                type="submit"
                label={loading ? "Guardando Pedido..." : "Guardar Pedido"}
                icon={loading ? "pi pi-spin pi-spinner" : "pi pi-save"}
                style={{
                  height: "3.5rem",
                  minWidth: "200px",
                  fontSize: "1rem",
                  fontWeight: "700",
                  borderRadius: "20px",
                  background: loading
                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
                  border: "none",
                  color: "white",
                  boxShadow: "0 8px 25px rgba(17, 153, 142, 0.3)",
                  transition: "all 0.3s ease",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  "@media (min-width: 768px)": {
                    height: "4rem",
                    minWidth: "250px",
                    fontSize: "1.2rem",
                    borderRadius: "25px",
                    boxShadow: "0 15px 35px rgba(17, 153, 142, 0.4)",
                    letterSpacing: "1px"
                  }
                }}
                disabled={loading}
              />
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default CargarPedido;
