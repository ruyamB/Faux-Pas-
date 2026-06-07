'use client';

import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { paginateFlatItems } from '@/lib/pagination';

// ═══════════════════════════════════════════════
// Element type cycle order (Tab key)
// ═══════════════════════════════════════════════
const TYPE_CYCLE = ['slugline', 'action', 'character', 'parenthetical', 'dialogue'];

const TYPE_CONFIG = {
  slugline: { label: 'Scene Heading', placeholder: 'INT. LOCATION - DAY' },
  action: { label: 'Action', placeholder: 'Description of what happens...' },
  character: { label: 'Character', placeholder: 'CHARACTER NAME' },
  parenthetical: { label: 'Parenthetical', placeholder: '(direction)' },
  dialogue: { label: 'Dialogue', placeholder: 'Spoken words...' },
  transition: { label: 'Transition', placeholder: 'CUT TO:' },
};

// ═══════════════════════════════════════════════
// Single screenplay element (memoized, uncontrolled)
// ═══════════════════════════════════════════════
function ElementBlock({ elementKey, type, initialContent, placeholder, onContentChange, onKeyDown, onFocus, elementsRef }) {
  const elRef = useRef(null);
  const contentRef = useRef(initialContent);

  // Set initial content only once on mount
  useEffect(() => {
    if (elRef.current && initialContent) {
      elRef.current.textContent = initialContent;
    }
  }, []); // intentionally empty — only on mount

  // Update ref mapping
  useEffect(() => {
    if (elRef.current) {
      elementsRef.current.set(elementKey, elRef.current);
    }
    return () => {
      elementsRef.current.delete(elementKey);
    };
  }, [elementKey]);

  const handleInput = useCallback((e) => {
    const text = e.target.textContent;
    contentRef.current = text;
    onContentChange(elementKey, text);

    // Toggle 'empty' class directly in DOM to avoid React re-render caret reset
    if (text.trim()) {
      e.target.classList.remove('empty');
    } else {
      e.target.classList.add('empty');
    }
  }, [elementKey, onContentChange]);

  const handleKeyDown = useCallback((e) => {
    onKeyDown(e, elementKey);
  }, [elementKey, onKeyDown]);

  const handleFocus = useCallback(() => {
    onFocus(elementKey);
  }, [elementKey, onFocus]);

  const isEmpty = !initialContent?.trim();
  const className = `screenplay-element element-${type}${isEmpty ? ' empty' : ''}`;

  return (
    <div
      ref={elRef}
      className={className}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      data-type={type}
      data-key={elementKey}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      spellCheck={false}
      id={`element-${elementKey}`}
    />
  );
}

