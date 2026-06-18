import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Plus, Trash2, Edit2, Calendar, Flag, X } from 'lucide-react';

const KanbanBoard = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState({
        todo: [],
        in_progress: [],
        review: [],
        done: []
    });
    const [loading, setLoading] = useState(true);
    const [showAddTask, setShowAddTask] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [editingTask, setEditingTask] = useState(null);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        priority: 'medium',
        due_date: ''
    });

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/tasks', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data.kanban) {
                setTasks(response.data.kanban);
            } else {
                // Initialize empty kanban board
                setTasks({
                    todo: [],
                    in_progress: [],
                    review: [],
                    done: []
                });
            }
        } catch (err) {
            console.error('Failed to fetch tasks:', err);
            setError('Failed to load tasks. Please refresh the page.');
        } finally {
            setLoading(false);
        }
    };

    const createTask = async () => {
        if (!newTask.title.trim()) {
            setError('Please enter a task title');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/tasks', newTask, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setNewTask({ title: '', description: '', priority: 'medium', due_date: '' });
            setShowAddTask(false);
            await fetchTasks();
            
        } catch (err) {
            console.error('Failed to create task:', err);
            setError(err.response?.data?.error || 'Failed to create task. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const updateTaskStatus = async (taskId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/tasks/${taskId}/status`, 
                { status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await fetchTasks();
        } catch (err) {
            console.error('Failed to update task status:', err);
            setError('Failed to update task status');
            setTimeout(() => setError(''), 3000);
        }
    };

    const deleteTask = async (taskId) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/tasks/${taskId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchTasks();
        } catch (err) {
            console.error('Failed to delete task:', err);
            setError('Failed to delete task');
            setTimeout(() => setError(''), 3000);
        }
    };

    const getPriorityColor = (priority) => {
        const colors = {
            low: '#10b981',
            medium: '#f59e0b',
            high: '#ef4444',
            urgent: '#dc2626'
        };
        return colors[priority] || '#6b7280';
    };

    const getPriorityLabel = (priority) => {
        const labels = {
            low: 'Low',
            medium: 'Medium',
            high: 'High',
            urgent: 'Urgent'
        };
        return labels[priority] || 'Medium';
    };

    const columns = [
        { id: 'todo', title: 'To Do', color: '#fef3c7', borderColor: '#f59e0b', bgColor: '#fffbeb' },
        { id: 'in_progress', title: 'In Progress', color: '#dbeafe', borderColor: '#3b82f6', bgColor: '#eff6ff' },
        { id: 'review', title: 'Review', color: '#e0e7ff', borderColor: '#8b5cf6', bgColor: '#f5f3ff' },
        { id: 'done', title: 'Done', color: '#d1fae5', borderColor: '#10b981', bgColor: '#ecfdf5' }
    ];

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', color: '#6b7280' }}>Loading your tasks...</div>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Task Board</h1>
                    <p style={{ color: '#6b7280' }}>Create and manage your tasks</p>
                </div>
                <button
                    onClick={() => setShowAddTask(!showAddTask)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '500'
                    }}
                >
                    <Plus size={18} />
                    Add Task
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    background: '#fee2e2',
                    color: '#991b1b',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span>{error}</span>
                    <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Add Task Form */}
            {showAddTask && (
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>Create New Task</h3>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                Task Title *
                            </label>
                            <input
                                type="text"
                                placeholder="Enter task title..."
                                value={newTask.title}
                                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                Description
                            </label>
                            <textarea
                                placeholder="Add description (optional)"
                                value={newTask.description}
                                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                rows="3"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                    Priority
                                </label>
                                <select
                                    value={newTask.priority}
                                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                    Due Date
                                </label>
                                <input
                                    type="date"
                                    value={newTask.due_date}
                                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem'
                                    }}
                                />
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <button
                                onClick={createTask}
                                disabled={submitting}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    opacity: submitting ? 0.5 : 1
                                }}
                            >
                                {submitting ? 'Creating...' : 'Create Task'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddTask(false);
                                    setError('');
                                }}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Kanban Board Columns */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1.5rem',
                overflowX: 'auto'
            }}>
                {columns.map(column => (
                    <div key={column.id} style={{
                        background: column.bgColor,
                        borderRadius: '12px',
                        padding: '1rem',
                        borderTop: `4px solid ${column.borderColor}`,
                        minWidth: '280px'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem',
                            padding: '0.5rem'
                        }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>{column.title}</h3>
                            <span style={{
                                background: column.borderColor,
                                color: 'white',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '500'
                            }}>
                                {tasks[column.id]?.length || 0}
                            </span>
                        </div>
                        
                        <div style={{ 
                            minHeight: '400px', 
                            maxHeight: '600px', 
                            overflowY: 'auto',
                            padding: '0.25rem'
                        }}>
                            {tasks[column.id] && tasks[column.id].length > 0 ? (
                                tasks[column.id].map(task => (
                                    <div
                                        key={task._id}
                                        style={{
                                            background: 'white',
                                            padding: '1rem',
                                            marginBottom: '0.75rem',
                                            borderRadius: '8px',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                            border: '1px solid #e5e7eb',
                                            transition: 'transform 0.2s, box-shadow 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', flex: 1, marginRight: '0.5rem' }}>
                                                {task.title}
                                            </h4>
                                            <button
                                                onClick={() => deleteTask(task._id)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: '#9ca3af',
                                                    padding: '2px'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                                onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        
                                        {task.description && (
                                            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                                                {task.description.length > 100 ? task.description.substring(0, 100) + '...' : task.description}
                                            </p>
                                        )}
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                fontSize: '0.7rem',
                                                padding: '0.25rem 0.5rem',
                                                background: getPriorityColor(task.priority) + '20',
                                                color: getPriorityColor(task.priority),
                                                borderRadius: '4px'
                                            }}>
                                                <Flag size={10} />
                                                {getPriorityLabel(task.priority)}
                                            </span>
                                            
                                            {task.due_date && (
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem',
                                                    fontSize: '0.7rem',
                                                    color: new Date(task.due_date) < new Date() ? '#ef4444' : '#6b7280'
                                                }}>
                                                    <Calendar size={10} />
                                                    {new Date(task.due_date).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        
                                        {/* Move buttons */}
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', borderTop: '1px solid #e5e7eb', paddingTop: '0.5rem' }}>
                                            {column.id !== 'todo' && (
                                                <button
                                                    onClick={() => {
                                                        const prevColumn = columns[columns.findIndex(c => c.id === column.id) - 1];
                                                        if (prevColumn) updateTaskStatus(task._id, prevColumn.id);
                                                    }}
                                                    style={{
                                                        fontSize: '0.7rem',
                                                        padding: '0.25rem 0.75rem',
                                                        background: '#f3f4f6',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        color: '#374151'
                                                    }}
                                                >
                                                    ← Previous
                                                </button>
                                            )}
                                            {column.id !== 'done' && (
                                                <button
                                                    onClick={() => {
                                                        const nextColumn = columns[columns.findIndex(c => c.id === column.id) + 1];
                                                        if (nextColumn) updateTaskStatus(task._id, nextColumn.id);
                                                    }}
                                                    style={{
                                                        fontSize: '0.7rem',
                                                        padding: '0.25rem 0.75rem',
                                                        background: '#f3f4f6',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        color: '#374151'
                                                    }}
                                                >
                                                    Next →
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '2rem',
                                    color: '#9ca3af',
                                    fontSize: '0.875rem'
                                }}>
                                    No tasks
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default KanbanBoard;