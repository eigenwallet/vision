import fs from 'fs';
import path from 'path';

// API and Repository Configuration
const GITHUB_API_BASE = 'https://api.github.com/repos/eigenwallet/core';
const GITHUB_RELEASES_API = `${GITHUB_API_BASE}/releases/latest`;
const GITHUB_RELEASES_BASE = 'https://github.com/eigenwallet/core/releases/download';
const GITHUB_ARCHIVE_BASE = 'https://github.com/eigenwallet/core/archive';
const SIGNING_KEY_URL = 'https://github.com/eigenwallet/core/blob/main/pgp-key.asc';

// Asset Filtering Patterns
const ASSET_PREFIXES = {
  GUI: 'eigenwallet_',
  CLI_ASB: 'asb_',
  CLI_SWAP: 'swap_',
} as const;

const FILE_EXTENSIONS = {
  SIGNATURE: '.sig',
  DMG: '.dmg',
  APPIMAGE: '.appimage',
  DEB: '.deb',
  RPM: '.rpm',
  MSI: '.msi',
  EXE: '.exe',
  APP_BUNDLE: '.app.tar.gz',
  TAR: '.tar',
  ZIP: '.zip',
} as const;

// Cache Configuration
const CACHE_FILE_NAME = '.github-cache.json';
const CACHE_FILE = path.join(process.cwd(), CACHE_FILE_NAME);
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// Platform Configuration
const PLATFORM_ORDER = ['Linux', 'Windows', 'macOS', 'Unknown', 'Source archive'] as const;
const PLATFORM_ICONS = {
  Linux: '🐧',
  Windows: '🪟',
  macOS: '🍎',
  Unknown: '❓',
  'Source archive': '📁',
} as const;

// File Size Units
const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB'] as const;

// Template Placeholders
const TEMPLATE_PLACEHOLDERS = {
  VERSION: '{{LATEST_VERSION}}',
  RELEASE_DATE: '{{RELEASE_DATE}}',
  GUI_TABLE: '{{GUI_TABLE}}',
  CLI_TABLE: '{{CLI_TABLE}}',
  HASHES_LINK: '{{HASHES_LINK}}',
  SIGNING_KEY_LINK: '{{SIGNING_KEY_LINK}}',
} as const;

// Architecture Detection Patterns
const ARCH_PATTERNS = {
  X64: ['x86_64', 'amd64', 'x64'],
  ARM64: ['aarch64', 'arm64'],
  ARM32: ['arm32', 'armv7'],
  ARM: ['arm'],
  X86: ['i386', 'x86'],
} as const;

// Platform Detection Patterns
const PLATFORM_PATTERNS = {
  LINUX: ['linux'],
  MACOS: ['darwin', 'macos'],
  WINDOWS: ['windows', 'win'],
  ANDROID: ['android'],
  IOS: ['ios'],
} as const;

interface DownloadAsset {
  name: string;
  downloadUrl: string;
  signatureUrl: string;
  size: string;
  architecture: string;
  platform: string;
  type: 'executable' | 'appimage' | 'installer' | 'bundle' | 'archive' | 'instructions';
}

interface ReleaseInfo {
  version: string;
  releaseDate: string;
  hashesUrl: string;
  signingKeyUrl: string;
  assets: DownloadAsset[];
}

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GitHubRelease {
  tag_name: string;
  published_at: string;
  assets: GitHubAsset[];
}

interface CachedData {
  timestamp: number;
  data: GitHubRelease;
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
 * Load cached GitHub data if available and valid
 */
function loadCache(): GitHubRelease | null {
  if (!fs.existsSync(CACHE_FILE)) {
    return null;
  }

  try {
    const cacheContent = fs.readFileSync(CACHE_FILE, 'utf8');
    const cached: CachedData = JSON.parse(cacheContent);
    
    // Check if cache is still valid (within cache duration)
    const now = Date.now();
    if (now - cached.timestamp < CACHE_DURATION_MS) {
      console.log('Using cached GitHub API data...');
      return cached.data;
    } else {
      console.log('Cache expired, fetching fresh data...');
      return null;
    }
  } catch (error) {
    console.log('Cache file corrupted, fetching fresh data...');
    return null;
  }
}

/**
 * Save GitHub data to cache
 */
function saveCache(data: GitHubRelease): void {
  const cached: CachedData = {
    timestamp: Date.now(),
    data
  };
  
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cached, null, 2));
    console.log('GitHub API data cached successfully');
  } catch (error) {
    console.warn('Failed to save cache:', error);
  }
}

/**
 * Fetch latest release data from GitHub API
 */
