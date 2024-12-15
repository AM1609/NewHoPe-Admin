import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase.config';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { Line, Bar, Pie } from 'react-chartjs-2';
import Sidebar from './Sidebar';
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
  Legend,
  ArcElement
} from 'chart.js';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale, setDefaultLocale } from "react-datepicker";
import vi from 'date-fns/locale/vi';

// Đăng ký locale tiếng Việt
registerLocale('vi', vi);
setDefaultLocale('vi');

// Đăng ký các thành phần chart
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
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
    datasets: [{
      data: [],
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
  });

  const [monthlyRevenue, setMonthlyRevenue] = useState(0);

  const [revenueStats, setRevenueStats] = useState({
    lastMonth: 0,
    thisMonth: 0,
    percentChange: 0
  });

  const [categoryStats, setCategoryStats] = useState({
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: []
    }]
  });

  const [monthlyRevenueData, setMonthlyRevenueData] = useState({
    labels: [],
    datasets: [{
      label: 'Doanh thu',
      data: [],
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 1
    }]
  });

  const [orderStatusData, setOrderStatusData] = useState({
    labels: ['Mới', 'Đang chờ', 'Đang chuẩn bị', 'Đang giao', 'Đã hoàn thành', 'Đã hủy'],
    datasets: [{
      data: [0, 0, 0, 0, 0, 0],
      backgroundColor: [
        '#FF6384', // Đỏ nhạt - Mới
        '#FFCE56', // Vàng - Đang chờ
        '#36A2EB', // Xanh dương - Đang chuẩn bị
        '#4BC0C0', // Xanh lá - Đang giao
        '#2ECC71', // Xanh lá đậm - Đã hoàn thành
        '#95A5A6'  // Xám - Đã hủy
      ],
      borderWidth: 0,
      hoverOffset: 4
    }]
  });

  const [dailyRevenue, setDailyRevenue] = useState({
    labels: [],
    datasets: [{
      label: 'Doanh thu',
      data: [],
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 1
    }]
  });

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  // Thêm loading state chung
  const [chartsLoading, setChartsLoading] = useState({
    monthlyOrders: true,
    topServices: true,
    monthlyRevenue: true,
    dailyRevenue: true,
    categoryStats: true,
    orderStatus: true
  });

  // Component Loading chung
  const LoadingChart = () => (
    <div className="chart-loading">
      <div className="loading-spinner"></div>
      <p>Đang tải dữ liệu...</p>
    </div>
  );

  // Sửa lại state ban đầu
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });

  // Thêm state để kiểm soát việc load dữ liệu
  const [shouldFetchData, setShouldFetchData] = useState(false);

  // Sửa lại hàm handleDateChange
  const handleDateChange = (type, date) => {
    setDateRange(prev => ({
      ...prev,
      [type]: date
    }));
    setShouldFetchData(false); // Reset trạng thái load khi có thay đổi ngày
  };

  // Hàm xử lý khi click nút Xem
  const handleViewData = () => {
    if (dateRange.startDate && dateRange.endDate) {
      setShouldFetchData(true);
      fetchDailyRevenue(dateRange.startDate, dateRange.endDate);
    } else {
      alert('Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc');
    }
  };

  // Sửa lại hàm fetchDailyRevenue để nhận tham số ngày
  const fetchDailyRevenue = async (start = dateRange.startDate, end = dateRange.endDate) => {
    try {
      setChartsLoading(prev => ({...prev, dailyRevenue: true}));
      
      // Đặt giờ bắt đầu và kết thúc
      const startDate = new Date(start);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);

      // Query một lần duy nhất cho toàn bộ khoảng thời gian
      const ordersRef = collection(db, "Appointments");
      const timeQuery = query(
        ordersRef,
        where("datetime", ">=", Timestamp.fromDate(startDate)),
        where("datetime", "<=", Timestamp.fromDate(endDate)),
        where("state", "in", ["delivered", "completed"])
      );

      const snapshot = await getDocs(timeQuery);
      
      // Tạo map để nhóm doanh thu theo ngày
      const revenueByDate = new Map();
      
      // Tạo mảng các ngày trong khoảng
      const dates = [];
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = currentDate.toLocaleDateString('vi-VN', {
          day: 'numeric',
          month: 'numeric'
        });
        revenueByDate.set(dateStr, 0);
        dates.push(dateStr);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Tính tổng doanh thu cho mỗi ngày
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const orderDate = data.datetime.toDate().toLocaleDateString('vi-VN', {
          day: 'numeric',
          month: 'numeric'
        });
        const currentRevenue = revenueByDate.get(orderDate) || 0;
        revenueByDate.set(orderDate, currentRevenue + (data.totalPrice || 0));
      });

      // Chuyển đổi dữ liệu cho biểu đồ
      const revenueData = dates.map(date => revenueByDate.get(date) || 0);

      setDailyRevenue({
        labels: dates,
        datasets: [{
          label: 'Doanh thu',
          data: revenueData,
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      });

    } catch (error) {
      console.error("Lỗi khi lấy doanh thu theo ngày:", error);
    } finally {
      setChartsLoading(prev => ({...prev, dailyRevenue: false}));
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
          where("state", "in", ["delivered", "completed"])
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

    const calculateRevenueStats = async () => {
      const now = new Date();
      const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const thisMonthQuery = query(
        collection(db, "Appointments"),
        where("datetime", ">=", Timestamp.fromDate(startThisMonth)),
        where("state", "in", ["delivered", "completed"])
      );

      const lastMonthQuery = query(
        collection(db, "Appointments"),
        where("datetime", ">=", Timestamp.fromDate(startLastMonth)),
        where("datetime", "<=", Timestamp.fromDate(endLastMonth)),
        where("state", "in", ["delivered", "completed"])
      );

      const [thisMonthSnapshot, lastMonthSnapshot] = await Promise.all([
        getDocs(thisMonthQuery),
        getDocs(lastMonthQuery)
      ]);

      const thisMonthRevenue = thisMonthSnapshot.docs.reduce((sum, doc) => 
        sum + (doc.data().totalPrice || 0), 0
      );
      const lastMonthRevenue = lastMonthSnapshot.docs.reduce((sum, doc) => 
        sum + (doc.data().totalPrice || 0), 0
      );

      const percentChange = lastMonthRevenue === 0 ? 100 :
        ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

      setRevenueStats({
        lastMonth: lastMonthRevenue,
        thisMonth: thisMonthRevenue,
        percentChange
      });
    };

    calculateRevenueStats();

    // Thêm hàm tạo màu ngẫu nhiên
    const generateColors = (count) => {
      const hueStep = 360 / count;
      return Array.from({ length: count }, (_, i) => {
        const hue = i * hueStep;
        return `hsl(${hue}, 70%, 65%)`; // Sử dụng HSL để đảm bảo mu khác nhau và dễ nhìn
      });
    };

    const calculateCategoryStats = async () => {
      try {
        // Lấy danh sách các loại (Type)
        const typeSnapshot = await getDocs(collection(db, "Type"));
        const types = {};
        typeSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.type) {
            types[data.type] = 0;
          }
        });

        // Đếm số lượng dịch vụ theo từng loại
        const servicesSnapshot = await getDocs(collection(db, "Services"));
        servicesSnapshot.forEach(doc => {
          const data = doc.data();
          const serviceType = data.type || 'Chưa phân loại';
          if (types.hasOwnProperty(serviceType)) {
            types[serviceType]++;
          } else {
            types['Chưa phân loại'] = (types['Chưa phân loại'] || 0) + 1;
          }
        });

        // Tạo màu dựa trên số lượng danh mục
        const categoryCount = Object.keys(types).length;
        const dynamicColors = generateColors(categoryCount);

        setCategoryStats({
          labels: Object.keys(types),
          datasets: [{
            data: Object.values(types),
            backgroundColor: dynamicColors,
            label: 'Số lượng sản phẩm'
          }]
        });
      } catch (error) {
        console.error("Error calculating category stats:", error);
      }
    };

    calculateCategoryStats();

    const fetchMonthlyRevenue = async () => {
      try {
        setChartsLoading(prev => ({...prev, monthlyRevenue: true}));
        const last5Months = Array.from({length: 5}, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          return date;
        }).reverse();

        const monthLabels = last5Months.map(date => 
          date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
        );

        const revenueData = [];
        const ordersRef = collection(db, "Appointments");

        for (const date of last5Months) {
          const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
          const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          
          const monthQuery = query(
            ordersRef,
            where("datetime", ">=", Timestamp.fromDate(startOfMonth)),
            where("datetime", "<=", Timestamp.fromDate(endOfMonth)),
            where("state", "in", ["delivered", "completed"])
          );

          const snapshot = await getDocs(monthQuery);
          const monthlyRevenue = snapshot.docs.reduce((sum, doc) => 
            sum + (doc.data().totalPrice || 0), 0
          );
          revenueData.push(monthlyRevenue);
        }

        setMonthlyRevenueData({
          labels: monthLabels,
          datasets: [{
            label: 'Doanh thu',
            data: revenueData,
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        });

      } catch (error) {
        console.error("Lỗi khi lấy doanh thu theo tháng:", error);
      } finally {
        setChartsLoading(prev => ({...prev, monthlyRevenue: false}));
      }
    };

    fetchMonthlyRevenue();

    const fetchOrderStatusData = async () => {
      try {
        const ordersRef = collection(db, "Appointments");
        const ordersSnapshot = await getDocs(ordersRef);
        
        const statusCounts = {
          new: 0,
          pending: 0,
          preparing: 0,
          delivering: 0,
          completed: 0,
          cancelled: 0
        };

        ordersSnapshot.forEach((doc) => {
          const status = doc.data().state || 'new';
          if (status === 'delivered' || status === 'completed') {
            statusCounts.completed++;
          } else {
            statusCounts[status]++;
          }
        });

        setOrderStatusData(prev => ({
          ...prev,
          datasets: [{
            ...prev.datasets[0],
            data: [
              statusCounts.new,
              statusCounts.pending,
              statusCounts.preparing,
              statusCounts.delivering,
              statusCounts.completed,
              statusCounts.cancelled
            ]
          }]
        }));

      } catch (error) {
        console.error("Error fetching order status data:", error);
      }
    };

    fetchOrderStatusData();

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

  // Sửa lại hàm formatCurrency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0 // Không hiển thị số thập phân
    }).format(amount);
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: 'Phân bố đơn hàng theo trạng thái',
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 20
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((acc, curr) => acc + curr, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Điều chỉnh commonChartOptions
  const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return formatCurrency(context.raw);
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          autoSkip: false,
          font: {
            size: 11
          },
          padding: 10
        }
      },
      y: {
        beginAtZero: true,
        suggestedMax: 200000,
        ticks: {
          stepSize: 25000,
          callback: function(value) {
            return formatCurrency(value);
          }
        }
      }
    },
    layout: {
      padding: {
        left: 15,
        right: 15,
        top: 15,
        bottom: 30
      }
    }
  };

  // Cấu hình cho biểu đồ đường (line chart)
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          padding: 10
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          padding: 10
        }
      }
    },
    layout: {
      padding: {
        left: 10,
        right: 10,
        top: 10,
        bottom: 20
      }
    }
  };

  // Hàm cắt chuỗi và thêm dấu ...
  const truncateLabel = (str, maxLength = 15) => {
    if (str.length > maxLength) {
      return str.substring(0, maxLength) + '...';
    }
    return str;
  };

  // Cấu hình cho biểu đồ cột
  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            // Sử dụng label trực tiếp từ context
            return `${context.label}: ${context.formattedValue}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          padding: 10
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 2,
          padding: 10
        }
      }
    }
  };

  // Khi set data cho biểu đồ

  // Khi fetch dữ liệu top services
  const fetchTopServices = async () => {
    try {
      setChartsLoading(prev => ({...prev, topServices: true}));
      const servicesRef = collection(db, "Services");
      const servicesSnapshot = await getDocs(servicesRef);
      
      const servicesData = servicesSnapshot.docs.map(doc => ({
        name: doc.data().name,
        count: doc.data().orderCount || 0
      }));

      // Sắp xếp theo số lượng đặt hàng
      servicesData.sort((a, b) => b.count - a.count);
      
      // Lấy top 5
      const top5Services = servicesData.slice(0, 5);

      setTopServicesData({
        labels: top5Services.map(service => truncateLabel(service.name)), // Labels đã được cắt ngắn
        datasets: [{
          label: 'Số lượng đặt hàng',
          data: top5Services.map(service => service.count),
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)'
          ],
          borderWidth: 1
        }]
      });
    } catch (error) {
      console.error("Lỗi khi lấy top services:", error);
    } finally {
      setChartsLoading(prev => ({...prev, topServices: false}));
    }
  };

  // Thêm hàm format date
  const formatDateForInput = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Hàm parse date từ format DD/MM/YYYY
  const parseDateFromFormat = (dateString) => {
    const [day, month, year] = dateString.split('/');
    return new Date(year, month - 1, day);
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
            <h2>Trang chủ</h2>
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
                <Bar
                  data={topServicesData}
                  options={barChartOptions}
                  height={250}
                />
              ) : (
                <LoadingChart />
              )}
            </div>

            <div className="chart-card">
              <h3>Doanh thu 5 tháng gần nhất</h3>
              <div style={{ height: '300px' }}>
                {monthlyRevenueData.labels.length > 0 ? (
                  <Bar
                    data={monthlyRevenueData}
                    options={commonChartOptions}
                  />
                ) : (
                  <LoadingChart />
                )}
              </div>
            </div>

            <div className="chart-card">
              <h3>Doanh thu theo ngày</h3>
              <div className="date-range-picker">
                <div className="date-input">
                  <label>Từ ngày:</label>
                  <DatePicker
                    selected={dateRange.startDate}
                    onChange={date => handleDateChange('startDate', date)}
                    dateFormat="dd/MM/yyyy"
                    maxDate={dateRange.endDate || new Date()}
                    locale="vi"
                    className="date-picker-input"
                    placeholderText="Chọn ngày bắt đầu"
                  />
                </div>
                <div className="date-input">
                  <label>Đến ngày:</label>
                  <DatePicker
                    selected={dateRange.endDate}
                    onChange={date => handleDateChange('endDate', date)}
                    dateFormat="dd/MM/yyyy"
                    minDate={dateRange.startDate}
                    maxDate={new Date()}
                    locale="vi"
                    className="date-picker-input"
                    placeholderText="Chọn ngày kết thúc"
                  />
                </div>
                <button 
                  className="view-data-button"
                  onClick={handleViewData}
                  disabled={!dateRange.startDate || !dateRange.endDate}
                >
                  Xem
                </button>
              </div>
              <div className="chart-inner-container">
                {(!dateRange.startDate || !dateRange.endDate) ? (
                  <div className="no-data-message">Hãy chọn ngày</div>
                ) : dailyRevenue.labels.length > 0 ? (
                  <Bar
                    data={dailyRevenue}
                    options={commonChartOptions}
                    className="chart-container"
                    height={250}
                  />
                ) : (
                  <div className="no-data-message">Bấm nút Xem để xem dữ liệu</div>
                )}
              </div>
            </div>

            <div className="chart-card">
              <h3>Phân bố sản phẩm theo danh mục</h3>
              <div style={{ height: '300px' }}>
                <Pie 
                  data={categoryStats}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          boxWidth: 15,
                          padding: 15,
                          font: {
                            size: 12
                          }
                        }
                      }
                    }
                  }} 
                />
              </div>
            </div>

            <div className="chart-card">
              <h3>Trạng thái đơn hàng</h3>
              <div className="pie-container">
                <Pie 
                  data={orderStatusData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 20,
                          usePointStyle: true,
                          pointStyle: 'circle',
                          font: {
                            size: 12
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            
          </div>
        </main>
      </div>
    </div>
  );
}

export default Home;