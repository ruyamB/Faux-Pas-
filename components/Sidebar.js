'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

export default function Sidebar({
  project,
  structure,
  isOpen,
  onToggle,
  onAddEpisode,
  onAddAct,
  onRenameEpisode,
  onRenameAct,
  onDeleteEpisode,
  onDeleteAct,
  onReorderEpisode,
  onReorderAct,
  onToggleMainBranch,
}) {
  const [editingEpIdx, setEditingEpIdx] = useState(null);
  const [editingActKey, setEditingActKey] = useState(null); // 'epIdx-actIdx'
  const [tempTitle, setTempTitle] = useState('');

  // Drag state
  const [dragType, setDragType] = useState(null); // 'episode' | 'act'
  const [dragEpIdx, setDragEpIdx] = useState(null);
  const [dragActIdx, setDragActIdx] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // { type, epIdx, actIdx? }

  const startEditEp = (ei, currentTitle) => {
    setEditingEpIdx(ei);
    setEditingActKey(null);
    setTempTitle(currentTitle);
  };

  const startEditAct = (ei, ai, currentTitle) => {
    setEditingActKey(`${ei}-${ai}`);
    setEditingEpIdx(null);
    setTempTitle(currentTitle);
  };

  const handleEpBlurOrEnter = (ei) => {
    setEditingEpIdx(null);
    if (tempTitle.trim() && tempTitle.trim() !== structure[ei].title) {
      onRenameEpisode(ei, tempTitle.trim());
    }
  };

  const handleActBlurOrEnter = (ei, ai) => {
    setEditingActKey(null);
    if (tempTitle.trim() && tempTitle.trim() !== structure[ei].acts[ai].title) {
      onRenameAct(ei, ai, tempTitle.trim());
    }
  };

  // ── Episode drag handlers ──
  const handleEpisodeDragStart = (e, ei) => {
    setDragType('episode');
    setDragEpIdx(ei);
    setDragActIdx(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `episode-${ei}`);
    // Add a slight delay for the drag ghost
    requestAnimationFrame(() => {
      e.target.closest('.sidebar-episode-group')?.classList.add('dragging');
    });
  };

  const handleEpisodeDragEnd = (e) => {
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    setDragType(null);
    setDragEpIdx(null);
    setDragActIdx(null);
    setDropTarget(null);
  };

  const handleEpisodeDragOver = (e, ei) => {
    e.preventDefault();
    if (dragType !== 'episode') return;
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ type: 'episode', epIdx: ei });
  };

  const handleEpisodeDrop = (e, toIdx) => {
    e.preventDefault();
    if (dragType === 'episode' && dragEpIdx !== null) {
      onReorderEpisode(dragEpIdx, toIdx);
    }
    handleEpisodeDragEnd(e);
  };

  // ── Act drag handlers ──
  const handleActDragStart = (e, ei, ai) => {
    e.stopPropagation(); // prevent episode drag
    setDragType('act');
    setDragEpIdx(ei);
    setDragActIdx(ai);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `act-${ei}-${ai}`);
    requestAnimationFrame(() => {
      e.target.classList.add('dragging');
    });
  };

  const handleActDragEnd = (e) => {
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    setDragType(null);
    setDragEpIdx(null);
    setDragActIdx(null);
    setDropTarget(null);
  };

  const handleActDragOver = (e, ei, ai) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragType !== 'act') return;
    // Only allow reordering within the same episode
    if (ei !== dragEpIdx) return;
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ type: 'act', epIdx: ei, actIdx: ai });
  };

  const handleActDrop = (e, ei, toActIdx) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragType === 'act' && dragEpIdx === ei && dragActIdx !== null) {
      onReorderAct(ei, dragActIdx, toActIdx);
    }
    handleActDragEnd(e);
  };

  const isEpisodeDropTarget = (ei) =>
    dropTarget?.type === 'episode' && dropTarget.epIdx === ei && dragEpIdx !== ei;

  const isActDropTarget = (ei, ai) =>
    dropTarget?.type === 'act' && dropTarget.epIdx === ei && dropTarget.actIdx === ai && dragActIdx !== ai;

  return (
    <aside className={`sidebar${isOpen ? '' : ' collapsed'}`}>
      {isOpen && (
        <>
          <div className="sidebar-header">
            <Link href="/dashboard" className="sidebar-brand">
              Faux Pas
            </Link>
            <button className="sidebar-toggle" onClick={onToggle} title="Collapse sidebar" id="sidebar-toggle-btn">
              ◂
            </button>
          </div>

          <div className="sidebar-content">
            {/* Project title */}
            <div className="sidebar-section">
              <div className="sidebar-section-header">
                <span className="sidebar-section-title">Project</span>
              </div>
              <div className="sidebar-tree-item active" style={{ fontWeight: 600 }}>
                {project?.title || 'Untitled'}
              </div>
            </div>

            {/* Structure tree */}
            <div className="sidebar-section">
              <div className="sidebar-section-header">
                <span className="sidebar-section-title">Structure</span>
                <button className="sidebar-add-btn" onClick={onAddEpisode} title="Add Episode" id="add-episode-btn">
                  + ep
                </button>
              </div>

              {structure.map((episode, ei) => {
                const isLinked = episode.in_main_branch !== false;
                return (
                <div
                  key={episode.id || ei}
                  className={`sidebar-episode-group${isEpisodeDropTarget(ei) ? ' drop-target' : ''}${!isLinked ? ' unlinked' : ''}`}
                  onDragOver={(e) => handleEpisodeDragOver(e, ei)}
                  onDrop={(e) => handleEpisodeDrop(e, ei)}
                >
                  {editingEpIdx === ei ? (
                    <input
                      type="text"
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      onBlur={() => handleEpBlurOrEnter(ei)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEpBlurOrEnter(ei);
                      }}
                      autoFocus
                      className="sidebar-tree-item"
                      style={{
                        width: '100%',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--accent)',
                        padding: '2px 4px',
                        fontSize: '12px',
                      }}
                    />
                  ) : (
                    <div
                      className="sidebar-tree-item sidebar-draggable"
                      draggable
                      onDragStart={(e) => handleEpisodeDragStart(e, ei)}
                      onDragEnd={handleEpisodeDragEnd}
                      onClick={() => {
                        const el = document.getElementById(`episode-${ei}`);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      onDoubleClick={() => startEditEp(ei, episode.title)}
                      title="Drag to reorder · Double-click to rename"
                      style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}
                    >
                      <span className="sidebar-drag-handle">⠿</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        ▸ {episode.title}
                      </span>
                      <button
                        className={`sidebar-branch-btn${isLinked ? ' linked' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleMainBranch(ei);
                        }}
                        title={isLinked ? 'On Main Branch (click to unlink)' : 'Off Main Branch (click to link)'}
                      >
                        {isLinked ? '⬥' : '⬦'}
                      </button>
                      <button
                        className="sidebar-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteEpisode(ei);
                        }}
                        title="Delete Episode"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {(episode.acts || []).map((act, ai) => {
                    const actKey = `${ei}-${ai}`;
                    return editingActKey === actKey ? (
                      <input
                        key={act.id || ai}
                        type="text"
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        onBlur={() => handleActBlurOrEnter(ei, ai)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleActBlurOrEnter(ei, ai);
                        }}
                        autoFocus
                        className="sidebar-tree-item sidebar-tree-item-indent"
                        style={{
                          width: 'calc(100% - 24px)',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--accent)',
                          padding: '2px 4px',
                          fontSize: '12px',
                          marginLeft: '24px',
                        }}
                      />
                    ) : (
                      <div
                        key={act.id || ai}
                        className={`sidebar-tree-item sidebar-tree-item-indent sidebar-draggable${isActDropTarget(ei, ai) ? ' drop-target' : ''}`}
                        draggable
                        onDragStart={(e) => handleActDragStart(e, ei, ai)}
                        onDragEnd={handleActDragEnd}
                        onDragOver={(e) => handleActDragOver(e, ei, ai)}
                        onDrop={(e) => handleActDrop(e, ei, ai)}
                        onClick={() => {
                          const el = document.getElementById(`act-${ei}-${ai}`);
                          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        onDoubleClick={() => startEditAct(ei, ai, act.title)}
                        title="Drag to reorder · Double-click to rename"
                        style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}
                      >
                        <span className="sidebar-drag-handle">⠿</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          ▹ {act.title}
                        </span>
                        <button
                          className="sidebar-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAct(ei, ai);
                          }}
                          title="Delete Act"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}

                  <div className="sidebar-tree-item sidebar-tree-item-indent">
                    <button
                      className="sidebar-add-btn"
                      onClick={() => onAddAct(ei)}
                      title="Add Act"
                      style={{ marginLeft: 0, fontSize: '10px' }}
                    >
                      + act
                    </button>
                  </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {!isOpen && (
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          title="Expand sidebar"
          style={{ padding: '16px 8px', width: '32px' }}
          id="sidebar-expand-btn"
        >
          ▸
        </button>
      )}
    </aside>
  );
}
