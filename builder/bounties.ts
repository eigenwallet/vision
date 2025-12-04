import fs from 'fs';
import path from 'path';

// GitHub API Configuration
const GITHUB_API_BASE = 'https://api.github.com/repos/eigenwallet/core';
const GITHUB_ISSUES_API = `${GITHUB_API_BASE}/issues`;

// Cache Configuration
const CACHE_FILE_NAME = '.bounties-cache.json';
const CACHE_FILE = path.join(process.cwd(), CACHE_FILE_NAME);
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

interface GitHubIssue {
  number: number;
  title: string;
  html_url: string;
  state: string;
  created_at: string;
  body: string | null;
  user: {
    login: string;
  };
  labels: Array<{
    name: string;
  }>;
}

interface BountyIssue {
  number: number;
  title: string;
  cleanTitle: string;
  bounty: string;
  htmlUrl: string;
  state: string;
  createdAt: string;
  user: string;
  body: string;
  labels: string[];
}

interface CachedData {
  timestamp: number;
  data: BountyIssue[];
}

/**
 * Check if we're in development mode
 */
function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === 'development' ||
         process.env.NODE_ENV === 'dev' ||
         process.argv.includes('--dev') ||
         process.argv.includes('--development');
}

/**
 * Load cached data if available and valid
 */
function loadCache(): BountyIssue[] | null {
  if (!fs.existsSync(CACHE_FILE)) {
    return null;
  }

  try {
    const cacheContent = fs.readFileSync(CACHE_FILE, 'utf8');
    const cached: CachedData = JSON.parse(cacheContent);

    const now = Date.now();
    if (now - cached.timestamp < CACHE_DURATION_MS) {
      console.log('Using cached bounties data...');
      return cached.data;
    } else {
      console.log('Bounties cache expired, fetching fresh data...');
      return null;
    }
  } catch (error) {
    console.log('Bounties cache corrupted, fetching fresh data...');
    return null;
  }
}

/**
 * Save data to cache
 */
function saveCache(data: BountyIssue[]): void {
  const cached: CachedData = {
    timestamp: Date.now(),
    data
  };

  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cached, null, 2));
    console.log('Bounties data cached successfully');
  } catch (error) {
    console.warn('Failed to save bounties cache:', error);
  }
}

/**
 * Fetch issues with "Bounty 💸" label from GitHub
 */
