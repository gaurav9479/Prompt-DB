const backendUrl = process.env.VITE_API_URL || 'https://prompt-db-zzqi.onrender.com';
const intervalMinutes = 10;
const intervalMs = intervalMinutes * 60 * 1000;

console.log(`===================================================`);
console.log(`  Prompt-DB Database & Backend Ping Service Started `);
console.log(`  Target: ${backendUrl}/api/health`);
console.log(`  Interval: Every ${intervalMinutes} minutes`);
console.log(`===================================================`);

async function pingBackend() {
  const timestamp = new Date().toISOString();
  try {
    const start = Date.now();
    const response = await fetch(`${backendUrl}/api/health`);
    const duration = Date.now() - start;
    
    if (!response.ok) {
      console.error(`[${timestamp}] ❌ Ping failed. Server returned HTTP ${response.status}`);
      return;
    }
    
    const data = await response.json();
    console.log(`[${timestamp}] ✅ Ping successful (${duration}ms). Database status: ${data.database || 'unknown'}`);
  } catch (error) {
    console.error(`[${timestamp}] ❌ Ping failed with error: ${error.message}`);
  }
}

// Run immediately on start
pingBackend();

// Run every 10 minutes
setInterval(pingBackend, intervalMs);
