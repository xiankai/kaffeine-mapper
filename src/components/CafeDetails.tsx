import React from 'react';
import { useParams } from 'react-router-dom';

export default function CafeDetails() {
  const { id } = useParams<{ id: string }>();

  return (
    <div style={{ padding: '2rem' }}>
      <h2>☕ Cafe Details</h2>
      <p>Detailed information about cafe #{id}</p>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        background: '#f8f9fa',
        border: '2px dashed #dee2e6',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <div>
          <h3>🏪 Cafe Details Coming Soon</h3>
          <p>This will show detailed information, photos, and visit history</p>
        </div>
      </div>
    </div>
  );
}