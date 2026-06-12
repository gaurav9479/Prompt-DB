import React, { useState, useEffect, useRef, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import { getApiUrl, getWebSocketUrl } from '../config'
import ThemeSelector from '../components/ThemeSelector'
import { useTheme } from '../context/ThemeContext'
import { useVoiceRecognition } from '../hooks/useVoiceRecognition'
import VoiceButton from '../components/VoiceButton'
import { getPasswordStrength } from '../utils/helpers'
import AnalyticsView from '../components/analytics/AnalyticsView'


const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4']
const PAGE_SIZE = 20

function AdminDashboard({ user, setUser, logout }) {
  const { colorTheme, setColorTheme } = useTheme()

  const [shopCategories, setShopCategories] = useState([])
  const [shops, setShops] = useState([])
  const [selectedShopCategory, setSelectedShopCategory] = useState(null)
  const [selectedShop, setSelectedShop] = useState(null)
  const [shopProducts, setShopProducts] = useState([])
  const [cart, setCart] = useState([])
  const [command, setCommand] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [logs, setLogs] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [shopsSearch, setShopsSearch] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)
  const [quickActions, setQuickActions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [shopsPage, setShopsPage] = useState(0);

  useEffect(() => {
    let retryAttempt = 0;
    const maxDelay = 30000; 
    const connect = () => {
      const ws = new WebSocket(getWebSocketUrl('api/ws'));
      ws.onopen = () => {
        setIsConnected(true);
        addLog('WebSocket connected', 'info');
        retryAttempt = 0;
      };
      ws.onclose = () => {
        setIsConnected(false);
        addLog('WebSocket disconnected, attempting reconnect', 'warning');
        const delay = Math.min(1000 * Math.pow(2, retryAttempt), maxDelay);
        retryAttempt += 1;
        setTimeout(connect, delay);
      };
      ws.onerror = (event) => {
        console.error('WebSocket error', event);

      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'data_update') {
            if (data.entity === 'product') {
              if (user?.shop_id && user.shop_id !== 'null') {
                fetchAdminProducts(user.shop_id, 0, true);
                fetchAdminDashboard(user.shop_id);
              }
            } else if (data.entity === 'order') {
              if (user?.shop_id && user.shop_id !== 'null') {
                fetchAdminOrders(user.shop_id, 0, true);
                fetchAdminDashboard(user.shop_id);
              }
            }
            addLog(`🔄 Real-time update: ${data.entity} ${data.operation}`, 'info');
          }
          if (data.type === 'action_result' && data.success) {
            const productActions = ['create_product','update_product','delete_product','restock_product','set_product_price','toggle_product_status','set_featured'];
            const orderActions   = ['create_order','update_order','cancel_order','confirm_order','ship_order','deliver_order','refund_order'];
            if (productActions.includes(data.action)) {
              if (user?.shop_id && user.shop_id !== 'null') {
                fetchAdminProducts(user.shop_id, 0, true);
                fetchAdminDashboard(user.shop_id);
              }
            } else if (orderActions.includes(data.action)) {
              if (user?.shop_id && user.shop_id !== 'null') {
                fetchAdminOrders(user.shop_id, 0, true);
                fetchAdminDashboard(user.shop_id);
              }
            }
          }
        } catch (e) {
          console.error('WebSocket message error', e);
        }
      };
    };
    connect();

    return () => {

    };
  }, []);  const [shopsHasMore, setShopsHasMore] = useState(false)
  const [productsPage, setProductsPage] = useState(0)
  const [productsHasMore, setProductsHasMore] = useState(false)
  const [dashboardStats, setDashboardStats] = useState({})
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [expiringProducts, setExpiringProducts] = useState([])
  const [clearanceProducts, setClearanceProducts] = useState([])
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [activityLogs, setActivityLogs] = useState([])
  const [editingProduct, setEditingProduct] = useState(null)
  const [adminProductSearch, setAdminProductSearch] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('')
  const [adminProductsPage, setAdminProductsPage] = useState(0)
  const [adminProductsHasMore, setAdminProductsHasMore] = useState(false)
  const [ordersPage, setOrdersPage] = useState(0)
  const [ordersHasMore, setOrdersHasMore] = useState(false)
  const [productForm, setProductForm] = useState({
    name: '', description: '', brand: '', sku: '', barcode: '',
    price: '', cost_price: '', min_price: '', compare_at_price: '',
    quantity: '', min_stock_level: '5', category_id: '',
    tags: '', unit: 'piece', is_featured: false,
    is_perishable: false, expiry_date: '', clearance_discount: '20'
  })
  const [platformStats, setPlatformStats] = useState({})
  const [allShops, setAllShops] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [shopForm, setShopForm] = useState({
    name: '', description: '', category_id: '',
    owner_name: '', owner_email: '', owner_phone: '',
    address: '', city: '', pincode: '', gst_number: ''
  })
  const [editingShop, setEditingShop] = useState(null)
  const [showShopForm, setShowShopForm] = useState(false)
  const [superAdminTab, setSuperAdminTab] = useState('overview')
  const [shopSearch, setShopSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [allShopsPage, setAllShopsPage] = useState(0)
  const [allShopsHasMore, setAllShopsHasMore] = useState(false)
  const [usersPage, setUsersPage] = useState(0)
  const [usersHasMore, setUsersHasMore] = useState(false)
  const [selectedAdminCategory, setSelectedAdminCategory] = useState(null)
  const [categoryShops, setCategoryShops] = useState([])
  const [categoryInfo, setCategoryInfo] = useState(null)
  const [showShopDetailModal, setShowShopDetailModal] = useState(false)
  const [shopDetailStats, setShopDetailStats] = useState(null)
  const [loadingShopDetail, setLoadingShopDetail] = useState(false)


  const { isListening, voiceSupported, toggleListening } = useVoiceRecognition(setCommand)


  const lastItemRef = useRef(null)


  useEffect(() => {
    if (user?.shop_id && user.shop_id !== 'null') {
      fetchAdminDashboard(user.shop_id)
      fetchAdminProducts(user.shop_id, 0, true)
      fetchAdminOrders(user.shop_id, 0, true)
      fetchShopActivityLogs()
    }
    fetchShopCategories()
    if (user?.role) fetchQuickActions(user.role)
  }, [user])


  useEffect(() => {
    if (!command.trim()) { setSuggestions([]); setShowSuggestions(false); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(getApiUrl(`api/command/suggestions?q=${encodeURIComponent(command)}`))
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.suggestions || [])
          setShowSuggestions((data.suggestions || []).length > 0)
        }
      } catch (err) { console.error('Error fetching suggestions:', err) }
    }, 300)
    return () => clearTimeout(timer)
  }, [command])


  const fetchShopCategories = async () => {
    try {
      const res = await fetch(getApiUrl('api/shop-categories/with-counts'))
      if (res.ok) setShopCategories(await res.json())
    } catch (err) { console.error('Error fetching shop categories:', err) }
  }

  const fetchQuickActions = async (role) => {
    try {
      const res = await fetch(getApiUrl(`api/command/quick-actions?role=${role}`))
      if (res.ok) {
        const data = await res.json()
        setQuickActions(data.quick_actions || [])
      }
    } catch (err) { console.error('Error fetching quick actions:', err) }
  }

  const handleSuggestionSelect = (suggestion) => {

    if (suggestion.examples && suggestion.examples.length > 0) {
      setCommand(suggestion.examples[0])
    } else {
      setCommand(suggestion.template)
    }
    setShowSuggestions(false)
    setSelectedSuggestion(-1)
  }

  const handleQuickAction = (action) => {
    setCommand(action.command)

  }

  const handleCommandKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedSuggestion(prev => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedSuggestion(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && selectedSuggestion >= 0) {
      e.preventDefault()
      handleSuggestionSelect(suggestions[selectedSuggestion])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const fetchShopsByCategory = async (categoryId, page = 0, reset = false) => {
    if (isLoading && !reset) return
    setIsLoading(true)
    try {
      let url = `api/shops/by-category/${categoryId}?skip=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`
      if (shopsSearch) url += `&search=${encodeURIComponent(shopsSearch)}`
      const res = await fetch(getApiUrl(url))
      if (res.ok) {
        const data = await res.json()
        setShops(prev => reset ? data : [...prev, ...data])
        setShopsHasMore(data.length === PAGE_SIZE)
        setShopsPage(page)
      }
    } catch (err) { console.error('Error fetching shops:', err) }
    finally { setIsLoading(false) }
  }

  const fetchShopProducts = async (shopId, page = 0, reset = false) => {
    if (isLoading && !reset) return
    setIsLoading(true)
    try {
      let url = `api/shops/${shopId}/products?skip=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`
      const res = await fetch(getApiUrl(url))
      if (res.ok) {
        const data = await res.json()
        setShopProducts(prev => reset ? data : [...prev, ...data])
        setProductsHasMore(data.length === PAGE_SIZE)
        setProductsPage(page)
      }
    } catch (err) { console.error('Error fetching products:', err) }
    finally { setIsLoading(false) }
  }

  const fetchAdminDashboard = async (shopId) => {
    try {
      const [dashRes, lowRes, catRes, expiryRes, clearanceRes] = await Promise.all([
        fetch(getApiUrl(`api/shops/${shopId}/dashboard`)),
        fetch(getApiUrl(`api/shops/${shopId}/low-stock`)),
        fetch(getApiUrl('api/categories')),
        fetch(getApiUrl(`api/shops/${shopId}/expiring-soon`)),
        fetch(getApiUrl(`api/shops/${shopId}/clearance`))
      ])
      if (dashRes.ok) setDashboardStats(await dashRes.json())
      if (lowRes.ok) setLowStockProducts(await lowRes.json())
      if (catRes.ok) setCategories(await catRes.json())
      if (expiryRes.ok) setExpiringProducts(await expiryRes.json())
      if (clearanceRes.ok) setClearanceProducts(await clearanceRes.json())
    } catch (err) { console.error('Error fetching dashboard:', err) }
  }

  const fetchAdminProducts = async (shopId, page = 0, reset = false) => {
    if (isLoading && !reset) return
    setIsLoading(true)
    try {
      let url = `api/products?include_inactive=true&shop_id=${shopId}&skip=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`;
      if (adminProductSearch) url += `&search=${encodeURIComponent(adminProductSearch)}`;
      const res = await fetch(getApiUrl(url));
      if (res.ok) {
        const data = await res.json()
        setProducts(prev => reset ? data : [...prev, ...data])
        setAdminProductsHasMore(data.length === PAGE_SIZE)
        setAdminProductsPage(page)
      }
    } catch (err) { console.error('Error fetching products:', err) }
    finally { setIsLoading(false) }
  }

  const fetchAdminOrders = async (shopId, page = 0, reset = false) => {
    if (isLoading && !reset) return
    setIsLoading(true)
    try {
      let url = `api/shops/${shopId}/orders?skip=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`
      if (orderStatusFilter) url += `&status=${orderStatusFilter}`
      const res = await fetch(getApiUrl(url))
      if (res.ok) {
        let data = await res.json()
        if (orderSearch) {
          data = data.filter(o =>
            o.customer_name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
            o.product_name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
            o.id.toString().includes(orderSearch)
          )
        }
        setOrders(prev => reset ? data : [...prev, ...data])
        setOrdersHasMore(data.length === PAGE_SIZE)
        setOrdersPage(page)
      }
    } catch (err) { console.error('Error fetching orders:', err) }
    finally { setIsLoading(false) }
  }

  const downloadInvoice = async (orderId) => {
    setIsLoading(true)
    try {
      const res = await fetch(getApiUrl(`api/orders/${orderId}/invoice`))
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `invoice_INV-${String(orderId).padStart(6, '0')}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
        addLog(`Invoice for Order #${orderId} downloaded successfully`, 'success')
      } else {
        addLog('Failed to download invoice', 'danger')
      }
    } catch (err) {
      console.error('Error downloading invoice:', err)
      addLog('Error downloading invoice', 'danger')
    } finally {
      setIsLoading(false)
    }
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    setIsLoading(true)
    try {
      const res = await fetch(getApiUrl(`api/orders/${orderId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        addLog(`Order #${orderId} status updated to ${newStatus}`, 'success')
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
        fetchAdminDashboard(user.shop_id)
      } else {
        const errData = await res.json()
        addLog(`Failed to update order status: ${errData.detail || 'Unknown error'}`, 'danger')
      }
    } catch (err) {
      console.error('Error updating order status:', err)
      addLog('Error updating order status', 'danger')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPlatformStats = async () => {
    try {
      const res = await fetch(getApiUrl('api/platform/stats'))
      if (res.ok) setPlatformStats(await res.json())
    } catch (err) { console.error('Error fetching platform stats:', err) }
  }

  const fetchAllShops = async (page = 0, reset = false) => {
    if (isLoading && !reset) return
    setIsLoading(true)
    try {
      let url = `api/platform/shops?skip=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`
      if (shopSearch) url += `&search=${encodeURIComponent(shopSearch)}`
      const res = await fetch(getApiUrl(url))
      if (res.ok) {
        let data = await res.json()
        if (shopSearch) {
          data = data.filter(s =>
            s.name?.toLowerCase().includes(shopSearch.toLowerCase()) ||
            s.owner_email?.toLowerCase().includes(shopSearch.toLowerCase()) ||
            s.city?.toLowerCase().includes(shopSearch.toLowerCase())
          )
        }
        setAllShops(prev => reset ? data : [...prev, ...data])
        setAllShopsHasMore(data.length === PAGE_SIZE)
        setAllShopsPage(page)
      }
    } catch (err) { console.error('Error fetching shops:', err) }
    finally { setIsLoading(false) }
  }

  const fetchAllUsers = async (page = 0, reset = false) => {
    if (isLoading && !reset) return
    setIsLoading(true)
    try {
      let url = `api/users?skip=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`
      if (userRoleFilter) url += `&role=${userRoleFilter}`
      const res = await fetch(getApiUrl(url))
      if (res.ok) {
        let data = await res.json()
        if (userSearch) {
          data = data.filter(u =>
            u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email?.toLowerCase().includes(userSearch.toLowerCase())
          )
        }
        setAllUsers(prev => reset ? data : [...prev, ...data])
        setUsersHasMore(data.length === PAGE_SIZE)
        setUsersPage(page)
      }
    } catch (err) { console.error('Error fetching users:', err) }
    finally { setIsLoading(false) }
  }

  const fetchCategoryShops = async (categoryId) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/shop-categories/${categoryId}/shops-with-stats`)
      if (res.ok) {
        const data = await res.json()
        setCategoryInfo(data.category)
        setCategoryShops(data.shops)
      }
    } catch (err) { console.error('Error fetching category shops:', err) }
    finally { setIsLoading(false) }
  }

  const fetchShopDetailStats = async (shopId) => {
    setLoadingShopDetail(true)
    try {
      const res = await fetch(`/api/shops/${shopId}/admin-stats`)
      if (res.ok) {
        const data = await res.json()
        setShopDetailStats(data)
        setShowShopDetailModal(true)
      }
    } catch (err) { console.error('Error fetching shop details:', err) }
    finally { setLoadingShopDetail(false) }
  }

  const openCategoryDetail = (categoryId) => {
    setSelectedAdminCategory(categoryId)
    fetchCategoryShops(categoryId)
  }

  const closeCategoryDetail = () => {
    setSelectedAdminCategory(null)
    setCategoryShops([])
    setCategoryInfo(null)
  }

  const closeShopDetailModal = () => {
    setShowShopDetailModal(false)
    setShopDetailStats(null)
  }

  const fetchShopActivityLogs = useCallback(async () => {
    if (!user?.shop_id) return
    try {
      const res = await fetch(getApiUrl(`api/command/logs/shop/${user.shop_id}`))
      if (res.ok) {
        setActivityLogs(await res.json())
      }
    } catch (err) {
      console.error('Error fetching shop activity logs:', err)
    }
  }, [user])

  const addLog = (message, type = 'info') => {
    setLogs(prev => [{ message, type, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 30))
  }


  const sendCommand = async (e) => {
    e?.preventDefault()
    if (!command.trim() || isProcessing) return
    setIsProcessing(true)
    addLog(`Processing: "${command}"`, 'info')
    try {

      const context = {}
      if (user?.shop_id) context.shop_id = user.shop_id
      if (user?.role)    context.role    = user.role
      if (user?.id)      context.user_id = user.id
      const res = await fetch(getApiUrl('api/command'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: command.trim(), context })
      })
      const data = await res.json()
      if (res.ok) {
        addLog(`Done: ${data.message || 'Command executed'}`, 'success')


        if (data.data?.action_type === 'prefill_form') {
          if (data.data.form_type === 'shop_registration') {

            const formData = data.data.form_data
            setShopForm({
              name: formData.name || '',
              description: formData.description || '',
              category_id: formData.category_id || '',
              owner_name: formData.owner_name || '',
              owner_email: formData.owner_email || '',
              owner_phone: formData.owner_phone || '',
              address: formData.address || '',
              city: formData.city || '',
              pincode: formData.pincode || '',
              gst_number: formData.gst_number || ''
            })
            setEditingShop(null)
            setShowShopForm(true)
            setSuperAdminTab('shops')
            addLog('Form pre-filled. Please review and submit.', 'info')
          }
        }

        fetchShopActivityLogs()

        if (user?.role === 'admin' && user.shop_id) {
          fetchAdminDashboard(user.shop_id)
          fetchAdminProducts(user.shop_id, 0, true)
          fetchAdminOrders(user.shop_id, 0, true)
        }
        if (user?.role === 'super_admin') {
          fetchPlatformStats()
          fetchAllShops(0, true)
        }
      } else {
        addLog(`Error: ${data.detail || 'Failed'}`, 'error')
      }
    } catch (err) { addLog(`Error: ${err.message}`, 'error') }
    finally { setIsProcessing(false); setCommand('') }
  }


  const createProduct = async (e) => {
    e.preventDefault()
    if (!user?.shop_id) return
    try {
      const data = {
        name: productForm.name,
        price: parseFloat(productForm.price),
        shop_id: user.shop_id,
        description: productForm.description || null,
        brand: productForm.brand || null,
        sku: productForm.sku || null,
        cost_price: productForm.cost_price ? parseFloat(productForm.cost_price) : null,
        min_price: productForm.min_price ? parseFloat(productForm.min_price) : null,
        quantity: parseInt(productForm.quantity) || 0,
        min_stock_level: parseInt(productForm.min_stock_level) || 5,
        category_id: productForm.category_id ? parseInt(productForm.category_id) : null,
        tags: productForm.tags || null,
        unit: productForm.unit,
        is_featured: productForm.is_featured,
        is_perishable: productForm.is_perishable,
        expiry_date: productForm.expiry_date ? new Date(productForm.expiry_date).toISOString() : null,
        clearance_discount: parseFloat(productForm.clearance_discount) || 20
      }
      const res = await fetch(getApiUrl('api/products'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        addLog(`Product "${productForm.name}" created`, 'success')
        resetProductForm()
        fetchAdminProducts(user.shop_id, 0, true)
        fetchAdminDashboard(user.shop_id)
      } else {
        const err = await res.json()
        addLog(`Error: ${err.detail}`, 'error')
      }
    } catch (err) { addLog(`Error: ${err.message}`, 'error') }
  }

  const updateProduct = async (e) => {
    e.preventDefault()
    if (!editingProduct) return
    try {
      const data = {
        name: productForm.name,
        price: parseFloat(productForm.price),
        description: productForm.description || null,
        brand: productForm.brand || null,
        sku: productForm.sku || null,
        cost_price: productForm.cost_price ? parseFloat(productForm.cost_price) : null,
        min_price: productForm.min_price ? parseFloat(productForm.min_price) : null,
        quantity: parseInt(productForm.quantity) || 0,
        min_stock_level: parseInt(productForm.min_stock_level) || 5,
        category_id: productForm.category_id ? parseInt(productForm.category_id) : null,
        tags: productForm.tags || null,
        unit: productForm.unit,
        is_featured: productForm.is_featured,
        is_perishable: productForm.is_perishable,
        expiry_date: productForm.expiry_date ? new Date(productForm.expiry_date).toISOString() : null,
        clearance_discount: parseFloat(productForm.clearance_discount) || 20
      }
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        addLog(`Product "${productForm.name}" updated`, 'success')
        setEditingProduct(null)
        resetProductForm()
        fetchAdminProducts(user.shop_id, 0, true)
        fetchAdminDashboard(user.shop_id)
      }
    } catch (err) { addLog(`Error: ${err.message}`, 'error') }
  }

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    addLog('Product deleted', 'success')
    fetchAdminProducts(user.shop_id, 0, true)
    fetchAdminDashboard(user.shop_id)
  }

  const editProduct = (p) => {
    setEditingProduct(p)
    setProductForm({
      name: p.name, description: p.description || '', brand: p.brand || '',
      sku: p.sku || '', barcode: p.barcode || '',
      price: p.price.toString(), cost_price: p.cost_price?.toString() || '',
      min_price: p.min_price?.toString() || '',
      compare_at_price: p.compare_at_price?.toString() || '',
      quantity: p.quantity.toString(), min_stock_level: p.min_stock_level.toString(),
      category_id: p.category_id?.toString() || '', tags: p.tags || '',
      unit: p.unit, is_featured: p.is_featured,
      is_perishable: p.is_perishable || false,
      expiry_date: p.expiry_date ? p.expiry_date.split('T')[0] : '',
      clearance_discount: p.clearance_discount?.toString() || '20'
    })
    setActiveTab('products')
  }

  const resetProductForm = () => {
    setProductForm({
      name: '', description: '', brand: '', sku: '', barcode: '',
      price: '', cost_price: '', min_price: '', compare_at_price: '',
      quantity: '', min_stock_level: '5', category_id: '',
      tags: '', unit: 'piece', is_featured: false,
      is_perishable: false, expiry_date: '', clearance_discount: '20'
    })
    setEditingProduct(null)
  }


  const verifyShop = async (shopId) => {
    const res = await fetch(`/api/platform/shops/${shopId}/verify`, { method: 'PATCH' })
    if (res.ok) {
      addLog('Shop verified', 'success')
      fetchAllShops(0, true)
      fetchPlatformStats()
    }
  }

  const suspendShop = async (shopId) => {
    if (!confirm('Suspend this shop?')) return
    const res = await fetch(`/api/platform/shops/${shopId}/suspend`, { method: 'PATCH' })
    if (res.ok) {
      addLog('Shop suspended', 'success')
      fetchAllShops(0, true)
    }
  }

  const activateShop = async (shopId) => {
    const res = await fetch(`/api/platform/shops/${shopId}/activate`, { method: 'PATCH' })
    if (res.ok) {
      addLog('Shop activated', 'success')
      fetchAllShops(0, true)
    }
  }

  const resetShopForm = () => {
    setShopForm({
      name: '', description: '', category_id: '',
      owner_name: '', owner_email: '', owner_phone: '',
      address: '', city: '', pincode: '', gst_number: ''
    })
    setEditingShop(null)
    setShowShopForm(false)
  }

  const submitShopForm = async (e) => {
    e.preventDefault()
    const payload = {
      ...shopForm,
      category_id: shopForm.category_id ? parseInt(shopForm.category_id) : null
    }

    let res
    if (editingShop) {
      res = await fetch(`/api/shops/${editingShop.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } else {
      res = await fetch(getApiUrl('api/shops'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    }

    if (res.ok) {
      addLog(editingShop ? 'Shop updated' : 'Shop registered', 'success')
      resetShopForm()
      fetchAllShops(0, true)
      fetchPlatformStats()
    } else {
      addLog('Failed to save shop', 'error')
    }
  }

  const startEditShop = (shop) => {
    setShopForm({
      name: shop.name || '',
      description: shop.description || '',
      category_id: shop.category_id?.toString() || '',
      owner_name: shop.owner_name || '',
      owner_email: shop.owner_email || '',
      owner_phone: shop.owner_phone || '',
      address: shop.address || '',
      city: shop.city || '',
      pincode: shop.pincode || '',
      gst_number: shop.gst_number || ''
    })
    setEditingShop(shop)
    setShowShopForm(true)
  }

  const deleteShop = async (shopId) => {
    if (!confirm('Delete this shop? This cannot be undone.')) return
    const res = await fetch(`/api/shops/${shopId}`, { method: 'DELETE' })
    if (res.ok) {
      addLog('Shop deleted', 'success')
      fetchAllShops(0, true)
      fetchPlatformStats()
    }
  }


  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { ...product, qty: 1 }]
    })
    addLog(`Added ${product.name} to cart`, 'success')
  }

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id))
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0)


  const SearchFilterBar = ({ search, setSearch, placeholder, filters }) => (
    <div className="search-filter-bar">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={placeholder}
          className="search-input"
        />
        {search && <button className="clear-btn" onClick={() => setSearch('')}>×</button>}
      </div>
      {filters}
    </div>
  )


  const LoadMoreButton = ({ hasMore, isLoading, onClick }) => (
    hasMore && (
      <div className="load-more-wrapper">
        <button className="load-more-btn" onClick={onClick} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load More'}
        </button>
      </div>
    )
  )


  return (
    <div className="admin-app">
      <header className="admin-header">
        <div className="header-left">
          <h1>Shop Dashboard</h1>
          <p>Manage your shop</p>
        </div>
        <div className="header-right">
          <div className="connection-status"><span className={`dot ${isConnected ? 'connected' : ''}`}></span>{isConnected ? 'Live' : 'Offline'}</div>
          <ThemeSelector currentTheme={colorTheme} setTheme={setColorTheme} />
          <span className="user-info">{user.name}</span>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="command-panel">
        {quickActions.length > 0 && (
          <div className="quick-actions">
            {quickActions.map((action, i) => (
              <button key={i} className="quick-action-btn" onClick={() => handleQuickAction(action)} title={action.command}>
                <span className="qa-label">{action.label}</span>
                {action.label_hi && <span className="qa-label-hi">{action.label_hi}</span>}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={sendCommand} className="command-form">
          <div className="command-input-wrapper">
            <span className="command-icon">🤖</span>
            <input
              type="text"
              value={command}
              onChange={e => setCommand(e.target.value)}
              onKeyDown={handleCommandKeyDown}
              onFocus={() => command.trim() && suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={isListening ? "🎤 सुन रहा हूं... बोलिए" : "बोलो या टाइप करो... (Hindi/English दोनों चलेगा)"}
              disabled={isProcessing}
              className={`command-input ${isListening ? 'listening' : ''}`}
            />
            <VoiceButton
              isListening={isListening}
              isSupported={voiceSupported}
              onClick={toggleListening}
              disabled={isProcessing}
            />
            <button type="submit" disabled={isProcessing || !command.trim()} className="command-btn">{isProcessing ? '...' : 'Go'}</button>
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className={`suggestion-item ${selectedSuggestion === i ? 'selected' : ''}`}
                  onClick={() => handleSuggestionSelect(s)}
                >
                  <div className="suggestion-header">
                    <span className="suggestion-category">{s.category} {s.category_hi && `| ${s.category_hi}`}</span>
                    <span className="suggestion-command">{s.description}</span>
                  </div>
                  <div className="suggestion-desc-hi">{s.description_hi}</div>
                  <div className="suggestion-example">{s.examples?.[0] || s.template}</div>
                  {s.examples_hi?.[0] && <div className="suggestion-example-hi">{s.examples_hi[0]}</div>}
                </div>
              ))}
            </div>
          )}
        </form>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-value">{dashboardStats.total_products || 0}</div><div className="stat-label">Products</div></div>
        <div className="stat-card success"><div className="stat-value">${dashboardStats.total_revenue?.toLocaleString() || 0}</div><div className="stat-label">Total Revenue</div></div>
        <div className="stat-card"><div className="stat-value">{dashboardStats.total_orders || 0}</div><div className="stat-label">Orders</div></div>
        <div className="stat-card warning"><div className="stat-value">{dashboardStats.pending_orders || 0}</div><div className="stat-label">Pending</div></div>
        <div className="stat-card danger"><div className="stat-value">{dashboardStats.low_stock_count || 0}</div><div className="stat-label">Low Stock</div></div>
        <div className="stat-card"><div className="stat-value">${dashboardStats.inventory_value?.toLocaleString() || 0}</div><div className="stat-label">Inventory Value</div></div>
      </div>

      <div className="tabs">
        {['dashboard', 'products', 'orders', 'analytics'].map(tab => (
          <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'analytics' ? 'Analytics' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="dashboard-grid">
          <div className="panel alerts-panel">
            <h2>Low Stock Alerts</h2>
            {lowStockProducts.length === 0 ? <p className="empty">All products are well stocked</p> : (
              <div className="alert-list">
                {lowStockProducts.map(p => (
                  <div key={p.id} className="alert-item">
                    <span className="alert-name">{p.name}</span>
                    <span className="alert-sku">{p.sku}</span>
                    <span className={`alert-qty ${p.quantity === 0 ? 'zero' : ''}`}>{p.quantity} left</span>
                    <button onClick={() => editProduct(products.find(prod => prod.id === p.id))}>Restock</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="panel expiry-panel">
            <h2>Expiring Soon</h2>
            {expiringProducts.length === 0 ? <p className="empty">No products expiring soon</p> : (
              <div className="alert-list">
                {expiringProducts.map(p => (
                  <div key={p.id} className={`alert-item expiry-item ${p.days_until_expiry <= 7 ? 'critical' : ''}`}>
                    <span className="alert-name">{p.name}</span>
                    <span className={`expiry-days ${p.days_until_expiry <= 7 ? 'urgent' : ''}`}>
                      {p.days_until_expiry} days left
                    </span>
                    <span className="expiry-price">
                      {p.is_on_clearance ? (
                        <>
                          <span className="original-price">₹{p.price}</span>
                          <span className="clearance-price">₹{p.clearance_price}</span>
                        </>
                      ) : (
                        <span>₹{p.price}</span>
                      )}
                    </span>
                    {!p.is_on_clearance && (
                      <button className="clearance-btn" onClick={async () => {
                        await fetch(`/api/products/${p.id}/apply-clearance`, { method: 'POST' })
                        fetchAdminDashboard(user.shop_id)
                      }}>Put on Sale</button>
                    )}
                    {p.is_on_clearance && <span className="on-sale-badge">ON SALE</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="panel logs-panel">
            <h2>Recent Activity (हाल की गतिविधि)</h2>
            {activityLogs.length === 0 ? (
              <p className="empty" style={{ padding: '16px', color: 'var(--text-muted)' }}>No recent activity. Use the command bar to add products or complete transactions! (जैसे: "sell product Samsung TV")</p>
            ) : (
              <div className="log-list">
                {activityLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="log-item success">
                    <span className="log-time" style={{ marginRight: '12px', fontSize: '12px', opacity: 0.8 }}>
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="tab-content">
          <div className="form-panel">
            <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
            <form onSubmit={editingProduct ? updateProduct : createProduct}>
              <div className="form-section">
                <div className="form-group"><label>Product Name *</label><input type="text" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} required /></div>
                <div className="form-row">
                  <div className="form-group"><label>Brand</label><input type="text" value={productForm.brand} onChange={e => setProductForm({ ...productForm, brand: e.target.value })} /></div>
                  <div className="form-group"><label>SKU</label><input type="text" value={productForm.sku} onChange={e => setProductForm({ ...productForm, sku: e.target.value })} /></div>
                </div>
                <div className="form-group"><label>Description</label><textarea value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} /></div>
              </div>
              <div className="form-section">
                <h3>Pricing</h3>
                <div className="form-row">
                  <div className="form-group"><label>Cost Price</label><input type="number" step="0.01" value={productForm.cost_price} onChange={e => setProductForm({ ...productForm, cost_price: e.target.value })} placeholder="Your purchase cost" /></div>
                  <div className="form-group"><label>MRP / Selling Price *</label><input type="number" step="0.01" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} required /></div>
                  <div className="form-group"><label>Min Bargain Price</label><input type="number" step="0.01" value={productForm.min_price} onChange={e => setProductForm({ ...productForm, min_price: e.target.value })} placeholder="Lowest acceptable price" /></div>
                </div>
                {productForm.cost_price && productForm.price && (
                  <div className="pricing-summary">
                    <span className="profit-margin">Margin: {(((parseFloat(productForm.price) - parseFloat(productForm.cost_price)) / parseFloat(productForm.cost_price)) * 100).toFixed(1)}%</span>
                    <span className="profit-amount">Profit: ₹{(parseFloat(productForm.price) - parseFloat(productForm.cost_price)).toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="form-section">
                <h3>Inventory</h3>
                <div className="form-row">
                  <div className="form-group"><label>Quantity *</label><input type="number" value={productForm.quantity} onChange={e => setProductForm({ ...productForm, quantity: e.target.value })} required /></div>
                  <div className="form-group"><label>Low Stock Alert</label><input type="number" value={productForm.min_stock_level} onChange={e => setProductForm({ ...productForm, min_stock_level: e.target.value })} /></div>
                </div>
              </div>
              <div className="form-section expiry-section">
                <h3>Expiry & Clearance</h3>
                <div className="form-row">
                  <div className="form-group checkbox-group">
                    <label>
                      <input type="checkbox" checked={productForm.is_perishable} onChange={e => setProductForm({ ...productForm, is_perishable: e.target.checked })} />
                      Perishable Item (has expiry date)
                    </label>
                  </div>
                </div>
                {productForm.is_perishable && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Expiry Date</label>
                      <input type="date" value={productForm.expiry_date} onChange={e => setProductForm({ ...productForm, expiry_date: e.target.value })} min={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div className="form-group">
                      <label>Clearance Discount (%)</label>
                      <input type="number" value={productForm.clearance_discount} onChange={e => setProductForm({ ...productForm, clearance_discount: e.target.value })} min="0" max="90" placeholder="20" />
                      <small>Auto-applied when expiring soon</small>
                    </div>
                  </div>
                )}
              </div>
              <div className="form-group"><label>Tags (comma-separated)</label><input type="text" value={productForm.tags} onChange={e => setProductForm({ ...productForm, tags: e.target.value })} placeholder="e.g. lipstick, makeup" /></div>
              <div className="form-actions">
                {editingProduct && <button type="button" className="cancel-btn" onClick={resetProductForm}>Cancel</button>}
                <button type="submit" className="submit-btn">{editingProduct ? 'Update' : 'Add Product'}</button>
              </div>
            </form>
          </div>

          <div className="data-panel">
            <SearchFilterBar search={adminProductSearch} setSearch={setAdminProductSearch} placeholder="Search products..." />
            <h2>Products ({products.length})</h2>
            <div className="data-table">
              <table>
                <thead><tr><th>Product</th><th>SKU</th><th>Cost</th><th>MRP</th><th>Min Price</th><th>Margin</th><th>Stock</th><th>Sold</th><th>Actions</th></tr></thead>
                <tbody>
                  {products.map(p => {
                    const margin = p.cost_price && p.price ? Math.round(((p.price - p.cost_price) / p.cost_price) * 100) : null
                    return (
                      <tr key={p.id} className={!p.is_active ? 'inactive' : ''}>
                        <td><div className="product-cell"><strong>{p.name}</strong>{p.brand && <span className="brand">{p.brand}</span>}</div></td>
                        <td>{p.sku || '-'}</td>
                        <td className="cost">{p.cost_price ? `₹${p.cost_price}` : '-'}</td>
                        <td className="price">₹{p.price}</td>
                        <td>{p.min_price ? `₹${p.min_price}` : '-'}</td>
                        <td className={`margin ${margin && margin > 20 ? 'good' : margin && margin > 0 ? 'ok' : 'low'}`}>
                          {margin != null ? `${margin}%` : '-'}
                        </td>
                        <td className={p.quantity <= p.min_stock_level ? 'low-stock' : ''}>{p.quantity}</td>
                        <td>{p.sold_count}</td>
                        <td>
                          <button className="edit-btn" onClick={() => editProduct(p)}>Edit</button>
                          <button className="delete-btn" onClick={() => deleteProduct(p.id)}>Delete</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <LoadMoreButton hasMore={adminProductsHasMore} isLoading={isLoading} onClick={() => fetchAdminProducts(user.shop_id, adminProductsPage + 1)} />
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="orders-panel">
          <SearchFilterBar
            search={orderSearch}
            setSearch={setOrderSearch}
            placeholder="Search orders..."
            filters={
              <select value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)} className="filter-select">
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            }
          />
          <h2>Orders ({orders.length})</h2>
          {orders.length === 0 ? <p className="empty">No orders found</p> : (
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>MRP</th>
                    <th>Sold At</th>
                    <th>Profit</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td>#{o.id}</td>
                      <td>{o.customer_name}</td>
                      <td>
                        <div>{o.product_name}</div>
                        {o.notes && (
                          <div style={{ fontSize: '0.85em', color: '#f97316', fontStyle: 'italic', marginTop: '2px' }}>
                            📝 Note: {o.notes}
                          </div>
                        )}
                      </td>
                      <td>{o.quantity}</td>
                      <td className="price">₹{o.listed_price || o.unit_price}</td>
                      <td className="price">₹{o.final_price || o.unit_price}</td>
                      <td className={`profit ${(o.profit || 0) >= 0 ? 'positive' : 'negative'}`}>
                        ₹{o.profit != null ? o.profit.toFixed(2) : '-'}
                      </td>
                      <td>
                        <select
                          value={o.status}
                          onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                          className={`status-select ${o.status}`}
                          disabled={isLoading}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td>{new Date(o.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() => downloadInvoice(o.id)}
                          className="btn-download"
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            backgroundColor: '#f97316',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          📥 PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <LoadMoreButton hasMore={ordersHasMore} isLoading={isLoading} onClick={() => fetchAdminOrders(user.shop_id, ordersPage + 1)} />
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="panel analytics-panel" style={{ background: 'var(--bg-elevated)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-primary)', marginTop: '20px' }}>
          <AnalyticsView shopId={user.shop_id} getApiUrl={getApiUrl} />
        </div>
      )}
    </div>
  )

}

export default AdminDashboard
