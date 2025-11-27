import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates a static book from a book directory
 * @param {string} bookPath - Path to the book directory
 * @param {string} outputPath - Path where the static book should be saved
 */
async function generateStaticBook(bookPath, outputPath) {
  // Read metadata
  const metadataPath = path.join(bookPath, 'metadata.json');
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

  // Start building the static book content
  let staticBook = `# ${metadata.name}\n\n`;
  
  if (metadata.description) {
    staticBook += `${metadata.description}\n\n`;
  }
  
  if (metadata.author) {
    staticBook += `**Author:** ${metadata.author}\n\n`;
  }

  if (metadata.originalBook) {
    staticBook += `## Source Book\n\n`;
    staticBook += `**Title:** ${metadata.originalBook.title}\n`;
    staticBook += `**Author:** ${metadata.originalBook.author}\n`;
    if (metadata.originalBook.publisher) {
      staticBook += `**Publisher:** ${metadata.originalBook.publisher}\n`;
    }
    if (metadata.originalBook.isbn) {
      staticBook += `**ISBN:** ${metadata.originalBook.isbn}\n`;
    }
    if (metadata.originalBook.url) {
      staticBook += `**URL:** ${metadata.originalBook.url}\n`;
    }
    staticBook += `\n---\n\n`;
  }

  staticBook += `**Generated:** ${new Date().toISOString()}\n\n`;
  staticBook += `---\n\n`;

  // Table of Contents
  staticBook += `# Table of Contents\n\n`;
  let tocEntryNumber = 1;
  const tocEntries = [];

  if (metadata.parts && Array.isArray(metadata.parts)) {
    // Process parts structure
    for (const part of metadata.parts) {
      staticBook += `## ${part.title}\n`;
      if (part.description) {
        staticBook += `${part.description}\n\n`;
      }

      for (const module of part.modules) {
        const modulePath = path.join(bookPath, module.path);
        if (fs.existsSync(modulePath)) {
          const moduleNumber = tocEntryNumber++;
          const moduleTitle = module.title || path.basename(module.path, '.md');
          tocEntries.push({
            number: moduleNumber,
            title: moduleTitle,
            id: module.id,
            path: modulePath
          });
          staticBook += `${moduleNumber}. ${moduleTitle}\n`;
          if (module.description) {
            staticBook += `   ${module.description}\n`;
          }
        }
      }
      staticBook += `\n`;
    }
  } else if (metadata.modules && Array.isArray(metadata.modules)) {
    // Process flat modules structure (legacy)
    for (const module of metadata.modules) {
      const modulePath = path.join(bookPath, module.path);
      if (fs.existsSync(modulePath)) {
        const moduleNumber = tocEntryNumber++;
        const moduleTitle = module.title || path.basename(module.path, '.md');
        tocEntries.push({
          number: moduleNumber,
          title: moduleTitle,
          id: module.id,
          path: modulePath
        });
        staticBook += `${moduleNumber}. ${moduleTitle}\n`;
        if (module.description) {
          staticBook += `   ${module.description}\n`;
        }
      }
    }
  }

  staticBook += `\n---\n\n`;

  // Process each module and add its content
  if (metadata.parts && Array.isArray(metadata.parts)) {
    let moduleNumber = 1;
    for (const part of metadata.parts) {
      // Format part title better (extract part number from ID and convert to Roman numeral)
      const partNum = part.id.replace('part-', '');
      const romanNum = toRomanNumeral(parseInt(partNum) || 1);
      staticBook += `\n# PART ${romanNum}\n\n`;
      staticBook += `## ${part.title}\n\n`;
      if (part.description) {
        staticBook += `*${part.description}*\n\n`;
      }
      staticBook += `---\n\n`;

      for (const module of part.modules) {
        const modulePath = path.join(bookPath, module.path);
        if (fs.existsSync(modulePath)) {
          try {
            const moduleContent = fs.readFileSync(modulePath, 'utf-8');
            const moduleTitle = module.title || path.basename(module.path, '.md');
            
            staticBook += `\n## Module ${moduleNumber}: ${moduleTitle}\n\n`;
            if (module.description) {
              staticBook += `*${module.description}*\n\n`;
            }
            staticBook += `**Module ID:** ${module.id}\n\n`;
            staticBook += `---\n\n`;

            // Process module content - handle relative image paths
            let processedContent = moduleContent;
            
            // If there are images referenced, we need to note them
            // For now, we'll preserve the markdown structure
            staticBook += processedContent;
            staticBook += `\n\n---\n\n`;
            
            moduleNumber++;
          } catch (error) {
            console.error(`Error reading module ${module.path}:`, error);
            staticBook += `\n*[Error: Could not load module content]*\n\n---\n\n`;
          }
        } else {
          console.warn(`Module file not found: ${modulePath}`);
          staticBook += `\n## Module ${moduleNumber}: ${module.title}\n\n`;
          staticBook += `*[Module file not found: ${module.path}]*\n\n---\n\n`;
          moduleNumber++;
        }
      }
    }
  } else if (metadata.modules && Array.isArray(metadata.modules)) {
    // Process flat modules structure (legacy)
    let moduleNumber = 1;
    for (const module of metadata.modules) {
      const modulePath = path.join(bookPath, module.path);
      if (fs.existsSync(modulePath)) {
        try {
          const moduleContent = fs.readFileSync(modulePath, 'utf-8');
          const moduleTitle = module.title || path.basename(module.path, '.md');
          
          staticBook += `\n## Module ${moduleNumber}: ${moduleTitle}\n\n`;
          if (module.description) {
            staticBook += `*${module.description}*\n\n`;
          }
          staticBook += `**Module ID:** ${module.id}\n\n`;
          staticBook += `---\n\n`;

          staticBook += moduleContent;
          staticBook += `\n\n---\n\n`;
          
          moduleNumber++;
        } catch (error) {
          console.error(`Error reading module ${module.path}:`, error);
          staticBook += `\n*[Error: Could not load module content]*\n\n---\n\n`;
        }
      } else {
        console.warn(`Module file not found: ${modulePath}`);
        staticBook += `\n## Module ${moduleNumber}: ${module.title}\n\n`;
        staticBook += `*[Module file not found: ${module.path}]*\n\n---\n\n`;
        moduleNumber++;
      }
    }
  }

  // Write the static book to file
  fs.writeFileSync(outputPath, staticBook, 'utf-8');
  console.log(`✅ Static book generated successfully at: ${outputPath}`);
  console.log(`📊 Total modules processed: ${tocEntries.length}`);
  
  return { markdownPath: outputPath, markdownContent: staticBook };
}

