// src/components/HomePage.js

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../api';
import { getAuthHeaders } from '../utils/auth';
import ProductCard from './ProductCard';
import ProductDetail from './ProductDetail';

const HomePage = ({ userId, username }) => {
  const [products, setProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  // Function to fetch products from the backend
  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products`);
      if (!response.ok) {
        throw new Error('Failed to load products');
      }
      const data = await response.json();
      setProducts(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Function to fetch recommendations for the user
  const fetchRecommendations = async () => {
    if (!userId) {
      setRecommendationsLoading(false);
      return;
    }
    setRecommendationsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/recommendations/${userId}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to load recommendations');
      }
      const data = await response.json();
      setRecommendations(data.recommended_products);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // useEffect to run on component mount
  useEffect(() => {
    fetchProducts();
    fetchRecommendations();
  }, [userId]); // Rerun if userId changes

  // Function to handle product card click
  const handleProductClick = (productId) => {
    setSelectedProductId(productId);
  };

  // Function to perform a search
  const handleSearch = async () => {
    if (!searchQuery) {
      fetchProducts();
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/products/search?q=${searchQuery}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  
  return (
    <div>
      <div className="search-container">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products..."
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      {selectedProductId ? (
        <ProductDetail productId={selectedProductId} goBack={() => setSelectedProductId(null)} />
      ) : (
        <>
          <section id="productListing">
            <h2>Products</h2>
            <div className="products-grid">
              {products.map(product => (
                <ProductCard key={product.id} product={product} onClick={handleProductClick} />
              ))}
            </div>
          </section>

          <section id="recommendations">
            <h2>Recommended Products for You</h2>
            <div className="products-grid">
              {recommendationsLoading ? (
                <p>Loading recommendations...</p>
              ) : recommendations.length > 0 ? (
                recommendations.map(product => (
                  <ProductCard key={product.id} product={product} onClick={handleProductClick} />
                ))
              ) : (
                <p>No recommendations available yet. Browse some products!</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default HomePage;