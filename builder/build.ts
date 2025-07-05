import { marked } from 'marked';
import fs from 'fs';
import path from 'path';

interface FootnoteMatch {
  num: string;
  content: string;
}

interface AbstractMatch {
  content: string;
  previousText: string;
  link: string;
  linkText: string;
}

// Configure marked to handle footnotes and math
marked.setOptions({
  breaks: false,
  gfm: true,
  headerIds: true,
  mangle: false,
  pedantic: false,
  sanitize: false,
  silent: false,
  smartLists: true,
  smartypants: false,
  xhtml: false,
});

/**
 * Read and process markdown file
 */
function readMarkdownFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading markdown file: ${error}`);
    process.exit(1);
  }
}

/**
 * Process internal links to other pages
 */
function processInternalLinks(content: string): string {
  // Convert markdown links to other .md files to .html
  content = content.replace(/href="([^"]+)\.md"/g, 'href="$1.html"');

  // Support [[page]] syntax for easy linking
  content = content.replace(/\[\[([^\]]+)\]\]/g, (match, pageName) => {
    const fileName = pageName.toLowerCase().replace(/\s+/g, '-');
    return `<a href="${fileName}.html">${pageName}</a>`;
  });

  return content;
}

/**
 * Convert markdown to HTML and post-process footnotes
 */
function convertMarkdownToHtml(markdown: string): string {
  let htmlContent = marked(markdown);

  // Post-process to handle footnotes
  htmlContent = htmlContent.replace(
    /\^\[(\d+)\]/g,
    '<sup><a href="#fn$1" id="ref$1">$1</a></sup>'
  );

  // Process internal links
  htmlContent = processInternalLinks(htmlContent);

  return htmlContent;
}

/**
 * Process footnotes from the references section
 */
function processFootnotes(content: string): string {
  const referencesRegex = /<h2>References<\/h2>\n([\s\S]*?)$/;
  const referencesMatch = content.match(referencesRegex);

  if (!referencesMatch) {
    return content;
  }

  const referencesText = referencesMatch[1];
  const footnoteRegex = /<p>\[(\d+)\]: ([\s\S]*?)<\/p>/g;
  let footnotes = '<div class="footnotes">\n';

  let match: RegExpExecArray | null;
  while ((match = footnoteRegex.exec(referencesText)) !== null) {
    const footnote: FootnoteMatch = {
      num: match[1],
      content: match[2].trim(),
    };
    footnotes += `  <p id="fn${footnote.num}">\n    ${footnote.num}. ${footnote.content}\n    <a href="#ref${footnote.num}" title="Jump back to footnote ${footnote.num} in the text.">↩</a>\n  </p>\n`;
  }
  footnotes += '</div>';

  return content.replace(referencesRegex, footnotes);
}

/**
 * Extract abstract content and clean main content
 */
function extractAbstractAndMainContent(content: string): {
  abstract: string;
  main: string;
} {
  const abstractMatch = content.match(
    /<h2>Abstract<\/h2>\s*<p><strong><em>eigenwallet<\/em><\/strong> (.*?)<\/p>\s*<p>(.*?)<\/p>\s*<p><a href="(.*?)">(.*?)<\/a><\/p>/s
  );

  let abstractContent = '';
  let mainContent = content;

  if (abstractMatch) {
    const abstract: AbstractMatch = {
      content: abstractMatch[1],
      previousText: abstractMatch[2],
      link: abstractMatch[3],
      linkText: abstractMatch[4],
    };

    abstractContent = `<p><strong><em>eigenwallet</em></strong> ${abstract.content}<br>${abstract.previousText}<br><a href="${abstract.link}">${abstract.linkText}</a>.</p>`;

    // Remove the abstract section from the main content
    mainContent = content.replace(
      /<h1><strong>eigenwallet<\/strong><\/h1>\s*<h2>Abstract<\/h2>\s*<p>.*?<\/p>\s*<p>.*?<\/p>\s*<p><a href=".*?">.*?<\/a><\/p>\s*<hr>/s,
      ''
    );
  } else {
    // For pages without abstract, remove any standalone h1 title at the beginning
    mainContent = content.replace(
      /^<h1><strong>eigenwallet<\/strong><\/h1>\s*/,
      ''
    );
  }

  return { abstract: abstractContent, main: mainContent };
}

/**
 * Generate complete HTML document
 */
function generateHtmlDocument(
  abstractContent: string,
  mainContent: string,
  fileName: string
): string {
  const abstractSection = abstractContent
    ? `
  <div class="abstract">
    <h2>Abstract</h2>
    ${abstractContent}
  </div>`
    : '';

  const isIndexPage = fileName === 'index.html';
  const backButton = !isIndexPage 
    ? `<a href="index.html" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); text-decoration: none; font-size: 1.5em; color: inherit; padding: 0.5rem;">&lt;</a>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="google-site-verification" content="tm5Y6ZNTf-lBqbwniGjQPv1q02o2TuUQZ9GTYa4SMLg" />
  <title>eigenwallet — The Monero wallet for the future</title>
  <link rel="stylesheet" href="latex.css" />
  <link rel="stylesheet" href="prism/prism.css" />
  <link rel="icon" type="image/png" href="imgs/icon.png" />
