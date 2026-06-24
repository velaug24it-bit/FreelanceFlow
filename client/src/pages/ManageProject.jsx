import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import ProjectTasks from '../components/ProjectTasks';
import KanbanBoard from '../components/KanbanBoard';
import GanttChart from '../components/GanttChart';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ManageProject = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState('tasks');

  useEffect(() => { fetchProject(); }, [id]);

  const fetchProject = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/projects/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setProject(res.data.project || res.data);
    } catch (err) { console.error(err); }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Manage Project</h2>
        <Link to="/projects">Back to projects</Link>
      </div>
      <h3>{project?.title}</h3>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={() => setTab('tasks')} style={{ padding: 8 }}>Tasks</button>
        <button onClick={() => setTab('kanban')} style={{ padding: 8 }}>Kanban</button>
        <button onClick={() => setTab('gantt')} style={{ padding: 8 }}>Gantt</button>
      </div>
      <div style={{ marginTop: 16 }}>
        {tab === 'tasks' && <ProjectTasks projectId={id} />}
        {tab === 'kanban' && <KanbanBoard projectId={id} />}
        {tab === 'gantt' && <GanttChart projectId={id} />}
      </div>
    </div>
  );
};

export default ManageProject;
