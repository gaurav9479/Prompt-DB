export default async function handler(req, res) {
  // Read backend URL from environment variables, fallback if not set
  const backendUrl = process.env.VITE_API_URL || 'https://prompt-db-zzqi.onrender.com';
  
  console.log(`[Cron] Pinging backend health endpoint: ${backendUrl}/api/health`);
  
  try {
    const startTime = Date.now();
    
    // Call the backend health check which queries "SELECT 1" on the database
    const response = await fetch(`${backendUrl}/api/health`);
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log(`[Cron] Ping successful in ${duration}ms. Database status: ${data.database || 'unknown'}`);
    
    return res.status(200).json({
      success: true,
      message: "Database and backend kept awake successfully.",
      duration: `${duration}ms`,
      backend: data
    });
  } catch (error) {
    console.error("[Cron] Error pinging backend:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to keep backend awake.",
      error: error.message
    });
  }
}
