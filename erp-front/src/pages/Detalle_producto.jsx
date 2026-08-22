import { Link } from 'react-router-dom'
import { useState } from 'react';

function Detalle_producto() {


    return(

        <div>
            <Link className="back-link" to="/Catalogo_de_productos">
            <span class="back-link" data-view-link="catalog">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                Volver al catálogo
            </span>
            </Link>

        <div class="detail-grid">
          <div class="detail-image">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>

          <div class="detail-panel">
            <div class="detail-top">
              <div>
                <div class="detail-category">Guitarras eléctricas</div>
                <h2 class="detail-title">Fender Stratocaster Player</h2>
                <div class="detail-sub">Marca Fender · Modelo MX23 · SKU GTR-FEN-001</div>
              </div>
              <div class="detail-price">$1.250.000</div>
            </div>

            <div class="detail-info-grid">
              <div class="detail-info-item">
                <div class="label">Stock total</div>
                <div class="value">16 unidades</div>
              </div>
              <div class="detail-info-item">
                <div class="label">Stock mínimo</div>
                <div class="value">5 unidades</div>
              </div>
              <div class="detail-info-item">
                <div class="label">Estado</div>
                <div class="value"><span class="badge badge-green"><span class="badge-dot"></span>Disponible</span></div>
              </div>
            </div>

            <p class="detail-desc">Guitarra eléctrica de cuerpo sólido en tilo, mástil de arce con diapasón de arce, pastillas Player Series Alnico 5 Strat y puente tremolo de 2 puntos. Ideal para estudio y presentaciones en vivo, con la versatilidad tonal característica de la línea Player.</p>

            <div class="detail-actions">
              <button class="btn btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                Editar producto
              </button>
              <button class="btn btn-outline" id="open-movement-modal-detail">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                Registrar movimiento
              </button>
              <button class="btn btn-outline">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
                Ver historial
              </button>
            </div>
          </div>
        </div>

        <div class="section-heading"><h2>Stock por depósito</h2></div>
        {/*<div class="warehouse-stock-grid">
          <div class="wh-stock-card">
            <div class="wh-name">Depósito Central</div>
            <div class="wh-qty">10</div>
            <div class="wh-bar"><div class="wh-bar-fill" style="width:100%"></div></div>
          </div>
          <div class="wh-stock-card">
            <div class="wh-name">Depósito Norte</div>
            <div class="wh-qty">3</div>
            <div class="wh-bar"><div class="wh-bar-fill" style="width:30%"></div></div>
          </div>
          <div class="wh-stock-card">
            <div class="wh-name">Depósito Sur</div>
            <div class="wh-qty">3</div>
            <div class="wh-bar"><div class="wh-bar-fill" style="width:30%"></div></div>
          </div>
        </div>*/}

        <div class="dashboard-row">
          <div class="panel">
            <div class="panel-header"><h3>Especificaciones</h3></div>
            <div class="panel-body">
              <div class="spec-list">
                <div class="spec-row"><span class="k">Cuerpo</span><span class="v">Tilo (Alder)</span></div>
                <div class="spec-row"><span class="k">Mástil</span><span class="v">Arce, perfil "Modern C"</span></div>
                <div class="spec-row"><span class="k">Diapasón</span><span class="v">Arce, radio 241 mm</span></div>
                <div class="spec-row"><span class="k">Pastillas</span><span class="v">Player Series Alnico 5 Strat (SSS)</span></div>
                <div class="spec-row"><span class="k">Puente</span><span class="v">Tremolo 2 puntos</span></div>
                <div class="spec-row"><span class="k">Escala</span><span class="v">648 mm (25.5")</span></div>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-header"><h3>Historial de movimientos</h3></div>
            <div class="table-scroll">
              <table>
                <thead><tr><th>Tipo</th><th>Depósito</th><th>Cant.</th><th>Fecha</th></tr></thead>
                <tbody>
                  <tr><td><span class="type-pill type-entrada">ENTRADA</span></td><td>Central</td><td>+12</td><td>15/08</td></tr>
                  <tr><td><span class="type-pill type-salida">SALIDA</span></td><td>Norte</td><td>-2</td><td>10/08</td></tr>
                  <tr><td><span class="type-pill type-transferencia">TRANSF.</span></td><td>Central → Sur</td><td>3</td><td>03/08</td></tr>
                  <tr><td><span class="type-pill type-entrada">ENTRADA</span></td><td>Sur</td><td>+6</td><td>28/07</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </div>
    )
}

export default Detalle_producto;