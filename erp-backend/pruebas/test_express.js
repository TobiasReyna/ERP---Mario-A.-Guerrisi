// test_express_transfer.js
    // Ejecutar con: node test_express_transfer.js

    const PAYLOAD = {
      articulo_id: "dc809e4c-e20a-4dd5-849e-21913e70e068",
      deposito_origen_id: "bf975c47-946f-406c-bb0e-a41dbe656df4",
      deposito_destino_id: "26ef85b3-71e1-419a-be45-896fad9b1cd2",
      cantidad: 5
    };

    const ENDPOINT_URL = "http://localhost:3001/api/stock/transfer";

    async function probarEndpointExpress() {
      console.log("🚀 Iniciando prueba hacia el backend de Express...");
      console.log(`📡 URL: POST ${ENDPOINT_URL}`);
      console.log("📦 Payload enviado desde el cliente:", JSON.stringify(PAYLOAD, null, 2));
      console.log("--------------------------------------------------");

      try {
        const response = await fetch(ENDPOINT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(PAYLOAD),
        });

        let result;
        try {
          result = await response.json();
        } catch (e) {
          result = await response.text();
        }

        if (!response.ok) {
          console.error(`❌ Falló la petición HTTP.`);
          console.error(`   Status Code: ${response.status}`);
          console.error("   Respuesta del Servidor:", result);
          return;
        }

        console.log(`✅ ¡Petición exitosa!`);
        console.log(`   Status Code: ${response.status}`);
        console.log("   Respuesta del Servidor:", result);

      } catch (error) {
        console.error("❌ Excepción crítica al intentar conectar con el servidor:");
        console.error(error.message);
      }
    }

    probarEndpointExpress();