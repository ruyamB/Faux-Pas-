// ═══════════════════════════════════════════════
// Pagination Utility for Page View and Exports
// ═══════════════════════════════════════════════

export function paginateFlatItems(flatItems, coverData, projectTitle) {
  const pages = [];

  // Page 0: Cover Page (if designed and has content)
  if (
    coverData &&
    (coverData.author || coverData.contact || coverData.date || coverData.comments)
  ) {
    pages.push({
      isCover: true,
      title: coverData.title || projectTitle || 'Untitled',
      author: coverData.author || '',
      contact: coverData.contact || '',
      date: coverData.date || '',
      comments: coverData.comments || '',
    });
  }

  let currentPageItems = [];
  let currentLineCount = 0;
  const MAX_LINES_PER_PAGE = 54; // standard screenplay lines per page

  const getLineCount = (item) => {
    if (item.kind === 'episode-header') return 3;
    if (item.kind === 'act-header') return 2;
    
    // Elements
    const text = item.content || '';
    const type = item.type;
    let textLines = 1;
    
    if (type === 'action') {
      textLines = Math.ceil(text.length / 60) || 1;
      return textLines + 1; // +1 spacing before
    }
    if (type === 'character') {
      return 2; // character + space before
    }
    if (type === 'parenthetical') {
      textLines = Math.ceil(text.length / 30) || 1;
      return textLines;
    }
    if (type === 'dialogue') {
      textLines = Math.ceil(text.length / 35) || 1;
      return textLines;
    }
    if (type === 'slugline') {
      textLines = Math.ceil(text.length / 60) || 1;
      return textLines + 2; // +2 spacing before
    }
    if (type === 'transition') {
      return 2;
    }
    return 1;
  };

  for (const item of flatItems) {
    const lines = getLineCount(item);
    if (currentLineCount + lines > MAX_LINES_PER_PAGE && currentPageItems.length > 0) {
      pages.push({ isCover: false, items: currentPageItems });
      currentPageItems = [item];
      currentLineCount = lines;
    } else {
      currentPageItems.push(item);
      currentLineCount += lines;
    }
  }

  if (currentPageItems.length > 0) {
    pages.push({ isCover: false, items: currentPageItems });
  }

  return pages;
}
