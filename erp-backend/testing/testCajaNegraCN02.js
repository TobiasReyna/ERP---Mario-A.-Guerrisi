const API_URL = 'http://localhost:3001/api/articles';

async function testCajaNegraCN02() {
  console.log("🚀 Iniciando Test CN-02: Rechazo por Tipo de Dato Inválido (UUID)...\n");

  const payloadMalFormado = {
    codigo_interno: "ERR-001",
    descripcion: "Artículo con Categoría Inválida",
    codigo_ean13: "9999999999999",
    categoria_id: "texto-invalido-en-vez-de-uuid", // ❌ ESTO DEBE HACER FALLAR LA API
    marca_id: "00000000-0000-0000-0000-000000000000", // Formato UUID válido falso
    pais_origen: "00000000-0000-0000-0000-000000000000", 
    precio_actual: 1000
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadMalFormado)
    });

    const data = await response.json();
    console.log(`Estado HTTP: ${response.status}`);

    if (response.status === 400 || response.status === 500) {
      console.log("✅ ÉXITO: El sistema bloqueó la petición por formato inválido.");
      console.log("Mensaje de error del backend:", data);
    } else if (response.ok) {
      console.log("❌ FALLO GRAVE: El sistema guardó el artículo a pesar de tener un ID inválido.");
    }
  } catch (error) {
    console.error("💥 Error de conexión:", error);
  }
}

testCajaNegraCN02();