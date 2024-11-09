import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase.config';
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc, setDoc, getDoc } from 'firebase/firestore';
import './UserManagement.css';

const formatRole = (role) => {
  switch(role) {
    case 'customer':
      return 'Khách hàng';
    case 'admin':
      return 'Admin';
    case 'staff':
      return 'Nhân viên';
    default:
      return role;
  }
};

function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [bases, setBases] = useState([]);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    role: 'customer',
    base: ''
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersSnapshot = await getDocs(collection(db, "USERS"));
      const usersData = usersSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(user => user.role === "customer" || user.role === "staff");
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBases = async () => {
    try {
      const basesSnapshot = await getDocs(collection(db, "base"));
      const basesData = basesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBases(basesData);
    } catch (error) {
      console.error("Error fetching bases:", error);
      alert('Có lỗi xảy ra khi tải danh sách cơ sở!');
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate('/login');
      }
    });

    fetchUsers();
    fetchBases();
    return () => unsubscribe();
  }, [navigate]);

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      try {
        await deleteDoc(doc(db, "USERS", userId));
        setUsers(users.filter(user => user.id !== userId));
        alert('Xóa người dùng thành công!');
      } catch (error) {
        console.error("Error deleting user:", error);
        alert('Có lỗi xảy ra khi xóa người dùng!');
      }
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName || '',
      email: user.email || '',
      password: user.password || '',
      phone: user.phone || '',
      address: user.address || '',
      role: user.role || 'customer',
      base: user.base || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveEdit = async (userId, updatedData) => {
    try {
      await updateDoc(doc(db, "USERS", userId), updatedData);
      setUsers(users.map(user => 
        user.id === userId ? { ...user, ...updatedData } : user
      ));
      setIsEditing(false);
      setSelectedUser(null);
      alert('Cập nhật thông tin thành công!');
    } catch (error) {
      console.error("Error updating user:", error);
      alert('Có lỗi xảy ra khi cập nhật thông tin!');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userData = {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        address: formData.address,
        role: formData.role,
        ...(formData.role === 'staff' && { base: formData.base })
      };

      if (editingUser) {
        const userDocRef = doc(db, "USERS", editingUser.email);
        await updateDoc(userDocRef, userData);
        alert('Cập nhật thông tin thành công!');
      } else {
        const userDocRef = doc(db, "USERS", formData.email);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          alert('Email này đã được sử dụng! Vui lòng chọn email khác.');
          return;
        }

        await setDoc(userDocRef, userData);
        alert('Thêm người dùng thành công!');
      }

      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        address: '',
        role: 'customer',
        base: ''
      });
      
      await fetchUsers();
    } catch (error) {
      console.error("Error saving user: ", error);
      alert('Có lỗi xảy ra khi lưu thông tin!');
    }
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="logo">NewHope Admin</div>
        <div className="header-right">
          <span className="admin-name">Admin</span>
          <button onClick={() => auth.signOut()} className="logout-button">
            Đăng xuất
          </button>
        </div>
      </header>

      <div className="admin-content">
        <nav className="admin-sidebar">
          <div className="menu-section">
            <h3>MENU CHÍNH</h3>
            <ul>
              <li className="menu-item" onClick={() => navigate('/')}>
                <i className="fas fa-home"></i>
                <span>Trang chủ</span>
              </li>
              <li className="menu-item active">
                <i className="fas fa-users"></i>
                <span>Quản lý người dùng</span>
              </li>
              <li className="menu-item" onClick={() => navigate('/orders')}>
                <i className="fas fa-calendar"></i>
                <span>Quản lý đơn hàng</span>
              </li>
              <li className="menu-item" onClick={() => navigate('/categories')}>
                <i className="fas fa-tags"></i>
                <span>Quản lý thể loại</span>
              </li>
              <li className="menu-item" onClick={() => navigate('/products')}>
                <i className="fas fa-box"></i>
                <span>Quản lý sản phẩm</span>
              </li>
              <li 
                className={`menu-item ${location.pathname === '/facilities' ? 'active' : ''}`}
                onClick={() => navigate('/facilities')}
              >
                <i className="fas fa-building"></i>
                <span>Quản lý cơ sở</span>
              </li>
              <li className="menu-item" onClick={() => navigate('/promotions')}>
                <i className="fas fa-tags"></i>
                <span>Quản lý khuyến mãi</span>
              </li>
              <li className="menu-item" onClick={() => navigate('/settings')}>
                <i className="fas fa-cog"></i>
                <span>Cài đặt</span>
              </li>
            </ul>
          </div>
        </nav>

        <main className="main-content">
          <div className="content-header">
            <h2>Quản lý người dùng</h2>
            <button 
              className="add-user-button"
              onClick={() => setIsModalOpen(true)}
            >
              <i className="fas fa-plus"></i>
              Thêm người dùng
            </button>
          </div>

          <div className="users-table-container">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Họ tên</th>
                    <th>Email</th>
                    <th>Số điện thoại</th>
                    <th>Địa chỉ</th>
                    <th>Cơ sở</th>
                    <th>Vai trò</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.fullName}</td>
                      <td>{user.email}</td>
                      <td>{user.phone}</td>
                      <td>{user.address}</td>
                      <td>{user.role === 'staff' ? user.base : ''}</td>
                      <td>{formatRole(user.role)}</td>
                      <td>
                        <button 
                          className="edit-button"
                          onClick={() => handleEditUser(user)}
                          disabled={!user.role || user.role === 'admin'}
                        >
                          <i className="fas fa-edit"></i> Sửa
                        </button>
                        <button 
                          className="delete-button"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={!user.role || user.role === 'admin'}
                        >
                          <i className="fas fa-trash"></i> Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingUser ? 'Sửa thông tin tài khoản' : 'Thêm người dùng mới'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Họ tên:</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={editingUser !== null}
                  required
                />
              </div>
              <div className="form-group">
                <label>Mật khẩu:</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Số điện thoại:</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Địa chỉ:</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Vai trò:</label>
                <select 
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                >
                  <option value="customer">Khách hàng</option>
                  <option value="staff">Nhân viên</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {formData.role === 'staff' && (
                <div className="form-group">
                  <label>Cơ sở:</label>
                  <select
                    name="base"
                    value={formData.base}
                    onChange={handleInputChange}
                    required={formData.role === 'staff'}
                  >
                    <option value="">Chọn cơ sở</option>
                    {bases.map((base) => (
                      <option key={base.id} value={base.name}>
                        {base.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="modal-actions">
                <button type="submit" className="submit-button">
                  {editingUser ? 'Cập nhật' : 'Thêm'}
                </button>
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingUser(null);
                    setFormData({
                      fullName: '',
                      email: '',
                      password: '',
                      phone: '',
                      address: '',
                      role: 'customer',
                      base: ''
                    });
                  }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement; 