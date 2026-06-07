'use client';

import { useState } from 'react';
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
}) {
  const [editingEpIdx, setEditingEpIdx] = useState(null);
  const [editingActKey, setEditingActKey] = useState(null); // 'epIdx-actIdx'
  const [tempTitle, setTempTitle] = useState('');

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

              {structure.map((episode, ei) => (
                <div key={episode.id || ei}>
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
                      className="sidebar-tree-item"
                      onClick={() => {
                        const el = document.getElementById(`episode-${ei}`);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      onDoubleClick={() => startEditEp(ei, episode.title)}
                      title="Double-click to rename"
                      style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        ▸ {episode.title}
                      </span>
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
                        className="sidebar-tree-item sidebar-tree-item-indent"
                        onClick={() => {
                          const el = document.getElementById(`act-${ei}-${ai}`);
                          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        onDoubleClick={() => startEditAct(ei, ai, act.title)}
                        title="Double-click to rename"
                        style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
              ))}
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
