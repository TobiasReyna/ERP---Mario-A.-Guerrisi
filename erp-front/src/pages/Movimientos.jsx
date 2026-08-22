function Movimientos() {

    return (

        <section class="view" id="view-movements">

        <div class="section-heading">
          <div>
            <h2>Movimientos de stock</h2>
            <span class="desc">Historial de entradas, salidas, ajustes y transferencias</span>
          </div>
          <button class="btn btn-primary" id="open-movement-modal">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Registrar movimiento
          </button>
        </div>

        <div class="filter-bar">
          <div class="select-field">Tipo:
            <select><option>Todos</option><option>Entrada</option><option>Salida</option><option>Ajuste positivo</option><option>Ajuste negativo</option><option>Transferencia</option></select>
          </div>
          <div class="select-field">Depósito:
            <select><option>Todos</option><option>Central</option><option>Norte</option><option>Sur</option></select>
          </div>
          <div class="select-field">Usuario:
            <select><option>Todos</option><option>Juan Pérez</option><option>María Gómez</option><option>Carlos Ruiz</option></select>
          </div>
          <div class="search-input" style="max-width:240px;">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" placeholder="Buscar producto o SKU"/>
          </div>
        </div>

        <div class="table-panel">
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Producto</th><th>Tipo</th><th>Depósito</th><th>Cantidad</th><th>Motivo</th><th>Usuario</th><th>Fecha</th><th>Stock ant. → result.</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="cell-strong">Fender Stratocaster Player<div class="cell-sub">GTR-FEN-001</div></td>
                  <td><span class="type-pill type-entrada">ENTRADA</span></td>
                  <td>Central</td><td>+12</td><td>Reposición de proveedor</td><td>Juan Pérez</td><td>15/08/2026 09:14</td>
                  <td>0 → 10</td>
                  <td><span class="badge badge-green"><span class="badge-dot"></span>Completado</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Shure SM58<div class="cell-sub">MIC-SHR-004</div></td>
                  <td><span class="type-pill type-salida">SALIDA</span></td>
                  <td>Norte</td><td>-6</td><td>Venta mostrador</td><td>María Gómez</td><td>15/08/2026 08:52</td>
                  <td>16 → 10</td>
                  <td><span class="badge badge-green"><span class="badge-dot"></span>Completado</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Roland TD-17<div class="cell-sub">BAT-ROL-006</div></td>
                  <td><span class="type-pill type-transferencia">TRANSFERENCIA</span></td>
                  <td>Central → Sur</td><td>2</td><td>Rebalanceo de stock</td><td>Carlos Ruiz</td><td>14/08/2026 17:30</td>
                  <td>5 → 3 / -1 → 1</td>
                  <td><span class="badge badge-green"><span class="badge-dot"></span>Completado</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Ibanez GSR200<div class="cell-sub">BAJ-IBA-010</div></td>
                  <td><span class="type-pill type-ajuste-neg">AJUSTE NEG.</span></td>
                  <td>Sur</td><td>-1</td><td>Producto dañado en depósito</td><td>Carlos Ruiz</td><td>14/08/2026 16:05</td>
                  <td>1 → 0</td>
                  <td><span class="badge badge-green"><span class="badge-dot"></span>Completado</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Yamaha P-145<div class="cell-sub">KEY-YAM-003</div></td>
                  <td><span class="type-pill type-entrada">ENTRADA</span></td>
                  <td>Central</td><td>+9</td><td>Reposición de proveedor</td><td>Juan Pérez</td><td>14/08/2026 11:20</td>
                  <td>0 → 9</td>
                  <td><span class="badge badge-green"><span class="badge-dot"></span>Completado</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Marshall MG30GFX<div class="cell-sub">AMP-MAR-005</div></td>
                  <td><span class="type-pill type-ajuste-pos">AJUSTE POS.</span></td>
                  <td>Central</td><td>+2</td><td>Corrección de conteo físico</td><td>María Gómez</td><td>13/08/2026 15:41</td>
                  <td>4 → 6</td>
                  <td><span class="badge badge-green"><span class="badge-dot"></span>Completado</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Pearl Export Series<div class="cell-sub">BAT-PEA-012</div></td>
                  <td><span class="type-pill type-salida">SALIDA</span></td>
                  <td>Central</td><td>-3</td><td>Venta a cliente corporativo</td><td>Juan Pérez</td><td>13/08/2026 10:02</td>
                  <td>5 → 2</td>
                  <td><span class="badge badge-green"><span class="badge-dot"></span>Completado</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Cort AD810<div class="cell-sub">GTR-COR-007</div></td>
                  <td><span class="type-pill type-transferencia">TRANSFERENCIA</span></td>
                  <td>Norte → Sur</td><td>4</td><td>Solicitud de sucursal</td><td>Carlos Ruiz</td><td>12/08/2026 14:18</td>
                  <td>10 → 6 / 5 → 9</td>
                  <td><span class="badge badge-amber"><span class="badge-dot"></span>Pendiente</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Yamaha YTR-2330<div class="cell-sub">VIE-YAM-016</div></td>
                  <td><span class="type-pill type-ajuste-neg">AJUSTE NEG.</span></td>
                  <td>Sur</td><td>-1</td><td>Unidad enviada a service técnico</td><td>María Gómez</td><td>11/08/2026 09:30</td>
                  <td>1 → 0</td>
                  <td><span class="badge badge-green"><span class="badge-dot"></span>Completado</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Korg B2<div class="cell-sub">KEY-KOR-011</div></td>
                  <td><span class="type-pill type-entrada">ENTRADA</span></td>
                  <td>Norte</td><td>+5</td><td>Reposición de proveedor</td><td>Juan Pérez</td><td>10/08/2026 12:00</td>
                  <td>0 → 5</td>
                  <td><span class="badge badge-green"><span class="badge-dot"></span>Completado</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

    );
}

export default Movimientos;