export async function generateDownloadData(): Promise<ReleaseInfo> {
  let release: GitHubRelease;

  // Try to use cache in development mode
  if (isDevelopmentMode()) {
    const cachedData = loadCache();
    if (cachedData) {
      release = cachedData;
    } else {
      console.log('Fetching fresh GitHub API data...');
      const response = await fetch(GITHUB_RELEASES_API);
      if (!response.ok) {
        throw new Error(`GitHub API responded with status: ${response.status}. Please check your internet connection or GitHub API rate limits.`);
      }
      
      release = await response.json();
      saveCache(release);
    }
  } else {
    // In production, always fetch fresh data
    const response = await fetch(GITHUB_RELEASES_API);
    if (!response.ok) {
      throw new Error(`GitHub API responded with status: ${response.status}. Please check your internet connection or GitHub API rate limits.`);
    }
    
    release = await response.json();
  }
  
  // Filter for relevant wallet assets (exclude .sig files)
  const walletAssets = release.assets.filter(asset => 
    (asset.name.startsWith(ASSET_PREFIXES.GUI) || 
     asset.name.startsWith(ASSET_PREFIXES.CLI_ASB) || 
     asset.name.startsWith(ASSET_PREFIXES.CLI_SWAP)) &&
    !asset.name.endsWith(FILE_EXTENSIONS.SIGNATURE)
  );
  
  const assets: DownloadAsset[] = walletAssets.map(asset => {
    const { platform, architecture, type } = parseAssetName(asset.name);
    
    return {
      name: getDisplayName(asset.name, type),
      downloadUrl: asset.browser_download_url,
      signatureUrl: `${asset.browser_download_url}${FILE_EXTENSIONS.SIGNATURE}`, // Assume .sig files exist
      size: formatFileSize(asset.size),
      architecture,
      platform,
      type
    };
  });

  // Add source archive if no specific eigenwallet assets found
  if (assets.length === 0) {
    const version = release.tag_name.replace(/^v/, '');
    assets.push({
      name: "Source Code (.tar.gz)",
      downloadUrl: `${GITHUB_ARCHIVE_BASE}/${release.tag_name}.tar.gz`,
      signatureUrl: "",
      size: "~2 MB",
      architecture: "",
      platform: "Source archive",
      type: "archive"
    });
  }

  const version = release.tag_name.replace(/^v/, '');
  const releaseDate = new Date(release.published_at).toISOString().split('T')[0];

  return {
    version,
    releaseDate,
    hashesUrl: `${GITHUB_RELEASES_BASE}/${release.tag_name}/hashes.txt`,
    signingKeyUrl: SIGNING_KEY_URL,
    assets
  };
}

/**
 * Check if asset is a tar file
 */
function isTarFile(assetName: string): boolean {
  return assetName.toLowerCase().includes(FILE_EXTENSIONS.TAR);
}

/**
 * Parse asset name to extract platform, architecture, and type information
 */
