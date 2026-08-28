const API_URL = 'http://localhost:3001/api/articles?limit=5&page=2';

async function testCajaNegraCN01() {
  console.log("🚀 Iniciando Test CN-01: Paginación en Listado de Artículos...\n");

  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    console.log(`Estado HTTP: ${response.status}`);

    if (response.ok) {
      console.log("✅ ÉXITO: La API respondió correctamente.");
      console.log("Datos recibidos (debe mostrar info de paginación y un máximo de 5 artículos):");
      console.log(data);
    } else {
      console.log("❌ FALLO: Hubo un error al listar los artículos.");
      console.log(data);
    }
  } catch (error) {
    console.error("💥 Error de conexión:", error);
  }
}

testCajaNegraCN01();