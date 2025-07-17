import fs from 'fs';
import path from 'path';
import * as vega from 'vega';
import * as vl from 'vega-lite';

// API Configuration
const LIST_API_URL = 'https://api.unstoppableswap.net/api/list';
const LIQUIDITY_DAILY_API_URL = 'https://api.unstoppableswap.net/api/liquidity-daily';
const GITHUB_API_BASE = 'https://api.github.com/repos/eigenwallet/core';
const GITHUB_RELEASES_API = `${GITHUB_API_BASE}/releases`;

// Cache Configuration
const CACHE_FILE_NAME = '.stats-cache.json';
const CACHE_FILE = path.join(process.cwd(), CACHE_FILE_NAME);
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// Constants
const SATOSHIS_PER_BTC = 100000000;

// Data Interfaces
interface PeerData {
  peerId: string;
  multiAddr: string;
  testnet: boolean;
  version: string;
  price: number; // in satoshis
  minSwapAmount: number; // in satoshis
  maxSwapAmount: number; // in satoshis
  age: number;
  recommended: boolean;
  relevancy: number;
}

interface LiquidityDayData {
  date: number[]; // [year, day_of_year, ...]
  totalLiquidityBtc: number; // already in BTC
}

interface StatsData {
  totalLiquidity: number; // in BTC
  maxSwap: number; // in BTC
  minSwap: number; // in BTC
  totalDownloads: number; // total GitHub downloads
  liquidityChart: string; // SVG string
  lastUpdated: string;
}

interface CachedData {
  timestamp: number;
  data: {
    peers: PeerData[];
    liquidity: LiquidityDayData[];
    totalDownloads: number;
  };
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
function loadCache(): { peers: PeerData[]; liquidity: LiquidityDayData[]; totalDownloads: number; } | null {
  if (!fs.existsSync(CACHE_FILE)) {
    return null;
  }

  try {
    const cacheContent = fs.readFileSync(CACHE_FILE, 'utf8');
    const cached: CachedData = JSON.parse(cacheContent);
    
    const now = Date.now();
    if (now - cached.timestamp < CACHE_DURATION_MS) {
      console.log('Using cached statistics data...');
      return cached.data;
    } else {
      console.log('Statistics cache expired, fetching fresh data...');
      return null;
    }
  } catch (error) {
    console.log('Statistics cache corrupted, fetching fresh data...');
    return null;
  }
}

/**
 * Save data to cache
 */
function saveCache(data: { peers: PeerData[]; liquidity: LiquidityDayData[]; totalDownloads: number; }): void {
  const cached: CachedData = {
    timestamp: Date.now(),
    data
  };
  
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cached, null, 2));
    console.log('Statistics data cached successfully');
  } catch (error) {
    console.warn('Failed to save statistics cache:', error);
  }
}

/**
 * Fetch API data
 */
async function fetchApiData(): Promise<{ peers: PeerData[]; liquidity: LiquidityDayData[]; totalDownloads: number; }> {
  console.log('Fetching statistics data from APIs...');
  
  const [peersResponse, liquidityResponse, totalDownloads] = await Promise.all([
    fetch(LIST_API_URL),
    fetch(LIQUIDITY_DAILY_API_URL),
    fetchTotalDownloads()
  ]);

  if (!peersResponse.ok) {
    throw new Error(`List API responded with status: ${peersResponse.status}`);
  }
  
  if (!liquidityResponse.ok) {
    throw new Error(`Liquidity API responded with status: ${liquidityResponse.status}`);
  }

  const peers: PeerData[] = await peersResponse.json();
  const liquidity: LiquidityDayData[] = await liquidityResponse.json();

  return { peers, liquidity, totalDownloads };
}

/**
 * Fetch total downloads from GitHub releases
 */
async function fetchTotalDownloads(): Promise<number> {
  try {
    console.log('Fetching GitHub download statistics...');
    const response = await fetch(GITHUB_RELEASES_API);
    
    if (!response.ok) {
      console.warn(`GitHub API responded with status: ${response.status}`);
      return 0;
    }

    const releases: any[] = await response.json();
    
    let totalDownloads = 0;
    for (const release of releases) {
      if (release.assets && Array.isArray(release.assets)) {
        for (const asset of release.assets) {
          if (asset.download_count) {
            totalDownloads += asset.download_count;
          }
        }
      }
    }

    return totalDownloads;
  } catch (error) {
    console.warn('Failed to fetch GitHub download statistics:', error);
    return 0;
  }
}

/**
 * Convert satoshis to BTC
 */
function satoshisToBtc(satoshis: number): number {
  return satoshis / SATOSHIS_PER_BTC;
}

/**
 * Format number with appropriate precision
 */
function formatNumber(value: number, decimals: number = 4): string {
  if (value >= 1) {
    return value.toFixed(Math.min(decimals, 2));
  }
  return value.toFixed(decimals);
}

/**
 * Format large numbers with k, M, B suffixes and one decimal place
 */
function formatLargeNumber(value: number): string {
  if (value >= 1000000000) {
    return (value / 1000000000).toFixed(1) + 'B';
  } else if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  } else if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'k';
  } else {
    return value.toString();
  }
}

/**
 * Convert date array to readable date
 */
function formatDate(dateArray: number[]): string {
  const year = dateArray[0];
  const dayOfYear = dateArray[1];
  
  // Convert day of year to Date
  const date = new Date(year, 0, dayOfYear);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
}

