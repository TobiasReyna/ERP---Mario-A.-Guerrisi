# API REST Express - Backend ERP

Para levantar este proyecto, crea una carpeta nueva (por ejemplo `erp-backend`), inicializa el proyecto e instala las dependencias:
```bash
npm init -y
npm install express cors dotenv @supabase/supabase-js
```

Crea un archivo `.env` en la raíz del proyecto backend con tus credenciales:
```env
PORT=3001
SUPABASE_URL=tu_supabase_url
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

A continuación, crea los siguientes archivos copiando y pegando el código:

### 1. `server.js` (Raíz del proyecto)
Punto de entrada de la aplicación. Configura CORS, JSON parsing y las rutas.

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stockRoutes = require('./routes/stockRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Registro de Rutas
app.use('/api/stock', stockRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor Express corriendo en http://localhost:${PORT}`);
});
```

---

### 2. `config/supabase.js`
Instanciación del cliente de Supabase usando Service Role Key.

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el archivo .env');
}

// Cliente inicializado con Service Role Key para ignorar RLS en el backend
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = { supabaseAdmin };
```

---

### 3. `services/stockService.js`
Capa de negocio. Ejecuta la sentencia a Supabase, confiando en que el Trigger actualiza la tabla de `existencias`.

```javascript
const { supabaseAdmin } = require('../config/supabase');

class StockService {
  static async transferirStock(payload) {
    const { articulo_id, deposito_origen_id, deposito_destino_id, cantidad, usuario_id, ip_origen } = payload;

    const { data, error } = await supabaseAdmin
      .from('transferencias_stock')
      .insert([
        {
          articulo_id,
          deposito_origen_id,
          deposito_destino_id,
          cantidad,
          usuario_id,
          ip_origen: ip_origen || '127.0.0.1'
        }
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Error en base de datos: ${error.message}`);
    }

    return data;
  }
}

module.exports = StockService;
```

---

### 4. `controllers/stockController.js`
Valida el request e inyecta al Usuario de Prueba estático antes de llamar al servicio.

```javascript
const StockService = require('../services/stockService');

// Usuario hardcodeado para Sprint 1
const TEST_USER_ID = "44444444-4444-4444-4444-444444444444";

const transferir = async (req, res) => {
  try {
    const { articulo_id, deposito_origen_id, deposito_destino_id, cantidad } = req.body;

    // 1. Validaciones básicas del payload frontend
    if (!articulo_id || !deposito_origen_id || !deposito_destino_id || cantidad === undefined) {
      return res.status(400).json({ error: 'Faltan campos obligatorios en el request.' });
    }

    if (cantidad <= 0) {
      return res.status(400).json({ error: 'La cantidad a transferir debe ser mayor a 0.' });
    }

    if (deposito_origen_id === deposito_destino_id) {
      return res.status(400).json({ error: 'El depósito de origen y de destino no pueden ser el mismo.' });
    }

    // 2. Extraer IP del origen
    const ip_origen = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    // 3. Delegar al servicio (Inyectando el TEST_USER_ID transparente al Frontend)
    const transferencia = await StockService.transferirStock({
      articulo_id,
      deposito_origen_id,
      deposito_destino_id,
      cantidad,
      usuario_id: TEST_USER_ID,
      ip_origen
    });

    return res.status(201).json({
      message: 'Transferencia registrada con éxito.',
      data: transferencia
    });

  } catch (error) {
    console.error('[API] Error POST /api/stock/transfer:', error);
    return res.status(500).json({ 
      error: error.message || 'Error interno procesando la transferencia.' 
    });
  }
};

module.exports = {
  transferir
};
```

---

### 5. `routes/stockRoutes.js`
Enlazado de la ruta al controlador.

```javascript
const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

// POST /api/stock/transfer
router.post('/transfer', stockController.transferir);

module.exports = router;
```
