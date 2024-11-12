import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase.config';
import { collection, getDocs, doc, deleteDoc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import './FacilityManagement.css';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Icon } from 'leaflet';

// Fix Leaflet marker icon issue
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});

// Tạo custom icon với URL trực tiếp
const customIcon = new Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});

// Thêm hàm để lấy địa chỉ từ tọa độ sử dụng OpenStreetMap
const getAddressFromCoordinates = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    const data = await response.json();
    
    if (data.display_name) {
      return data.display_name;
    }
    return '';
  } catch (error) {
    console.error('Error fetching address:', error);
    return '';
  }
};

function FacilityManagement() {
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: ''
  });
  const [selectedPosition, setSelectedPosition] = useState(null);
  const GEOAPIFY_API_KEY = 'YOUR_GEOAPIFY_API_KEY'; // Replace with your API key
  const [map, setMap] = useState(null);
  const [isAddressLoading, setIsAddressLoading] = useState(false);

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      const facilitiesSnapshot = await getDocs(collection(db, "base"));
      const facilitiesData = facilitiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFacilities(facilitiesData);
    } catch (error) {
      console.error("Error fetching facilities:", error);
      alert('Có lỗi xảy ra khi tải danh sách cơ sở!');
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

    fetchFacilities();
    return () => unsubscribe();
  }, [navigate]);

  const handleDeleteFacility = async (facilityId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa cơ sở này?')) {
      try {
        await deleteDoc(doc(db, "base", facilityId));
        setFacilities(facilities.filter(facility => facility.id !== facilityId));
        alert('Xóa cơ sở thành công!');
      } catch (error) {
        console.error("Error deleting facility:", error);
        alert('Có lỗi xảy ra khi xóa cơ sở!');
      }
    }
  };

  const handleEditFacility = (facility) => {
    setEditingFacility(facility);
    setFormData({
      name: facility.name || '',
      address: facility.address || '',
      latitude: facility.latitude || '',
      longitude: facility.longitude || ''
    });
    
    if (facility.latitude && facility.longitude) {
      const position = {
        lat: parseFloat(facility.latitude),
        lng: parseFloat(facility.longitude)
      };
      setSelectedPosition(position);
      
      if (map) {
        map.setView([position.lat, position.lng], 13);
      }
    }
    
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
      const facilityData = {
        name: formData.name,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude
      };

      if (editingFacility) {
        // Cập nhật cơ sở
        await updateDoc(doc(db, "base", editingFacility.id), facilityData);
        alert('Cập nhật thông tin thành công!');
      } else {
        // Thêm cơ sở mới
        await addDoc(collection(db, "base"), facilityData);
        alert('Thêm cơ sở thành công!');
      }

      setIsModalOpen(false);
      setEditingFacility(null);
      setFormData({
        name: '',
        address: '',
        latitude: '',
        longitude: ''
      });
      
      await fetchFacilities();
    } catch (error) {
      console.error("Error saving facility: ", error);
      alert('Có lỗi xảy ra khi lưu thông tin!');
    }
  };

  function MapClickHandler({ onPositionSelect }) {
    useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng;
        setIsAddressLoading(true);
        
        try {
          const address = await getAddressFromCoordinates(lat, lng);
          onPositionSelect({
            lat,
            lng,
            address
          });
        } finally {
          setIsAddressLoading(false);
        }
      },
    });
    return null;
  }

  useEffect(() => {
    // Fix CSS cho marker icons
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css';
    document.head.appendChild(link);

    return () => {
        document.head.removeChild(link);
    };
  }, []);

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
              <li className="menu-item" onClick={() => navigate('/categories')}>
                <i className="fas fa-tags"></i>
                <span>Quản lý thể loại</span>
              </li>
              <li className="menu-item" onClick={() => navigate('/products')}>
                <i className="fas fa-box"></i>
                <span>Quản lý sản phẩm</span>
              </li>
              <li className="menu-item active">
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
            <h2>Quản lý cơ sở</h2>
            <button 
              className="add-facility-button"
              onClick={() => setIsModalOpen(true)}
            >
              <i className="fas fa-plus"></i>
              Thêm cơ sở
            </button>
          </div>

          <div className="facilities-container">
            <div className="facilities-table-container">
              {loading ? (
                <div className="loading">Loading...</div>
              ) : (
                <table className="facilities-table">
                  <thead>
                    <tr>
                      <th>Tên cơ sở</th>
                      <th>Địa chỉ</th>
                      <th>Vị trí</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facilities.map((facility) => (
                      <tr key={facility.id}>
                        <td>{facility.name}</td>
                        <td>{facility.address}</td>
                        <td>
                          <div className="mini-map-container">
                            <MapContainer
                              center={[
                                parseFloat(facility.latitude) || 10.8231,
                                parseFloat(facility.longitude) || 106.6297
                              ]}
                              zoom={15}
                              style={{ height: '150px', width: '150px' }}
                              zoomControl={false}
                              dragging={false}
                              scrollWheelZoom={false}
                            >
                              <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              />
                              <Marker 
                                position={[
                                  parseFloat(facility.latitude),
                                  parseFloat(facility.longitude)
                                ]}
                                icon={customIcon}
                              />
                            </MapContainer>
                          </div>
                        </td>
                        <td>
                          <button 
                            className="edit-button"
                            onClick={() => handleEditFacility(facility)}
                          >
                            <i className="fas fa-edit"></i> Sửa
                          </button>
                          <button 
                            className="delete-button"
                            onClick={() => handleDeleteFacility(facility.id)}
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
          </div>
        </main>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingFacility ? 'Sửa thông tin cơ sở' : 'Thêm cơ sở mới'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên cơ sở:</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
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
                  placeholder={isAddressLoading ? "Đang tải địa chỉ..." : ""}
                  required
                />
              </div>
              
              <div className="map-container" style={{ height: '300px', marginBottom: '1rem' }}>
                <MapContainer
                  center={editingFacility && editingFacility.latitude && editingFacility.longitude 
                    ? [parseFloat(editingFacility.latitude), parseFloat(editingFacility.longitude)]
                    : [10.8231, 106.6297]}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  ref={setMap}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <MapClickHandler
                    onPositionSelect={(position) => {
                      setSelectedPosition(position);
                      setFormData(prev => ({
                        ...prev,
                        latitude: position.lat.toFixed(6),
                        longitude: position.lng.toFixed(6),
                        address: position.address
                      }));
                    }}
                  />
                  {selectedPosition && (
                    <Marker 
                      position={[selectedPosition.lat, selectedPosition.lng]}
                      icon={customIcon}
                    />
                  )}
                </MapContainer>
              </div>

              <div className="form-group">
                <label>Vĩ độ:</label>
                <input
                  type="text"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  required
                  readOnly
                />
              </div>
              <div className="form-group">
                <label>Kinh độ:</label>
                <input
                  type="text"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  required
                  readOnly
                />
              </div>
              
              <div className="modal-actions">
                <button type="submit" className="submit-button">
                  {editingFacility ? 'Cập nhật' : 'Thêm'}
                </button>
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingFacility(null);
                    setFormData({
                      name: '',
                      address: '',
                      latitude: '',
                      longitude: ''
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

export default FacilityManagement; 