import { Link } from 'react-router-dom';
import { useState } from 'react';

//import '../index.css';

function Dashboard() {

    return(

        
        <div className="main">

          

            <main className="content">
                <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-card-top">
              <div class="stat-icon tint-red">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L4 3v5.59a2 2 0 0 0 .59 1.41l9.59 9.59a2 2 0 0 0 2.82 0l3.59-3.59a2 2 0 0 0 0-2.59Z"/></svg>
              </div>
              <span class="stat-trend up">+4.2%</span>
            </div>
            <div class="stat-value">186</div>
            <div class="stat-label">Productos en catalogo</div>
          </div>

          <div class="stat-card">
            <div class="stat-card-top">
              <div class="stat-icon tint-black">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/></svg>
              </div>
              <span class="stat-trend flat">estable</span>
            </div>
            <div class="stat-value">3.842</div>
            <div class="stat-label">Unidades - stock consolidado</div>
          </div>

          <div class="stat-card">
            <div class="stat-card-top">
              <div class="stat-icon tint-amber">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg>
              </div>
              <span class="stat-trend down">+2 hoy</span>
            </div>
            <div class="stat-value">12</div>
            <div class="stat-label">Productos que requieren atención</div>
          </div>

          <div class="stat-card">
            <div class="stat-card-top">
              <div class="stat-icon tint-green">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h13l-3-3M17 17H4l3 3"/></svg>
              </div>
              <span class="stat-trend up">+18%</span>
            </div>
            <div class="stat-value">27</div>
            <div class="stat-label">Movimientos del día</div>
          </div>
        </div>
        <div className="dashboard-row">
          <div class="panel">
            <div class="panel-header">
              <h3>Stock consolidado por categoría</h3>
              <Link to="/Inventario">
              <span class="link">Ver inventario</span>
              </Link>
            </div>
            <div class="panel-body">
              <div class="bar-chart">
                <div class="bar-row">
                  <span class="bar-row-label">Guitarras eléctricas</span>
                  <div class="bar-track"><div class="bar-fill" ></div></div>
                  <span class="bar-row-value">612</span>
                </div>
                <div class="bar-row">
                  <span class="bar-row-label">Guitarras acústicas</span>
                  <div class="bar-track"><div class="bar-fill alt" ></div></div>
                  <span class="bar-row-value">398</span>
                </div>
                <div class="bar-row">
                  <span class="bar-row-label">Bajos</span>
                  <div class="bar-track"><div class="bar-fill" ></div></div>
                  <span class="bar-row-value">211</span>
                </div>
                <div class="bar-row">
                  <span class="bar-row-label">Teclados y pianos</span>
                  <div class="bar-track"><div class="bar-fill alt" ></div></div>
                  <span class="bar-row-value">487</span>
                </div>
                <div class="bar-row">
                  <span class="bar-row-label">Baterías y percusión</span>
                  <div class="bar-track"><div class="bar-fill" ></div></div>
                  <span class="bar-row-value">318</span>
                </div>
                <div class="bar-row">
                  <span class="bar-row-label">Amplificadores</span>
                  <div class="bar-track"><div class="bar-fill alt" ></div></div>
                  <span class="bar-row-value">267</span>
                </div>
                <div class="bar-row">
                  <span class="bar-row-label">Micrófonos y audio</span>
                  <div class="bar-track"><div class="bar-fill"></div></div>
                  <span class="bar-row-value">743</span>
                </div>
                <div class="bar-row">
                  <span class="bar-row-label">Accesorios</span>
                  <div class="bar-track"><div class="bar-fill alt"></div></div>
                  <span class="bar-row-value">806</span>
                </div>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">
              <h3>Alertas recientes</h3>

              {/*Agregar a futuro el link que conduzca a la nueva página "Alertas y notificaciones"*/}
              <span class="link">Ver todas</span>


            </div>
            <div class="panel-body">
              <div class="alert-mini">
                <span class="alert-mini-dot crit"></span>
                <div class="alert-mini-info">
                  <div class="alert-mini-name">Pearl Export Series</div>
                  <div class="alert-mini-sub">Depósito Central · mínimo 4</div>
                </div>
                <span class="alert-mini-stock">2 uds.</span>
              </div>
              <div class="alert-mini">
                <span class="alert-mini-dot crit"></span>
                <div class="alert-mini-info">
                  <div class="alert-mini-name">Ibanez GSR200</div>
                  <div class="alert-mini-sub">Depósito Sur · mínimo 6</div>
                </div>
                <span class="alert-mini-stock">3 uds.</span>
              </div>
              <div class="alert-mini">
                <span class="alert-mini-dot low"></span>
                <div class="alert-mini-info">
                  <div class="alert-mini-name">Fender Stratocaster Player</div>
                  <div class="alert-mini-sub">Depósito Norte · mínimo 5</div>
                </div>
                <span class="alert-mini-stock low">3 uds.</span>
              </div>
              <div class="alert-mini">
                <span class="alert-mini-dot low"></span>
                <div class="alert-mini-info">
                  <div class="alert-mini-name">Taylor 214ce</div>
                  <div class="alert-mini-sub">Depósito Sur · mínimo 6</div>
                </div>
                <span class="alert-mini-stock low">4 uds.</span>
              </div>
              <div class="alert-mini">
                <span class="alert-mini-dot low"></span>
                <div class="alert-mini-info">
                  <div class="alert-mini-name">Yamaha YTR-2330</div>
                  <div class="alert-mini-sub">Depósito Norte · mínimo 5</div>
                </div>
                <span class="alert-mini-stock low">3 uds.</span>
              </div>
            </div>
          </div>

        </div>
        <div class="panel">
          <div class="panel-header">
            <h3>Últimos movimientos</h3>
            
            <Link to="/Movimientos">
            <span class="link">Ver historial completo</span>
            </Link>
            
          </div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Producto</th><th>Tipo</th><th>Depósito</th><th>Cantidad</th><th>Usuario</th><th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="cell-strong">Fender Stratocaster Player</td>
                  <td><span class="type-pill type-entrada">ENTRADA</span></td>
                  <td>Depósito Central</td>
                  <td>+12</td>
                  <td>Juan Pérez</td>
                  <td>15/08/2026 · 09:14</td>
                </tr>
                <tr>
                  <td class="cell-strong">Shure SM58</td>
                  <td><span class="type-pill type-salida">SALIDA</span></td>
                  <td>Depósito Norte</td>
                  <td>-6</td>
                  <td>María Gómez</td>
                  <td>15/08/2026 · 08:52</td>
                </tr>
                <tr>
                  <td class="cell-strong">Roland TD-17</td>
                  <td><span class="type-pill type-transferencia">TRANSFERENCIA</span></td>
                  <td>Central → Sur</td>
                  <td>2</td>
                  <td>Carlos Ruiz</td>
                  <td>14/08/2026 · 17:30</td>
                </tr>
                <tr>
                  <td class="cell-strong">Ibanez GSR200</td>
                  <td><span class="type-pill type-ajuste-neg">AJUSTE NEG.</span></td>
                  <td>Depósito Sur</td>
                  <td>-1</td>
                  <td>Carlos Ruiz</td>
                  <td>14/08/2026 · 16:05</td>
                </tr>
                <tr>
                  <td class="cell-strong">Yamaha P-145</td>
                  <td><span class="type-pill type-entrada">ENTRADA</span></td>
                  <td>Depósito Central</td>
                  <td>+9</td>
                  <td>Juan Pérez</td>
                  <td>14/08/2026 · 11:20</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
            </main>
        </div>

    );

}

export default Dashboard;