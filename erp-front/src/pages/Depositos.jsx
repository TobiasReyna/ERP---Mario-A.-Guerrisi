import { Link } from 'react-router-dom';
import { useState } from 'react';

function Depositos() {

    return(
        <div>


        <div class="section-heading">
          <div>
            <h2>Depósitos</h2>
            <span class="desc">Visión general de los 3 depósitos activos</span>
          </div>
        </div>

        <div class="warehouse-grid">
          <div class="warehouse-card">
            <div class="warehouse-card-top">
              <div class="warehouse-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/></svg>
              </div>
              <div>
                <div class="warehouse-card-name">Depósito Central</div>
                <div class="warehouse-card-loc">Salta Capital, Salta</div>
              </div>
            </div>
            <div class="warehouse-stat-row"><span class="k">Productos distintos</span><span class="v">142</span></div>
            <div class="warehouse-stat-row"><span class="k">Unidades totales</span><span class="v">1.960</span></div>
            <div class="warehouse-stat-row"><span class="k">Alertas activas</span><span class="v">3</span></div>
            <div class="warehouse-stat-row"><span class="k">Responsable</span><span class="v">Juan Pérez</span></div>
          </div>

          <div class="warehouse-card">
            <div class="warehouse-card-top">
              <div class="warehouse-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/></svg>
              </div>
              <div>
                <div class="warehouse-card-name">Depósito Norte</div>
                <div class="warehouse-card-loc">Jujuy, Argentina</div>
              </div>
            </div>
            <div class="warehouse-stat-row"><span class="k">Productos distintos</span><span class="v">98</span></div>
            <div class="warehouse-stat-row"><span class="k">Unidades totales</span><span class="v">874</span></div>
            <div class="warehouse-stat-row"><span class="k">Alertas activas</span><span class="v">5</span></div>
            <div class="warehouse-stat-row"><span class="k">Responsable</span><span class="v">María Gómez</span></div>
          </div>

          <div class="warehouse-card">
            <div class="warehouse-card-top">
              <div class="warehouse-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/></svg>
              </div>
              <div>
                <div class="warehouse-card-name">Depósito Sur</div>
                <div class="warehouse-card-loc">Tucumán, Argentina</div>
              </div>
            </div>
            <div class="warehouse-stat-row"><span class="k">Productos distintos</span><span class="v">116</span></div>
            <div class="warehouse-stat-row"><span class="k">Unidades totales</span><span class="v">1.008</span></div>
            <div class="warehouse-stat-row"><span class="k">Alertas activas</span><span class="v">4</span></div>
            <div class="warehouse-stat-row"><span class="k">Responsable</span><span class="v">Carlos Ruiz</span></div>
          </div>
        </div>

        {/*<div class="panel">
          <div class="panel-header"><h3>Distribución de stock total por depósito</h3></div>
          <div class="panel-body">
            <div class="bar-chart">
              <div class="bar-row">
                <span class="bar-row-label">Depósito Central</span>
                <div class="bar-track"><div class="bar-fill" style="width:100%"></div></div>
                <span class="bar-row-value">1.960</span>
              </div>
              <div class="bar-row">
                <span class="bar-row-label">Depósito Sur</span>
                <div class="bar-track"><div class="bar-fill alt" style="width:51%"></div></div>
                <span class="bar-row-value">1.008</span>
              </div>
              <div class="bar-row">
                <span class="bar-row-label">Depósito Norte</span>
                <div class="bar-track"><div class="bar-fill" style="width:45%"></div></div>
                <span class="bar-row-value">874</span>
              </div>
            </div>
          </div>
        </div> */}

        </div>
    );
}

export default Depositos;