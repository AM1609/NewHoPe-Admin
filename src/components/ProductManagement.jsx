import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../../firebase.config';
import { collection, getDocs, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import './ProductManagement.css';
import Sidebar from './Sidebar';

function ProductManagement() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    image: '',
    type: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [options, setOptions] = useState([]);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [optionForm, setOptionForm] = useState({
    optionName: '',
    price: ''
  });
  const [editingOption, setEditingOption] = useState(null);

  const fetchCategories = async () => {
    try {
      const categoriesSnapshot = await getDocs(collection(db, "Type"));
      const categoriesData = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        type: doc.data().type
      }));
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const productsSnapshot = await getDocs(collection(db, "Services"));
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching products:", error);
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
    fetchProducts();
    return () => unsubscribe();
  }, [navigate]);

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      try {
        // 1. Xóa tất cả documents trong subcollection Option
        const optionsRef = collection(db, `Services/${productId}/Option`);
        const optionsSnapshot = await getDocs(optionsRef);
        
        const deletePromises = optionsSnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        await Promise.all(deletePromises);

        // 2. Xóa document trong collection Services
        const serviceDocRef = doc(db, "Services", productId);
        await deleteDoc(serviceDocRef);

        // 3. Cập nhật state
        setProducts(prevProducts => prevProducts.filter(product => product.id !== productId));
        alert('Xóa sản phẩm thành công!');
      } catch (error) {
        console.error("Error deleting product:", error);
        alert('Có lỗi xảy ra khi xóa sản phẩm!');
      }
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setFormData({
      title: product.title || '',
      price: product.price || '',
      image: product.image || '',
      type: product.type || '',
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // Tạo preview cho hình ảnh
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file) => {
    if (!file) return null;
    const timestamp = new Date().getTime();
    const storageRef = ref(storage, `products/${timestamp}_${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  };

  const deleteOldImage = async (imageUrl) => {
    if (!imageUrl) return;
    try {
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
    } catch (error) {
      console.error("Error deleting old image:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let imageUrl = formData.image;

      // Nếu có file hình mới, upload và lấy URL
      if (imageFile) {
        // Xóa hình cũ nếu đang sửa sản phẩm
        if (editingProduct && editingProduct.image) {
          await deleteOldImage(editingProduct.image);
        }
        imageUrl = await uploadImage(imageFile);
      }

      const productData = {
        title: formData.title,
        price: formData.price,
        image: imageUrl,
        type: formData.type,
        create: 'admin@gmail.com',
      };

      if (editingProduct) {
        const productDocRef = doc(db, "Services", editingProduct.id);
        await updateDoc(productDocRef, productData);
        alert('Cập nhật thông tin thành công!');
      } else {
        const newProductRef = doc(collection(db, "Services"));
        productData.id = newProductRef.id;
        await setDoc(newProductRef, productData);
        alert('Thêm sản phẩm thành công!');
      }

      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({
        title: '',
        price: '',
        image: '',
        type: '',
      });
      setImageFile(null);
      setImagePreview(null);
      
      await fetchProducts();
    } catch (error) {
      console.error("Error saving product: ", error);
      alert('Có lỗi xảy ra khi lưu thông tin!');
    }
  };

  const fetchProductOptions = async (productId) => {
    try {
      const optionsSnapshot = await getDocs(collection(db, `Services/${productId}/Option`));
      const optionsData = optionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Options fetched:', optionsData);
      setOptions(optionsData);
    } catch (error) {
      console.error("Error fetching options:", error);
    }
  };

  const handleManageOptions = async (product) => {
    setSelectedProduct(product);
    await fetchProductOptions(product.id);
    setShowOptionModal(true);
  };

  const handleAddOption = async (e) => {
    e.preventDefault();
    try {
      const optionData = {
        OptionName: optionForm.optionName,
        Price: optionForm.price
      };

      const newOptionRef = doc(collection(db, `Services/${selectedProduct.id}/Option`));
      await setDoc(newOptionRef, optionData);
      
      await fetchProductOptions(selectedProduct.id);
      setOptionForm({ optionName: '', price: '' });
      alert('Thêm option thành công!');
    } catch (error) {
      console.error("Error adding option:", error);
      alert('Có lỗi xảy ra khi thêm option!');
    }
  };

  const handleDeleteOption = async (optionId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa option này?')) {
      try {
        await deleteDoc(doc(db, `Services/${selectedProduct.id}/Option`, optionId));
        await fetchProductOptions(selectedProduct.id);
        alert('Xóa option thành công!');
      } catch (error) {
        console.error("Error deleting option:", error);
        alert('Có lỗi xảy ra khi xóa option!');
      }
    }
  };

  const handleEditOption = (option) => {
    setEditingOption(option);
    setOptionForm({
      optionName: option.OptionName,
      price: option.Price
    });
  };

  const handleOptionSubmit = async (e) => {
    e.preventDefault();
    try {
      const optionData = {
        OptionName: optionForm.optionName,
        Price: optionForm.price
      };

      if (editingOption) {
        // Cập nhật option
        await updateDoc(
          doc(db, `Services/${selectedProduct.id}/Option`, editingOption.id),
          optionData
        );
        alert('Cập nhật option thành công!');
      } else {
        // Thêm option mới
        const newOptionRef = doc(collection(db, `Services/${selectedProduct.id}/Option`));
        await setDoc(newOptionRef, optionData);
        alert('Thêm option thành công!');
      }
      
      await fetchProductOptions(selectedProduct.id);
      setOptionForm({ optionName: '', price: '' });
      setEditingOption(null);
    } catch (error) {
      console.error("Error saving option:", error);
      alert('Có lỗi xảy ra khi lưu option!');
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
            <h2>Quản lý sản phẩm</h2>
            <button 
              className="add-product-button"
              onClick={() => setIsModalOpen(true)}
            >
              <i className="fas fa-plus"></i>
              Thêm sản phẩm
            </button>
          </div>

          <div className="products-table-container">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : (
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Hình ảnh</th>
                    <th>Tên sản phẩm</th>
                    <th>Giá</th>
                    <th>Thể loại</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <img 
                          src={product.image} 
                          alt={product.title} 
                          className="product-image"
                        />
                      </td>
                      <td>{product.title}</td>
                      <td>{product.price}</td>
                      <td>{product.type}</td>
                      <td>
                        <div>
                        <button 
                          className="edit-button"
                          onClick={() => handleEditProduct(product)}
                        >
                          Sửa
                        </button>
                        </div>
                        <div>
                        <button 
                          className="delete-button"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          Xóa
                        </button>
                        </div>
                        <div>
                        <button 
                          className="option-button"
                          onClick={() => handleManageOptions(product)}
                        >
                          Options
                        </button>
                        </div>
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
            <h2>{editingProduct ? 'Sửa thông tin sản phẩm' : 'Thêm sản phẩm mới'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên sản phẩm:</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Giá:</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Hình ảnh:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="file-input"
                />
                {imagePreview && (
                  <div className="image-preview-container">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="image-preview"
                    />
                  </div>
                )}
                {!imagePreview && formData.image && (
                  <div className="image-preview-container">
                    <img
                      src={formData.image}
                      alt="Current"
                      className="image-preview"
                    />
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Thể loại:</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Chọn thể loại</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.type}>
                      {category.type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="submit" className="submit-button">
                  {editingProduct ? 'Cập nhật' : 'Thêm'}
                </button>
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingProduct(null);
                    setFormData({
                      title: '',
                      price: '',
                      image: '',
                      type: '',
                    });
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showOptionModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Quản lý Options - {selectedProduct?.title}</h2>
            
            <form onSubmit={handleOptionSubmit} className="option-form">
              <div className="form-group">
                <label>Tên option:</label>
                <input
                  type="text"
                  value={optionForm.optionName}
                  onChange={(e) => setOptionForm({...optionForm, optionName: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Giá:</label>
                <input
                  type="number"
                  value={optionForm.price}
                  onChange={(e) => setOptionForm({...optionForm, price: e.target.value})}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="submit-button">
                  {editingOption ? 'Cập nhật' : 'Thêm Option'}
                </button>
                {editingOption && (
                  <button 
                    type="button" 
                    className="cancel-edit-button"
                    onClick={() => {
                      setEditingOption(null);
                      setOptionForm({ optionName: '', price: '' });
                    }}
                  >
                    Hủy sửa
                  </button>
                )}
              </div>
            </form>

            <div className="options-list">
              <h3>Danh sách Options</h3>
              <table className="options-table">
                <thead>
                  <tr>
                    <th>Tên option</th>
                    <th>Giá</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {options.map((option) => (
                    <tr key={option.id}>
                      <td>{option.OptionName}</td>
                      <td>{option.Price}</td>
                      <td>
                        <button 
                          className="edit-button"
                          onClick={() => handleEditOption(option)}
                        >
                          Sửa
                        </button>
                        <button 
                          className="delete-button"
                          onClick={() => handleDeleteOption(option.id)}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-actions">
              <button 
                className="cancel-button"
                onClick={() => {
                  setShowOptionModal(false);
                  setSelectedProduct(null);
                  setOptions([]);
                  setOptionForm({ optionName: '', price: '' });
                  setEditingOption(null);
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

export default ProductManagement;
