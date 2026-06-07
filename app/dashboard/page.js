'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ThemeToggle from '@/components/ThemeToggle';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }
    setUser(user);
    await fetchProjects(user.id);
    setLoading(false);
  };

  const fetchProjects = async (userId) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setProjects(data);
    }
  };

  const createProject = async () => {
    if (!newTitle.trim() || !user) return;
    setCreating(true);

    try {
      // Create project
      const { data: project, error: projError } = await supabase
        .from('projects')
        .insert({ user_id: user.id, title: newTitle.trim() })
        .select()
        .single();

      if (projError) throw projError;

      // Create default Episode 1
      const { data: episode, error: epError } = await supabase
        .from('episodes')
        .insert({ project_id: project.id, title: 'Episode 1', sort_order: 0 })
        .select()
        .single();

      if (epError) throw epError;

      // Create default Act 1
      const { data: act, error: actError } = await supabase
        .from('acts')
        .insert({ episode_id: episode.id, title: 'Act 1', sort_order: 0 })
        .select()
        .single();

      if (actError) throw actError;

      // Create first empty element (action line)
      await supabase
        .from('elements')
        .insert({ act_id: act.id, type: 'action', content: '', sort_order: 0 });

      router.push(`/editor/${project.id}`);
    } catch (err) {
      console.error('Error creating project:', err?.message || err?.details || JSON.stringify(err));
      alert('Error: ' + (err?.message || err?.details || 'Failed to create project. Make sure you ran supabase-setup.sql.'));
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const deleteProject = async (e, projectId) => {
    e.stopPropagation();
    if (typeof window !== 'undefined' && !window.confirm('Delete this project? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) {
        throw error;
      }
      setProjects(projects.filter((p) => p.id !== projectId));
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('Failed to delete project: ' + (err?.message || err || 'Unknown error'));
    }
  };

  if (loading) {
    return <div className="loading">Loading</div>;
  }

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <span className="dashboard-brand">Faux Pas</span>
        <div className="dashboard-user">
          <span className="dashboard-username">
            {user?.user_metadata?.username || user?.email}
          </span>
          <ThemeToggle />
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} id="logout-btn">
            Logout
          </button>
        </div>
      </header>

      <div className="projects-grid">
        {/* New Project Card */}
        <div
          className="project-card project-card-new"
          onClick={() => setShowNewModal(true)}
          id="new-project-card"
        >
          <span className="project-card-new-icon">+</span>
          <span className="project-card-new-label">New Project</span>
        </div>

        {/* Existing Projects */}
        {projects.map((project) => (
          <div
            key={project.id}
            className="project-card"
            onClick={() => router.push(`/editor/${project.id}`)}
            id={`project-card-${project.id}`}
          >
            <div className="project-card-title">{project.title}</div>
            <div className="project-card-meta">
              {formatDate(project.updated_at)}
            </div>
            <button
              className="btn btn-danger btn-sm"
              onClick={(e) => deleteProject(e, project.id)}
              style={{ marginTop: '12px' }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* New Project Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">New Project</h2>
            <input
              id="new-project-title"
              type="text"
              placeholder="Project title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createProject();
              }}
              autoFocus
              style={{ width: '100%' }}
            />
            <div className="modal-actions">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowNewModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={createProject}
                disabled={creating || !newTitle.trim()}
                id="create-project-btn"
              >
                {creating ? '...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
