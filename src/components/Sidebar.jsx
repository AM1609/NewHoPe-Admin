import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      path: '/',
      icon: 'fas fa-home',
      label: 'Trang chủ'
    },
    {
      path: '/users',
      icon: 'fas fa-users',
      label: 'Quản lý người dùng'
    },
    {
      path: '/orders',
      icon: 'fas fa-shopping-cart',
      label: 'Quản lý đơn hàng'
    },
    {
      path: '/categories',
      icon: 'fas fa-tags',
      label: 'Quản lý thể loại'
    },
    {
      path: '/products',
      icon: 'fas fa-box',
      label: 'Quản lý sản phẩm'
    },
    {
      path: '/facilities',
      icon: 'fas fa-building',
      label: 'Quản lý cơ sở'
    },
    {
      path: '/promotions',
      icon: 'fas fa-percentage',
      label: 'Quản lý khuyến mãi'
    }
  ];

  return (
    <nav className="admin-sidebar">
      <div className="menu-section">
        <h3>MENU CHÍNH</h3>
        <ul>
          {menuItems.map((item) => (
            <li
              key={item.path}
              className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export default Sidebar;
