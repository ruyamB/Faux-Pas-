import { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak } from 'docx';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

// ═══════════════════════════════════════════════
// Element formatting config (Hollywood standard)
// ═══════════════════════════════════════════════
const ELEMENT_CONFIG = {
  slugline: {
    label: 'Scene Heading',
    leftMargin: 0,      // inches from page left margin
    uppercase: true,
    bold: true,
    placeholder: 'INT. LOCATION - DAY',
  },
  action: {
    label: 'Action',
    leftMargin: 0,
    uppercase: false,
    bold: false,
    placeholder: 'Description of what happens...',
  },
  character: {
    label: 'Character',
    leftMargin: 2.2,    // ~3.7" from page left (1.5" page margin + 2.2")
    uppercase: true,
    bold: false,
    placeholder: 'CHARACTER NAME',
  },
  parenthetical: {
    label: 'Parenthetical',
    leftMargin: 1.6,    // ~3.1" from page left
    uppercase: false,
    bold: false,
    placeholder: '(direction)',
  },
  dialogue: {
    label: 'Dialogue',
    leftMargin: 1.0,    // ~2.5" from page left
    uppercase: false,
    bold: false,
    placeholder: 'Spoken words...',
  },
  transition: {
    label: 'Transition',
    leftMargin: 0,
    uppercase: true,
    bold: false,
    rightAlign: true,
    placeholder: 'CUT TO:',
  },
};

