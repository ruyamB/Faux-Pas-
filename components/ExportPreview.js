'use client';

import { useState, useEffect } from 'react';
import { exportAsPDF, exportAsTXT, exportAsDOCX } from '@/lib/exportUtils';
import { paginateFlatItems } from '@/lib/pagination';

export default function ExportPreview({ format, project, structure, onClose }) {
  const [pages, setPages] = useState([]);

  useEffect(() => {
    // Generate flat list from structure
    const flat = [];
    for (let ei = 0; ei < structure.length; ei++) {
      const episode = structure[ei];
      flat.push({ kind: 'episode-header', episodeIdx: ei, title: episode.title });

      for (let ai = 0; ai < (episode.acts || []).length; ai++) {
        const act = episode.acts[ai];
        flat.push({ kind: 'act-header', episodeIdx: ei, actIdx: ai, title: act.title });

        for (let li = 0; li < (act.elements || []).length; li++) {
          const el = act.elements[li];
          flat.push({
            kind: 'element',
            episodeIdx: ei,
            actIdx: ai,
            elementIdx: li,
            type: el.type,
            content: el.content || '',
            key: `${ei}-${ai}-${li}`,
          });
        }
      }
    }

    const coverData = {
      title: project?.title || 'Untitled',
      author: project?.cover_author || '',
      contact: project?.cover_contact || '',
      date: project?.cover_date || '',
      comments: project?.cover_comments || '',
    };

    const paginated = paginateFlatItems(flat, coverData, project?.title);
    setPages(paginated);
  }, [structure, project]);

  const handleDownload = () => {
    const projectTitle = project?.title || 'Untitled';
    const coverData = {
      title: project?.title || 'Untitled',
      author: project?.cover_author || '',
      contact: project?.cover_contact || '',
      date: project?.cover_date || '',
      comments: project?.cover_comments || '',
    };

    switch (format) {
      case 'pdf':
        exportAsPDF(projectTitle, structure, coverData);
        break;
      case 'txt':
        exportAsTXT(projectTitle, structure, coverData);
        break;
      case 'docx':
        exportAsDOCX(projectTitle, structure, coverData);
        break;
    }
  };

  const getFormatLabel = () => {
    switch (format) {
      case 'pdf': return 'PDF Document';
      case 'txt': return 'Plain Text (.txt)';
      case 'docx': return 'Word Document (.docx)';
      default: return 'Screenplay';
    }
  };

  let contentPageCount = 0;

  return (
    <div className="export-preview-overlay">
      <div className="export-preview-header">
        <div className="export-preview-info">
          <h3>Export Preview</h3>
          <span>Format: {getFormatLabel()}</span>
        </div>
        <div className="export-preview-actions">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Close Preview
          </button>
          <button className="btn btn-sm" onClick={handleDownload} style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}>
            Download {format.toUpperCase()}
          </button>
        </div>
      </div>

      <div className="export-preview-body">
        <div className="export-preview-pages">
          {pages.map((page, pageIdx) => {
            if (page.isCover) {
              return (
                <div key="cover" className="screenplay-page preview-sheet cover-page">
                  <div className="cover-title-group">
                    <div className="cover-title">{page.title}</div>
                    {page.author && (
                      <>
                        <div className="cover-by">by</div>
                        <div className="cover-author">{page.author}</div>
                      </>
                    )}
                    {page.comments && (
                      <div className="cover-comments">{page.comments}</div>
                    )}
                  </div>
                  <div className="cover-bottom-group">
                    <div className="cover-contact">{page.contact}</div>
                    <div className="cover-date">{page.date}</div>
                  </div>
                </div>
              );
            }

            contentPageCount++;
            return (
              <div key={`page-${pageIdx}`} className="screenplay-page preview-sheet content-page">
                {/* Screenplay page number */}
                <div className="screenplay-page-number">{contentPageCount}.</div>

                {page.items.map((item, itemIdx) => {
                  if (item.kind === 'episode-header') {
                    return (
                      <div key={`ep-${item.episodeIdx}`} className="screenplay-structure-header">
                        {item.title}
                      </div>
                    );
                  }
                  if (item.kind === 'act-header') {
                    return (
                      <div key={`act-${item.episodeIdx}-${item.actIdx}`} className="screenplay-structure-header" style={{ fontSize: '10px', paddingTop: '12px' }}>
                        {item.title}
                      </div>
                    );
                  }
                  if (item.kind === 'element') {
                    return (
                      <div
                        key={item.key}
                        className={`screenplay-element element-${item.type} read-only`}
                        data-type={item.type}
                      >
                        {item.type === 'parenthetical' && !item.content.startsWith('(') ? `(${item.content})` : item.content}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
