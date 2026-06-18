import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const ClientForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    contact_name: '',
    company_name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    if (id) {
      fetchClient();
    }
  }, [id]);

  const fetchClient = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/clients/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormData(response.data.client);
    } catch (err) {
      console.error('Failed to fetch client:', err);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (id) {
        await axios.put(`/api/clients/${id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/clients', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      navigate('/clients');
    } catch (err) {
      console.error('Failed to save client:', err);
      alert('Failed to save client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>{id ? 'Edit Client' : 'Add New Client'}</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Contact Name *</label>
          <input
            type="text"
            name="contact_name"
            value={formData.contact_name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Company Name</label>
          <input
            type="text"
            name="company_name"
            value={formData.company_name}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Phone</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Address</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows="3"
          />
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : (id ? 'Update' : 'Create')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/clients')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClientForm;