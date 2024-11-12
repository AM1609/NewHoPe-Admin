import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase.config';
import { collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import './SettingsManagement.css';

function SettingsManagement() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    businessHours: {
      monday: { open: '08:00', close: '20:00' },
      tuesday: { open: '08:00', close: '20:00' },
      wednesday: { open: '08:00', close: '20:00' },
      thursday: { open: '08:00', close: '20:00' },
      friday: { open: '08:00', close: '20:00' },
      saturday: { open: '08:00', close: '20:00' },
      sunday: { open: '08:00', close: '20:00' }
    },
    contactInfo: {
      phone: '',
      email: '',
      address: ''
    },
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: ''
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate('/login');
      }
    });

    fetchSettings();
    return () => unsubscribe();
  }, [navigate]);

  const fetchSettings = async () => {
    try {
      const settingsDoc = await getDocs(collection(db, "Settings"));
      if (!settingsDoc.empty) {
        setSettings(settingsDoc.docs[0].data());
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching settings:", error);
      setLoading(false);
    }
  };

  const handleInputChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleTimeChange = (day, type, value) => {
    setSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          [type]: value
        }
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const settingsRef = doc(collection(db, "Settings"), "general");
      await setDoc(settingsRef, settings);
      alert('Cài đặt đã được lưu thành công!');
    } catch (error) {
      console.error("Error saving settings:", error);
      alert('Có lỗi xảy ra khi lưu cài đặt!');
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
          {/* Copy the sidebar from ProductManagement component */}
        </nav>

        <main className="main-content">
          <div className="content-header">
            <h2>Cài đặt hệ thống</h2>
          </div>

          {loading ? (
            <div className="loading">Loading...</div>
          ) : (
            <form onSubmit={handleSubmit} className="settings-form">
              <div className="settings-section">
                <h3>Giờ làm việc</h3>
                {Object.entries(settings.businessHours).map(([day, times]) => (
                  <div key={day} className="time-setting">
                    <label>{day.charAt(0).toUpperCase() + day.slice(1)}:</label>
                    <input
                      type="time"
                      value={times.open}
                      onChange={(e) => handleTimeChange(day, 'open', e.target.value)}
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={times.close}
                      onChange={(e) => handleTimeChange(day, 'close', e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="settings-section">
                <h3>Thông tin liên hệ</h3>
                <div className="form-group">
                  <label>Số điện thoại:</label>
                  <input
                    type="tel"
                    value={settings.contactInfo.phone}
                    onChange={(e) => handleInputChange('contactInfo', 'phone', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={settings.contactInfo.email}
                    onChange={(e) => handleInputChange('contactInfo', 'email', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Địa chỉ:</label>
                  <textarea
                    value={settings.contactInfo.address}
                    onChange={(e) => handleInputChange('contactInfo', 'address', e.target.value)}
                  />
                </div>
              </div>

              <div className="settings-section">
                <h3>Mạng xã hội</h3>
                <div className="form-group">
                  <label>Facebook:</label>
                  <input
                    type="url"
                    value={settings.socialMedia.facebook}
                    onChange={(e) => handleInputChange('socialMedia', 'facebook', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Instagram:</label>
                  <input
                    type="url"
                    value={settings.socialMedia.instagram}
                    onChange={(e) => handleInputChange('socialMedia', 'instagram', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Twitter:</label>
                  <input
                    type="url"
                    value={settings.socialMedia.twitter}
                    onChange={(e) => handleInputChange('socialMedia', 'twitter', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="save-button">
                  Lưu cài đặt
                </button>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}

export default SettingsManagement; 