// ═══════════════════════════════════════════════
// Export as Plain Text
// ═══════════════════════════════════════════════
export function exportAsTXT(projectTitle, structure, coverData = null) {
  let text = '';

  for (const episode of structure) {
    text += `\n${'='.repeat(50)}\n`;
    text += `${episode.title.toUpperCase()}\n`;
    text += `${'='.repeat(50)}\n\n`;

    for (const act of episode.acts || []) {
      text += `--- ${act.title.toUpperCase()} ---\n\n`;

      for (const el of act.elements || []) {
        const config = ELEMENT_CONFIG[el.type] || ELEMENT_CONFIG.action;
        const indent = ' '.repeat(Math.round(config.leftMargin * 10));
        let content = el.content || '';

        if (config.uppercase) content = content.toUpperCase();
        if (el.type === 'parenthetical' && content && !content.startsWith('(')) {
          content = `(${content})`;
        }
        if (config.rightAlign) {
          content = ' '.repeat(Math.max(0, 55 - content.length)) + content;
        } else {
          content = indent + content;
        }

        text += content + '\n';
        if (el.type === 'slugline' || el.type === 'transition') text += '\n';
      }
      text += '\n';
    }
  }

  if (coverData) {
    const cTitle = (coverData.title || projectTitle).toUpperCase();
    const cAuthor = coverData.author || '';
    const cContact = coverData.contact || '';
    const cDate = coverData.date || '';
    const cComments = coverData.comments || '';

    let coverText = '\n'.repeat(15);
    coverText += ' '.repeat(Math.max(0, Math.round((60 - cTitle.length) / 2))) + cTitle + '\n\n';
    if (cAuthor) {
      coverText += ' '.repeat(Math.max(0, Math.round((60 - 2) / 2))) + 'by\n\n';
      coverText += ' '.repeat(Math.max(0, Math.round((60 - cAuthor.length) / 2))) + cAuthor + '\n';
    }
    if (cComments) {
      coverText += '\n';
      const commentLines = cComments.split('\n');
      for (const line of commentLines) {
        coverText += ' '.repeat(Math.max(0, Math.round((60 - line.length) / 2))) + line + '\n';
      }
    }

    coverText += '\n'.repeat(12);

    const contactLines = cContact.split('\n');
    const dateLines = cDate.split('\n');
    const maxLines = Math.max(contactLines.length, dateLines.length);

    for (let i = 0; i < maxLines; i++) {
      const leftText = contactLines[i] || '';
      const rightText = dateLines[i] || '';
      const pad = ' '.repeat(Math.max(1, 60 - leftText.length - rightText.length));
      coverText += leftText + pad + rightText + '\n';
    }

    coverText += '\n\f\n';
    text = coverText + text;
  } else {
    text = `${projectTitle.toUpperCase()}\n\n` + text;
  }

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${projectTitle}.txt`);
}

// ═══════════════════════════════════════════════
// Export as PDF
// ═══════════════════════════════════════════════
export function exportAsPDF(projectTitle, structure, coverData = null) {
  const doc = new jsPDF({
    unit: 'in',
    format: 'letter',
  });

  // Use Courier (built into jsPDF)
  doc.setFont('courier', 'normal');
  doc.setFontSize(12);

  const pageWidth = 8.5;
  const leftMargin = 1.5;
  const rightMargin = 1.0;
  const topMargin = 1.0;
  const bottomMargin = 1.0;
  const lineHeight = 0.167; // ~12pt / 72
  const usableWidth = pageWidth - leftMargin - rightMargin;

  let y = topMargin;
  let pageNum = 1;

  const newPage = () => {
    doc.addPage();
    pageNum++;
    y = topMargin;
  };

  const checkPage = () => {
    if (y > 11 - bottomMargin) {
      newPage();
    }
  };

  const writeLine = (text, xOffset = 0, options = {}) => {
    checkPage();
    const x = leftMargin + xOffset;

    if (options.bold) {
      doc.setFont('courier', 'bold');
    } else {
      doc.setFont('courier', 'normal');
    }

    if (options.rightAlign) {
      const textWidth = doc.getTextWidth(text);
      doc.text(text, pageWidth - rightMargin - textWidth + xOffset, y);
    } else {
      // Word wrap
      const maxWidth = usableWidth - xOffset;
      const lines = doc.splitTextToSize(text, maxWidth);
      for (const line of lines) {
        checkPage();
        doc.text(line, x, y);
        y += lineHeight;
      }
      return;
    }
    y += lineHeight;
  };

  // Title page
  if (coverData) {
    const cTitle = (coverData.title || projectTitle).toUpperCase();
    const cAuthor = coverData.author || '';
    const cContact = coverData.contact || '';
    const cDate = coverData.date || '';
    const cComments = coverData.comments || '';

    // Title (Centered, ~3.5" from top)
    doc.setFont('courier', 'bold');
    doc.setFontSize(14); // Standard screenplay is 12pt bold, we will use 14pt for title
    const tWidth = doc.getTextWidth(cTitle);
    doc.text(cTitle, (pageWidth - tWidth) / 2, 3.5);

    // Written by
    doc.setFont('courier', 'normal');
    doc.setFontSize(12);
    if (cAuthor) {
      doc.text("by", (pageWidth - doc.getTextWidth("by")) / 2, 4.0);
      doc.setFont('courier', 'bold'); // BOLD writer's name
      doc.text(cAuthor, (pageWidth - doc.getTextWidth(cAuthor)) / 2, 4.4);
      doc.setFont('courier', 'normal');
    }

    // Comments (Centered, directly below writer's name)
    if (cComments) {
      const commentLines = doc.splitTextToSize(cComments, 5.0);
      let cy = 5.0;
      for (const line of commentLines) {
        doc.text(line, (pageWidth - doc.getTextWidth(line)) / 2, cy);
        cy += lineHeight;
      }
    }

    // Contact info (Bottom Left: y = 9.0)
    if (cContact) {
      const contactLines = doc.splitTextToSize(cContact, 4.0);
      let cy = 9.0;
      for (const line of contactLines) {
        doc.text(line, leftMargin, cy);
        cy += lineHeight;
      }
    }

    // Date (Bottom Right: y = 9.0)
    if (cDate) {
      const dateLines = doc.splitTextToSize(cDate, 3.0);
      let dy = 9.0;
      for (const line of dateLines) {
        const dWidth = doc.getTextWidth(line);
        doc.text(line, pageWidth - rightMargin - dWidth, dy);
        dy += lineHeight;
      }
    }

    newPage();
    pageNum = 1;
  } else {
    doc.setFontSize(24);
    doc.setFont('courier', 'bold');
    const titleWidth = doc.getTextWidth(projectTitle.toUpperCase());
    doc.text(projectTitle.toUpperCase(), (pageWidth - titleWidth) / 2, 4);
    doc.setFontSize(12);
    doc.setFont('courier', 'normal');
    newPage();
  }

  // Content
  for (const episode of structure) {
    for (const act of episode.acts || []) {
      for (const el of act.elements || []) {
        const config = ELEMENT_CONFIG[el.type] || ELEMENT_CONFIG.action;
        let content = el.content || '';
        if (!content.trim()) continue;

        if (config.uppercase) content = content.toUpperCase();
        if (el.type === 'parenthetical' && !content.startsWith('(')) {
          content = `(${content})`;
        }

        // Add spacing before certain elements
        if (el.type === 'slugline') {
          y += lineHeight;
        } else if (el.type === 'character') {
          y += lineHeight * 0.5;
        }

        writeLine(content, config.leftMargin, {
          bold: config.bold,
          rightAlign: config.rightAlign,
        });
      }
    }
  }

  doc.save(`${projectTitle}.pdf`);
}

// ═══════════════════════════════════════════════
// Export as DOCX
// ═══════════════════════════════════════════════
export async function exportAsDOCX(projectTitle, structure, coverData = null) {
  const children = [];

  if (coverData) {
    const cTitle = (coverData.title || projectTitle).toUpperCase();
    const cAuthor = coverData.author || '';
    const cContact = coverData.contact || '';
    const cDate = coverData.date || '';
    const cComments = coverData.comments || '';

    // Push empty paragraphs to push title down (~12 empty lines)
    for (let i = 0; i < 15; i++) {
      children.push(new Paragraph({ children: [] }));
    }

    // Title
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: cTitle,
            font: 'Courier New',
            size: 28, // 14pt
            bold: true,
          }),
        ],
      })
    );

    // written by
    if (cAuthor) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: 'by',
              font: 'Courier New',
              size: 24, // 12pt
            }),
          ],
        })
      );
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [
            new TextRun({
              text: cAuthor,
              font: 'Courier New',
              size: 24, // 12pt
              bold: true, // Bold writer's name
            }),
          ],
        })
      );
    }

    // Comments
    if (cComments) {
      const commentLines = cComments.split('\n');
      for (const line of commentLines) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 120 },
            children: [
              new TextRun({
                text: line,
                font: 'Courier New',
                size: 24,
              }),
            ],
          })
        );
      }
    }

    // Push down to bottom (approx 10 paragraphs)
    const pushCount = Math.max(5, 12 - (cComments ? cComments.split('\n').length : 0));
    for (let i = 0; i < pushCount; i++) {
      children.push(new Paragraph({ children: [] }));
    }

    // Contact and Date at the bottom using left and right alignment
    if (cContact || cDate) {
      const contactLines = cContact.split('\n');
      const dateLines = cDate.split('\n');
      const maxLines = Math.max(contactLines.length, dateLines.length);

      for (let i = 0; i < maxLines; i++) {
        const leftText = contactLines[i] || '';
        const rightText = dateLines[i] || '';
        children.push(
          new Paragraph({
            tabStops: [
              {
                type: 'right',
                position: 8640,
              },
            ],
            children: [
              new TextRun({
                text: leftText,
                font: 'Courier New',
                size: 24,
              }),
              new TextRun({
                text: rightText ? '\t' + rightText : '',
                font: 'Courier New',
                size: 24,
              }),
            ],
          })
        );
      }
    }

    // Page Break
    children.push(
      new Paragraph({
        children: [new PageBreak()],
      })
    );
  } else {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: projectTitle.toUpperCase(),
            font: 'Courier New',
            size: 48,
            bold: true,
          }),
        ],
      })
    );
    children.push(
      new Paragraph({
        children: [new PageBreak()],
      })
    );
  }

  // Content
  for (const episode of structure) {
    for (const act of episode.acts || []) {
      for (const el of act.elements || []) {
        const config = ELEMENT_CONFIG[el.type] || ELEMENT_CONFIG.action;
        let content = el.content || '';
        if (!content.trim()) continue;

        if (config.uppercase) content = content.toUpperCase();
        if (el.type === 'parenthetical' && !content.startsWith('(')) {
          content = `(${content})`;
        }

        const indentTwips = Math.round(config.leftMargin * 1440); // 1 inch = 1440 twips
        const spacingBefore = (el.type === 'slugline' || el.type === 'character') ? 200 : 0;

        children.push(
          new Paragraph({
            alignment: config.rightAlign ? AlignmentType.RIGHT : AlignmentType.LEFT,
            indent: config.rightAlign ? {} : { left: indentTwips },
            spacing: { before: spacingBefore, after: 0 },
            children: [
              new TextRun({
                text: content,
                font: 'Courier New',
                size: 24, // 12pt
                bold: config.bold || false,
              }),
            ],
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 }, // Letter in twips
            margin: {
              top: 1440,
              bottom: 1440,
              left: 2160,  // 1.5 inches
              right: 1440, // 1 inch
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${projectTitle}.docx`);
}