// ═══════════════════════════════════════════════
// Main editor
// ═══════════════════════════════════════════════
const ScreenplayEditor = forwardRef(function ScreenplayEditor(
  { structure, onChange, onActiveTypeChange, project },
  ref
) {
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [isPageView, setIsPageView] = useState(false);
  const containerRef = useRef(null);
  const elementsRef = useRef(new Map());
  const contentMapRef = useRef(new Map()); // tracks live content without re-renders
  const saveTimeoutRef = useRef(null);
  const structureRef = useRef(structure);

  // Keep structureRef in sync
  useEffect(() => {
    structureRef.current = structure;
  }, [structure]);

  // Initialize content map from structure
  useEffect(() => {
    for (let ei = 0; ei < structure.length; ei++) {
      for (let ai = 0; ai < (structure[ei].acts || []).length; ai++) {
        for (let li = 0; li < (structure[ei].acts[ai].elements || []).length; li++) {
          const key = `${ei}-${ai}-${li}`;
          const el = structure[ei].acts[ai].elements[li];
          if (!contentMapRef.current.has(key)) {
            contentMapRef.current.set(key, el.content || '');
          }
        }
      }
    }
  }, [structure]);

  // ── Flatten structure for rendering ──
  const flattenStructure = useCallback(() => {
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
    return flat;
  }, [structure]);

  const flatItems = flattenStructure();

  // ── Sync content map back to structure (debounced) ──
  const syncContentToStructure = useCallback(() => {
    const s = structureRef.current;
    const newStructure = JSON.parse(JSON.stringify(s));
    let changed = false;

    for (const [key, content] of contentMapRef.current.entries()) {
      const [ei, ai, li] = key.split('-').map(Number);
      const el = newStructure[ei]?.acts?.[ai]?.elements?.[li];
      if (el && el.content !== content) {
        el.content = content;
        changed = true;
      }
    }

    if (changed) {
      onChange(newStructure);
    }
  }, [onChange]);

  // ── Handle content changes from elements (no re-render) ──
  const handleContentChange = useCallback((key, text) => {
    contentMapRef.current.set(key, text);
    // Debounce sync to parent
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      syncContentToStructure();
    }, 1000);
  }, [syncContentToStructure]);

  // ── Push undo state ──
  const pushUndo = useCallback(() => {
    // Sync content first
    syncContentToStructure();
    const s = structureRef.current;
    setUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(s))].slice(-50));
    setRedoStack([]);
  }, [syncContentToStructure]);

  // ── Undo ──
  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const newStack = [...prev];
      const lastState = newStack.pop();
      setRedoStack((r) => [...r, JSON.parse(JSON.stringify(structureRef.current))]);
      onChange(lastState);
      // Update DOM to match restored state
      setTimeout(() => {
        for (let ei = 0; ei < lastState.length; ei++) {
          for (let ai = 0; ai < (lastState[ei].acts || []).length; ai++) {
            for (let li = 0; li < (lastState[ei].acts[ai].elements || []).length; li++) {
              const key = `${ei}-${ai}-${li}`;
              const content = lastState[ei].acts[ai].elements[li].content || '';
              contentMapRef.current.set(key, content);
              const dom = elementsRef.current.get(key);
              if (dom) dom.textContent = content;
            }
          }
        }
      }, 0);
      return newStack;
    });
  }, [onChange]);

  // ── Update element type ──
  const updateElementType = useCallback(
    (episodeIdx, actIdx, elementIdx, newType) => {
      pushUndo();
      const newStructure = JSON.parse(JSON.stringify(structureRef.current));
      const el = newStructure[episodeIdx]?.acts?.[actIdx]?.elements?.[elementIdx];
      if (!el) return;
      el.type = newType;
      // Also sync any pending content changes
      const key = `${episodeIdx}-${actIdx}-${elementIdx}`;
      const liveContent = contentMapRef.current.get(key);
      if (liveContent !== undefined) el.content = liveContent;
      onChange(newStructure);
    },
    [onChange, pushUndo]
  );

  // ── Add new element after given index ──
  const addElementAfter = useCallback(
    (episodeIdx, actIdx, elementIdx, type = 'action') => {
      // Sync content first
      syncContentToStructure();
      pushUndo();
      const newStructure = JSON.parse(JSON.stringify(structureRef.current));
      const elements = newStructure[episodeIdx]?.acts?.[actIdx]?.elements;
      if (!elements) return;

      const newEl = { type, content: '', sort_order: elementIdx + 1 };
      elements.splice(elementIdx + 1, 0, newEl);
      elements.forEach((el, i) => (el.sort_order = i));

      // Update content map keys (shift everything after insertion)
      const newContentMap = new Map();
      for (const [k, v] of contentMapRef.current.entries()) {
        const [kei, kai, kli] = k.split('-').map(Number);
        if (kei === episodeIdx && kai === actIdx && kli > elementIdx) {
          newContentMap.set(`${kei}-${kai}-${kli + 1}`, v);
        } else {
          newContentMap.set(k, v);
        }
      }
      newContentMap.set(`${episodeIdx}-${actIdx}-${elementIdx + 1}`, '');
      contentMapRef.current = newContentMap;

      onChange(newStructure);

      // Focus the new element after render
      setTimeout(() => {
        const key = `${episodeIdx}-${actIdx}-${elementIdx + 1}`;
        const dom = elementsRef.current.get(key);
        if (dom) dom.focus();
      }, 50);
    },
    [onChange, pushUndo, syncContentToStructure]
  );

  // ── Delete element ──
  const deleteElement = useCallback(
    (episodeIdx, actIdx, elementIdx) => {
      syncContentToStructure();
      pushUndo();
      const newStructure = JSON.parse(JSON.stringify(structureRef.current));
      const elements = newStructure[episodeIdx]?.acts?.[actIdx]?.elements;
      if (!elements || elements.length <= 1) return;

      elements.splice(elementIdx, 1);
      elements.forEach((el, i) => (el.sort_order = i));

      // Update content map
      contentMapRef.current.delete(`${episodeIdx}-${actIdx}-${elementIdx}`);
      const newContentMap = new Map();
      for (const [k, v] of contentMapRef.current.entries()) {
        const [kei, kai, kli] = k.split('-').map(Number);
        if (kei === episodeIdx && kai === actIdx && kli > elementIdx) {
          newContentMap.set(`${kei}-${kai}-${kli - 1}`, v);
        } else {
          newContentMap.set(k, v);
        }
      }
      contentMapRef.current = newContentMap;

      onChange(newStructure);

      setTimeout(() => {
        const prevIdx = Math.max(0, elementIdx - 1);
        const key = `${episodeIdx}-${actIdx}-${prevIdx}`;
        const dom = elementsRef.current.get(key);
        if (dom) {
          dom.focus();
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(dom);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }, 50);
    },
    [onChange, pushUndo, syncContentToStructure]
  );

  // ── Determine default type after Enter ──
  const getNextTypeAfterEnter = (currentType) => {
    switch (currentType) {
      case 'slugline': return 'action';
      case 'character': return 'dialogue';
      case 'parenthetical': return 'dialogue';
      case 'dialogue': return 'action';
      case 'transition': return 'slugline';
      default: return 'action';
    }
  };

  // ── Focus helpers ──
  const focusPrevElement = useCallback((ei, ai, li) => {
    const s = structureRef.current;
    if (li > 0) {
      elementsRef.current.get(`${ei}-${ai}-${li - 1}`)?.focus();
    } else if (ai > 0) {
      const prevAct = s[ei]?.acts?.[ai - 1];
      if (prevAct?.elements?.length) {
        elementsRef.current.get(`${ei}-${ai - 1}-${prevAct.elements.length - 1}`)?.focus();
      }
    } else if (ei > 0) {
      const prevEp = s[ei - 1];
      const lastAct = prevEp?.acts?.[prevEp.acts.length - 1];
      if (lastAct?.elements?.length) {
        elementsRef.current.get(`${ei - 1}-${prevEp.acts.length - 1}-${lastAct.elements.length - 1}`)?.focus();
      }
    }
  }, []);

  const focusNextElement = useCallback((ei, ai, li) => {
    const s = structureRef.current;
    const act = s[ei]?.acts?.[ai];
    if (li < (act?.elements?.length || 0) - 1) {
      elementsRef.current.get(`${ei}-${ai}-${li + 1}`)?.focus();
    } else if (ai < (s[ei]?.acts?.length || 0) - 1) {
      elementsRef.current.get(`${ei}-${ai + 1}-0`)?.focus();
    } else if (ei < s.length - 1) {
      elementsRef.current.get(`${ei + 1}-0-0`)?.focus();
    }
  }, []);

  // ── Handle key events on elements ──
  const handleKeyDown = useCallback(
    (e, elementKey) => {
      const [ei, ai, li] = elementKey.split('-').map(Number);
      const s = structureRef.current;
      const el = s[ei]?.acts?.[ai]?.elements?.[li];
      if (!el) return;

      // Tab — cycle element type
      if (e.key === 'Tab') {
        e.preventDefault();
        const currentIdx = TYPE_CYCLE.indexOf(el.type);
        const nextIdx = (currentIdx + 1) % TYPE_CYCLE.length;
        const nextType = TYPE_CYCLE[nextIdx];
        updateElementType(ei, ai, li, nextType);
        onActiveTypeChange(nextType);
        return;
      }

      // Shift+? — transition
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        updateElementType(ei, ai, li, 'transition');
        onActiveTypeChange('transition');
        return;
      }

      // Alt+Ctrl — toggle page view
      if (e.altKey && e.ctrlKey) {
        e.preventDefault();
        setIsPageView((prev) => !prev);
        return;
      }

      // Enter — new element
      if (e.key === 'Enter') {
        e.preventDefault();
        const nextType = getNextTypeAfterEnter(el.type);
        addElementAfter(ei, ai, li, nextType);
        onActiveTypeChange(nextType);
        return;
      }

      // Backspace on empty element — delete
      if (e.key === 'Backspace' && !e.target.textContent.trim()) {
        e.preventDefault();
        deleteElement(ei, ai, li);
        return;
      }

      // Ctrl+Z — undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ctrl+A — select all in this element
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const range = document.createRange();
        range.selectNodeContents(e.target);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }

      // Arrow Up
      if (e.key === 'ArrowUp') {
        const sel = window.getSelection();
        if (sel.anchorOffset === 0) {
          e.preventDefault();
          focusPrevElement(ei, ai, li);
        }
      }

      // Arrow Down
      if (e.key === 'ArrowDown') {
        const sel = window.getSelection();
        if (sel.anchorOffset >= e.target.textContent.length) {
          e.preventDefault();
          focusNextElement(ei, ai, li);
        }
      }
    },
    [updateElementType, addElementAfter, deleteElement, handleUndo, onActiveTypeChange, focusPrevElement, focusNextElement]
  );

  // ── Handle focus to update active type ──
  const handleFocus = useCallback(
    (elementKey) => {
      const [ei, ai, li] = elementKey.split('-').map(Number);
      const el = structureRef.current[ei]?.acts?.[ai]?.elements?.[li];
      if (el) {
        onActiveTypeChange(el.type);
      }
    },
    [onActiveTypeChange]
  );

  // ── Render ──
  const coverData = {
    title: project?.title || 'Untitled',
    author: project?.cover_author || '',
    contact: project?.cover_contact || '',
    date: project?.cover_date || '',
    comments: project?.cover_comments || '',
  };

  const paginatedPages = isPageView ? paginateFlatItems(flatItems, coverData, project?.title) : [];
  let contentPageCount = 0;

  if (isPageView) {
    return (
      <div className="screenplay-container page-view" ref={containerRef}>
        <div className="pages-wrapper">
          {paginatedPages.map((page, pageIdx) => {
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
                <div className="screenplay-page-number">{contentPageCount}.</div>
                {page.items.map((item) => {
                  if (item.kind === 'episode-header') {
                    return (
                      <div key={`ep-${item.episodeIdx}`} className="screenplay-structure-header" id={`episode-${item.episodeIdx}`}>
                        {item.title}
                      </div>
                    );
                  }
                  if (item.kind === 'act-header') {
                    return (
                      <div key={`act-${item.episodeIdx}-${item.actIdx}`} className="screenplay-structure-header" id={`act-${item.episodeIdx}-${item.actIdx}`} style={{ fontSize: '10px', paddingTop: '12px' }}>
                        {item.title}
                      </div>
                    );
                  }
                  if (item.kind === 'element') {
                    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.action;
                    return (
                      <ElementBlock
                        key={item.key}
                        elementKey={item.key}
                        type={item.type}
                        initialContent={item.content}
                        placeholder={config.placeholder}
                        onContentChange={handleContentChange}
                        onKeyDown={handleKeyDown}
                        onFocus={handleFocus}
                        elementsRef={elementsRef}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            );
          })}
        </div>

        <div className="keyboard-hint">
          <kbd>Tab</kbd> cycle type &nbsp; <kbd>Shift</kbd>+<kbd>?</kbd> transition &nbsp; <kbd>Ctrl</kbd>+<kbd>Alt</kbd> continuous view &nbsp; <kbd>Ctrl</kbd>+<kbd>S</kbd> save
        </div>
      </div>
    );
  }

  return (
    <div className="screenplay-container" ref={containerRef}>
      <div className="screenplay-page">
        {flatItems.map((item) => {
          if (item.kind === 'episode-header') {
            return (
              <div key={`ep-${item.episodeIdx}`} className="screenplay-structure-header" id={`episode-${item.episodeIdx}`}>
                {item.title}
              </div>
            );
          }

          if (item.kind === 'act-header') {
            return (
              <div key={`act-${item.episodeIdx}-${item.actIdx}`} className="screenplay-structure-header" id={`act-${item.episodeIdx}-${item.actIdx}`} style={{ fontSize: '10px', paddingTop: '12px' }}>
                {item.title}
              </div>
            );
          }

          if (item.kind === 'element') {
            const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.action;

            return (
              <ElementBlock
                key={item.key}
                elementKey={item.key}
                type={item.type}
                initialContent={item.content}
                placeholder={config.placeholder}
                onContentChange={handleContentChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                elementsRef={elementsRef}
              />
            );
          }

          return null;
        })}
      </div>

      <div className="keyboard-hint">
        <kbd>Tab</kbd> cycle type &nbsp; <kbd>Shift</kbd>+<kbd>?</kbd> transition &nbsp; <kbd>Ctrl</kbd>+<kbd>Alt</kbd> page view &nbsp; <kbd>Ctrl</kbd>+<kbd>S</kbd> save
      </div>
    </div>
  );
});

export default ScreenplayEditor;
