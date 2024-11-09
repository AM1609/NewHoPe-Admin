import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase.config';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { Line, Bar } from 'react-chartjs-2';
import './Home.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Đăng ký các components cần thiết cho Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function Home() {
  const navigate = useNavigate();
  const [userCount, setUserCount] = useState(0);
  const [todayOrderCount, setTodayOrderCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [monthlyOrders, setMonthlyOrders] = useState([]);
  const [monthlyOrdersData, setMonthlyOrdersData] = useState({
    labels: [],
    datasets: [{
      label: 'Số đơn hàng',
      data: [],
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  });

  const [topServicesData, setTopServicesData] = useState({
    labels: [],
    datasets: []
  });

  const [monthlyRevenue, setMonthlyRevenue] = useState(0);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate('/login');
      }
    });

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Đếm users
        const usersSnapshot = await getDocs(collection(db, "USERS"));
        setUserCount(usersSnapshot.size);

        // Đếm đơn hàng hôm nay
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);
        
        const ordersRef = collection(db, "Appointments");
        const todayOrdersQuery = query(
          ordersRef,
          where("datetime", ">=", todayTimestamp)
        );
        const todayOrdersSnapshot = await getDocs(todayOrdersQuery);
        console.log("Today's orders:", todayOrdersSnapshot.size);
        setTodayOrderCount(todayOrdersSnapshot.size);

        // Đếm sản phẩm
        const productsSnapshot = await getDocs(collection(db, "Services"));
        setProductCount(productsSnapshot.size);

        // Tính doanh thu tháng này
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const startOfMonthTimestamp = Timestamp.fromDate(startOfMonth);
        
        console.log("Start of month:", startOfMonth);
        
        const monthlyOrdersQuery = query(
          ordersRef,
          where("datetime", ">=", startOfMonthTimestamp),
          where("state", "==", "delivered")
        );
        
        const monthlyOrdersSnapshot = await getDocs(monthlyOrdersQuery);
        console.log("Found orders:", monthlyOrdersSnapshot.size);
        
        // Log chi tiết từng đơn hàng
        monthlyOrdersSnapshot.forEach(doc => {
          const data = doc.data();
          console.log("Order details:", {
            id: doc.id,
            state: data.state,
            totalPrice: data.totalPrice,
            datetime: data.datetime?.toDate()
          });
        });

        const revenue = monthlyOrdersSnapshot.docs.reduce((total, doc) => {
          const orderData = doc.data();
          const currentTotal = total + (orderData.totalPrice || 0);
          console.log("Adding order:", {
            price: orderData.totalPrice,
            runningTotal: currentTotal
          });
          return currentTotal;
        }, 0);
        
        console.log("Final revenue:", revenue);
        setMonthlyRevenue(revenue);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const fetchMonthlyData = async () => {
      try {
        const last6Months = Array.from({length: 6}, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          return date;
        }).reverse(); // Đảo ngược để hiển thị từ tháng cũ đến mới

        const monthLabels = last6Months.map(date => 
          date.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' })
        );

        const ordersRef = collection(db, "Appointments");
        const monthlyData = [];

        for (const date of last6Months) {
          const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
          const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          
          const monthQuery = query(
            ordersRef,
            where("datetime", ">=", Timestamp.fromDate(startOfMonth)),
            where("datetime", "<=", Timestamp.fromDate(endOfMonth))
          );

          const snapshot = await getDocs(monthQuery);
          monthlyData.push(snapshot.size);
        }

        setMonthlyOrdersData({
          labels: monthLabels,
          datasets: [{
            label: 'Số đơn hàng',
            data: monthlyData,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          }]
        });

        // Fetch top services data
        const appointmentsSnapshot = await getDocs(collection(db, "Appointments"));
        const appointments = appointmentsSnapshot.docs.map(doc => doc.data());

        const serviceCount = new Map();
        
        appointments.forEach(appointment => {
          if (appointment.services && Array.isArray(appointment.services)) {
            appointment.services.forEach(service => {
              if (service.title) {
                const currentCount = serviceCount.get(service.title) || 0;
                serviceCount.set(service.title, currentCount + (parseInt(service.quantity) || 1));
              }
            });
          }
        });

        const sortedServices = Array.from(serviceCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        const topServicesChartData = {
          labels: sortedServices.map(([title]) => title),
          datasets: [{
            label: 'Số lượt đặt',
            data: sortedServices.map(([, count]) => count),
            backgroundColor: [
              'rgba(255, 99, 132, 0.5)',
              'rgba(54, 162, 235, 0.5)',
              'rgba(255, 206, 86, 0.5)',
              'rgba(75, 192, 192, 0.5)',
              'rgba(153, 102, 255, 0.5)'
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)'
            ],
            borderWidth: 1
          }]
        };

        setTopServicesData(topServicesChartData);

      } catch (error) {
        console.error("Error fetching monthly data:", error);
      }
    };

    fetchMonthlyData();

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Lỗi đăng xuất:', error);
    }
  };

  // Hàm format số tiền
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="logo">NewHope Admin</div>
        <div className="header-right">
          <span className="admin-name">Admin</span>
          <button onClick={handleLogout} className="logout-button">
            Đăng xuất
          </button>
        </div>
      </header>

      <div className="admin-content">
        <nav className="admin-sidebar">
          <div className="menu-section">
            <h3>MENU CHÍNH</h3>
            <ul>
              <li className="menu-item active">
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
              <li className="menu-item" onClick={() => navigate('/facilities')}>
                <i className="fas fa-base"></i>
                <span>Quản lý cơ sở</span>
              </li>
              <li className="menu-item" onClick={() => navigate('/promotions')}>
                <i className="fas fa-box"></i>
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
          <div className="page-header">
            <h1>Dashboard</h1>
            <div className="breadcrumb">
              Trang chủ / Dashboard
            </div>
          </div>

          <div className="dashboard-stats">
            <div className="stat-card">
              <h3>Tổng người dùng</h3>
              {loading ? (
                <p className="stat-number">Loading...</p>
              ) : (
                <p className="stat-number">{userCount}</p>
              )}
            </div>
            <div className="stat-card">
              <h3>Đơn hàng hôm nay</h3>
              {loading ? (
                <p className="stat-number">Loading...</p>
              ) : (
                <p className="stat-number">{todayOrderCount}</p>
              )}
            </div>
            <div className="stat-card">
              <h3>Tổng sản phẩm</h3>
              {loading ? (
                <p className="stat-number">Loading...</p>
              ) : (
                <p className="stat-number">{productCount}</p>
              )}
            </div>
            <div className="stat-card">
              <h3>Doanh thu tháng này</h3>
              {loading ? (
                <p className="stat-number">Loading...</p>
              ) : (
                <p className="stat-number">{formatCurrency(monthlyRevenue)}</p>
              )}
            </div>
          </div>

          <div className="dashboard-charts">
            <div className="chart-card">
              <h3>Thống kê đơn hàng 6 tháng gần nhất</h3>
              <Line data={monthlyOrdersData} options={chartOptions} />
            </div>
            
            <div className="chart-card">
              <h3>Top 5 sản phẩm được đặt nhiều nhất</h3>
              {topServicesData.labels.length > 0 ? (
                <Bar data={topServicesData} options={chartOptions} />
              ) : (
                <p>Đang tải dữ liệu...</p>
              )}
            </div>
          </div>

          <div className="dashboard-tables">
            <div className="recent-orders">
              <h3>Đơn hàng gần đây</h3>
              {/* Bảng đơn hàng mới nhất */}
            </div>
            
            <div className="recent-users">
              <h3>Người dùng mới</h3>
              {/* Bảng người dùng mới đăng ký */}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Home;