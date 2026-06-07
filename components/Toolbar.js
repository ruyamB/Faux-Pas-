'use client';

import { useState, useRef, useEffect } from 'react';
import ThemeToggle from '@/components/ThemeToggle';

const TYPE_LABELS = {
  slugline: 'Scene Heading',
  action: 'Action',
  character: 'Character',
  parenthetical: 'Parenthetical',
  dialogue: 'Dialogue',
  transition: 'Transition',
};

export default function Toolbar({ project, activeElementType, saveStatus, onSave, onUpdateTitle, structure, onUpdateCoverPage, onExportSelect }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(project?.title || '');
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [coverAuthor, setCoverAuthor] = useState(project?.cover_author || '');
  const [coverContact, setCoverContact] = useState(project?.cover_contact || '');
  const [coverDate, setCoverDate] = useState(project?.cover_date || '');
  const [coverComments, setCoverComments] = useState(project?.cover_comments || '');

  const dropdownRef = useRef(null);
  const titleInputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus title input when editing
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  // Keep state in sync with project updates
  useEffect(() => {
    if (project) {
      setCoverAuthor(project.cover_author || '');
      setCoverContact(project.cover_contact || '');
      setCoverDate(project.cover_date || '');
      setCoverComments(project.cover_comments || '');
    }
  }, [project]);

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (title.trim() !== project?.title) {
      onUpdateTitle(title);
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  const handleExport = (format) => {
    if (onExportSelect) {
      onExportSelect(format);
    }
    setDropdownOpen(false);
  };

  const handleSaveCover = () => {
    onUpdateCoverPage({
      cover_author: coverAuthor,
      cover_contact: coverContact,
      cover_date: coverDate,
      cover_comments: coverComments,
    });
    setShowCoverModal(false);
  };

  const statusText = {
    saved: '✓ saved',
    saving: 'saving...',
    unsaved: '● unsaved',
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        {editingTitle ? (
          <input
            ref={titleInputRef}
            className="toolbar-project-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            id="toolbar-title-input"
          />
        ) : (
          <span
            className="toolbar-project-title"
            onClick={() => setEditingTitle(true)}
            style={{ cursor: 'pointer' }}
            id="toolbar-title-display"
          >
            {project?.title || 'Untitled'}
          </span>
        )}

        <span className="toolbar-element-type">
          {TYPE_LABELS[activeElementType] || 'Action'}
        </span>
      </div>

      <div className="toolbar-right">
        <span className={`toolbar-save-status ${saveStatus}`}>
          {statusText[saveStatus]}
        </span>

        <ThemeToggle />

        <button className="btn btn-ghost btn-sm" onClick={() => setShowCoverModal(true)} id="cover-page-btn">
          Cover Page
        </button>

        <button className="btn btn-ghost btn-sm" onClick={onSave} id="save-btn">
          Save
        </button>

        <div className="dropdown" ref={dropdownRef}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            id="download-btn"
          >
            Download ▾
          </button>
          <div className={`dropdown-menu${dropdownOpen ? ' open' : ''}`}>
            <button className="dropdown-item" onClick={() => handleExport('pdf')} id="export-pdf">
              PDF
            </button>
            <button className="dropdown-item" onClick={() => handleExport('txt')} id="export-txt">
              Plain Text
            </button>
            <button className="dropdown-item" onClick={() => handleExport('docx')} id="export-docx">
              DOCX
            </button>
          </div>
        </div>
      </div>

      {showCoverModal && (
        <div className="modal-overlay" onClick={() => setShowCoverModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3 className="modal-title">Design Cover Page</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', letterSpacing: '1px' }}>Script Title</label>
                <input
                  type="text"
                  value={project?.title || 'Untitled'}
                  disabled
                  style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '8px', borderRadius: '4px', cursor: 'not-allowed', fontStyle: 'italic' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', letterSpacing: '1px' }}>Written By / Author</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={coverAuthor}
                  onChange={(e) => setCoverAuthor(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', letterSpacing: '1px' }}>Comments / Remarks</label>
                <textarea
                  placeholder="e.g. Based on characters created by... or First Draft"
                  value={coverComments}
                  onChange={(e) => setCoverComments(e.target.value)}
                  rows={2}
                  style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px', resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', letterSpacing: '1px' }}>Draft Date</label>
                <input
                  type="text"
                  placeholder="e.g. June 2026"
                  value={coverDate}
                  onChange={(e) => setCoverDate(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', letterSpacing: '1px' }}>Contact Info</label>
                <textarea
                  placeholder="e.g. Phone, email, address, or agency details"
                  value={coverContact}
                  onChange={(e) => setCoverContact(e.target.value)}
                  rows={3}
                  style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px', fontFamily: 'monospace', resize: 'vertical' }}
                />
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button className="btn btn-ghost" onClick={() => setShowCoverModal(false)}>Cancel</button>
              <button className="btn" onClick={handleSaveCover} style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
