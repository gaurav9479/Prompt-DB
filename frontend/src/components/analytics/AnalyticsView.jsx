import React, { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts'

const ORANGE_COLORS = ['#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12', '#431407']
const GUEST_COLOR = '#4b5563' // Gray for unregistered/guest
const ACCENT_COLOR = '#f97316' // Orange primary

export default function AnalyticsView({ shopId, getApiUrl }) {
  // Section 1: Live Metrics
  const [liveData, setLiveData] = useState(null)
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveError, setLiveError] = useState(null)

  // Section 2: Deep Insights States
  const [insights, setInsights] = useState({
    rfm: { data: null, loading: false, timestamp: null },
    demandForecast: { data: null, loading: false, timestamp: null },
    reorderQueue: { data: null, loading: false, timestamp: null },
    churn: { data: null, loading: false, timestamp: null },
    affinity: { data: null, loading: false, timestamp: null },
    ltv: { data: null, loading: false, timestamp: null },
    heatmap: { data: null, loading: false, timestamp: null },
    revenueForecast: { data: null, loading: false, timestamp: null }
  })

  // Selected Insight to display in detail
  const [activeInsight, setActiveInsight] = useState(null)

  // Fetch Section 1: Live Metrics
  const fetchLiveMetrics = async () => {
    setLiveLoading(true)
    setLiveError(null)
    try {
      const url = shopId 
        ? `api/analytics/live?shop_id=${shopId}` 
        : 'api/analytics/live'
      const res = await fetch(getApiUrl(url))
      if (!res.ok) throw new Error('Failed to load live metrics')
      const data = await res.json()
      setLiveData(data)
    } catch (err) {
      console.error(err)
      setLiveError(err.message)
    } finally {
      setLiveLoading(false)
    }
  }

  // Fetch Section 2: On-Demand Insights
  const runDeepInsight = async (key, apiPath) => {
    setInsights(prev => ({
      ...prev,
      [key]: { ...prev[key], loading: true }
    }))
    try {
      const url = shopId 
        ? `api/analytics/${apiPath}?shop_id=${shopId}` 
        : `api/analytics/${apiPath}`
      const res = await fetch(getApiUrl(url))
      if (!res.ok) throw new Error(`Failed to compute ${key}`)
      const data = await res.json()
      setInsights(prev => ({
        ...prev,
        [key]: { data, loading: false, timestamp: new Date().toLocaleTimeString() }
      }))
      setActiveInsight(key)
    } catch (err) {
      console.error(err)
      alert(`Error running analytics computation: ${err.message}`)
      setInsights(prev => ({
        ...prev,
        [key]: { ...prev[key], loading: false }
      }))
    }
  }

  useEffect(() => {
    fetchLiveMetrics()
    
    // Auto-update live metrics every 5 minutes
    const interval = setInterval(fetchLiveMetrics, 300000)
    return () => clearInterval(interval)
  }, [shopId])

  // Helpers to structure charts
  const getRegPieData = () => {
    if (!liveData || !liveData.customer_counts) return []
    const counts = liveData.customer_counts
    return [
      { name: 'Registered', value: counts.registered, color: ACCENT_COLOR },
      { name: 'Guest / Guest Orders', value: counts.guest, color: GUEST_COLOR }
    ]
  }

  return (
    <div className="analytics-dashboard" style={{ color: '#f3f4f6', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Banner */}
      <div className="analytics-banner" style={{
        background: 'rgba(234, 88, 12, 0.1)',
        border: '1px solid #ea580c',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '28px',
        color: '#f97316',
        fontSize: '14px',
        lineHeight: '1.6',
        fontWeight: '500'
      }}>
        💡 <em>All insights are computed directly from your database using Python. No external services or APIs are used. Live metrics refresh automatically. Deep insights run only when you click — tap any card to compute.</em>
      </div>

      {/* SECTION 1: LIVE METRICS */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '22px', borderLeft: '4px solid #ea580c', paddingLeft: '12px', margin: 0 }}>
            Section 1 — Live Metrics (Auto-updates)
          </h2>
          <button 
            onClick={fetchLiveMetrics} 
            disabled={liveLoading}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid #ea580c',
              borderRadius: '6px',
              color: '#ea580c',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {liveLoading ? 'Refreshing...' : '🔄 Refresh Live Metrics'}
          </button>
        </div>

        {liveLoading && !liveData && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading live metrics...</div>
        )}

        {liveError && (
          <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '8px' }}>
            Error: {liveError}
          </div>
        )}

        {liveData && (
          <div>
            {/* Top Cards Row */}
            <div className="analytics-live-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px',
              marginBottom: '24px'
            }}>
              {/* Card 1: Revenue Month Comparison */}
              <div className="stat-card-analytics" style={{
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'left'
              }}>
                <div style={{ color: '#9ca3af', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue (This Month)</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '8px 0', color: '#f3f4f6' }}>
                  ₹{liveData.monthly_comparison.this_month.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '13px', color: liveData.monthly_comparison.growth_percentage >= 0 ? '#10b981' : '#ef4444' }}>
                  {liveData.monthly_comparison.growth_percentage >= 0 ? '📈' : '📉'}{' '}
                  {liveData.monthly_comparison.growth_percentage}% vs Last Month
                </div>
              </div>

              {/* Card 2: Stock Health */}
              <div className="stat-card-analytics" style={{
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'left'
              }}>
                <div style={{ color: '#9ca3af', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Critical Inventory</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '8px 0', color: liveData.stock_health.critical_stock_count > 0 ? '#ef4444' : '#10b981' }}>
                  {liveData.stock_health.critical_stock_count} Items
                </div>
                <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                  Products with &lt; 7 days of stock left
                </div>
              </div>

              {/* Card 3: Registered vs Guest */}
              <div className="stat-card-analytics" style={{
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'left'
              }}>
                <div style={{ color: '#9ca3af', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registered Shop Customers</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '8px 0', color: '#f97316' }}>
                  {liveData.customer_counts.registered} / {liveData.customer_counts.total}
                </div>
                <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                  ({liveData.customer_counts.guest} guest accounts in orders)
                </div>
              </div>
            </div>

            {/* Graphs Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '24px'
            }}>
              {/* Sales Trend (Last 30 days) */}
              <div style={{ background: '#1f2937', border: '1px solid #374151', padding: '20px', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '16px', marginTop: 0, marginBottom: '16px' }}>Sales Trend (Last 30 Days)</h3>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={liveData.sales_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickFormatter={(val) => val.substring(8, 10)} />
                      <YAxis stroke="#9ca3af" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }} 
                        labelStyle={{ color: '#f97316' }}
                      />
                      <Bar dataKey="revenue" name="Sales Revenue (₹)" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Customer Share, Top Products & Admin Activity */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}>
                {/* Customer Share Pie Chart */}
                <div style={{ background: '#1f2937', border: '1px solid #374151', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '50%', height: 110 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={getRegPieData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {getRegPieData().map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ width: '50%', paddingLeft: '12px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Customer Mix</h4>
                    {getRegPieData().map((entry, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: '6px', fontSize: '12px' }}>
                        <span style={{ display: 'inline-block', width: 10, height: 10, backgroundColor: entry.color, borderRadius: '2px', marginRight: 6 }}></span>
                        <span>{entry.name}: <strong>{entry.value}</strong></span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top 5 Products Weekly Bar */}
                <div style={{ background: '#1f2937', border: '1px solid #374151', padding: '16px', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Top 5 Products this Week</h4>
                  {liveData.top_products.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px', paddingTop: '10px' }}>No weekly product sales yet</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {liveData.top_products.map((p, idx) => (
                        <div key={idx} style={{ fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span>{p.product_name}</span>
                            <strong>{p.total_sold} units</strong>
                          </div>
                          <div style={{ width: '100%', height: '6px', backgroundColor: '#374151', borderRadius: '3px' }}>
                            <div style={{
                              height: '100%',
                              width: `${(p.total_sold / liveData.top_products[0].total_sold) * 100}%`,
                              backgroundColor: '#ea580c',
                              borderRadius: '3px'
                            }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Admin Activity Weekly Bar Chart */}
                <div style={{ background: '#1f2937', border: '1px solid #374151', padding: '16px', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Admin Sales Count this Week</h4>
                  {!liveData.admin_activity || liveData.admin_activity.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px', paddingTop: '10px' }}>No admin activity this week</div>
                  ) : (
                    <div style={{ width: '100%', height: 110 }}>
                      <ResponsiveContainer>
                        <BarChart data={liveData.admin_activity}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="admin_name" stroke="#9ca3af" fontSize={9} />
                          <YAxis stroke="#9ca3af" fontSize={9} />
                          <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} />
                          <Bar dataKey="sales_count" name="Sales Count" fill="#ea580c" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: DEEP INSIGHTS */}
      <div>
        <h2 style={{ fontSize: '22px', borderLeft: '4px solid #ea580c', paddingLeft: '12px', marginBottom: '20px' }}>
          Section 2 — Deep Insights (On-demand)
        </h2>

        {/* Grid of On-Demand Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          {/* Card 1: RFM */}
          <InsightActionCard
            title="1. Customer RFM Groups"
            description="Segment customers into Loyal, Champions, and Lost groupings based on Recency, Frequency, and Monetary scores."
            insightKey="rfm"
            apiPath="rfm"
            state={insights.rfm}
            onRun={runDeepInsight}
            isActive={activeInsight === 'rfm'}
            onSelect={() => setActiveInsight('rfm')}
          />

          {/* Card 2: Demand Forecast */}
          <InsightActionCard
            title="2. Demand Forecast"
            description="Fit a daily sales linear regression over the last 30 days using numpy.polyfit to predict the next 7 days."
            insightKey="demandForecast"
            apiPath="demand-forecast"
            state={insights.demandForecast}
            onRun={runDeepInsight}
            isActive={activeInsight === 'demandForecast'}
            onSelect={() => setActiveInsight('demandForecast')}
          />

          {/* Card 3: Smart Reorder Queue */}
          <InsightActionCard
            title="3. Smart Reorder Queue"
            description="List items that are out of stock or will deplete in 14 days based on daily velocity rates, sorting by urgency."
            insightKey="reorderQueue"
            apiPath="reorder-suggestions"
            state={insights.reorderQueue}
            onRun={runDeepInsight}
            isActive={activeInsight === 'reorderQueue'}
            onSelect={() => setActiveInsight('reorderQueue')}
          />

          {/* Card 4: Churn Prediction */}
          <InsightActionCard
            title="4. Churn Risk Alerts"
            description="Identify customers inactive for over 30 days who previously ordered frequently, highlighting churning probabilities."
            insightKey="churn"
            apiPath="churn-risk"
            state={insights.churn}
            onRun={runDeepInsight}
            isActive={activeInsight === 'churn'}
            onSelect={() => setActiveInsight('churn')}
          />

          {/* Card 5: Product Affinity */}
          <InsightActionCard
            title="5. Product Affinity Analysis"
            description="Analyze orders grouped by customer and date to calculate purchase support and confidence metrics."
            insightKey="affinity"
            apiPath="product-affinity"
            state={insights.affinity}
            onRun={runDeepInsight}
            isActive={activeInsight === 'affinity'}
            onSelect={() => setActiveInsight('affinity')}
          />

          {/* Card 6: Customer LTV */}
          <InsightActionCard
            title="6. Customer Lifetime Value"
            description="Project each customer's lifetime spending by combining their AOV, order frequency, and retention models."
            insightKey="ltv"
            apiPath="customer-ltv"
            state={insights.ltv}
            onRun={runDeepInsight}
            isActive={activeInsight === 'ltv'}
            onSelect={() => setActiveInsight('ltv')}
          />

          {/* Card 7: Hourly Heatmap */}
          <InsightActionCard
            title="7. Hourly Sales Heatmap"
            description="Generate a grid of order volumes by hour of the day and day of the week to reveal peaks."
            insightKey="heatmap"
            apiPath="sales-heatmap"
            state={insights.heatmap}
            onRun={runDeepInsight}
            isActive={activeInsight === 'heatmap'}
            onSelect={() => setActiveInsight('heatmap')}
          />

          {/* Card 8: Revenue Forecast */}
          <InsightActionCard
            title="8. Revenue Forecast (30D)"
            description="Fit a degree-2 polynomial trend line over 90 days of daily sales to forecast the next 30 days of revenue."
            insightKey="revenueForecast"
            apiPath="revenue-forecast"
            state={insights.revenueForecast}
            onRun={runDeepInsight}
            isActive={activeInsight === 'revenueForecast'}
            onSelect={() => setActiveInsight('revenueForecast')}
          />
        </div>

        {/* Detailed Report Rendering Box */}
        {activeInsight && insights[activeInsight]?.data && (
          <div style={{
            background: '#111827',
            border: '2px solid #ea580c',
            borderRadius: '16px',
            padding: '28px',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#f97316', textTransform: 'uppercase' }}>
                🔍 Detailed Report: {activeInsight.replace(/([A-Z])/g, ' $1').toUpperCase()}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Computed at: {insights[activeInsight].timestamp}</span>
                <button 
                  onClick={() => setActiveInsight(null)} 
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#9ca3af',
                    fontSize: '20px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Render reports depending on key */}
            {activeInsight === 'rfm' && renderRFMReport(insights.rfm.data)}
            {activeInsight === 'demandForecast' && renderDemandReport(insights.demandForecast.data)}
            {activeInsight === 'reorderQueue' && renderReorderReport(insights.reorderQueue.data)}
            {activeInsight === 'churn' && renderChurnReport(insights.churn.data)}
            {activeInsight === 'affinity' && renderAffinityReport(insights.affinity.data)}
            {activeInsight === 'ltv' && renderLTVReport(insights.ltv.data)}
            {activeInsight === 'heatmap' && renderHeatmapReport(insights.heatmap.data)}
            {activeInsight === 'revenueForecast' && renderRevenueForecastReport(insights.revenueForecast.data)}
          </div>
        )}
      </div>
    </div>
  )
}

// Sub-component: Card for On-Demand Actions
function InsightActionCard({ title, description, insightKey, apiPath, state, onRun, isActive, onSelect }) {
  return (
    <div style={{
      background: '#1f2937',
      border: isActive ? '2px solid #ea580c' : '1px solid #374151',
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      cursor: state.data ? 'pointer' : 'default',
      transition: 'transform 0.2s',
    }}
    onClick={() => {
      if (state.data && !isActive) {
        onSelect()
      }
    }}
    >
      <div>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: isActive ? '#f97316' : '#f3f4f6' }}>{title}</h4>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#9ca3af', lineHeight: '1.5' }}>{description}</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRun(insightKey, apiPath)
          }}
          disabled={state.loading}
          style={{
            padding: '8px 14px',
            backgroundColor: state.data ? 'transparent' : '#ea580c',
            border: state.data ? '1px solid #ea580c' : 'none',
            borderRadius: '6px',
            color: state.data ? '#ea580c' : '#fff',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          {state.loading ? '⏳ Computing...' : (state.data ? '🔄 Recompute' : '⚙️ Run Analysis')}
        </button>

        {state.timestamp && (
          <span style={{ fontSize: '11px', color: '#10b981' }}>✓ Computed</span>
        )}
      </div>
    </div>
  )
}

// 1. RFM Report Rendering
function renderRFMReport(data) {
  const chartData = Object.entries(data.segments).map(([key, val]) => ({
    name: key,
    value: val
  }))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
      <div>
        <h4 style={{ marginTop: 0 }}>Customer Segments Allocation</h4>
        <div style={{ width: '100%', height: 250 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9ca3af" fontSize={11} />
              <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={11} width={120} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} />
              <Bar dataKey="value" name="Customers" fill="#f97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <h4 style={{ marginTop: 0 }}>Top Customers by Spending</h4>
        <div className="data-table" style={{ maxHeight: '250px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #374151', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Name</th>
                <th style={{ padding: '8px' }}>Recency (days)</th>
                <th style={{ padding: '8px' }}>Frequency</th>
                <th style={{ padding: '8px' }}>Spent</th>
                <th style={{ padding: '8px' }}>Segment</th>
              </tr>
            </thead>
            <tbody>
              {data.top_customers.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1f2937' }}>
                  <td style={{ padding: '8px' }}>{c.name}</td>
                  <td style={{ padding: '8px' }}>{c.recency}</td>
                  <td style={{ padding: '8px' }}>{c.frequency}</td>
                  <td style={{ padding: '8px', color: '#10b981' }}>₹{c.monetary.toLocaleString()}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{
                      backgroundColor: c.segment === 'Champions' ? '#ea580c' : '#374151',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: '#fff'
                    }}>{c.segment}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// 2. Demand Forecast Report Rendering
function renderDemandReport(data) {
  const chartData = [
    ...data.historical.map(h => ({ date: h.date, Revenue: h.revenue })),
    ...data.forecast.map(f => ({ date: f.date, Forecast: f.projected_revenue }))
  ]

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <strong>Growth/Demand Trend:</strong>{' '}
        <span style={{ color: data.trend === 'upward' ? '#10b981' : (data.trend === 'downward' ? '#ef4444' : '#9ca3af') }}>
          {data.trend.toUpperCase()} ({data.slope >= 0 ? '+' : ''}{data.slope} Rs/day velocity)
        </span>
      </div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickFormatter={(val) => val.substring(5, 10)} />
            <YAxis stroke="#9ca3af" fontSize={11} />
            <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} />
            <Legend />
            <Line type="monotone" dataKey="Revenue" stroke="#9ca3af" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Forecast" stroke="#f97316" strokeWidth={3} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// 3. Smart Reorder Queue Report Rendering
function renderReorderReport(data) {
  return (
    <div>
      <h4 style={{ marginTop: 0 }}>Inventory Reorder Recommendations</h4>
      {data.length === 0 ? (
        <p style={{ color: '#10b981', fontWeight: 'bold' }}>✓ All products are fully stocked! No reorders needed within 14 days.</p>
      ) : (
        <div className="data-table" style={{ maxHeight: '350px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #374151', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Product</th>
                <th style={{ padding: '8px' }}>Current Stock</th>
                <th style={{ padding: '8px' }}>Sales Velocity (/day)</th>
                <th style={{ padding: '8px' }}>Days Left</th>
                <th style={{ padding: '8px' }}>Recommended Reorder</th>
                <th style={{ padding: '8px' }}>Estimated Cost</th>
                <th style={{ padding: '8px' }}>Priority</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #1f2937' }}>
                  <td style={{ padding: '8px' }}>{item.product_name}</td>
                  <td style={{ padding: '8px' }}>{item.current_stock}</td>
                  <td style={{ padding: '8px' }}>{item.daily_sales_rate}</td>
                  <td style={{ padding: '8px' }}>{item.days_left}</td>
                  <td style={{ padding: '8px', color: '#f97316', fontWeight: 'bold' }}>+{item.recommended_reorder_qty}</td>
                  <td style={{ padding: '8px' }}>₹{item.estimated_cost.toLocaleString()}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{
                      backgroundColor: item.priority === 'HIGH' ? '#ef4444' : (item.priority === 'MEDIUM' ? '#d97706' : '#4b5563'),
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: '#fff'
                    }}>{item.priority}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// 4. Churn Risk Report Rendering
function renderChurnReport(data) {
  return (
    <div>
      <h4 style={{ marginTop: 0 }}>At-Risk Churning Customers</h4>
      {data.length === 0 ? (
        <p style={{ color: '#10b981', fontWeight: 'bold' }}>✓ Customer retention is stable. No users flagged for churn risk.</p>
      ) : (
        <div className="data-table" style={{ maxHeight: '350px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #374151', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Name</th>
                <th style={{ padding: '8px' }}>Email</th>
                <th style={{ padding: '8px' }}>Inactive (days)</th>
                <th style={{ padding: '8px' }}>Avg Purchase Interval</th>
                <th style={{ padding: '8px' }}>Orders</th>
                <th style={{ padding: '8px' }}>Risk Probability</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #1f2937' }}>
                  <td style={{ padding: '8px' }}>{c.customer_name}</td>
                  <td style={{ padding: '8px' }}>{c.customer_email}</td>
                  <td style={{ padding: '8px', color: '#ef4444' }}>{c.days_inactive}</td>
                  <td style={{ padding: '8px' }}>{c.avg_order_interval_days} days</td>
                  <td style={{ padding: '8px' }}>{c.total_orders}</td>
                  <td style={{ padding: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '60px', height: '6px', backgroundColor: '#374151', borderRadius: '3px' }}>
                        <div style={{ height: '100%', width: `${c.churn_risk_percentage}%`, backgroundColor: '#ef4444', borderRadius: '3px' }}></div>
                      </div>
                      <span style={{ fontWeight: 'bold', color: c.risk_level === 'CRITICAL' ? '#ef4444' : '#f97316' }}>{c.churn_risk_percentage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// 5. Product Affinity Report Rendering
function renderAffinityReport(data) {
  return (
    <div>
      <h4 style={{ marginTop: 0 }}>Product Association Rules (Co-occurrences)</h4>
      {data.length === 0 ? (
        <p style={{ color: '#9ca3af' }}>Not enough order data to calculate affinity pairs. Place multiple items on same dates to compute rules.</p>
      ) : (
        <div className="data-table" style={{ maxHeight: '350px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #374151', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Product A</th>
                <th style={{ padding: '8px' }}>Product B</th>
                <th style={{ padding: '8px' }}>Co-occurrences</th>
                <th style={{ padding: '8px' }}>Support %</th>
                <th style={{ padding: '8px' }}>Confidence A &rarr; B</th>
                <th style={{ padding: '8px' }}>Confidence B &rarr; A</th>
              </tr>
            </thead>
            <tbody>
              {data.map((rule, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #1f2937' }}>
                  <td style={{ padding: '8px' }}>{rule.product_A}</td>
                  <td style={{ padding: '8px' }}>{rule.product_B}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{rule.co_occurrences} times</td>
                  <td style={{ padding: '8px' }}>{rule.support_percentage}%</td>
                  <td style={{ padding: '8px', color: '#f97316' }}>{rule.confidence_A_to_B}%</td>
                  <td style={{ padding: '8px', color: '#f97316' }}>{rule.confidence_B_to_A}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// 6. LTV Report Rendering
function renderLTVReport(data) {
  return (
    <div>
      <h4 style={{ marginTop: 0 }}>Customer Lifetime Value Projections (Ranked)</h4>
      <div className="data-table" style={{ maxHeight: '350px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #374151', textAlign: 'left' }}>
              <th style={{ padding: '8px' }}>Customer</th>
              <th style={{ padding: '8px' }}>Orders</th>
              <th style={{ padding: '8px' }}>Total Spent</th>
              <th style={{ padding: '8px' }}>AOV</th>
              <th style={{ padding: '8px' }}>Monthly Orders Rate</th>
              <th style={{ padding: '8px' }}>Projected LTV (1yr)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #1f2937' }}>
                <td style={{ padding: '8px' }}>{c.customer_name}</td>
                <td style={{ padding: '8px' }}>{c.total_orders}</td>
                <td style={{ padding: '8px' }}>₹{c.total_spent.toLocaleString()}</td>
                <td style={{ padding: '8px' }}>₹{c.average_order_value.toLocaleString()}</td>
                <td style={{ padding: '8px' }}>{c.monthly_order_frequency} /mo</td>
                <td style={{ padding: '8px', color: '#10b981', fontWeight: 'bold', fontSize: '14px' }}>₹{c.projected_lifetime_value.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// 7. Hourly Heatmap Report Rendering
function renderHeatmapReport(data) {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const hours = Array.from({ length: 24 }, (_, i) => i)

  // Find max count to scale opacity/shading
  const maxCount = Math.max(...data.map(d => d.count), 1)

  return (
    <div>
      <h4 style={{ marginTop: 0 }}>Hourly Sales Volume Matrix</h4>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: '700px', display: 'grid', gridTemplateColumns: '80px repeat(24, 1fr)', gap: '2px', fontSize: '10px' }}>
          {/* Header row */}
          <div>Day</div>
          {hours.map(h => (
            <div key={h} style={{ textAlign: 'center', fontWeight: 'bold', color: '#9ca3af' }}>{h}h</div>
          ))}

          {/* Grid rows */}
          {daysOfWeek.map(day => {
            const dayRow = data.filter(d => d.day === day)
            return (
              <React.Fragment key={day}>
                <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', padding: '4px 0' }}>{day.substring(0, 3)}</div>
                {hours.map(hour => {
                  const cell = dayRow.find(d => d.hour === hour)
                  const count = cell ? cell.count : 0
                  const intensity = count / maxCount
                  return (
                    <div
                      key={hour}
                      title={`${day} ${hour}:00 - ${count} orders`}
                      style={{
                        backgroundColor: count > 0 ? `rgba(249, 115, 22, ${0.15 + intensity * 0.85})` : '#1f2937',
                        borderRadius: '2px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: count > 0 ? '#fff' : '#4b5563',
                        fontWeight: count > 0 ? 'bold' : 'normal',
                        border: '1px solid #111827'
                      }}
                    >
                      {count > 0 ? count : ''}
                    </div>
                  )
                })}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// 8. Revenue Forecast Report Rendering
function renderRevenueForecastReport(data) {
  const chartData = [
    ...data.historical.map(h => ({ date: h.date, Actual: h.revenue, Smooth: h.rolling_avg })),
    ...data.forecast.map(f => ({ date: f.date, Forecast: f.projected_revenue }))
  ]

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <strong>Revenue Projection Class:</strong>{' '}
        <span style={{ color: data.trend === 'accelerating' ? '#10b981' : (data.trend === 'decelerating' ? '#ef4444' : '#9ca3af') }}>
          {data.trend.toUpperCase()} (Quadratic scale coeff: {data.quadratic_coefficient})
        </span>
      </div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickFormatter={(val) => val.substring(5, 10)} />
            <YAxis stroke="#9ca3af" fontSize={11} />
            <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} />
            <Legend />
            <Line type="monotone" dataKey="Actual" stroke="#4b5563" strokeWidth={1} dot={false} name="Actual Revenue (Daily)" />
            <Line type="monotone" dataKey="Smooth" stroke="#f97316" strokeWidth={2} dot={false} name="7D Rolling Average" />
            <Line type="monotone" dataKey="Forecast" stroke="#ef4444" strokeWidth={3} strokeDasharray="5 5" name="30D Projected Forecast" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
