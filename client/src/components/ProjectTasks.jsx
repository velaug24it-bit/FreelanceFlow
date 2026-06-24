import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProjectTasks = ({ projectId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    if (projectId) fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/tasks/project/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(res.data.tasks || []);
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally { setLoading(false); }
  };

  const createTask = async () => {
    if (!newTitle) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/tasks`, { project_id: projectId, title: newTitle }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewTitle('');
      fetchTasks();
    } catch (err) {
      console.error('Failed to create task', err);
    }
  };

  const toggleSubtask = async (taskId, subId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/tasks/${taskId}/subtasks/${subId}/toggle`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchTasks();
    } catch (err) { console.error(err); }
  };

  if (!projectId) return <div>Select a project to manage tasks</div>;

  return (
    <div>
      <h3>Tasks</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="New task title" />
        <button onClick={createTask}>Add</button>
      </div>
      {loading ? <div>Loading tasks...</div> : (
        <div>
          {tasks.map(t => (
            <div key={t._id} style={{ padding: 10, border: '1px solid #eee', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{t.title}</strong>
                <span>{t.status}</span>
              </div>
              <div style={{ marginTop: 8 }}>
                {t.subtasks && t.subtasks.map(st => (
                  <div key={st._id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={st.done} onChange={() => toggleSubtask(t._id, st._id)} />
                    <span style={{ textDecoration: st.done ? 'line-through' : 'none' }}>{st.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectTasks;
