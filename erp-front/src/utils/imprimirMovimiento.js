import { formatearMonto, formatearFechaHora } from './format';

const escapeHtml = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Comprobante NO FISCAL de un movimiento manual de caja.
 * Se imprime desde un iframe oculto (no depende de abrir una ventana emergente, que el
 * navegador bloquearía porque se dispara después de la respuesta del servidor).
 */
export function imprimirComprobanteMovimiento(mov) {
  const esEgreso = mov.tipo === 'Egreso';
  const numero = String(mov.movimientoId || '').slice(0, 8).toUpperCase();

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Movimiento de caja ${escapeHtml(numero)}</title>
<style>
  body { font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; padding: 14px; color: #000; font-size: 12px; }
  h1 { font-size: 15px; text-align: center; margin: 0 0 4px; }
  .nofiscal { text-align: center; font-weight: bold; border: 1px solid #000; padding: 4px; margin: 6px 0 10px; font-size: 11px; }
  .row { display: flex; justify-content: space-between; gap: 8px; margin: 3px 0; }
  .row span:last-child { text-align: right; }
  .monto { font-size: 18px; font-weight: bold; text-align: center; margin: 12px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 8px 0; }
  .firma { margin-top: 34px; border-top: 1px solid #000; text-align: center; padding-top: 4px; font-size: 11px; }
  .obs { margin-top: 6px; word-break: break-word; }
</style></head><body>
  <h1>MOVIMIENTO DE CAJA</h1>
  <div class="nofiscal">COMPROBANTE NO FISCAL<br>NO VÁLIDO COMO FACTURA</div>
  <div class="row"><span>N° movimiento</span><span>${escapeHtml(numero)}</span></div>
  <div class="row"><span>Fecha y hora</span><span>${escapeHtml(formatearFechaHora(mov.fechaHora))}</span></div>
  <div class="row"><span>Caja</span><span>${escapeHtml(mov.cajaNombre)}</span></div>
  <div class="row"><span>Tipo</span><span>${escapeHtml(mov.tipo.toUpperCase())}</span></div>
  <div class="row"><span>Concepto</span><span>${escapeHtml(mov.concepto)}</span></div>
  <div class="monto">${esEgreso ? '-' : '+'} ${escapeHtml(formatearMonto(mov.monto))}</div>
  ${mov.observacion ? `<div class="obs"><b>Observación:</b> ${escapeHtml(mov.observacion)}</div>` : ''}
  ${mov.resumen ? `<div class="row" style="margin-top:10px"><span>Efectivo en caja</span><span>${escapeHtml(formatearMonto(mov.resumen.saldoEfectivo))}</span></div>` : ''}
  <div class="firma">Firma del responsable</div>
</body></html>`;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  iframe.srcdoc = html;
  iframe.onload = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } finally {
      setTimeout(() => iframe.remove(), 3000);
    }
  };
  document.body.appendChild(iframe);
}