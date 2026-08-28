// UUID válido en formato, pero inventado. No existe en la BD.
const FAKE_UUID = "12345678-1234-1234-1234-123456789abc";
const API_URL = `http://localhost:3001/api/articles/${FAKE_UUID}/status`;

async function testCajaNegraCN03() {
  console.log("🚀 Iniciando Test CN-03: Baja Lógica de un Artículo Inexistente...\n");

  try {
    const response = await fetch(API_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`Estado HTTP: ${response.status}`);

    if (response.status === 404) {
      console.log("✅ ÉXITO: El servidor detectó que el artículo no existe y devolvió 404.");
    } else if (response.ok) {
      console.log("❌ FALLO: El servidor devolvió OK (200/204) pero el artículo no existe.");
    } else {
      console.log(`⚠️ ATENCIÓN: El servidor devolvió otro código (${response.status}). Validar si es el comportamiento esperado.`);
    }
  } catch (error) {
    console.error("💥 Error de conexión:", error);
  }
}

testCajaNegraCN03();