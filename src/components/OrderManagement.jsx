import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase.config';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import Sidebar from './Sidebar';
import './OrderManagement.css';

function OrderManagement() {
  const navigate = useNavigate();
  const STATE_ORDER = {
    'new': 1,
    'pending': 2,
    'preparing': 3,
    'delivering': 4,
    'delivered': 5,
    'completed': 6,
    'cancelled': 7
  };

  const sortOptions = [
    { value: 'datetime_desc', label: '⌚ Thời gian (Mới nhất)', field: 'datetime', direction: 'desc' },
    { value: 'datetime_asc', label: '⌚ Thời gian (Cũ nhất)', field: 'datetime', direction: 'asc' },
    { value: 'totalPrice_desc', label: '💰 Giá trị (Cao nhất)', field: 'totalPrice', direction: 'desc' },
    { value: 'totalPrice_asc', label: '💰 Giá trị (Thấp nhất)', field: 'totalPrice', direction: 'asc' },
    { value: 'state', label: '📊 Trạng thái', field: 'state', direction: 'asc' }
  ];

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [sortValue, setSortValue] = useState('datetime_desc');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const ordersSnapshot = await getDocs(collection(db, "Appointments"));
      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sắp xếp đơn hàng theo thời gian mới nhất
      const sortedOrders = ordersData.sort((a, b) => {
        const timeA = a.datetime?.seconds || 0;
        const timeB = b.datetime?.seconds || 0;
        return timeB - timeA; // Sắp xếp giảm dần (mới nhất lên đầu)
      });
      
      console.log('Fetched orders:', sortedOrders);
      setOrders(sortedOrders);
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

  useEffect(() => {
    let result = [...orders];
    
    // Filter by search term
    if (searchTerm) {
      result = result.filter(order => 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(order => 
        order.state?.toLowerCase() === statusFilter.toLowerCase()
      );
    }
    
    setFilteredOrders(result);
  }, [orders, searchTerm, statusFilter]);

  const handleViewDetails = (order) => {
    console.log('Selected order:', order);
    console.log('Document ID:', order.id);
    
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      if (!orderId) {
        throw new Error('Order ID is required');
      }

      console.log('Updating order with ID:', orderId);
      console.log('New status:', newStatus);

      const orderRef = doc(db, "Appointments", orderId);

      await updateDoc(orderRef, {
        state: newStatus.toLowerCase()
      });
      
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, state: newStatus.toLowerCase() }
            : order
        )
      );
      
      setSelectedOrder(prev => ({
        ...prev,
        state: newStatus.toLowerCase()
      }));
      
      alert('Cập nhật trạng thái thành công!');
    } catch (error) {
      console.error("Error updating order status:", error);
      alert(`Có lỗi xảy ra khi cập nhật trạng thái: ${error.message}`);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
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
      case 'COMPLETED':
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

  const handleSortChange = (e) => {
    const selectedValue = e.target.value;
    setSortValue(selectedValue);
    
    const selectedOption = sortOptions.find(opt => opt.value === selectedValue);
    if (!selectedOption) return;

    setOrders(prevOrders => {
      const sortedOrders = [...prevOrders].sort((a, b) => {
        const { field, direction } = selectedOption;
        
        switch (field) {
          case 'datetime':
            const timeA = a.datetime?.seconds || 0;
            const timeB = b.datetime?.seconds || 0;
            return direction === 'desc' ? timeB - timeA : timeA - timeB;
            
          case 'totalPrice':
            const priceA = a.totalPrice || 0;
            const priceB = b.totalPrice || 0;
            return direction === 'desc' ? priceB - priceA : priceA - priceB;
            
          case 'state':
            const stateA = (a.state || '').toLowerCase();
            const stateB = (b.state || '').toLowerCase();
            const orderA = STATE_ORDER[stateA] || 999;
            const orderB = STATE_ORDER[stateB] || 999;
            return orderA - orderB;
            
          default:
            return 0;
        }
      });
      return sortedOrders;
    });
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
            <h2>Quản lý đơn hàng</h2>
          </div>

          <div className="filters-container">
            <div className="search-box">
              <input
                type="text"
                placeholder="Tìm kiếm theo mã đơn, tên khách hàng, số điện thoại..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i className="fas fa-search search-icon"></i>
              {searchTerm && (
                <i 
                  className="fas fa-times clear-icon"
                  onClick={() => setSearchTerm('')}
                ></i>
              )}
            </div>
            
            <div className="filter-actions">
              <div className="status-filter">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">🔄 Tất cả trạng thái</option>
                  <option value="new">🆕 Mới</option>
                  <option value="pending">⏳ Đang chờ</option>
                  <option value="preparing">👨‍🍳 Đang chuẩn bị</option>
                  <option value="delivering">🚚 Đang giao</option>
                  <option value="delivered">✅ Đã giao</option>
                  <option value="completed">✅ Đã hoàn thành</option>
                  <option value="cancelled">❌ Đã hủy</option>
                </select>
              </div>

              <div className="sort-filter">
                <select
                  value={sortValue}
                  onChange={handleSortChange}
                  className="sort-select"
                >
                  <option value="" disabled>-- Sắp xếp theo --</option>
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="orders-table-container">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
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
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.id}</td>
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
            )}
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
                    value={selectedOrder.state?.toLowerCase()}
                    onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                  >
                    <option value="new">Mới</option>
                    <option value="pending">Đang chờ</option>
                    <option value="preparing">Đang chuẩn bị</option>
                    <option value="delivering">Đang giao</option>
                    <option value="delivered">Đã giao</option>
                    <option value="completed">Đã hoàn thành</option>
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