/**
 * Converts number to Roman numeral
 */
function toRomanNumeral(num) {
  if (num < 1 || num > 3999) {
    return num.toString(); // Fallback for out-of-range numbers
  }
  
  const romanNumerals = [
    { value: 1000, numeral: 'M' },
    { value: 900, numeral: 'CM' },
    { value: 500, numeral: 'D' },
    { value: 400, numeral: 'CD' },
    { value: 100, numeral: 'C' },
    { value: 90, numeral: 'XC' },
    { value: 50, numeral: 'L' },
    { value: 40, numeral: 'XL' },
    { value: 10, numeral: 'X' },
    { value: 9, numeral: 'IX' },
    { value: 5, numeral: 'V' },
    { value: 4, numeral: 'IV' },
    { value: 1, numeral: 'I' }
  ];
  
  let result = '';
  for (const { value, numeral } of romanNumerals) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
}

/**
 * Converts markdown to PDF using puppeteer
 */
async function convertToPDFWithPuppeteer(markdownContent, pdfPath) {
  try {
    console.log(`\n📄 Converting markdown to PDF using puppeteer...`);
    
    // Try to import puppeteer and markdown-it
    let puppeteer, MarkdownIt;
    try {
      puppeteer = (await import('puppeteer')).default;
      MarkdownIt = (await import('markdown-it')).default;
    } catch (importError) {
      console.warn(`⚠️  Puppeteer or markdown-it not available. Install with: npm install puppeteer markdown-it`);
      return false;
    }
    
    // Render markdown to HTML
    const md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: false
    });
    
    let htmlContent = md.render(markdownContent);
    
    // Post-process HTML to add classes and improve structure
    // Add class to first h1 (book title)
    htmlContent = htmlContent.replace(/<h1>([^<]+)<\/h1>/, (match, title) => {
      if (title.includes('AI Agents') || title.length > 30) {
        return `<h1 class="book-title">${title}</h1>`;
      }
      return match;
    });
    
    // Add module-title class to module headings and wrap descriptions
    htmlContent = htmlContent.replace(/<h2>Module \d+: ([^<]+)<\/h2>/g, '<h2 class="module-title">$1</h2>');
    
    // Wrap module descriptions (first paragraph after module title) with styling
    htmlContent = htmlContent.replace(
      /(<h2 class="module-title">[^<]+<\/h2>)\s*(<p><em>([^<]+)<\/em><\/p>)/g,
      '<h2 class="module-title">$1</h2><p style="font-style: italic; color: #64748b; background-color: #f8fafc; padding: 8pt 12pt; margin-bottom: 18pt; border-left: 3pt solid #3b82f6; border-radius: 0 4pt 4pt 0;">$3</p>'
    );
    
    // Style part headers - match "PART I", "PART II", "PART III", etc.
    htmlContent = htmlContent.replace(
      /<h1>PART ([IVX]+)<\/h1>\s*<h2>([^<]+)<\/h2>/g,
      '<h1>PART $1</h1><h2 class="part-title">$2</h2>'
    );
    
    // Extract book title for headers
    const titleMatch = markdownContent.match(/^# (.+)$/m);
    const bookTitle = titleMatch ? titleMatch[1] : 'Agentic Design Patterns';
    
    const cssContent = `
@page {
  size: A4;
}

* {
  box-sizing: border-box;
}

body {
  font-family: 'Crimson Pro', 'Georgia', 'Palatino', 'Book Antiqua', 'Times New Roman', serif;
  font-size: 11.5pt;
  line-height: 1.8;
  color: #2c3e50;
  max-width: 100%;
  text-align: justify;
  hyphens: auto;
  orphans: 3;
  widows: 3;
  font-feature-settings: "kern" 1, "liga" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Typography Hierarchy */
h1 {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  font-size: 32pt;
  font-weight: 700;
  margin-top: 0;
  margin-bottom: 18pt;
  page-break-after: always;
  color: #1a202c;
  letter-spacing: -0.8pt;
  line-height: 1.2;
  text-align: center;
  padding-top: 60pt;
  font-feature-settings: "kern" 1;
}

h1.book-title {
  font-size: 44pt;
  margin-bottom: 12pt;
  color: #1a202c;
  text-transform: none;
  letter-spacing: -1.2pt;
  font-weight: 700;
}

h1.book-title + p {
  text-align: center;
  font-size: 14pt;
  color: #64748b;
  margin-bottom: 40pt;
  font-style: italic;
}

/* Part headers - PART I, PART II, etc. */
h1:not(.book-title) {
  page-break-before: always;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 48pt;
  font-weight: 700;
  color: #2563eb;
  text-align: center;
  margin-top: 80pt;
  margin-bottom: 20pt;
  padding: 0;
  border: none;
  letter-spacing: 4pt;
  text-transform: uppercase;
  opacity: 0.9;
}

/* Part title (h2 immediately following PART header) */
h1:not(.book-title) + h2,
h2.part-title {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 32pt;
  font-weight: 600;
  color: #1e40af;
  text-align: center;
  margin-top: 0;
  margin-bottom: 40pt;
  padding: 0;
  border: none;
  letter-spacing: -0.5pt;
}

/* Part description (paragraph after part title h2) */
h1:not(.book-title) + h2 + p,
h2.part-title + p {
  text-align: center;
  font-size: 14pt;
  color: #64748b;
  font-style: italic;
  margin: 0 auto 40pt auto;
  max-width: 500pt;
  padding: 0;
  background: none;
  border: none;
}

/* Reset regular h2 styling when it's a part title */
h2.part-title {
  border-bottom: none;
  padding-bottom: 0;
}

h2 {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  font-size: 20pt;
  font-weight: 600;
  margin-top: 32pt;
  margin-bottom: 12pt;
  page-break-after: avoid;
  color: #1e40af;
  letter-spacing: -0.3pt;
  line-height: 1.3;
  text-align: left;
  border-bottom: 2pt solid #e2e8f0;
  padding-bottom: 8pt;
}

h2.module-title {
  font-size: 24pt;
  margin-top: 40pt;
  color: #1e3a8a;
  border-bottom: 3pt solid #3b82f6;
  padding-bottom: 12pt;
}

h3 {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  font-size: 15pt;
  font-weight: 600;
  margin-top: 24pt;
  margin-bottom: 10pt;
  page-break-after: avoid;
  color: #334155;
  letter-spacing: -0.2pt;
  line-height: 1.4;
}

h4 {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  font-size: 12.5pt;
  font-weight: 600;
  margin-top: 18pt;
  margin-bottom: 8pt;
  page-break-after: avoid;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5pt;
  font-size: 11pt;
}

/* Paragraphs */
p {
  margin-top: 0;
  margin-bottom: 12pt;
  text-align: justify;
  text-indent: 0;
  orphans: 3;
  widows: 3;
}

/* First paragraph after heading - no indent */
h1 + p, h2 + p, h3 + p, h4 + p {
  text-indent: 0;
}

/* Lists */
ul, ol {
  margin-top: 12pt;
  margin-bottom: 12pt;
  padding-left: 24pt;
}

li {
  margin-top: 6pt;
  margin-bottom: 6pt;
  line-height: 1.7;
}

li p {
  margin-bottom: 6pt;
}

/* Code */
code {
  font-family: 'JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
  font-size: 9.5pt;
  background-color: #f8fafc;
  color: #e11d48;
  padding: 2pt 5pt;
  border-radius: 3pt;
  border: 1pt solid #e2e8f0;
  font-weight: 500;
  font-feature-settings: "liga" 0;
}

pre {
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border-left: 4pt solid #3b82f6;
  border-top: 1pt solid #e2e8f0;
  border-bottom: 1pt solid #e2e8f0;
  border-right: 1pt solid #e2e8f0;
  border-radius: 0 6pt 6pt 0;
  padding: 16pt;
  margin: 18pt 0;
  overflow-x: auto;
  page-break-inside: avoid;
  box-shadow: 0 2pt 4pt rgba(0,0,0,0.05);
}

pre code {
  font-family: 'JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
  background-color: transparent;
  color: #1e293b;
  padding: 0;
  border: none;
  font-weight: 400;
  font-size: 9pt;
  line-height: 1.6;
  font-feature-settings: "liga" 0;
}

/* Blockquotes */
blockquote {
  border-left: 4pt solid #3b82f6;
  background-color: #f8fafc;
  margin: 18pt 0;
  margin-left: 0;
  padding: 12pt 18pt;
  color: #475569;
  font-style: italic;
  border-radius: 0 4pt 4pt 0;
  box-shadow: 0 1pt 3pt rgba(0,0,0,0.05);
}

blockquote p {
  margin-bottom: 0;
}

blockquote p:last-child {
  margin-bottom: 0;
}

/* Tables */
table {
  border-collapse: collapse;
  width: 100%;
  margin: 18pt 0;
  page-break-inside: avoid;
  font-size: 10pt;
  box-shadow: 0 2pt 4pt rgba(0,0,0,0.05);
  border-radius: 4pt;
  overflow: hidden;
}

th, td {
  border: 1pt solid #e2e8f0;
  padding: 10pt 12pt;
  text-align: left;
}

th {
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  text-transform: uppercase;
  font-size: 9pt;
  letter-spacing: 0.5pt;
}

tr:nth-child(even) {
  background-color: #f8fafc;
}

tr:hover {
  background-color: #f1f5f9;
}

/* Horizontal Rules */
hr {
  border: none;
  border-top: 2pt solid #e2e8f0;
  margin: 32pt 0;
  width: 100pt;
  margin-left: auto;
  margin-right: auto;
}

/* Links */
a {
  color: #2563eb;
  text-decoration: none;
  border-bottom: 1pt solid #bfdbfe;
  transition: all 0.2s;
}

a:hover {
  color: #1d4ed8;
  border-bottom-color: #2563eb;
}

/* Images */
img {
  max-width: 100%;
  height: auto;
  page-break-inside: avoid;
  margin: 18pt auto;
  display: block;
  border-radius: 4pt;
  box-shadow: 0 4pt 8pt rgba(0,0,0,0.1);
}

/* Table of Contents */
h1:first-of-type {
  page-break-after: always;
}

/* Module separators */
hr + h2 {
  margin-top: 0;
}

/* Special styling for module descriptions */
h2.module-title + p {
  font-size: 12pt;
  color: #64748b;
  font-style: italic;
  margin-bottom: 18pt;
  text-align: left;
  padding: 8pt 12pt;
  background-color: #f8fafc;
  border-left: 3pt solid #3b82f6;
  border-radius: 0 4pt 4pt 0;
}

/* Source book info section */
h2 + p {
  /* First paragraph after h2 for source book info styling */
}

/* Page breaks */
h1, h2 {
  page-break-after: avoid;
  orphans: 3;
  widows: 3;
}

/* Avoid breaking code blocks */
pre, blockquote, table {
  page-break-inside: avoid;
}

/* Better spacing for first elements */
body > *:first-child {
  margin-top: 0;
}
`;
      
    const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>${cssContent}</style>
</head>
<body>
${htmlContent}
</body>
</html>`;
    
    // Launch browser and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(fullHTML, { waitUntil: 'networkidle0' });
    
    // Create professional header and footer
    const headerTemplate = `
      <div style="font-size: 9pt; color: #64748b; width: 100%; padding: 0 10pt; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-weight: 500;">
        <div style="float: left;">${bookTitle}</div>
        <div style="float: right;"></div>
        <div style="clear: both;"></div>
      </div>
    `;
    
    const footerTemplate = `
      <div style="font-size: 9pt; color: #64748b; width: 100%; text-align: center; padding-top: 8pt; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-weight: 500;">
        <span class="pageNumber"></span>
      </div>
    `;
    
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      margin: {
        top: '3cm',
        bottom: '2.5cm',
        left: '2.5cm',
        right: '2.5cm'
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: headerTemplate,
      footerTemplate: footerTemplate
    });
    
    await browser.close();
    console.log(`✅ PDF generated successfully at: ${pdfPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error with puppeteer:`, error.message);
    return false;
  }
}

/**
 * Converts markdown to PDF with nice formatting
 */
async function convertToPDF(markdownPath, pdfPath, markdownContent) {
  try {
    console.log(`\n📄 Converting markdown to PDF...`);
    
    // First try puppeteer (if available)
    const puppeteerSuccess = await convertToPDFWithPuppeteer(markdownContent, pdfPath);
    if (puppeteerSuccess) {
      return true;
    }
    
    // Fallback: Try using npx md-to-pdf (doesn't require installation)
    try {
      const mdToPdfPath = path.join(path.dirname(markdownPath), 'md-to-pdf-temp.mdcss');
      const cssContent = `@page {
  margin: 2.5cm 2cm;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #333;
}`;
      
      fs.writeFileSync(mdToPdfPath, cssContent, 'utf-8');
      
      // Use npx to run md-to-pdf without installation
      const command = `npx --yes md-to-pdf "${markdownPath}" --pdf-options '{"format":"A4","margin":{"top":"2.5cm","bottom":"2.5cm","left":"2cm","right":"2cm"},"printBackground":true}' --stylesheet "${mdToPdfPath}" --as-html`;
      
      execSync(command, { stdio: 'inherit', cwd: path.dirname(markdownPath) });
      
      // md-to-pdf creates a PDF with the same name as the markdown file but with .pdf extension
      const autoPdfPath = markdownPath.replace(/\.md$/, '.pdf');
      if (fs.existsSync(autoPdfPath)) {
        if (autoPdfPath !== pdfPath) {
          fs.copyFileSync(autoPdfPath, pdfPath);
          fs.unlinkSync(autoPdfPath);
        }
        fs.unlinkSync(mdToPdfPath);
        console.log(`✅ PDF generated successfully at: ${pdfPath}`);
        return true;
      }
    } catch (npxError) {
      // npx failed, provide instructions
      console.warn(`⚠️  Could not use npx md-to-pdf: ${npxError.message}`);
      console.log(`\n📝 To generate PDF, you can:`);
      console.log(`   1. Install dependencies: npm install puppeteer markdown-it`);
      console.log(`   2. Then run the script again`);
      console.log(`   3. Or install md-to-pdf globally: npm install -g md-to-pdf`);
      console.log(`   4. Then run: md-to-pdf "${markdownPath}"`);
      console.log(`   5. Or use pandoc: pandoc "${markdownPath}" -o "${pdfPath}" --pdf-engine=xelatex`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error converting to PDF:`, error);
    return false;
  }
}

// Main execution
const bookPath = process.argv[2] || path.join(__dirname, '..', 'books', 'agentic-patterns-principles-practices');
const outputMdPath = process.argv[3] || path.join(__dirname, '..', 'books', 'agentic-patterns-principles-practices', 'static-book.md');
const outputPdfPath = outputMdPath.replace(/\.md$/, '.pdf');
const generatePdf = !process.argv.includes('--no-pdf');

if (!fs.existsSync(bookPath)) {
  console.error(`❌ Book directory not found: ${bookPath}`);
  process.exit(1);
}

generateStaticBook(bookPath, outputMdPath)
  .then(async (result) => {
    if (generatePdf) {
      await convertToPDF(outputMdPath, outputPdfPath, result.markdownContent);
    } else {
      console.log(`\n📝 Markdown file generated. To generate PDF, run without --no-pdf flag.`);
    }
  })
  .catch(error => {
    console.error('❌ Error generating static book:', error);
    process.exit(1);
  });