async function fetchBountyIssues(): Promise<BountyIssue[]> {
  try {
    console.log('Fetching bounty issues from GitHub...');
    const response = await fetch(`${GITHUB_ISSUES_API}?state=all&per_page=100`);

    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status}`);
    }

    const issues: GitHubIssue[] = await response.json();

    // Filter issues with "Bounty 💸" label
    const bountyIssues = issues.filter(issue =>
      issue.labels.some(label => label.name === 'Bounty 💸')
    );

    console.log(`Found ${bountyIssues.length} bounty issues`);

    // Transform issues to BountyIssue format
    return bountyIssues.map(issue => {
      // Extract bounty amount from title
      const bountyMatch = issue.title.match(/\[(?:Bounty: )?([0-9.]+) XMR\]/i);
      const bounty = bountyMatch ? bountyMatch[1] : '?';

      // Remove bounty prefix from title
      const cleanTitle = issue.title.replace(/\[(?:Bounty: )?[0-9.?]+ XMR\] /i, '');

      return {
        number: issue.number,
        title: issue.title,
        cleanTitle,
        bounty,
        htmlUrl: issue.html_url,
        state: issue.state,
        createdAt: issue.created_at,
        user: issue.user.login,
        body: issue.body || '',
        labels: issue.labels.map(label => label.name),
      };
    });
  } catch (error) {
    console.error('Error fetching bounty issues:', error);
    throw error;
  }
}

/**
 * Format date to readable format
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Extract first few lines of body for preview
 */
function extractBodyPreview(body: string): string {
  if (!body) return '';

  // Remove markdown image syntax
  body = body.replace(/!\[.*?\]\(.*?\)/g, '');

  // Remove HTML comments
  body = body.replace(/<!--[\s\S]*?-->/g, '');

  // Remove details/summary tags content
  body = body.replace(/<details>[\s\S]*?<\/details>/gi, '');

  // Remove HTML tags
  body = body.replace(/<[^>]*>/g, '');

  // Remove markdown links but keep text
  body = body.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

  // Remove ** and other markdown formatting
  body = body.replace(/\*\*/g, '');
  body = body.replace(/\*/g, '');
  body = body.replace(/_/g, '');

  // Get first 3 non-empty lines
  const lines = body.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .slice(0, 3);

  return lines.join('\n');
}

/**
 * Generate HTML for a single bounty card
 */
function generateBountyCard(issue: BountyIssue): string {
  const formattedDate = formatDate(issue.createdAt);
  const bodyPreview = extractBodyPreview(issue.body);
  const stateClass = issue.state.toLowerCase();
  const stateDisplay = issue.state.charAt(0).toUpperCase() + issue.state.slice(1);

  const bodySection = bodyPreview
    ? `
    <div class="bounty-description">
        <p>${bodyPreview}</p>
    </div>`
    : '';

  const labelsHtml = issue.labels
    .map(label => `<span class="label">${label}</span>`)
    .join('\n        ');

  return `<div class="bounty-card">
    <div class="bounty-header">
        <div>
            <div class="bounty-title">
                <a href="${issue.htmlUrl}" style="color: inherit; text-decoration: none;">
                    ${issue.cleanTitle}
                </a>
            </div>
            <div class="bounty-meta">
                Issue #${issue.number} • Opened by ${issue.user} on ${formattedDate}
            </div>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
            <span class="bounty-amount">${issue.bounty} XMR</span>
            <span class="bounty-status ${stateClass}">${stateDisplay}</span>
        </div>
    </div>${bodySection}
    <div class="bounty-labels">
        ${labelsHtml}
    </div>
    <div style="margin-top: 1rem;">
        <a href="${issue.htmlUrl}" style="font-weight: 500;">View on GitHub →</a>
    </div>
</div>`;
}

/**
 * Generate CSS styles for bounties page
 */
function generateStyles(): string {
  return `<style>
.bounty-card {
    border: 1px solid #ddd;
    padding: 1.5rem;
    margin-bottom: 2rem;
    border-radius: 4px;
    background-color: var(--pre-bg-color, #f5f5f5);
}

.bounty-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.bounty-amount {
    background-color: #4CAF50;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-weight: bold;
    font-size: 1.1em;
}

.bounty-status {
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-size: 0.9em;
    font-weight: 500;
}

.bounty-status.open {
    background-color: #28a745;
    color: white;
}

.bounty-status.closed {
    background-color: #6c757d;
    color: white;
}

.bounty-title {
    font-size: 1.3em;
    font-weight: bold;
    margin-bottom: 0.5rem;
}

.bounty-meta {
    font-size: 0.9em;
    color: #666;
    margin-bottom: 1rem;
}

.bounty-description {
    margin: 1rem 0;
    padding: 1rem;
    background-color: white;
    border-left: 3px solid #4CAF50;
    white-space: pre-line;
}

.bounty-labels {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 1rem;
}

.label {
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    font-size: 0.85em;
    background-color: #e0e0e0;
    color: #333;
}

@media (max-width: 600px) {
    .bounty-header {
        flex-direction: column;
    }
}
</style>`;
}

/**
 * Generate navigation for bounties page
 */
function generateNavigation(): string {
  return `
  <nav style="text-align: center; margin: 0.25rem 0 0.25rem 0; padding: 0.25rem 0;">
    <a href="index.html" style="text-decoration: none; color: inherit; margin: 0 1rem; font-weight: 500;">Vision</a>
    <a href="download.html" style="text-decoration: none; color: inherit; margin: 0 1rem; font-weight: 500;">Download</a>
    <a href="statistics.html" style="text-decoration: none; color: inherit; margin: 0 1rem; font-weight: 500;">Statistics</a>
    <a href="changelog.html" style="text-decoration: none; color: inherit; margin: 0 1rem; font-weight: 500;">Changelog</a>
    <a href="bounties.html" style="text-decoration: underline; color: inherit; margin: 0 1rem; font-weight: 500;">Bounties</a>
  </nav>
  <hr style="margin: 0.5rem 0 2rem 0;" />`;
}

/**
 * Generate complete HTML page for bounties
 */
async function generateBountiesPageHtml(issues: BountyIssue[]): Promise<string> {
  const bountyCardsHtml = issues.map(issue => generateBountyCard(issue)).join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="google-site-verification" content="tm5Y6ZNTf-lBqbwniGjQPv1q02o2TuUQZ9GTYa4SMLg" />
  <title>eigenwallet — Bug Bounties</title>
  <link rel="stylesheet" href="latex.css" />
  <link rel="stylesheet" href="prism/prism.css" />
  <link rel="icon" type="image/png" href="imgs/icon.png" />
</head>

<body id="top" class="text-justify">
  <header style="text-align: center; display: flex; justify-content: center; align-items: center; gap: 0.5rem; position: relative; padding: 1rem 0;">
    <a href="index.html" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); text-decoration: none; font-size: 1.5em; color: inherit; padding: 0.5rem;">&lt;</a>
    <a href="index.html" style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: 0.5rem;">
      <img src="imgs/icon.svg" alt="eigenwallet logo" style="height: 5em;" />
    </a>
  </header>

  <main>
    <article>
      <hr style="margin: 0.5rem 0;" />${generateNavigation()}
      ${generateStyles()}

<h2>Bug Bounties</h2>

${bountyCardsHtml}

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
 * Build bounties page and write to dist directory
 */
export async function buildBountiesPage(distDir: string = 'dist'): Promise<void> {
  try {
    let issues: BountyIssue[];

    // Try cache in development mode
    if (isDevelopmentMode()) {
      const cachedData = loadCache();
      if (cachedData) {
        issues = cachedData;
      } else {
        issues = await fetchBountyIssues();
        saveCache(issues);
      }
    } else {
      // Always fetch fresh data in production
      issues = await fetchBountyIssues();
    }

    const html = await generateBountiesPageHtml(issues);
    const outputPath = path.join(distDir, 'bounties.html');
    fs.writeFileSync(outputPath, html);
    console.log(`Successfully generated ${outputPath}`);
  } catch (error) {
    console.error('Error building bounties page:', error);
    throw error;
  }
}
