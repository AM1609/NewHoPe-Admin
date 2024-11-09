import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './src/components/Login';
import Home from './src/components/Home';
import UserManagement from './src/components/UserManagement';
import ProductManagement from './src/components/ProductManagement';
import CategoryManagement from './src/components/CategoryManagement';
import FacilityManagement from './src/components/FacilityManagement';
import PromotionManagement from './src/components/PromotionManagement';
import OrderManagement from './src/components/OrderManagement';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/products" element={<ProductManagement />} />
          <Route path="/categories" element={<CategoryManagement />} />
          <Route path="/facilities" element={<FacilityManagement />} />
          <Route path="/promotions" element={<PromotionManagement />} />
          <Route path="/orders" element={<OrderManagement />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;