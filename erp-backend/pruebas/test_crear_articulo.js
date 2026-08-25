// Script para probar la creación de un artículo usando fetch nativo.
// Ejecutar con: node test_crear_articulo.js

const url = 'http://localhost:3001/api/articles';

// Como no tenemos UUIDs reales de categorías, marcas o países de origen a mano en este script,
// idealmente deberías reemplazarlos con los UUID reales de tu base de datos antes de probar.
// De lo contrario, fallará por restricción de clave foránea (Foreign Key).
const payload = {
    codigo_interno: "Les Paul",
    descripcion: "Guitarra amarilla Gibson Les Paul",
    codigo_ean13: "6950376704443",
    categoria_id: "566cbb3d-e638-4089-83fc-4c44895acc4a", // REEMPLAZAR CON UUID REAL
    marca_id: "fdc7d2df-e972-4f13-8f23-6808e434e78e",     // REEMPLAZAR CON UUID REAL
    pais_origen: "b05040f8-3657-40da-b803-30c2b6ee3b1d",  // REEMPLAZAR CON UUID REAL
    precio_actual: 45500.50,
    modelo: "K552-KR"
};

async function probarCrearArticulo() {
    try {
        console.log("Enviando petición POST a", url);
        console.log("Payload:", JSON.stringify(payload, null, 2));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log("\n✅ Éxito:", data);
        } else {
            console.error("\n❌ Error del servidor:", response.status, data);
        }
    } catch (error) {
        console.error("\n❌ Error de conexión:", error);
    }
}

probarCrearArticulo();
