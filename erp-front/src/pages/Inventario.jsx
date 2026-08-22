import { Link } from 'react-router-dom';
import { useState } from 'react';

function Inventario() {

    return(
        <div>
            <div class="section-heading">
          <div>
            <h2>Inventario multi-depósito</h2>
            <span class="desc">Comparación de stock entre los 3 depósitos activos</span>
          </div>
        </div>

        <div class="warehouse-tabs">
          <span class="warehouse-tab active">Todos los depósitos</span>
          <span class="warehouse-tab">Depósito Central</span>
          <span class="warehouse-tab">Depósito Norte</span>
          <span class="warehouse-tab">Depósito Sur</span>
        </div>

        <div class="filter-bar">
          <div class="select-field">Categoría:
            <select><option>Todas</option><option>Guitarras eléctricas</option><option>Guitarras acústicas</option><option>Bajos</option><option>Teclados / Pianos</option><option>Baterías / Percusión</option><option>Amplificadores</option><option>Micrófonos / Audio</option><option>Accesorios</option><option>Viento</option></select>
          </div>
          <div class="select-field">Marca:
            <select><option>Todas</option><option>Fender</option><option>Gibson</option><option>Yamaha</option><option>Roland</option></select>
          </div>
          <div class="select-field">Estado:
            <select><option>Todos</option><option>Disponible</option><option>Stock bajo</option><option>Crítico</option></select>
          </div>
        </div>

        <div class="table-panel">
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Producto</th><th>SKU</th><th>Central</th><th>Norte</th><th>Sur</th><th>Stock total</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="cell-strong">Fender Stratocaster Player</td>
                  <td>GTR-FEN-001</td>
                  <td class="stock-cell">10</td><td class="stock-cell low">3</td><td class="stock-cell low">3</td>
                  <td class="cell-strong">16</td>
                  <td><span class="badge badge-green"><span class="badge-dot"></span>Disponible</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Gibson Les Paul Studio</td>
                  <td>GTR-GIB-002</td>
                  <td class="stock-cell">4</td><td class="stock-cell">1</td><td class="stock-cell">2</td>
                  <td class="cell-strong">7</td>
                  <td><span class="badge badge-green"><span class="badge-dot"></span>Disponible</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Cort AD810</td>
                  <td>GTR-COR-007</td>
                  <td class="stock-cell">12</td><td class="stock-cell">6</td><td class="stock-cell">9</td>
                  <td class="cell-strong">27</td>
                  <td><span class="badge badge-green"><span class="badge-dot"></span>Disponible</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Taylor 214ce</td>
                  <td>GTR-TAY-008</td>
                  <td class="stock-cell">3</td><td class="stock-cell zero">0</td><td class="stock-cell low">1</td>
                  <td class="cell-strong">4</td>
                  <td><span class="badge badge-amber"><span class="badge-dot"></span>Stock bajo</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Fender Player Jazz Bass</td>
                  <td>BAJ-FEN-009</td>
                  <td class="stock-cell">5</td><td class="stock-cell">2</td><td class="stock-cell">3</td>
                  <td class="cell-strong">10</td>
                  <td><span class="badge badge-green"><span class="badge-dot"></span>Disponible</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Ibanez GSR200</td>
                  <td>BAJ-IBA-010</td>
                  <td class="stock-cell low">2</td><td class="stock-cell low">1</td><td class="stock-cell zero">0</td>
                  <td class="cell-strong">3</td>
                  <td><span class="badge badge-red"><span class="badge-dot"></span>Crítico</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Yamaha P-145</td>
                  <td>KEY-YAM-003</td>
                  <td class="stock-cell">9</td><td class="stock-cell">4</td><td class="stock-cell">6</td>
                  <td class="cell-strong">19</td>
                  <td><span class="badge badge-green"><span class="badge-dot"></span>Disponible</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Korg B2</td>
                  <td>KEY-KOR-011</td>
                  <td class="stock-cell">7</td><td class="stock-cell">3</td><td class="stock-cell">2</td>
                  <td class="cell-strong">12</td>
                  <td><span class="badge badge-green"><span class="badge-dot"></span>Disponible</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Roland TD-17</td>
                  <td>BAT-ROL-006</td>
                  <td class="stock-cell">3</td><td class="stock-cell low">1</td><td class="stock-cell low">1</td>
                  <td class="cell-strong">5</td>
                  <td><span class="badge badge-green"><span class="badge-dot"></span>Disponible</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Pearl Export Series</td>
                  <td>BAT-PEA-012</td>
                  <td class="stock-cell low">2</td><td class="stock-cell zero">0</td><td class="stock-cell zero">0</td>
                  <td class="cell-strong">2</td>
                  <td><span class="badge badge-red"><span class="badge-dot"></span>Crítico</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">LP Cajón Peruano</td>
                  <td>PER-LPX-013</td>
                  <td class="stock-cell">15</td><td class="stock-cell">8</td><td class="stock-cell">10</td>
                  <td class="cell-strong">33</td>
                  <td><span class="badge badge-green"><span class="badge-dot"></span>Disponible</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Marshall MG30GFX</td>
                  <td>AMP-MAR-005</td>
                  <td class="stock-cell">6</td><td class="stock-cell">2</td><td class="stock-cell">3</td>
                  <td class="cell-strong">11</td>
                  <td><span class="badge badge-green"><span class="badge-dot"></span>Disponible</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Shure SM58</td>
                  <td>MIC-SHR-004</td>
                  <td class="stock-cell">20</td><td class="stock-cell">10</td><td class="stock-cell">14</td>
                  <td class="cell-strong">44</td>
                  <td><span class="badge badge-green"><span class="badge-dot"></span>Disponible</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Yamaha HS5</td>
                  <td>AUD-YAM-014</td>
                  <td class="stock-cell">4</td><td class="stock-cell">2</td><td class="stock-cell low">1</td>
                  <td class="cell-strong">7</td>
                  <td><span class="badge badge-green"><span class="badge-dot"></span>Disponible</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Dunlop Correa + Púas Kit</td>
                  <td>ACC-DUN-015</td>
                  <td class="stock-cell">30</td><td class="stock-cell">18</td><td class="stock-cell">22</td>
                  <td class="cell-strong">70</td>
                  <td><span class="badge badge-green"><span class="badge-dot"></span>Disponible</span></td>
                </tr>
                <tr>
                  <td class="cell-strong">Yamaha YTR-2330</td>
                  <td>VIE-YAM-016</td>
                  <td class="stock-cell low">2</td><td class="stock-cell low">1</td><td class="stock-cell zero">0</td>
                  <td class="cell-strong">3</td>
                  <td><span class="badge badge-amber"><span class="badge-dot"></span>Stock bajo</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        </div>
    );
}

export default Inventario;