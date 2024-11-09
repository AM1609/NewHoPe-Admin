import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase.config';
import { collection, getDocs, doc, deleteDoc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import './CategoryManagement.css';

function CategoryManagement() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const categoriesSnapshot = await getDocs(collection(db, "Type"));
      const categoriesData = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        type: doc.data().type
      }));
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate('/login');
      }
    });

    fetchCategories();
    return () => unsubscribe();
  }, [navigate]);

  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa thể loại này?')) {
      try {
        await deleteDoc(doc(db, "Type", categoryId));
        setCategories(categories.filter(category => category.id !== categoryId));
        alert('Xóa thể loại thành công!');
      } catch (error) {
        console.error("Error deleting category:", error);
        alert('Có lỗi xảy ra khi xóa thể loại!');
      }
    }
  };

  const handleEditCategory = (category) => {
    console.log('Category data:', category);
    setEditingCategory(category);
    setFormData({
      name: category.type,
      description: category.description || '',
    });
    setIsModalOpen(true);
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
      const categoryData = {
        type: formData.name
      };

      if (editingCategory) {
        const categoryDocRef = doc(db, "Type", editingCategory.id);
        await updateDoc(categoryDocRef, categoryData);
        alert('Cập nhật thông tin thành công!');
      } else {
        const newCategoryRef = doc(collection(db, "Type"));
        await setDoc(newCategoryRef, categoryData);
        alert('Thêm thể loại thành công!');
      }

      setIsModalOpen(false);
      setEditingCategory(null);
      setFormData({
        name: '',
        description: ''
      });
      
      await fetchCategories();
    } catch (error) {
      console.error("Error saving category: ", error);
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
              <li className="menu-item" onClick={() => navigate('/users')}>
                <i className="fas fa-users"></i>
                <span>Quản lý người dùng</span>
              </li>
              <li className="menu-item" onClick={() => navigate('/orders')}>
                <i className="fas fa-calendar"></i>
                <span>Quản lý đơn hàng</span>
              </li>
              <li className="menu-item active">
                <i className="fas fa-tags"></i>
                <span>Quản lý thể loại</span>
              </li>
              <li className="menu-item" onClick={() => navigate('/products')}>
                <i className="fas fa-box"></i>
                <span>Quản lý sản phẩm</span>
              </li>
              <li className="menu-item" onClick={() => navigate('/facilities')}>
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
            <h2>Quản lý thể loại</h2>
            <button 
              className="add-category-button"
              onClick={() => setIsModalOpen(true)}
            >
              <i className="fas fa-plus"></i>
              Thêm thể loại
            </button>
          </div>

          <div className="categories-table-container">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              <table className="categories-table">
                <thead>
                  <tr>
                    <th>Tên thể loại</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td>{category.type}</td>
                      <td>
                        <button 
                          className="edit-button"
                          onClick={() => handleEditCategory(category)}
                        >
                          Sửa
                        </button>
                        <button 
                          className="delete-button"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          Xóa
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
            <h2>{editingCategory ? 'Sửa thông tin thể loại' : 'Thêm thể loại mới'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên thể loại:</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="submit-button">
                  {editingCategory ? 'Cập nhật' : 'Thêm'}
                </button>
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingCategory(null);
                    setFormData({
                      name: '',
                      description: ''
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

export default CategoryManagement;
