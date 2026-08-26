# ERP Backend — Mario A. Guerrisi 🎸

Bienvenido al repositorio del backend del **ERP Mario A. Guerrisi**. Este servicio expone la API RESTful consumida por el Frontend para gestionar todo el ecosistema de la tienda de instrumentos musicales (inventario multi-depósito, catálogo de artículos, trazabilidad y políticas de reposición).

## 🏛️ Arquitectura y Reglas de Negocio

El proyecto está construido sobre **Node.js** utilizando **Express.js** bajo el patrón de arquitectura por capas (Controladores, Servicios, Rutas).

**🚨 REGLAS CLAVE DE NEGOCIO Y SEGURIDAD:**  
- **Validaciones Estrictas Previas (Controladores):** El backend cuenta con un filtro estricto de seguridad en la capa de controladores antes de cursar cualquier transacción a la base de datos. Se impide matemáticamente que el stock de un depósito quede con números negativos (quiebres irreales) durante ajustes o transferencias, abortando la petición con un error HTTP 400.
- **Delega de Transacciones a BD:** Toda la lógica pesada de inserciones, cálculos de concurrencia optimista y prevención de condiciones de carrera está delegada a la Base de Datos (PostgreSQL en Supabase) mediante Triggers y Funciones PL/pgSQL, utilizando bloqueos a nivel de fila (`FOR UPDATE`).

## 📦 Dependencias Principales

El proyecto utiliza un conjunto mínimo de dependencias listadas en el `package.json` para asegurar velocidad y facilidad de mantenimiento:

- **`express`**: Framework web minimalista para Node.js. Encargado de levantar el servidor y enrutar las peticiones HTTP.
- **`@supabase/supabase-js`**: Cliente oficial de Supabase. Lo utilizamos para interactuar directamente con la base de datos PostgreSQL utilizando el *Service Role Key* (Admin) para evadir las políticas RLS y ejecutar operaciones privilegiadas de servidor a servidor.
- **`dotenv`**: Carga variables de entorno desde el archivo `.env` en `process.env`.
- **`cors`**: Middleware para habilitar el Intercambio de Recursos de Origen Cruzado (CORS), permitiendo que nuestro Frontend (React/Vue/Angular) consuma la API de manera segura sin ser bloqueado por el navegador.

## ⚙️ Instalación y Configuración

Sigue estos pasos para levantar el proyecto de forma local (Ideal para nuevos desarrolladores en el equipo):

1. **Clonar el repositorio** y acceder a la carpeta del backend.
2. **Instalar las dependencias**:
   ```bash
   npm install
   ```
3. **Configurar las variables de entorno**:
   Crea un archivo `.env` en la raíz de `erp-backend` basado en el siguiente esquema (NO uses comillas):
   ```env
   PORT=3001
   SUPABASE_URL=tu_url_de_supabase_aqui
   SUPABASE_SERVICE_ROL_KEY=tu_service_role_key_aqui
   ```
   *(Nota: Pide al Administrador o Tech Lead las claves reales correspondientes al entorno de desarrollo).*
4. **Levantar el servidor**:
   ```bash
   npm run dev
   # O si no tienes nodemon configurado:
   node server.js
   ```
   El servidor estará disponible en `http://localhost:3001`.

## 📁 Estructura del Proyecto

```text
erp-backend/
├── config/        # Configuración de clientes de terceros (ej. inicialización de Supabase).
├── controllers/   # Validaciones de request/response y manejo de códigos HTTP.
├── services/      # Lógica de negocio y consultas directas a la base de datos.
├── routes/        # Definición de endpoints REST y mapeo con controladores.
├── pruebas/       # Scripts utilitarios (fetch nativo) para probar la API desde consola.
├── server.js      # Punto de entrada de la aplicación y registro de middlewares.
└── package.json   # Definición de dependencias y scripts de Node.
```

## 🔌 Listado de Endpoints (API Reference)

A continuación, un detalle rápido de los endpoints expuestos organizados por módulo:

### 🛒 Módulo de Artículos (Catálogo Maestro) - `/api/articles`
- `POST /` : Alta de un nuevo artículo (valida unicidad de EAN-13 y código interno).
- `GET /` : Listado de todos los artículos activos en catálogo.
- `GET /:id` : Detalle completo de un artículo específico por su UUID.
- `PUT /:id` : Modificación de datos (incluyendo precio, lo que dispara el trigger de historial).
- `PATCH /:id/status` : Baja lógica del artículo (actualiza `estado = false`).

### 📦 Módulo de Stock y Disponibilidad - `/api/stock`
- `POST /transfer` : Ejecuta una transferencia de mercancía entre dos depósitos.
- `POST /adjust` : Registra una merma, rotura o ajuste de inventario.
- `GET /alerts` : Devuelve el listado de artículos que perforaron su stock mínimo (sugerencias de reposición).
- `PUT /policies/:articulo_id` : Configura los niveles de stock mínimo y máximo por depósito.
- `GET /:articulo_id` : Devuelve el stock consolidado total y el desglose en array por depósito.
- `GET /:articulo_id/history` : Trazabilidad unificada de movimientos (ajustes y transferencias) ordenada cronológicamente por fecha descendente.

### 🗂️ Módulo de Maestros y Sistema - `/api`
Endpoints utilitarios y globales utilizados por el Frontend:
- `GET /categories` : Categorías de productos.
- `GET /brands` : Marcas (filtra solo las activas).
- `GET /countries` : Países de origen.
- `GET /deposits` : Depósitos físicos habilitados en el sistema.
- `GET /adjustment-reasons` : Tipos y motivos de ajuste permitidos.
- `GET /system/activity` : **[NUEVO]** Actividad del Sistema / Historial Global. Unifica y formatea de forma cronológica los movimientos de stock y las actualizaciones del catálogo en una sola respuesta, ideal para poblar campanitas de notificaciones.

## 🧪 Cómo probar la API (Testing Rápido)

Para no depender exclusivamente de Postman durante el desarrollo, creamos una suite de scripts con `fetch` nativo de Node.js en la carpeta `pruebas/`. Estos scripts contienen payloads de ejemplo armados con datos realistas.

Para usarlos, simplemente levanta el servidor y, en otra terminal, ejecuta cualquiera de ellos:
```bash
node pruebas/test_crear_articulo.js
node pruebas/test_maestros.js
node pruebas/test_disponibilidad.js
node pruebas/test_historial.js
node pruebas/test_alertas.js
node pruebas/test_articulos_resto.js
```
> **IMPORTANTE:** Asegúrate de abrir y editar los archivos de prueba para reemplazar los placeholders del tipo `"TU_ARTICULO_UUID_AQUI"` por UUIDs reales extraídos de tu base de datos antes de ejecutarlos.
