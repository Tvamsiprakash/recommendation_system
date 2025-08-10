// src/components/ProductCard.js

import React from 'react';

const ProductCard = ({ product, onClick }) => {
  return (
    <div className="product-card" onClick={() => onClick(product.id)}>
      <img src={product.image_url || 'https://via.placeholder.com/150'} alt={product.name} />
      <h3>{product.name}</h3>
      <p>${product.price.toFixed(2)}</p>
    </div>
  );
};

export default ProductCard;