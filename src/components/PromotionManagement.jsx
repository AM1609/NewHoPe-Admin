import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase.config';
import { collection, getDocs, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import Sidebar from './Sidebar';
import './PromotionManagement.css';

function PromotionManagement() {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    code: '',
    condition: {
      total: '',
      product: ''
    },
    type: '*',
    value: ''
  });

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const promotionsSnapshot = await getDocs(collection(db, "Discount"));
      const promotionsData = promotionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPromotions(promotionsData);
    } catch (error) {
      console.error("Error fetching promotions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const productsSnapshot = await getDocs(collection(db, "Services"));
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate('/login');
      }
    });

    fetchPromotions();
    fetchProducts();
    return () => unsubscribe();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('condition.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        condition: {
          ...prev.condition,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.condition.total && !formData.condition.product) {
        alert('Vui lòng nhập ít nhất một điều kiện (Tổng tiền hoặc Sản phẩm áp dụng)');
        return;
      }

      if (formData.type === '*' && Number(formData.value) > 100) {
        alert('Giảm giá theo phần trăm không thể vượt quá 100%');
        return;
      }

      const condition = {};
      if (formData.condition.product) {
        condition.product = formData.condition.product;
      }
      if (formData.condition.total) {
        condition.total = formData.condition.total;
      }

      const promotionData = {
        code: formData.code,
        condition: condition,
        type: formData.type,
        value: formData.value
      };

      if (editingPromotion) {
        await updateDoc(doc(db, "Discount", editingPromotion.id), promotionData);
        alert('Cập nhật khuyến mãi thành công!');
      } else {
        const newPromotionRef = doc(collection(db, "Discount"));
        await setDoc(newPromotionRef, promotionData);
        alert('Thêm khuyến mãi mới thành công!');
      }

      setIsModalOpen(false);
      setEditingPromotion(null);
      setFormData({
        code: '',
        condition: {
          total: '',
          product: ''
        },
        type: '*',
        value: ''
      });
      fetchPromotions();
    } catch (error) {
      console.error("Error saving promotion:", error);
      alert('Có lỗi xảy ra khi lưu thông tin!');
    }
  };

  const handleEditPromotion = (promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      code: promotion.code,
      condition: {
        total: promotion.condition.total,
        product: promotion.condition.product
      },
      type: promotion.type,
      value: promotion.value
    });
    setIsModalOpen(true);
  };

  const handleDeletePromotion = async (promotionId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa khuyến mãi này?')) {
      try {
        await deleteDoc(doc(db, "Discount", promotionId));
        setPromotions(promotions.filter(promo => promo.id !== promotionId));
        alert('Xóa khuyến mãi thành công!');
      } catch (error) {
        console.error("Error deleting promotion:", error);
        alert('Có lỗi xảy ra khi xóa khuyến mãi!');
      }
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
        <Sidebar />
        <main className="main-content">
          <div className="page-title">
            <h2>Quản lý khuyến mãi</h2>
            <button 
              className="add-promotion-button"
              onClick={() => setIsModalOpen(true)}
            >
              <i className="fas fa-plus"></i>
              Thêm khuyến mãi
            </button>
          </div>

          <div className="promotions-table-container">
            <table className="promotions-table">
              <thead>
                <tr>
                  <th>Mã khuyến mãi</th>
                  <th>Sản phẩm áp dụng</th>
                  <th>Điều kiện (Tổng tiền)</th>
                  <th>Loại giảm giá</th>
                  <th>Giá trị</th>
                  <th> </th>
                  <th> </th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((promotion) => (
                  <tr key={promotion.id}>
                    <td>{promotion.code}</td>
                    <td>
                      {products.find(p => p.id === promotion.condition?.product)?.title || ''}
                    </td>
                    <td>
                      {promotion.condition?.total && promotion.condition.total !== '0' 
                        ? `${Number(promotion.condition.total).toLocaleString()} VNĐ` 
                        : ''}
                    </td>
                    <td>
                      {promotion.type === '*' 
                        ? `Theo phần trăm` 
                        : `Trừ thẳng`}
                    </td>
                    <td>
                      {promotion.type === '*'
                        ? `${promotion.value}%`
                        : `${Number(promotion.value).toLocaleString()} VNĐ`}
                    </td>
                    <td>
                      <button 
                        className="edit-button"
                        onClick={() => handleEditPromotion(promotion)}
                      >
                        Sửa
                      </button>
                    </td>
                    <td>
                      <button 
                        className="delete-button"
                        onClick={() => handleDeletePromotion(promotion.id)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingPromotion ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi mới'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Mã khuyến mãi:</label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Sản phẩm áp dụng:</label>
                <select
                  name="condition.product"
                  value={formData.condition.product}
                  onChange={handleInputChange}
                >
                  <option value="">Chọn sản phẩm</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Điều kiện (Tổng tiền):</label>
                <input
                  type="number"
                  name="condition.total"
                  value={formData.condition.total}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Loại giảm giá:</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="*">Giảm theo phần trăm (%)</option>
                  <option value="-">Giảm trực tiếp (VNĐ)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Giá trị giảm {formData.type === '*' ? '(%)' : '(VNĐ)'}:</label>
                <input
                  type="number"
                  name="value"
                  value={formData.value}
                  onChange={handleInputChange}
                  min={formData.type === '*' ? "0" : "1000"}
                  max={formData.type === '*' ? "100" : undefined}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="submit-button">
                  {editingPromotion ? 'Cập nhật' : 'Thêm'}
                </button>
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingPromotion(null);
                    setFormData({
                      code: '',
                      condition: {
                        total: '',
                        product: ''
                      },
                      type: '*',
                      value: ''
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

export default PromotionManagement; 