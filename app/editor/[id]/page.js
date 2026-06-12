'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import ScreenplayEditor from '@/components/ScreenplayEditor';
import Sidebar from '@/components/Sidebar';
import Toolbar from '@/components/Toolbar';

const ExportPreview = dynamic(() => import('@/components/ExportPreview'), { ssr: false });

export default function EditorPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id;

  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [structure, setStructure] = useState([]); // episodes → acts → elements
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved'
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeElementType, setActiveElementType] = useState('action');
  const [exportFormat, setExportFormat] = useState(null);

  const editorRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // ── Auth check ──
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUser(user);
      await loadProject(user.id);
    };
    init();
  }, [projectId]);

  // ── Load project with full structure ──
  const loadProject = async (userId) => {
    try {
      // Fetch project
      const { data: proj, error: projError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single();

      if (projError || !proj) {
        router.push('/dashboard');
        return;
      }
      setProject(proj);

      // Fetch episodes
      const { data: episodes } = await supabase
        .from('episodes')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');

      const fullStructure = [];

      for (const ep of episodes || []) {
        // Fetch acts for each episode
        const { data: acts } = await supabase
          .from('acts')
          .select('*')
          .eq('episode_id', ep.id)
          .order('sort_order');

        const epData = { ...ep, acts: [] };

        for (const act of acts || []) {
          // Fetch elements for each act
          const { data: elements } = await supabase
            .from('elements')
            .select('*')
            .eq('act_id', act.id)
            .order('sort_order');

          epData.acts.push({ ...act, elements: elements || [] });
        }

        fullStructure.push(epData);
      }

      setStructure(fullStructure);
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Save all elements ──
  const saveProject = useCallback(async () => {
    if (!project) return;
    setSaveStatus('saving');

    try {
      // Update project timestamp
      await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', project.id);

      // Save each act's elements
      for (const episode of structure) {
        for (const act of episode.acts || []) {
          // Delete existing elements for this act
          await supabase.from('elements').delete().eq('act_id', act.id);

          // Insert current elements
          if (act.elements && act.elements.length > 0) {
            const rows = act.elements.map((el, idx) => ({
              act_id: act.id,
              type: el.type,
              content: el.content,
              sort_order: idx,
            }));
            await supabase.from('elements').insert(rows);
          }
        }
      }

      setSaveStatus('saved');
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('unsaved');
    }
  }, [project, structure]);

  // ── Auto-save debounce ──
  const triggerAutoSave = useCallback(() => {
    setSaveStatus('unsaved');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveProject();
    }, 3000);
  }, [saveProject]);

  // ── Handle structure changes from editor ──
  const handleStructureChange = useCallback((newStructure) => {
    setStructure(newStructure);
    triggerAutoSave();
  }, [triggerAutoSave]);

  // ── Add episode ──
  const addEpisode = async () => {
    const sortOrder = structure.length;
    const title = `Episode ${sortOrder + 1}`;

    const { data: episode, error } = await supabase
      .from('episodes')
      .insert({ project_id: projectId, title, sort_order: sortOrder })
      .select()
      .single();

    if (error) return;

    // Create default act
    const { data: act } = await supabase
      .from('acts')
      .insert({ episode_id: episode.id, title: 'Act 1', sort_order: 0 })
      .select()
      .single();

    // Create default element
    await supabase
      .from('elements')
      .insert({ act_id: act.id, type: 'action', content: '', sort_order: 0 });

    setStructure([
      ...structure,
      { ...episode, acts: [{ ...act, elements: [{ type: 'action', content: '', sort_order: 0 }] }] },
    ]);
  };

  // ── Add act to episode ──
  const addAct = async (episodeIdx) => {
    const episode = structure[episodeIdx];
    const sortOrder = (episode.acts || []).length;
    const title = `Act ${sortOrder + 1}`;

    const { data: act, error } = await supabase
      .from('acts')
      .insert({ episode_id: episode.id, title, sort_order: sortOrder })
      .select()
      .single();

    if (error) return;

    await supabase
      .from('elements')
      .insert({ act_id: act.id, type: 'action', content: '', sort_order: 0 });

    const newStructure = [...structure];
    newStructure[episodeIdx] = {
      ...episode,
      acts: [...(episode.acts || []), { ...act, elements: [{ type: 'action', content: '', sort_order: 0 }] }],
    };
    setStructure(newStructure);
  };

  // ── Update project title ──
  const updateTitle = async (newTitle) => {
    if (!newTitle.trim()) return;
    await supabase
      .from('projects')
      .update({ title: newTitle.trim() })
      .eq('id', project.id);
    setProject({ ...project, title: newTitle.trim() });
  };

  // ── Update Cover Page ──
  const updateCoverPage = async (coverData) => {
    try {
      setSaveStatus('saving');
      const { error } = await supabase
        .from('projects')
        .update({
          cover_author: coverData.cover_author,
          cover_contact: coverData.cover_contact,
          cover_date: coverData.cover_date,
          cover_comments: coverData.cover_comments,
        })
        .eq('id', project.id);
      if (error) throw error;
      setProject({
        ...project,
        cover_author: coverData.cover_author,
        cover_contact: coverData.cover_contact,
        cover_date: coverData.cover_date,
        cover_comments: coverData.cover_comments,
      });
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to update cover page:', err);
      alert('Failed to update cover page: ' + (err.message || err));
      setSaveStatus('unsaved');
    }
  };

  // ── Rename Episode ──
  const renameEpisode = async (episodeIdx, newTitle) => {
    if (!newTitle.trim()) return;
    const newStructure = [...structure];
    const episode = newStructure[episodeIdx];
    episode.title = newTitle.trim();
    setStructure(newStructure);

    if (episode.id) {
      await supabase
        .from('episodes')
        .update({ title: newTitle.trim() })
        .eq('id', episode.id);
    }
  };

  // ── Rename Act ──
  const renameAct = async (episodeIdx, actIdx, newTitle) => {
    if (!newTitle.trim()) return;
    const newStructure = [...structure];
    const act = newStructure[episodeIdx].acts[actIdx];
    act.title = newTitle.trim();
    setStructure(newStructure);

    if (act.id) {
      await supabase
        .from('acts')
          .update({ title: newTitle.trim() })
          .eq('id', act.id);
    }
  };

  // ── Delete Episode ──
  const deleteEpisode = async (episodeIdx) => {
    const episode = structure[episodeIdx];
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${episode.title}" and all its acts? This cannot be undone.`)) {
      return;
    }

    try {
      if (episode.id) {
        const { error } = await supabase.from('episodes').delete().eq('id', episode.id);
        if (error) throw error;
      }
      const newStructure = structure.filter((_, idx) => idx !== episodeIdx);
      setStructure(newStructure);
    } catch (err) {
      console.error('Failed to delete episode:', err);
      alert('Failed to delete episode: ' + (err.message || err));
    }
  };

  // ── Delete Act ──
  const deleteAct = async (episodeIdx, actIdx) => {
    const episode = structure[episodeIdx];
    const act = episode.acts[actIdx];
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${act.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      if (act.id) {
        const { error } = await supabase.from('acts').delete().eq('id', act.id);
        if (error) throw error;
      }
      const newStructure = [...structure];
      newStructure[episodeIdx] = {
        ...episode,
        acts: episode.acts.filter((_, idx) => idx !== actIdx)
      };
      setStructure(newStructure);
    } catch (err) {
      console.error('Failed to delete act:', err);
      alert('Failed to delete act: ' + (err.message || err));
    }
  };

  // ── Toggle Main Branch ──
  const toggleMainBranch = async (episodeIdx) => {
    const episode = structure[episodeIdx];
    const newValue = episode.in_main_branch === false ? true : false;
    const newStructure = [...structure];
    newStructure[episodeIdx] = { ...episode, in_main_branch: newValue };
    setStructure(newStructure);

    if (episode.id) {
      await supabase
        .from('episodes')
        .update({ in_main_branch: newValue })
        .eq('id', episode.id);
    }
  };

  // ── Reorder Episode (drag & drop) ──
  const reorderEpisode = async (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    const newStructure = [...structure];
    const [moved] = newStructure.splice(fromIdx, 1);
    newStructure.splice(toIdx, 0, moved);
    setStructure(newStructure);

    // Persist new sort orders
    for (let i = 0; i < newStructure.length; i++) {
      if (newStructure[i].id) {
        await supabase
          .from('episodes')
          .update({ sort_order: i })
          .eq('id', newStructure[i].id);
      }
    }
  };

  // ── Reorder Act within an episode (drag & drop) ──
  const reorderAct = async (episodeIdx, fromActIdx, toActIdx) => {
    if (fromActIdx === toActIdx) return;
    const newStructure = [...structure];
    const acts = [...newStructure[episodeIdx].acts];
    const [moved] = acts.splice(fromActIdx, 1);
    acts.splice(toActIdx, 0, moved);
    newStructure[episodeIdx] = { ...newStructure[episodeIdx], acts };
    setStructure(newStructure);

    // Persist new sort orders
    for (let i = 0; i < acts.length; i++) {
      if (acts[i].id) {
        await supabase
          .from('acts')
          .update({ sort_order: i })
          .eq('id', acts[i].id);
      }
    }
  };

  // ── Keyboard shortcuts: Ctrl+S and ESC+1 ──
  useEffect(() => {
    let escPressed = false;

    const handleKeyDown = (e) => {
      // Ctrl+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveProject();
      }

      // ESC+1 toggle sidebar
      if (e.key === 'Escape') {
        escPressed = true;
      }
      if (e.key === '1' && escPressed) {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Escape') {
        escPressed = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [saveProject]);

  if (loading) {
    return <div className="loading">Loading project</div>;
  }

  return (
    <div className="editor-layout">
      <Sidebar
        project={project}
        structure={structure}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onAddEpisode={addEpisode}
        onAddAct={addAct}
        onRenameEpisode={renameEpisode}
        onRenameAct={renameAct}
        onDeleteEpisode={deleteEpisode}
        onDeleteAct={deleteAct}
        onReorderEpisode={reorderEpisode}
        onReorderAct={reorderAct}
        onToggleMainBranch={toggleMainBranch}
      />
      <div className="editor-main">
        <Toolbar
          project={project}
          activeElementType={activeElementType}
          saveStatus={saveStatus}
          onSave={saveProject}
          onUpdateTitle={updateTitle}
          structure={structure}
          onUpdateCoverPage={updateCoverPage}
          onExportSelect={(format) => setExportFormat(format)}
        />
        <ScreenplayEditor
          ref={editorRef}
          structure={structure}
          onChange={handleStructureChange}
          onActiveTypeChange={setActiveElementType}
          project={project}
        />
      </div>
      {exportFormat && (
        <ExportPreview
          format={exportFormat}
          project={project}
          structure={structure.filter(ep => ep.in_main_branch !== false)}
          onClose={() => setExportFormat(null)}
        />
      )}
    </div>
  );
}
