// src/components/AdminPage.js

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../api';
import { getAuthHeaders, handleAuthError } from '../utils/auth';
import { displayMessage } from '../utils/utils';
import ProductCardAdmin from './ProductCardAdmin';

const AdminPage = ({ userId, username }) => {
  const [products, setProducts] = useState([]);
  const [addProductData, setAddProductData] = useState({
    name: '', description: '', price: '', category: '', image_url: '', stock_quantity: ''
  });
  const [addMessage, setAddMessage] = useState('');
  const [addMessageType, setAddMessageType] = useState('');
  const [manageMessage, setManageMessage] = useState('');
  const [manageMessageType, setManageMessageType] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);

  const fetchAdminProducts = async () => {
    setManageMessage('Loading products...');
    setManageMessageType('info');
    try {
      const response = await fetch(`${API_BASE_URL}/products`);
      if (!response.ok) {
        throw new Error('Failed to load products');
      }
      const data = await response.json();
      setProducts(data);
      setManageMessage('');
    } catch (err) {
      setManageMessageType('error');
      setManageMessage(err.message);
    }
  };

  useEffect(() => {
    fetchAdminProducts();
  }, []);

  const handleAddProductChange = (e) => {
    const { name, value } = e.target;
    setAddProductData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!addProductData.name || !addProductData.price || !addProductData.category) {
      setAddMessageType('error');
      setAddMessage('Missing required fields (name, price, category)');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/products/add`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(addProductData),
      });
      const data = await response.json();
      if (response.ok) {
        setAddMessageType('success');
        setAddMessage(data.message);
        setAddProductData({ name: '', description: '', price: '', category: '', image_url: '', stock_quantity: 0 });
        fetchAdminProducts();
      } else {
        if (handleAuthError(response, data)) return;
        setAddMessageType('error');
        setAddMessage(data.message || 'Failed to add product');
      }
    } catch (err) {
      setAddMessageType('error');
      setAddMessage('Network error. Could not add product.');
      console.error('Error adding product:', err);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/products/delete/${productId}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (response.ok) {
          setManageMessageType('success');
          setManageMessage(data.message);
          fetchAdminProducts();
        } else {
          if (handleAuthError(response, data)) return;
          setManageMessageType('error');
          setManageMessage(data.message || 'Failed to delete product');
        }
      } catch (err) {
        setManageMessageType('error');
        setManageMessage('Network error. Could not delete product.');
      }
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct.name || !editingProduct.price || !editingProduct.category) {
      setManageMessageType('error');
      setManageMessage('Missing required fields (name, price, category)');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/products/update/${editingProduct.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(editingProduct),
      });
      const data = await response.json();
      if (response.ok) {
        setManageMessageType('success');
        setManageMessage(data.message);
        setEditingProduct(null);
        fetchAdminProducts();
      } else {
        if (handleAuthError(response, data)) return;
        setManageMessageType('error');
        setManageMessage(data.message || 'Failed to update product');
      }
    } catch (err) {
      setManageMessageType('error');
      setManageMessage('Network error. Could not update product.');
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingProduct(prevData => ({ ...prevData, [name]: value }));
  };

  return (
    <div>
      <h2>Admin Dashboard</h2>
      <section id="addProductSection">
        <h3>Add New Product</h3>
        <form onSubmit={handleAddProduct}>
          <div className="admin-form-group">
            <label htmlFor="name">Product Name:</label>
            <input type="text" id="name" name="name" value={addProductData.name} onChange={handleAddProductChange} required />
          </div>
          <div className="admin-form-group">
            <label htmlFor="description">Description:</label>
            <textarea id="description" name="description" value={addProductData.description} onChange={handleAddProductChange}></textarea>
          </div>
          <div className="admin-form-group">
            <label htmlFor="price">Price:</label>
            <input type="number" id="price" name="price" value={addProductData.price} onChange={handleAddProductChange} step="0.01" required />
          </div>
          <div className="admin-form-group">
            <label htmlFor="category">Category:</label>
            <input type="text" id="category" name="category" value={addProductData.category} onChange={handleAddProductChange} required />
          </div>
          <div className="admin-form-group">
            <label htmlFor="image_url">Image URL:</label>
            <input type="url" id="image_url" name="image_url" value={addProductData.image_url} onChange={handleAddProductChange} />
          </div>
          <div className="admin-form-group">
            <label htmlFor="stock_quantity">Stock Quantity:</label>
            <input type="number" id="stock_quantity" name="stock_quantity" value={addProductData.stock_quantity} onChange={handleAddProductChange} required />
          </div>
          <button type="submit" className="admin-action-btn">Add Product</button>
        </form>
        {addMessage && <p className={`message ${addMessageType}`}>{addMessage}</p>}
      </section>

      <section id="manageProductsSection">
        <h3>Manage Existing Products</h3>
        {manageMessage && <p className={`message ${manageMessageType}`}>{manageMessage}</p>}
        <ul className="product-admin-list">
          {products.map(product => (
            <ProductCardAdmin key={product.id} product={product} onDelete={handleDeleteProduct} onEdit={setEditingProduct} />
          ))}
        </ul>
      </section>
      
      {editingProduct && (
        <div className="modal">
          <div className="modal-content">
            <span className="close-button" onClick={() => setEditingProduct(null)}>&times;</span>
            <h3>Edit Product</h3>
            <form onSubmit={handleEditProduct}>
              <div className="admin-form-group">
                <label htmlFor="editName">Product Name:</label>
                <input type="text" id="editName" name="name" value={editingProduct.name} onChange={handleEditChange} required />
              </div>
              <div className="admin-form-group">
                <label htmlFor="editDescription">Description:</label>
                <textarea id="editDescription" name="description" value={editingProduct.description} onChange={handleEditChange}></textarea>
              </div>
              <div className="admin-form-group">
                <label htmlFor="editPrice">Price:</label>
                <input type="number" id="editPrice" name="price" value={editingProduct.price} onChange={handleEditChange} step="0.01" required />
              </div>
              <div className="admin-form-group">
                <label htmlFor="editCategory">Category:</label>
                <input type="text" id="editCategory" name="category" value={editingProduct.category} onChange={handleEditChange} required />
              </div>
              <div className="admin-form-group">
                <label htmlFor="editImageUrl">Image URL:</label>
                <input type="url" id="editImageUrl" name="image_url" value={editingProduct.image_url} onChange={handleEditChange} />
              </div>
              <div className="admin-form-group">
                <label htmlFor="editStock">Stock Quantity:</label>
                <input type="number" id="editStock" name="stock_quantity" value={editingProduct.stock_quantity} onChange={handleEditChange} required />
              </div>
              <button type="submit" className="admin-action-btn">Update Product</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;