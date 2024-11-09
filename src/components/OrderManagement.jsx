import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase.config';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import './OrderManagement.css';

function OrderManagement() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const ordersSnapshot = await getDocs(collection(db, "Appointments"));
      const ordersData = ordersSnapshot.docs.map(doc => ({
        transactionId: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
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

    fetchOrders();
    return () => unsubscribe();
  }, [navigate]);

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, "Appointments", orderId), {
        state: newStatus
      });
      
      setOrders(orders.map(order => 
        order.transactionId === orderId 
          ? { ...order, state: newStatus }
          : order
      ));
      
      alert('Cập nhật trạng thái thành công!');
    } catch (error) {
      console.error("Error updating order status:", error);
      alert('Có lỗi xảy ra khi cập nhật trạng thái!');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    // Kiểm tra nếu timestamp là object từ Firestore
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString('vi-VN', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      });
    }
    
    // Nếu timestamp là string hoặc number
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'NEW':
        return 'status-badge status-new';
      case 'DELIVERED':
        return 'status-badge status-delivered';
      case 'PENDING':
        return 'status-badge status-pending';
      case 'CANCELED':
      case 'CANCELLED':
        return 'status-badge status-cancelled';
      case 'PREPARING':
        return 'status-badge status-preparing';
      case 'DELIVERING':
        return 'status-badge status-delivering';
      default:
        return 'status-badge';
    }
  };

  const getStatusText = (status) => {
    return status || '';
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
              <li className="menu-item active" onClick={() => navigate('/orders')}>
                <i className="fas fa-shopping-cart"></i>
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
              <li className="menu-item" onClick={() => navigate('/facilities')}>
                <i className="fas fa-building"></i>
                <span>Quản lý cơ sở</span>
              </li>
              <li className="menu-item" onClick={() => navigate('/promotions')}>
                <i className="fas fa-percentage"></i>
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
          <div className="page-title">
            <h1>Quản lý đơn hàng</h1>
          </div>

          <div className="orders-table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Mã đơn hàng</th>
                  <th>Khách hàng</th>
                  <th>Thời gian</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.transactionId}>
                    <td>{order.transactionId}</td>
                    <td>{order.fullName}</td>
                    <td>{formatDate(order.datetime)}</td>
                    <td>{order.totalPrice?.toLocaleString()} VNĐ</td>
                    <td>
                      <span className={getStatusBadgeClass(order.state)}>
                        {order.state?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="edit-button"
                        onClick={() => handleViewDetails(order)}
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {isModalOpen && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Chi tiết đơn hàng</h2>
            <div className="order-details">
              <div className="detail-row">
                <span className="detail-label">Mã đơn hàng:</span>
                <span className="detail-value">{selectedOrder.transactionId}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Khách hàng:</span>
                <span className="detail-value">{selectedOrder.fullName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{selectedOrder.email}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Số điện thoại:</span>
                <span className="detail-value">{selectedOrder.phone}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Địa chỉ:</span>
                <span className="detail-value">{selectedOrder.address}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Thời gian:</span>
                <span className="detail-value">{formatDate(selectedOrder.datetime)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Trạng thái:</span>
                <span className="detail-value">
                  <select
                    value={selectedOrder.state}
                    onChange={(e) => handleUpdateStatus(selectedOrder.transactionId, e.target.value)}
                  >
                    <option value="new">Mới</option>
                    <option value="pending">Chưa thanh toán</option>
                    <option value="delivered">Đã hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Tổng tiền:</span>
                <span className="detail-value">{selectedOrder.totalPrice?.toLocaleString()} VNĐ</span>
              </div>

              <h3>Sản phẩm đã đặt</h3>
              <div className="services-list">
                {selectedOrder.services?.map((service, index) => (
                  <div key={index} className="service-item">
                    <div>Tên sản phẩm: {service.title || service.options?.title}</div>
                    <div>Số lượng: {service.quantity || service.options?.quantity}</div>
                    {service.options && (
                      <div className="service-options">
                        <div>Tùy chọn:</div>
                        {Array.isArray(service.options) ? (
                          service.options.map((option, optIndex) => (
                            <div key={optIndex} className="option-item">
                              <div>- {option.name}</div>
                              {option.quantity && <div>  Số lượng: {option.quantity}</div>}
                            </div>
                          ))
                        ) : (
                          <div className="option-item">
                            <div>- {service.options.name}</div>
                            {service.options.quantity && <div>  Số lượng: {service.options.quantity}</div>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="cancel-button"
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedOrder(null);
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderManagement;