function parseAssetName(assetName: string): { platform: string; architecture: string; type: DownloadAsset['type'] } {
  const name = assetName.toLowerCase();
  const isTar = isTarFile(assetName);
  
  // Determine platform first by explicit keywords, then by file extensions
  let platform = "Unknown";
  if (PLATFORM_PATTERNS.LINUX.some(p => name.includes(p))) platform = "Linux";
  else if (PLATFORM_PATTERNS.MACOS.some(p => name.includes(p))) platform = "macOS";
  else if (PLATFORM_PATTERNS.WINDOWS.some(p => name.includes(p))) platform = "Windows";
  else if (PLATFORM_PATTERNS.ANDROID.some(p => name.includes(p))) platform = "Android";
  else if (PLATFORM_PATTERNS.IOS.some(p => name.includes(p))) platform = "iOS";
  else if (name.includes(FILE_EXTENSIONS.DMG) || name.includes(FILE_EXTENSIONS.APP_BUNDLE)) platform = "macOS";
  else if (name.includes(FILE_EXTENSIONS.APPIMAGE) || name.includes(FILE_EXTENSIONS.DEB) || name.includes(FILE_EXTENSIONS.RPM)) platform = "Linux";
  else if (name.includes(FILE_EXTENSIONS.EXE) || name.includes(FILE_EXTENSIONS.MSI)) platform = "Windows";

  // Determine architecture
  let architecture = "";
  const isAppImage = name.includes(FILE_EXTENSIONS.APPIMAGE);
  const isDebian = name.includes(FILE_EXTENSIONS.DEB);
  
  if (ARCH_PATTERNS.X64.some(p => name.includes(p))) {
    if (platform === "macOS") {
      const macReleaseType = name.includes(FILE_EXTENSIONS.DMG) ? 'DMG' : name.includes(FILE_EXTENSIONS.APP_BUNDLE) ? 'Bundle' : 'Binary';
      architecture = "Intel <span style='float: right;'>" + macReleaseType + "</span>";
    } else if (isAppImage) {
      architecture = "x86 <span style='float: right;'>AppImage</span>";
    } else if (isDebian) {
      architecture = "x86 <span style='float: right;'>Debian</span>";
    } else if (isTar) {
      architecture = "x64 <span style='float: right;'>Binary</span>";
    } else {
      architecture = "x64";
    }
  } else if (ARCH_PATTERNS.ARM64.some(p => name.includes(p))) {
    if (platform === "macOS") {
      const macReleaseType = name.includes(FILE_EXTENSIONS.DMG) ? 'DMG' : name.includes(FILE_EXTENSIONS.APP_BUNDLE) ? 'Bundle' : 'Binary';
      architecture = "Silicon <span style='float: right;'>" + macReleaseType + "</span>";
    } else if (isAppImage) {
      architecture = "AppImage <span style='float: right;'>ARM64</span>";
    } else if (isDebian) {
      architecture = "Debian <span style='float: right;'>ARM64</span>";
    } else if (isTar) {
      architecture = "ARM64 <span style='float: right;'>Binary</span>";
    } else {
      architecture = "ARM64";
    }
  } else if (ARCH_PATTERNS.ARM32.some(p => name.includes(p))) {
    if (isAppImage) {
      architecture = "AppImage <span style='float: right;'>ARM32</span>";
    } else if (isDebian) {
      architecture = "Debian <span style='float: right;'>ARM32</span>";
    } else if (isTar) {
      architecture = "ARM32 <span style='float: right;'>Binary</span>";
    } else {
      architecture = "ARM32";
    }
  } else if (ARCH_PATTERNS.ARM.some(p => name.includes(p))) {
    if (isAppImage) {
      architecture = "AppImage <span style='float: right;'>ARM</span>";
    } else if (isDebian) {
      architecture = "Debian <span style='float: right;'>ARM</span>";
    } else if (isTar) {
      architecture = "ARM <span style='float: right;'>Binary</span>";
    } else {
      architecture = "ARM";
    }
  } else if (ARCH_PATTERNS.X86.some(p => name.includes(p))) {
    if (isAppImage) {
      architecture = "AppImage <span style='float: right;'>x86</span>";
    } else if (isDebian) {
      architecture = "Debian <span style='float: right;'>x86</span>";
    } else if (isTar) {
      architecture = "x86 <span style='float: right;'>Binary</span>";
    } else {
      architecture = "x86";
    }
  }
  
  // Determine type
  let type: DownloadAsset['type'] = "archive";
  if (name.includes(FILE_EXTENSIONS.EXE)) type = "executable";
  else if (name.includes(FILE_EXTENSIONS.MSI) || name.includes(FILE_EXTENSIONS.DEB) || name.includes(FILE_EXTENSIONS.RPM)) type = "installer";
  else if (name.includes(FILE_EXTENSIONS.DMG) || name.includes(FILE_EXTENSIONS.APP_BUNDLE)) type = "bundle";
  else if (name.includes(FILE_EXTENSIONS.APPIMAGE)) type = "appimage";
  
  return { platform, architecture, type };
}

/**
 * Get display name for download asset
 */
function getDisplayName(assetName: string, type: DownloadAsset['type']): string {
  const name = assetName.toLowerCase();
  
  // Be specific about file types
  if (name.includes(FILE_EXTENSIONS.DMG)) return 'DMG Installer';
  if (name.includes(FILE_EXTENSIONS.APPIMAGE)) return 'AppImage';
  if (name.includes(FILE_EXTENSIONS.DEB)) return 'DEB Package';
  if (name.includes(FILE_EXTENSIONS.RPM)) return 'RPM Package';
  if (name.includes(FILE_EXTENSIONS.MSI)) return 'MSI Installer';
  if (name.includes(FILE_EXTENSIONS.EXE)) return 'Executable';
  if (name.includes(FILE_EXTENSIONS.APP_BUNDLE)) return 'macOS App Bundle';
  if (name.includes(FILE_EXTENSIONS.TAR)) return 'TAR Archive';
  if (name.includes(FILE_EXTENSIONS.ZIP)) return 'ZIP Archive';
  
  // Fallback to generic types
  switch (type) {
    case 'executable': return 'Executable';
    case 'installer': return 'Installer';
    case 'bundle': return 'Bundle';
    case 'appimage': return 'AppImage';
    case 'archive': return 'Archive';
    default: return assetName;
  }
}

