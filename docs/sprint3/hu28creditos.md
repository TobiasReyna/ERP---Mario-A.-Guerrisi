## HU-23 - Registro de Comprobantes y Facturas de Proveedores

* **Prioridad:** 23 | **Módulo:** Compras | **Puntos de Función:** 8
* **Como:** Encargado de Compras / Tesorero
* **¿Qué necesito?** Registrar facturas y otros comprobantes comerciales emitidos por los proveedores
* **¿Para qué?** Generar la deuda formal (Cuenta por Pagar) vinculada a la mercadería recibida

**Criterios de Aceptación:**

1. Dado el formulario de registro de comprobantes, cuando el usuario intenta confirmarlo, el sistema exige completar obligatoriamente: Proveedor, Tipo de Comprobante (Factura, Nota de Crédito, Nota de Débito), Número de Comprobante y Monto Total.
2. Dado un comprobante con un número de serie específico, cuando el usuario intenta registrarlo para un proveedor que ya tiene ese mismo número registrado, el sistema bloquea la operación y muestra un mensaje de "Comprobante duplicado para este proveedor".
3. Dado el registro exitoso de una Factura o Nota de Débito, cuando se confirma la operación, el sistema genera automáticamente una nueva "Cuenta por Pagar" (o actualiza el saldo de una existente) por el monto exacto ingresado.
4. Dado el registro de una Nota de Crédito de un proveedor, cuando se confirma la operación, el sistema descuenta automáticamente ese valor del saldo pendiente en la Cuenta por Pagar asociada.

**Reglas de Negocio y Notas Técnicas:**
El registro de comprobantes es el gatillo que alimenta el módulo de Tesorería (Cuentas por Pagar). El monto se ingresa de forma manual y totalizada (por directiva del PO, el sistema no realizará cálculos automáticos de IVA o retenciones).

**Dependencias:**
HU-11 (Proveedores), HU-14 (Cuentas por Pagar).

---