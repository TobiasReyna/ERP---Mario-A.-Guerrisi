import { Link } from 'react-router-dom';
import { useState } from 'react';

function Alertas_de_stock() {

    return(

        <div>


        <div class="alert-summary-card">
          <div class="alert-summary-left">
            <div class="alert-summary-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <div>
              <div class="alert-summary-title">12 productos requieren atención</div>
              <div class="alert-summary-sub">Revisá el detalle y generá órdenes de reposición para evitar quiebres de stock</div>
            </div>
          </div>
          <div class="alert-summary-stats">
            <div class="alert-summary-stat"><div class="n">4</div><div class="l">Críticos</div></div>
            <div class="alert-summary-stat"><div class="n">8</div><div class="l">Stock bajo</div></div>
            <div class="alert-summary-stat"><div class="n">3</div><div class="l">Depósitos</div></div>
          </div>
        </div>

        <div class="section-heading">
          <div>
            <h2>Productos con alertas activas</h2>
            <span class="desc">Ordenados por prioridad de reposición</span>
          </div>
          <button class="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
            Gestionar reposición
          </button>
        </div>

        <div class="alert-cards">

          <div class="alert-card">
            <div class="alert-card-head">
              <div>
                <div class="alert-card-name">Fender Stratocaster Player</div>
                <div class="alert-card-sku">GTR-FEN-001</div>
              </div>
              <span class="badge badge-red"><span class="badge-dot"></span>Crítico</span>
            </div>
            <div class="alert-card-metrics">
              <div class="alert-metric crit"><div class="n">2</div><div class="l">Actual</div></div>
              <div class="alert-metric"><div class="n">5</div><div class="l">Mínimo</div></div>
              <div class="alert-metric"><div class="n">8</div><div class="l">Sugerido</div></div>
            </div>
            <div class="alert-card-foot">
              <span class="alert-card-wh">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/></svg>
                Depósito Norte
              </span>
              <button class="btn btn-outline btn-sm">Generar reposición</button>
            </div>
          </div>

          <div class="alert-card">
            <div class="alert-card-head">
              <div>
                <div class="alert-card-name">Pearl Export Series</div>
                <div class="alert-card-sku">BAT-PEA-012</div>
              </div>
              <span class="badge badge-red"><span class="badge-dot"></span>Crítico</span>
            </div>
            <div class="alert-card-metrics">
              <div class="alert-metric crit"><div class="n">2</div><div class="l">Actual</div></div>
              <div class="alert-metric"><div class="n">4</div><div class="l">Mínimo</div></div>
              <div class="alert-metric"><div class="n">6</div><div class="l">Sugerido</div></div>
            </div>
            <div class="alert-card-foot">
              <span class="alert-card-wh">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/></svg>
                Depósito Central
              </span>
              <button class="btn btn-outline btn-sm">Generar reposición</button>
            </div>
          </div>

          <div class="alert-card">
            <div class="alert-card-head">
              <div>
                <div class="alert-card-name">Ibanez GSR200</div>
                <div class="alert-card-sku">BAJ-IBA-010</div>
              </div>
              <span class="badge badge-red"><span class="badge-dot"></span>Crítico</span>
            </div>
            <div class="alert-card-metrics">
              <div class="alert-metric crit"><div class="n">3</div><div class="l">Actual</div></div>
              <div class="alert-metric"><div class="n">6</div><div class="l">Mínimo</div></div>
              <div class="alert-metric"><div class="n">8</div><div class="l">Sugerido</div></div>
            </div>
            <div class="alert-card-foot">
              <span class="alert-card-wh">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/></svg>
                Depósito Sur
              </span>
              <button class="btn btn-outline btn-sm">Generar reposición</button>
            </div>
          </div>

          <div class="alert-card">
            <div class="alert-card-head">
              <div>
                <div class="alert-card-name">Yamaha YTR-2330</div>
                <div class="alert-card-sku">VIE-YAM-016</div>
              </div>
              <span class="badge badge-red"><span class="badge-dot"></span>Crítico</span>
            </div>
            <div class="alert-card-metrics">
              <div class="alert-metric crit"><div class="n">0</div><div class="l">Actual</div></div>
              <div class="alert-metric"><div class="n">5</div><div class="l">Mínimo</div></div>
              <div class="alert-metric"><div class="n">6</div><div class="l">Sugerido</div></div>
            </div>
            <div class="alert-card-foot">
              <span class="alert-card-wh">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/></svg>
                Depósito Sur
              </span>
              <button class="btn btn-outline btn-sm">Generar reposición</button>
            </div>
          </div>

          <div class="alert-card priority-low">
            <div class="alert-card-head">
              <div>
                <div class="alert-card-name">Taylor 214ce</div>
                <div class="alert-card-sku">GTR-TAY-008</div>
              </div>
              <span class="badge badge-amber"><span class="badge-dot"></span>Stock bajo</span>
            </div>
            <div class="alert-card-metrics">
              <div class="alert-metric"><div class="n">4</div><div class="l">Actual</div></div>
              <div class="alert-metric"><div class="n">6</div><div class="l">Mínimo</div></div>
              <div class="alert-metric"><div class="n">6</div><div class="l">Sugerido</div></div>
            </div>
            <div class="alert-card-foot">
              <span class="alert-card-wh">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/></svg>
                Depósito Sur
              </span>
              <button class="btn btn-outline btn-sm">Generar reposición</button>
            </div>
          </div>

          <div class="alert-card priority-low">
            <div class="alert-card-head">
              <div>
                <div class="alert-card-name">Roland TD-17</div>
                <div class="alert-card-sku">BAT-ROL-006</div>
              </div>
              <span class="badge badge-amber"><span class="badge-dot"></span>Stock bajo</span>
            </div>
            <div class="alert-card-metrics">
              <div class="alert-metric"><div class="n">5</div><div class="l">Actual</div></div>
              <div class="alert-metric"><div class="n">6</div><div class="l">Mínimo</div></div>
              <div class="alert-metric"><div class="n">4</div><div class="l">Sugerido</div></div>
            </div>
            <div class="alert-card-foot">
              <span class="alert-card-wh">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/></svg>
                Depósito Norte
              </span>
              <button class="btn btn-outline btn-sm">Generar reposición</button>
            </div>
          </div>

          <div class="alert-card priority-low">
            <div class="alert-card-head">
              <div>
                <div class="alert-card-name">Yamaha HS5</div>
                <div class="alert-card-sku">AUD-YAM-014</div>
              </div>
              <span class="badge badge-amber"><span class="badge-dot"></span>Stock bajo</span>
            </div>
            <div class="alert-card-metrics">
              <div class="alert-metric"><div class="n">7</div><div class="l">Actual</div></div>
              <div class="alert-metric"><div class="n">8</div><div class="l">Mínimo</div></div>
              <div class="alert-metric"><div class="n">6</div><div class="l">Sugerido</div></div>
            </div>
            <div class="alert-card-foot">
              <span class="alert-card-wh">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/></svg>
                Depósito Sur
              </span>
              <button class="btn btn-outline btn-sm">Generar reposición</button>
            </div>
          </div>

          <div class="alert-card priority-low">
            <div class="alert-card-head">
              <div>
                <div class="alert-card-name">Korg B2</div>
                <div class="alert-card-sku">KEY-KOR-011</div>
              </div>
              <span class="badge badge-amber"><span class="badge-dot"></span>Stock bajo</span>
            </div>
            <div class="alert-card-metrics">
              <div class="alert-metric"><div class="n">2</div><div class="l">Actual</div></div>
              <div class="alert-metric"><div class="n">3</div><div class="l">Mínimo</div></div>
              <div class="alert-metric"><div class="n">4</div><div class="l">Sugerido</div></div>
            </div>
            <div class="alert-card-foot">
              <span class="alert-card-wh">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/></svg>
                Depósito Sur
              </span>
              <button class="btn btn-outline btn-sm">Generar reposición</button>
            </div>
          </div>

        </div>

        </div>

    );
}

export default Alertas_de_stock;