/**
 * Generate SVG chart for liquidity data using Vega-Lite
 */
async function generateLiquidityChart(liquidityData: LiquidityDayData[]): Promise<string> {
  if (liquidityData.length === 0) {
    return `<svg width="800" height="200" viewBox="0 0 800 200">
      <text x="400" y="100" text-anchor="middle" fill="#666">No data available</text>
    </svg>`;
  }

  // Transform data for Vega-Lite
  const chartData = liquidityData.map(d => {
    const year = d.date[0];
    const dayOfYear = d.date[1];
    const date = new Date(year, 0, dayOfYear);
    
    return {
      date: date.toISOString().split('T')[0], // YYYY-MM-DD format
      liquidity: d.totalLiquidityBtc
    };
  }).reverse(); // Reverse to show chronological order (oldest to newest)

  // Vega-Lite specification
  const spec: vl.TopLevelSpec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 720,
    height: 160,
    background: 'transparent',
    padding: { left: 20, right: 0, top: 0, bottom: 0 },
    data: {
      values: chartData
    },
    layer: [
             // Area chart
       {
         mark: {
           type: 'area',
           color: '#ff6b35',
           opacity: 0.2,
           line: false
         },
        encoding: {
          x: {
            field: 'date',
            type: 'temporal',
            axis: {
              format: '%b %d',
              labelAngle: 0,
              labelFontSize: 12,
              labelColor: '#666',
              tickColor: 'transparent',
              domainColor: 'transparent',
              grid: false
            }
          },
                     y: {
             field: 'liquidity',
             type: 'quantitative',
             axis: {
               labelFontSize: 12,
               labelColor: '#666',
               tickColor: 'transparent',
               domainColor: 'transparent',
               grid: false,
               format: '.4f',
               title: 'BTC',
               titleFontSize: 12,
               titleColor: '#666'
             }
           }
        }
      },
      // Line chart
      {
        mark: {
          type: 'line',
          color: '#ff6b35',
          strokeWidth: 2,
          strokeCap: 'round',
          strokeJoin: 'round'
        },
        encoding: {
          x: {
            field: 'date',
            type: 'temporal'
          },
          y: {
            field: 'liquidity',
            type: 'quantitative'
          }
        }
      }
    ],
    resolve: {
      scale: { y: 'shared', x: 'shared' }
    }
  };

  try {
    // Compile Vega-Lite to Vega
    const vegaSpec = vl.compile(spec).spec;
    
    // Create Vega view and render to SVG
    const view = new vega.View(vega.parse(vegaSpec), { renderer: 'none' });
    const svg = await view.toSVG();
    
    // Add responsive styling to the SVG
    return svg.replace('<svg', '<svg style="max-width: 100%; height: auto;"');
  } catch (error) {
    console.error('Failed to generate chart:', error);
    return `<svg width="800" height="200" viewBox="0 0 800 200">
      <text x="400" y="100" text-anchor="middle" fill="#666">Chart generation failed</text>
    </svg>`;
  }
}

/**
 * Generate statistics data
 */
export async function generateStatsData(): Promise<StatsData> {
  let apiData: { peers: PeerData[]; liquidity: LiquidityDayData[]; totalDownloads: number; };

  // Try cache in development mode
  if (isDevelopmentMode()) {
    const cachedData = loadCache();
    if (cachedData) {
      apiData = cachedData;
    } else {
      apiData = await fetchApiData();
      saveCache(apiData);
    }
  } else {
    // Always fetch fresh data in production
    apiData = await fetchApiData();
  }

  const { peers, liquidity, totalDownloads } = apiData;

  // Calculate statistics
  const activePeers = peers.filter(p => !p.testnet);
  
  // Total liquidity from the latest daily data (first item = most recent, already in BTC)
  const totalLiquidity = liquidity.length > 0 ? liquidity[0].totalLiquidityBtc : 0;
  
  const maxSwapSatoshis = Math.max(...activePeers.map(p => p.maxSwapAmount));
  const minSwapSatoshis = Math.min(...activePeers.map(p => p.minSwapAmount));
  
  const maxSwap = satoshisToBtc(maxSwapSatoshis);
  const minSwap = satoshisToBtc(minSwapSatoshis);

  // Generate chart
  const liquidityChart = await generateLiquidityChart(liquidity);

  return {
    totalLiquidity,
    maxSwap,
    minSwap,
    totalDownloads,
    liquidityChart,
    lastUpdated: new Date().toISOString().split('T')[0]
  };
}

/**
 * Process statistics template
 */
export async function processStatsTemplate(template: string): Promise<string> {
  const statsData = await generateStatsData();
  
  return template
    .replace(/\{\{TOTAL_LIQUIDITY\}\}/g, formatNumber(statsData.totalLiquidity))
    .replace(/\{\{MAX_SWAP\}\}/g, formatNumber(statsData.maxSwap))
    .replace(/\{\{MIN_SWAP\}\}/g, formatNumber(statsData.minSwap))
    .replace(/\{\{TOTAL_DOWNLOADS\}\}/g, formatLargeNumber(statsData.totalDownloads))
    .replace(/\{\{LIQUIDITY_CHART\}\}/g, statsData.liquidityChart)
    .replace(/\{\{LAST_UPDATED\}\}/g, statsData.lastUpdated);
} 