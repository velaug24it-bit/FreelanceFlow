import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Inject responsive styles for Clients page
if (!document.querySelector('style[data-clients-responsive]')) {
  const s = document.createElement('style');
  s.setAttribute('data-clients-responsive', 'true');
  s.textContent = `
    .clients-root {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    .clients-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .clients-header h1 {
      font-size: 2rem;
      margin: 0;
    }

    /* Desktop table */
    .clients-table-wrap {
      display: block;
    }
    .clients-cards {
      display: none;
    }

    /* Mobile */
    @media (max-width: 640px) {
      .clients-root {
        padding: 1rem 0.75rem;
      }
      .clients-header h1 {
        font-size: 1.5rem;
      }
      .clients-table-wrap {
        display: none;
      }
      .clients-cards {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .client-card {
        background: white;
        border-radius: 12px;
        padding: 1rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        border: 1px solid #e5e7eb;
      }
      .client-card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.5rem;
        gap: 0.5rem;
      }
      .client-card-name {
        font-size: 1rem;
        font-weight: 700;
        color: #1e293b;
      }
      .client-card-company {
        font-size: 0.8rem;
        color: #6b7280;
        margin-top: 0.15rem;
      }
      .client-card-details {
        font-size: 0.85rem;
        color: #475569;
        margin: 0.25rem 0;
        word-break: break-all;
      }
      .client-card-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.75rem;
      }
      .client-card-actions button {
        flex: 1;
        padding: 0.45rem 0;
        font-size: 0.85rem;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-weight: 600;
      }
      .client-card-actions .btn-edit {
        background: #f1f5f9;
        color: #334155;
      }
      .client-card-actions .btn-delete {
        background: #fee2e2;
        color: #991b1b;
      }
    }
  `;
  document.head.appendChild(s);
}

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/clients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(response.data.clients || []);
    } catch (err) {
      setError('Failed to fetch clients');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/clients/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchClients();
      } catch (err) {
        setError('Failed to delete client');
      }
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading clients...</div>;

  return (
    <div className="clients-root">
      <div className="clients-header">
        <h1>Clients</h1>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/clients/new')}
        >
          + Add New Client
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {clients.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>No clients yet</p>
          <button className="btn btn-primary" onClick={() => navigate('/clients/new')}>
            Add Your First Client
          </button>
        </div>
      ) : (
        <>
          {/* ── Desktop table ─────────────────────────────── */}
          <div className="clients-table-wrap table-container">
            <table>
              <thead>
                <tr>
                  <th>Contact Name</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(client => (
                  <tr key={client._id}>
                    <td>{client.contact_name}</td>
                    <td>{client.company_name || '-'}</td>
                    <td>{client.email}</td>
                    <td>{client.phone || '-'}</td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: client.status === 'active' ? '#d1fae5' : '#fee2e2',
                        color: client.status === 'active' ? '#065f46' : '#991b1b'
                      }}>
                        {client.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem' }}
                        onClick={() => navigate(`/clients/${client._id}/edit`)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '0.25rem 0.5rem' }}
                        onClick={() => handleDelete(client._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ──────────────────────────────── */}
          <div className="clients-cards">
            {clients.map(client => (
              <div key={client._id} className="client-card">
                <div className="client-card-top">
                  <div>
                    <div className="client-card-name">{client.contact_name}</div>
                    {client.company_name && (
                      <div className="client-card-company">{client.company_name}</div>
                    )}
                  </div>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    backgroundColor: client.status === 'active' ? '#d1fae5' : '#fee2e2',
                    color: client.status === 'active' ? '#065f46' : '#991b1b',
                    flexShrink: 0
                  }}>
                    {client.status}
                  </span>
                </div>
                <div className="client-card-details">📧 {client.email}</div>
                {client.phone && (
                  <div className="client-card-details">📞 {client.phone}</div>
                )}
                <div className="client-card-actions">
                  <button
                    className="btn-edit"
                    onClick={() => navigate(`/clients/${client._id}/edit`)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(client._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Clients;