/**
 * Format file size from bytes to human readable format
 */
function formatFileSize(bytes: number): string {
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < FILE_SIZE_UNITS.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${Math.round(size)} ${FILE_SIZE_UNITS[unitIndex]}`;
}



/**
 * Generate HTML table for GUI downloads
 */
export function generateGuiTable(releaseInfo: ReleaseInfo): string {
  // Filter for GUI assets (eigenwallet_*)
  const guiAssets = releaseInfo.assets.filter(asset => 
    asset.downloadUrl.includes(ASSET_PREFIXES.GUI)
  );
  
  return generateTable(guiAssets, "GUI Downloads");
}

/**
 * Generate HTML table for CLI downloads
 */
export function generateCliTable(releaseInfo: ReleaseInfo): string {
  // Filter for CLI assets (asb_* and swap_*)
  const cliAssets = releaseInfo.assets.filter(asset => 
    asset.downloadUrl.includes(ASSET_PREFIXES.CLI_ASB) || asset.downloadUrl.includes(ASSET_PREFIXES.CLI_SWAP)
  );
  
  return generateTable(cliAssets, "CLI Tools");
}

/**
 * Generate HTML table for downloads
 */
function generateTable(assets: DownloadAsset[], title: string): string {
  if (assets.length === 0) {
    return `<p><em>No ${title.toLowerCase()} available for this release.</em></p>`;
  }

  // Group assets by platform
  const platformGroups = assets.reduce((groups, asset) => {
    if (!groups[asset.platform]) {
      groups[asset.platform] = [];
    }
    groups[asset.platform].push(asset);
    return groups;
  }, {} as Record<string, DownloadAsset[]>);

  let tableHtml = `
<table>
  <thead>
    <tr>
      <th scope="col">Architecture</th>
      <th scope="col">File</th>
      <th scope="col">Signature</th>
      <th scope="col">Size</th>
    </tr>
  </thead>
  <tbody>`;

  // Define platform order and icons
  for (const platform of PLATFORM_ORDER) {
    if (!platformGroups[platform]) continue;
    
    const platformAssets = platformGroups[platform];
    const icon = PLATFORM_ICONS[platform] || "";
    
    // Add platform header row
    if (platformAssets.length > 1) {
      tableHtml += `
    <tr>
      <td colspan="4" style="background-color: var(--pre-bg-color); font-weight: bold; padding: 0.75rem;">
        ${icon} ${platform}
      </td>
    </tr>`;
    }

    // Add asset rows
    for (const asset of platformAssets) {
      const architecture = platformAssets.length === 1 ? `${icon} ${platform}${asset.architecture ? ` (${asset.architecture})` : ''}` : asset.architecture;
      const fileName = asset.downloadUrl.split('/').pop() || 'Unknown';
      const fileNameLink = asset.type === 'instructions' 
        ? `<a href="${asset.downloadUrl}">Instructions</a>`
        : `<a href="${asset.downloadUrl}" style="text-decoration: none;"><code style="font-size: 0.85em; word-break: break-all;">${fileName}</code></a>`;
      const signatureLink = asset.signatureUrl 
        ? `<a href="${asset.signatureUrl}">signature</a>`
        : '';
      
      tableHtml += `
    <tr>
      <td>${architecture}</td>
      <td>${fileNameLink}</td>
      <td>${signatureLink}</td>
      <td>${asset.size}</td>
    </tr>`;
    }
  }

  tableHtml += `
  </tbody>
</table>`;

  return tableHtml;
}

/**
 * Process download template with actual data
 */
export async function processDownloadTemplate(template: string): Promise<string> {
  const releaseInfo = await generateDownloadData();
  const guiTable = generateGuiTable(releaseInfo);
  const cliTable = generateCliTable(releaseInfo);
  
  return template
    .replace(new RegExp(TEMPLATE_PLACEHOLDERS.VERSION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), releaseInfo.version)
    .replace(new RegExp(TEMPLATE_PLACEHOLDERS.RELEASE_DATE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), releaseInfo.releaseDate)
    .replace(new RegExp(TEMPLATE_PLACEHOLDERS.GUI_TABLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), guiTable)
    .replace(new RegExp(TEMPLATE_PLACEHOLDERS.CLI_TABLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), cliTable)
    .replace(new RegExp(TEMPLATE_PLACEHOLDERS.HASHES_LINK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), releaseInfo.hashesUrl)
    .replace(new RegExp(TEMPLATE_PLACEHOLDERS.SIGNING_KEY_LINK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), releaseInfo.signingKeyUrl);
} 