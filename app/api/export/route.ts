import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/export
 * Returns the document as formatted HTML suitable for browser print-to-PDF.
 * The client opens this in a new window and uses window.print() for PDF.
 * Also supports plain text fallback.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { document, sessionId, format } = body;

    if (!document || typeof document !== 'string') {
      return NextResponse.json(
        { error: 'document field is required and must be a string' },
        { status: 400 }
      );
    }

    // Plain text download
    if (format === 'text') {
      const textBuffer = new TextEncoder().encode(document);
      return new Response(textBuffer, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="complaint-${sessionId || 'document'}.txt"`,
        },
      });
    }

    // HTML for print-to-PDF (default)
    const html = generatePrintableHtml(document, sessionId);
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

/**
 * Convert markdown-like document to printable HTML with proper legal document styling.
 */
function generatePrintableHtml(content: string, sessionId?: string): string {
  // Convert markdown to HTML (basic conversion)
  let htmlContent = content
    // Headers
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Numbered lists
    .replace(/^\d+\.\s(.*$)/gm, '<li>$1</li>')
    // Line breaks to paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap in paragraphs
  htmlContent = `<p>${htmlContent}</p>`;
  // Fix list items
  htmlContent = htmlContent.replace(/(<li>.*?<\/li>)+/g, '<ol>$&</ol>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Legal Complaint - ${sessionId || 'Document'}</title>
  <style>
    @page {
      size: A4;
      margin: 2.5cm;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 13pt;
      line-height: 1.6;
      color: #000;
      max-width: 21cm;
      margin: 0 auto;
      padding: 2cm;
    }
    h1 {
      text-align: center;
      font-size: 16pt;
      text-transform: uppercase;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    h2 {
      font-size: 14pt;
      margin-top: 20px;
      text-decoration: underline;
    }
    h3 {
      font-size: 13pt;
      margin-top: 15px;
    }
    p {
      text-align: justify;
      margin-bottom: 10px;
    }
    ol {
      margin-left: 20px;
    }
    li {
      margin-bottom: 8px;
      text-align: justify;
    }
    hr {
      border: none;
      border-top: 1px solid #000;
      margin: 20px 0;
    }
    strong {
      font-weight: bold;
    }
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: #1a56db;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .print-btn:hover {
      background: #1e40af;
    }
    @media print {
      .print-btn { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">📄 Save as PDF</button>
  ${htmlContent}
  <script>
    // Auto-trigger print dialog after a short delay
    setTimeout(() => {
      // Don't auto-print, let user click the button
    }, 500);
  </script>
</body>
</html>`;
}
