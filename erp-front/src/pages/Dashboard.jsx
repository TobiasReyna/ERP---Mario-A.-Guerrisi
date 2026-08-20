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
            <div class="stat-label">Productos registrados</div>
          </div>

          <div class="stat-card">
            <div class="stat-card-top">
              <div class="stat-icon tint-black">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/></svg>
              </div>
              <span class="stat-trend flat">estable</span>
            </div>
            <div class="stat-value">3.842</div>
            <div class="stat-label">Unidades en stock total</div>
          </div>

          <div class="stat-card">
            <div class="stat-card-top">
              <div class="stat-icon tint-amber">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg>
              </div>
              <span class="stat-trend down">+2 hoy</span>
            </div>
            <div class="stat-value">12</div>
            <div class="stat-label">Productos con stock bajo</div>
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
        
        <div class="panel">
          <div class="panel-header">
            <h3>Últimos movimientos</h3>
            <span class="link">Ver historial completo</span>
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