// Parámetros de Tesorería.
// LIMITE_RETIRO_CAJA: un egreso por encima de este monto requeriría la autorización de un
// Encargado (PIN). Por ahora el PIN no está implementado y el límite se fija en un valor
// prácticamente inalcanzable; cuando exista el PIN, este valor pasa a ser configurable por sucursal.
const LIMITE_RETIRO_CAJA = 99999999;

// HU-29: umbral para advertir que una caja acumula demasiado efectivo.
// Se conserva el mismo valor configurado actualmente.
const LIMITE_SEGURIDAD_EFECTIVO = LIMITE_RETIRO_CAJA;

module.exports = {
  LIMITE_RETIRO_CAJA,
  LIMITE_SEGURIDAD_EFECTIVO,
};