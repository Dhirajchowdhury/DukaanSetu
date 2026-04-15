import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import Sidebar from '../components/layout/Sidebar';
import { useProducts } from '../context/ProductContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import './Dashboard.css';
import './Categories.css';

const EMOJI_OPTIONS = ['📦','🍎','🥛','🧴','🍞','🥩','🧹','💊','🥤','🌾','🧂','🫙','🛒','🏪','🎁'];

const CategoryModal = ({ category, onClose, onSaved }) => {
  const [name, setName] = useState(category?.name || '');
  const [icon, setIcon] = useState(category?.icon || '📦');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name is required');
    setLoading(true);
    try {
      if (category) {
        await api.put(`/categories/${category._id}`, { name, icon });
        toast.success('Category updated');
      } else {
        await api.post('/categories', { name, icon });
        toast.success('Category created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2>{category ? 'Edit Category' : 'New Category'}</h2>
          <button className="btn-icon btn-ghost" onClick={onClose}><FiX /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Icon</label>
              <div className="cat-emoji-grid">
                {EMOJI_OPTIONS.map(e => (
                  <button
                    key={e}
                    type="button"
                    className={`cat-emoji-btn ${icon === e ? 'cat-emoji-btn--active' : ''}`}
                    onClick={() => setIcon(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Category Name *</label>
              <input
                className="form-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Dairy Products"
                autoFocus
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" /> Saving...</> : category ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Categories = () => {
  const { categories, fetchCategories } = useProducts();
  const [modalOpen, setModalOpen] = useState(false);
  const [editCat, setEditCat] = useState(null);

  useEffect(() => { fetchCategories(); }, []);

  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete "${cat.name}"?`)) return;
    try {
      await api.delete(`/categories/${cat._id}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const openEdit = (cat) => { setEditCat(cat); setModalOpen(true); };
  const openAdd  = () => { setEditCat(null); setModalOpen(true); };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <div className="page-header-row">
          <div>
            <h1>Categories</h1>
            <p>Organise your products into categories.</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <FiPlus /> New Category
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon">🏷️</div>
            <h3>No categories yet</h3>
            <p>Create your first category to organise products.</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={openAdd}>
              <FiPlus /> Create Category
            </button>
          </div>
        ) : (
          <div className="cat-grid">
            {categories.map(cat => (
              <div key={cat._id} className="cat-card card">
                <div className="cat-card__icon">{cat.icon}</div>
                <div className="cat-card__body">
                  <p className="cat-card__name">{cat.name}</p>
                  {cat.isDefault && (
                    <span className="badge badge-neutral" style={{ fontSize: 10 }}>Default</span>
                  )}
                </div>
                {!cat.isDefault && (
                  <div className="cat-card__actions">
                    <button className="btn-icon pt-btn-edit" onClick={() => openEdit(cat)} title="Edit">
                      <FiEdit2 />
                    </button>
                    <button className="btn-icon pt-btn-delete" onClick={() => handleDelete(cat)} title="Delete">
                      <FiTrash2 />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {modalOpen && (
        <CategoryModal
          category={editCat}
          onClose={() => setModalOpen(false)}
          onSaved={fetchCategories}
        />
      )}
    </div>
  );
};

export default Categories;
