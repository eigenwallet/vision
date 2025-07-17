import fs from 'fs';
import path from 'path';

// API Configuration
const LIST_API_URL = 'https://api.unstoppableswap.net/api/list';
const LIQUIDITY_DAILY_API_URL = 'https://api.unstoppableswap.net/api/liquidity-daily';

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
  liquidityChart: string; // SVG string
  lastUpdated: string;
}

interface CachedData {
  timestamp: number;
  data: {
    peers: PeerData[];
    liquidity: LiquidityDayData[];
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
function loadCache(): { peers: PeerData[]; liquidity: LiquidityDayData[]; } | null {
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
function saveCache(data: { peers: PeerData[]; liquidity: LiquidityDayData[]; }): void {
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
async function fetchApiData(): Promise<{ peers: PeerData[]; liquidity: LiquidityDayData[]; }> {
  console.log('Fetching statistics data from APIs...');
  
  const [peersResponse, liquidityResponse] = await Promise.all([
    fetch(LIST_API_URL),
    fetch(LIQUIDITY_DAILY_API_URL)
  ]);

  if (!peersResponse.ok) {
    throw new Error(`List API responded with status: ${peersResponse.status}`);
  }
  
  if (!liquidityResponse.ok) {
    throw new Error(`Liquidity API responded with status: ${liquidityResponse.status}`);
  }

  const peers: PeerData[] = await peersResponse.json();
  const liquidity: LiquidityDayData[] = await liquidityResponse.json();

  return { peers, liquidity };
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
 * Generate SVG chart for liquidity data
 */
function generateLiquidityChart(liquidityData: LiquidityDayData[]): string {
  const width = 800;
  const height = 200;
  const padding = 40;
  
  // Take first 200 days (most recent) and reverse to show chronological order (oldest to newest)
  const recentData = liquidityData.reverse();
  
  if (recentData.length === 0) {
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <text x="${width/2}" y="${height/2}" text-anchor="middle" fill="#666">No data available</text>
    </svg>`;
  }

  const values = recentData.map(d => d.totalLiquidityBtc);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const range = maxValue - minValue || 1;

  // Generate path data
  const points = recentData.map((d, i) => {
    const x = padding + (i * (width - 2 * padding)) / (recentData.length - 1);
    const y = height - padding - ((d.totalLiquidityBtc - minValue) / range) * (height - 2 * padding);
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(' L ')}`;

  // Create area fill
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const areaData = `${pathData} L ${lastPoint.split(',')[0]},${height - padding} L ${firstPoint.split(',')[0]},${height - padding} Z`;

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width: 100%; height: auto;">
    <defs>
      <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#ff6b35;stop-opacity:0.3" />
        <stop offset="100%" style="stop-color:#ff6b35;stop-opacity:0.05" />
      </linearGradient>
    </defs>
    
    <!-- Background -->
    <rect x="0" y="0" width="${width}" height="${height}" fill="transparent" />
    
    <!-- Area fill -->
    <path d="${areaData}" fill="url(#areaGradient)" />
    
    <!-- Main line -->
    <path d="${pathData}" fill="none" stroke="#ff6b35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    
    <!-- Y-axis labels -->
    <text x="${padding - 10}" y="${padding + 5}" text-anchor="end" fill="#666" font-size="12" font-family="system-ui, sans-serif">${formatNumber(maxValue)} BTC</text>
    <text x="${padding - 10}" y="${height - padding + 5}" text-anchor="end" fill="#666" font-size="12" font-family="system-ui, sans-serif">${formatNumber(minValue)} BTC</text>
    
    <!-- X-axis labels -->
    <text x="${padding}" y="${height - padding + 20}" text-anchor="start" fill="#666" font-size="12" font-family="system-ui, sans-serif">${formatDate(recentData[0].date)}</text>
    <text x="${width - padding}" y="${height - padding + 20}" text-anchor="end" fill="#666" font-size="12" font-family="system-ui, sans-serif">${formatDate(recentData[recentData.length - 1].date)}</text>
  </svg>`;
}

/**
 * Generate statistics data
 */
export async function generateStatsData(): Promise<StatsData> {
  let apiData: { peers: PeerData[]; liquidity: LiquidityDayData[]; };

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

  const { peers, liquidity } = apiData;

  // Calculate statistics
  const activePeers = peers.filter(p => !p.testnet);
  
  // Total liquidity from the latest daily data (first item = most recent, already in BTC)
  const totalLiquidity = liquidity.length > 0 ? liquidity[0].totalLiquidityBtc : 0;
  
  const maxSwapSatoshis = Math.max(...activePeers.map(p => p.maxSwapAmount));
  const minSwapSatoshis = Math.min(...activePeers.map(p => p.minSwapAmount));
  
  const maxSwap = satoshisToBtc(maxSwapSatoshis);
  const minSwap = satoshisToBtc(minSwapSatoshis);

  // Generate chart
  const liquidityChart = generateLiquidityChart(liquidity);

  return {
    totalLiquidity,
    maxSwap,
    minSwap,
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
    .replace(/\{\{LIQUIDITY_CHART\}\}/g, statsData.liquidityChart)
    .replace(/\{\{LAST_UPDATED\}\}/g, statsData.lastUpdated);
} 