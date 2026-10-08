import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/userDisplay';

function Perfil() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div>
      <div className="section-heading">
        <div>
          <h2>Mi perfil</h2>
          <span className="desc">Información de la cuenta</span>
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-head">
          <div className="profile-avatar">{getInitials(user?.nombre)}</div>
          <div>
            <div className="profile-head-name">{user?.nombre}</div>
            <div className="profile-head-role">{user?.rol}</div>
          </div>
        </div>
        <div className="profile-body">
          <div className="spec-list">
            <div className="spec-row">
              <span className="k">Nombre</span>
              <span className="v">{user?.nombre}</span>
            </div>
            <div className="spec-row">
              <span className="k">Rol</span>
              <span className="v">{user?.rol}</span>
            </div>
            <div className="spec-row">
              <span className="k">Email</span>
              <span className="v">{user?.email}</span>
            </div>
          </div>

          <div style={{ marginTop: '18px' }}>
            <button className="btn btn-outline" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Perfil;