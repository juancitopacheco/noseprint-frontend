// src/App.jsx
// Aplicación completa de identificación de perros por huella nasal
// Se conecta a la API FastAPI corriendo en http://127.0.0.1:8000

import { useState, useRef, useCallback } from "react";

//const API_URL = "http://127.0.0.1:8000";
const API_URL = "http://web-production-52cf6.up.railway.app";

// ── Componente: barra de score ────────────────────────────────────────────────
// Muestra visualmente qué tan similar es un embedding con otro
function ScoreBar({ score, label }) {
  const pct   = Math.round(score * 100);
  const color = pct >= 90 ? "#4ade80" : pct >= 75 ? "#facc15" : "#f87171";
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
        <span style={{ color: "#94a3b8" }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, background: color,
          borderRadius: 3, transition: "width 1s ease"
        }} />
      </div>
    </div>
  );
}

// ── Componente: ficha del perro identificado ──────────────────────────────────
// Muestra los datos del perro cuando es identificado exitosamente
function FichaPerro({ perro, confianza }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #0f2027, #1a3a2a)",
      border: "1px solid #4ade80",
      borderRadius: 16,
      padding: 20,
      boxShadow: "0 0 30px #4ade8022",
    }}>
      {/* Cabecera con nombre y badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg, #4ade80, #22d3ee)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
        }}>🐾</div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>{perro.nombre}</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>{perro.raza}</div>
        </div>
        <div style={{
          marginLeft: "auto", background: "#4ade8022", color: "#4ade80",
          border: "1px solid #4ade8044", borderRadius: 20,
          padding: "4px 12px", fontSize: 11, fontWeight: 700,
        }}>
          ✓ IDENTIFICADO
        </div>
      </div>

      {/* Grid de datos del perro */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          ["ID",    perro.id],
          ["Dueño", perro.dueno],
          ["Edad",  `${perro.edad} años`],
          ["Raza",  perro.raza],
        ].map(([key, val]) => (
          <div key={key} style={{ background: "#0a0f1a", borderRadius: 10, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, color: "#4ade80", letterSpacing: 2, marginBottom: 3 }}>
              {key.toUpperCase()}
            </div>
            <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>{val}</div>
          </div>
        ))}
      </div>

      <ScoreBar score={confianza} label="Confianza de identificación" />
    </div>
  );
}

