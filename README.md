# Proyecto de sistema ERP para la tienda de Musica Mario A. Guerrisi

## Módulo de Autenticación (Login y Seguridad)

Hemos implementado un flujo de autenticación de alta seguridad basado en **Supabase** y **Express**, con un enfoque estricto en la prevención de ataques XSS.

### Arquitectura de Seguridad (Zero LocalStorage)
Por política de seguridad, está **estrictamente prohibido** guardar tokens JWT en el `localStorage` del navegador. 
- Los tokens (`access_token` y `refresh_token`) son manejados y devueltos por el backend utilizando cookies **HttpOnly**, `secure` y `sameSite: 'strict'`.
- El frontend (React) gestiona la sesión a través de Axios usando la directiva `withCredentials: true` para el envío automático de cookies.

### Backend (Node.js / Express)
1. **Controlador de Autenticación (`/api/auth/login`)**:
   - Valida las credenciales contra el servicio de Supabase (`signInWithPassword`).
   - Verifica que el usuario tenga un perfil operativo asociado cruzando la tabla `usuarios` y `roles`.
   - Genera e inyecta las cookies seguras en el navegador.
   - Retorna únicamente información pública del usuario (nombre, email, rol) sin enviar los tokens en la carga útil (body).
2. **CORS y Cookies**: Configurado con `cookie-parser` y habilitado para aceptar orígenes de credenciales.

### Frontend (React / Vite)
1. **Login Estético y Nativo**: Componente `/login` construido sin librerías externas (sin Tailwind), respetando estrictamente las variables CSS y el Design System corporativo (`index.css`), e integrado con íconos de `lucide-react`.
2. **Context API (`AuthContext`)**: Maneja globalmente el estado del usuario logueado en memoria.
3. **Rutas Protegidas (`ProtectedRoute`)**: Componente guardián en `App.jsx` que bloquea el acceso a las vistas internas del ERP si el usuario no existe en el contexto, redirigiéndolo silenciosamente hacia el login.