</head>

<body id="top" class="text-justify">
  <header style="text-align: center; display: flex; justify-content: center; align-items: center; gap: 0.5rem; position: relative; padding: 1rem 0;">
    ${backButton}
    <a href="index.html" style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: 0.5rem;">
      <h1 style="font-size: 2em; margin-bottom: 0.5rem;"><strong>eigenwallet</strong></h1>
      <img src="imgs/icon.png" alt="eigenwallet logo" style="width: 2em; height: 2em;" />
    </a>
  </header>
${abstractSection}

  <main>
    <article>
      <hr style="margin: 2rem 0;" />
      ${mainContent}
    </article>
  </main>

  <script>
    MathJax = {
      tex: {
        inlineMath: [['$', '$'],],
      },
    }
  </script>
  <script type="text/javascript" id="MathJax-script" async
  src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js">
  </script>
</body>

</html>`;
}

/**
 * Write HTML content to file
 */
function writeHtmlFile(
  content: string,
  outputPath: string,
  inputPath: string
): void {
  try {
    fs.writeFileSync(outputPath, content);
    console.log(`Successfully generated ${outputPath} from ${inputPath}`);
  } catch (error) {
    console.error(`Error writing HTML file: ${error}`);
    process.exit(1);
  }
}

/**
 * Build a single markdown file to HTML
 */
function buildFile(inputPath: string, outputPath: string): void {
  // Read markdown file
  const markdownContent = readMarkdownFile(inputPath);

  // Convert markdown to HTML
  const htmlContent = convertMarkdownToHtml(markdownContent);

  // Process footnotes
  const processedContent = processFootnotes(htmlContent);

  // Extract abstract and main content
  const { abstract, main } = extractAbstractAndMainContent(processedContent);

  // Generate complete HTML document
  const outputFileName = path.basename(outputPath);
  const fullHTML = generateHtmlDocument(abstract, main, outputFileName);

  // Write to output file
  writeHtmlFile(fullHTML, outputPath, inputPath);
}

/**
 * Discover all markdown files in content directory
 */
function discoverMarkdownFiles(): string[] {
  try {
    const contentDir = 'content';
    const files = fs.readdirSync(contentDir);
    return files
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(contentDir, file));
  } catch (error) {
    console.error(`Error reading content directory: ${error}`);
    return [];
  }
}

/**
 * Convert input path to output path
 */
function getOutputPath(inputPath: string): string {
  const fileName = path.basename(inputPath, '.md');
  const outputFileName =
    fileName === 'index' ? 'index.html' : `${fileName}.html`;
  return path.join('dist', outputFileName);
}

/**
 * Copy static assets to dist directory
 */
function copyStaticAssets(): void {
  const staticDirs = ['imgs', 'fonts', 'lang', 'prism'];
  const staticFiles = ['latex.css'];

  staticDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const destDir = path.join('dist', dir);
      if (fs.existsSync(destDir)) {
        fs.rmSync(destDir, { recursive: true, force: true });
      }

      // Copy directory but skip if it's trying to copy into itself
      const srcPath = path.resolve(dir);
      const destPath = path.resolve(destDir);

      if (!destPath.startsWith(srcPath)) {
        fs.cpSync(dir, destDir, { recursive: true });
        console.log(`Copied ${dir}/ to dist/${dir}/`);
      }
    }
  });

  staticFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const destFile = path.join('dist', file);
      fs.copyFileSync(file, destFile);
      console.log(`Copied ${file} to dist/${file}`);
    }
  });
}

/**
 * Main build process
 */
function main(): void {
  // Ensure dist directory exists
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }

  // Copy static assets
  copyStaticAssets();

  // Discover all markdown files
  const markdownFiles = discoverMarkdownFiles();

  if (markdownFiles.length === 0) {
    console.log('No markdown files found in content directory');
    return;
  }

  // Build each markdown file
  markdownFiles.forEach(inputPath => {
    const outputPath = getOutputPath(inputPath);
    buildFile(inputPath, outputPath);
  });
}

// Run the build process
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as buildMarkdownToHtml };