// ── Componente: zona de carga de imagen ───────────────────────────────────────
// Permite arrastrar o seleccionar una imagen
// Muestra preview si ya hay una imagen seleccionada
function DropZone({ onImagen, preview, onLimpiar }) {
  const fileRef = useRef();

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) onImagen(file);
  }, [onImagen]);

  if (preview) return (
    <div style={{ marginBottom: 16 }}>
      <img src={preview} alt="preview" style={{
        width: "100%", maxHeight: 220, objectFit: "contain",
        borderRadius: 12, border: "1px solid #1e293b", display: "block", marginBottom: 10,
      }} />
      <button onClick={onLimpiar} style={{
        width: "100%", padding: "10px", background: "#1e293b", border: "none",
        borderRadius: 10, color: "#94a3b8", cursor: "pointer", fontSize: 12,
        fontFamily: "inherit",
      }}>
        ✕ Cambiar imagen
      </button>
    </div>
  );

  return (
    <>
      <div
        onClick={() => fileRef.current.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{
          border: "2px dashed #1e293b", borderRadius: 16, padding: "40px 20px",
          textAlign: "center", cursor: "pointer", marginBottom: 16, background: "#0a0f1a",
        }}
      >
        <div style={{ fontSize: 44, marginBottom: 10 }}>📸</div>
        <div style={{ color: "#475569", fontSize: 13 }}>Arrastra una imagen o haz clic</div>
        <div style={{ color: "#334155", fontSize: 11, marginTop: 4 }}>JPG · PNG · WEBP</div>
      </div>
      <input
        ref={fileRef} type="file" accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => e.target.files[0] && onImagen(e.target.files[0])}
      />
    </>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function App() {
  const [tab,       setTab]       = useState("identificar");
  const [imagen,    setImagen]    = useState(null);
  const [preview,   setPreview]   = useState(null);
  const [cargando,  setCargando]  = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error,     setError]     = useState(null);
  const [perrosDB,  setPerrosDB]  = useState([]);
  const [dbCargada, setDbCargada] = useState(false);
  const [form,      setForm]      = useState({ nombre: "", raza: "", dueno: "", edad: "" });
  const [apiOnline, setApiOnline] = useState(null);

  // Verificar que la API está corriendo al cargar la app
  // Se ejecuta una sola vez gracias al useRef
  const verificado = useRef(false);
  if (!verificado.current) {
    verificado.current = true;
    fetch(`${API_URL}/`)
      .then(r => r.json())
      .then(d => setApiOnline(d))
      .catch(() => setApiOnline(false));
  }

  // Cargar lista de perros desde la API
  const cargarPerros = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/perros`);
      const data = await res.json();
      setPerrosDB(data.perros);
      setDbCargada(true);
    } catch {
      setError("No se pudo conectar a la API.");
    }
  }, []);

  // Manejar imagen seleccionada — crea preview y limpia resultados anteriores
  const handleImagen = useCallback((file) => {
    setImagen(file);
    setPreview(URL.createObjectURL(file));
    setResultado(null);
    setError(null);
  }, []);

  const limpiarImagen = useCallback(() => {
    setImagen(null);
    setPreview(null);
    setResultado(null);
    setError(null);
  }, []);

  // Enviar imagen a POST /identificar
  // FormData es el formato que usa HTTP para enviar archivos
  const handleIdentificar = async () => {
    if (!imagen) return;
    setCargando(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("foto", imagen);
      const res  = await fetch(`${API_URL}/identificar`, { method: "POST", body: formData });
      const data = await res.json();
      setResultado({ tipo: "identificar", ...data });
    } catch {
      setError("Error al conectar con la API.");
    }
    setCargando(false);
  };

  // Enviar imagen + datos a POST /registrar
  const handleRegistrar = async () => {
    if (!imagen || !form.nombre) return;
    setCargando(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("foto",   imagen);
      formData.append("nombre", form.nombre);
      formData.append("raza",   form.raza  || "Desconocida");
      formData.append("dueno",  form.dueno || "Sin registrar");
      formData.append("edad",   form.edad  || "0");
      const res  = await fetch(`${API_URL}/registrar`, { method: "POST", body: formData });
      const data = await res.json();
      setResultado({ tipo: "registrar", ...data });
      setForm({ nombre: "", raza: "", dueno: "", edad: "" });
    } catch {
      setError("Error al registrar.");
    }
    setCargando(false);
  };

  // Cambiar tab y resetear estado
  const cambiarTab = (nuevoTab) => {
    setTab(nuevoTab);
    setResultado(null);
    setError(null);
    limpiarImagen();
    if (nuevoTab === "database" && !dbCargada) cargarPerros();
  };

  // ── Estilos ─────────────────────────────────────────────────────────────────
  const S = {
    root: {
      minHeight: "100vh", background: "#060b14",
      fontFamily: "'DM Mono', 'Courier New', monospace",
      color: "#e2e8f0", paddingBottom: 60,
    },
    header: {
      background: "linear-gradient(180deg, #0a0f1a, #060b14)",
      borderBottom: "1px solid #1e293b", padding: "24px 24px 0",
    },
    body:  { padding: "24px 20px", maxWidth: 520, margin: "0 auto" },
    card:  {
      background: "#0a0f1a", border: "1px solid #1e293b",
      borderRadius: 14, padding: 18, marginBottom: 14,
    },
    label: {
      fontSize: 10, color: "#4ade80", letterSpacing: 2,
      textTransform: "uppercase", marginBottom: 6, display: "block",
    },
    input: {
      width: "100%", padding: "12px 14px", background: "#0a0f1a",
      border: "1px solid #1e293b", borderRadius: 10, color: "#e2e8f0",
      fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10,
    },
    btn: (variant = "primary") => ({
      width: "100%", padding: "14px", borderRadius: 10, border: "none",
      cursor: "pointer", fontSize: 13, fontWeight: 700, letterSpacing: 1,
      textTransform: "uppercase", fontFamily: "inherit",
      background: variant === "primary"
        ? "linear-gradient(135deg, #4ade80, #22d3ee)" : "#1e293b",
      color: variant === "primary" ? "#0a0f1a" : "#94a3b8",
      opacity: cargando ? 0.6 : 1,
    }),
    tab: (active) => ({
      padding: "10px 20px", fontSize: 12, letterSpacing: 1,
      textTransform: "uppercase", border: "none", background: "transparent",
      color: active ? "#4ade80" : "#475569",
      borderBottom: `2px solid ${active ? "#4ade80" : "transparent"}`,
      cursor: "pointer", fontFamily: "inherit",
    }),
    badge: (color) => ({
      display: "inline-block", background: `${color}22`, color,
      border: `1px solid ${color}44`, borderRadius: 20,
      padding: "3px 12px", fontSize: 11, fontWeight: 700,
    }),
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>

      {/* Header */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 36, height: 36,
            background: "linear-gradient(135deg, #4ade80, #22d3ee)",
            borderRadius: 10, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 18,
          }}>🐾</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9" }}>NosePrint ID</div>
            <div style={{ fontSize: 10, color: "#4ade80", letterSpacing: 2 }}>BIOMETRÍA NASAL CANINA</div>
          </div>
          {/* Badge de estado de la API */}
          <div style={{ marginLeft: "auto" }}>
            {apiOnline === null  && <span style={S.badge("#64748b")}>CONECTANDO...</span>}
            {apiOnline === false && <span style={S.badge("#f87171")}>API OFFLINE</span>}
            {apiOnline          && <span style={S.badge("#4ade80")}>API ONLINE ✓</span>}
          </div>
        </div>

        {/* Tabs de navegación */}
        <div style={{ display: "flex" }}>
          {[
            ["identificar", "🔍 Identificar"],
            ["registrar",   "➕ Registrar"],
            ["database",    "🗄 Base de Datos"],
          ].map(([key, label]) => (
            <button key={key} style={S.tab(tab === key)} onClick={() => cambiarTab(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={S.body}>

        {/* Banner cuando la API no responde */}
        {apiOnline === false && (
          <div style={{
            background: "#1a0a0a", border: "1px solid #7f1d1d",
            borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 13, color: "#f87171",
          }}>
            ⚠ No se puede conectar a la API.<br />
            <span style={{ color: "#64748b" }}>
              Asegúrate de que esté corriendo con:<br />
              <code style={{ color: "#94a3b8" }}>python -m uvicorn api:app --reload</code>
            </span>
          </div>
        )}

        {/* ── TAB: IDENTIFICAR ── */}
        {tab === "identificar" && (
          <>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20, lineHeight: 1.6 }}>
              Sube la foto de la nariz de un perro para identificarlo en la base de datos.
            </div>

            <DropZone onImagen={handleImagen} preview={preview} onLimpiar={limpiarImagen} />

            <button style={S.btn()} onClick={handleIdentificar} disabled={!imagen || cargando}>
              {cargando ? "⟳ Procesando con ResNet-50..." : "Identificar perro"}
            </button>

            {error && (
              <div style={{
                background: "#1a0a0a", border: "1px solid #7f1d1d",
                borderRadius: 10, padding: 14, marginTop: 14, color: "#f87171", fontSize: 13,
              }}>
                {error}
              </div>
            )}

            {/* Resultado de identificación */}
            {resultado?.tipo === "identificar" && (
              <div style={{ marginTop: 24 }}>
                {resultado.encontrado ? (
                  <FichaPerro perro={resultado.perro} confianza={resultado.confianza} />
                ) : (
                  <div style={{
                    background: "linear-gradient(135deg, #1a0a0a, #1a1010)",
                    border: "1px solid #7f1d1d", borderRadius: 14,
                    padding: 20, textAlign: "center",
                  }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>❌</div>
                    <div style={{ color: "#f87171", fontWeight: 700, fontSize: 15 }}>
                      Perro no encontrado
                    </div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>
                      {resultado.mensaje}
                    </div>
                  </div>
                )}

                {/* Scores de todos los candidatos */}
                {resultado.scores && Object.keys(resultado.scores).length > 0 && (
                  <div style={{ ...S.card, marginTop: 14 }}>
                    <span style={S.label}>Scores de comparación</span>
                    {Object.entries(resultado.scores)
                      .sort(([, a], [, b]) => b - a)
                      .map(([pid, score]) => (
                        <ScoreBar key={pid} score={score} label={pid} />
                      ))
                    }
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── TAB: REGISTRAR ── */}
        {tab === "registrar" && (
          <>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20, lineHeight: 1.6 }}>
              Registra un nuevo perro capturando su huella nasal.
            </div>

            <div style={S.card}>
              <span style={S.label}>Datos del perro</span>
              {[
                ["nombre", "Nombre del perro *", "text"],
                ["raza",   "Raza",               "text"],
                ["dueno",  "Nombre del dueño",   "text"],
                ["edad",   "Edad (años)",         "number"],
              ].map(([campo, placeholder, tipo]) => (
                <input
                  key={campo}
                  style={{ ...S.input, marginBottom: campo === "edad" ? 0 : 10 }}
                  placeholder={placeholder}
                  type={tipo}
                  value={form[campo]}
                  onChange={(e) => setForm(p => ({ ...p, [campo]: e.target.value }))}
                />
              ))}
            </div>

            <DropZone onImagen={handleImagen} preview={preview} onLimpiar={limpiarImagen} />

            <button
              style={S.btn()}
              onClick={handleRegistrar}
              disabled={!imagen || !form.nombre || cargando}
            >
              {cargando ? "⟳ Registrando..." : "Registrar huella nasal"}
            </button>

            {error && (
              <div style={{
                background: "#1a0a0a", border: "1px solid #7f1d1d",
                borderRadius: 10, padding: 14, marginTop: 14, color: "#f87171", fontSize: 13,
              }}>
                {error}
              </div>
            )}

            {resultado?.tipo === "registrar" && resultado.registrado && (
              <div style={{
                background: "linear-gradient(135deg, #0f2027, #1a3a2a)",
                border: "1px solid #4ade80", borderRadius: 14,
                padding: 20, textAlign: "center", marginTop: 20,
              }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                <div style={{ color: "#4ade80", fontWeight: 800, fontSize: 15 }}>
                  ¡{resultado.nombre} registrado!
                </div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>
                  ID asignado: <span style={{ color: "#22d3ee" }}>{resultado.id}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── TAB: BASE DE DATOS ── */}
        {tab === "database" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                {perrosDB.length} perros registrados
              </div>
              <button onClick={cargarPerros} style={{
                background: "none", border: "1px solid #1e293b", borderRadius: 8,
                color: "#64748b", padding: "6px 12px", cursor: "pointer",
                fontSize: 12, fontFamily: "inherit",
              }}>
                ↻ Actualizar
              </button>
            </div>

            {!dbCargada && (
              <div style={{ textAlign: "center", color: "#475569", padding: 40 }}>
                Cargando base de datos...
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {perrosDB.map((perro) => (
                <div key={perro.id} style={{
                  background: "#0a0f1a", border: "1px solid #1e293b",
                  borderRadius: 12, padding: 16,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: "linear-gradient(135deg, #1e293b, #0f172a)",
                      display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 22,
                    }}>🐾</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#f1f5f9", fontWeight: 700 }}>{perro.nombre}</div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>
                        {perro.raza} · {perro.edad} años · {perro.dueno}
                      </div>
                    </div>
                    <span style={S.badge("#22d3ee")}>{perro.id}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}