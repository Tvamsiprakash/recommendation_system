// src/components/ProductDetail.js

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../api';
import { getAuthHeaders } from '../utils/auth';

const ProductDetail = ({ productId, goBack }) => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          throw new Error('Failed to load product details');
        }
        const data = await response.json();
        setProduct(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]); // Rerun if productId changes

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!product) return null;

  return (
    <section id="productDetail">
      <button onClick={goBack}>Back to Products</button>
      <h2>{product.name}</h2>
      <img src={product.image_url || 'https://via.placeholder.com/300'} alt={product.name} />
      <p>Price: ${product.price.toFixed(2)}</p>
      <p>{product.description}</p>
      <p>Category: {product.category}</p>
      <p>Stock: {product.stock_quantity}</p>
    </section>
  );
};

export default ProductDetail;