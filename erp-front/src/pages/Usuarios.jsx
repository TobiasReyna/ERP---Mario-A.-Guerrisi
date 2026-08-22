import { Link } from 'react-router-dom';
import { useState } from 'react';

function Usuarios() {

    return (

        <div>
        <div class="section-heading"><div><h2>Usuarios</h2><span class="desc">Administración de accesos y responsables por depósito</span></div></div>
        <div class="table-panel">
          <div class="table-scroll">
            <table>
              <thead><tr><th>Usuario</th><th>Rol</th><th>Depósito asignado</th><th>Estado</th></tr></thead>
              <tbody>
                <tr><td class="cell-strong">Juan Pérez</td><td>Encargado de depósito</td><td>Depósito Central</td><td><span class="badge badge-green"><span class="badge-dot"></span>Activo</span></td></tr>
                <tr><td class="cell-strong">María Gómez</td><td>Encargada de depósito</td><td>Depósito Norte</td><td><span class="badge badge-green"><span class="badge-dot"></span>Activo</span></td></tr>
                <tr><td class="cell-strong">Carlos Ruiz</td><td>Encargado de depósito</td><td>Depósito Sur</td><td><span class="badge badge-green"><span class="badge-dot"></span>Activo</span></td></tr>
                <tr><td class="cell-strong">Administrador</td><td>Administrador general</td><td>Todos</td><td><span class="badge badge-green"><span class="badge-dot"></span>Activo</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
        </div>

    );
}

export default Usuarios;