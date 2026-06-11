import React, { useState, useEffect, useRef, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import { getApiUrl, getWebSocketUrl } from '../config'
import ThemeSelector from '../components/ThemeSelector'
import { useTheme } from '../context/ThemeContext'
import { useVoiceRecognition } from '../hooks/useVoiceRecognition'
import VoiceButton from '../components/VoiceButton'
import { getPasswordStrength } from '../utils/helpers'

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4']
const PAGE_SIZE = 20

function CustomerView({ user, setUser, logout }) {
  const { colorTheme, setColorTheme } = useTheme()

  const [shopCategories, setShopCategories] = useState([])
  const [shops, setShops] = useState([])
  const [selectedShopCategory, setSelectedShopCategory] = useState(null)
  const [selectedShop, setSelectedShop] = useState(null)
  const [shopProducts, setShopProducts] = useState([])
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [mainTab, setMainTab] = useState('shops')
  const [shopTab, setShopTab] = useState('products')
  const [customerOrders, setCustomerOrders] = useState([])
  const [customerOrdersLoading, setCustomerOrdersLoading] = useState(false)
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
  const [shopsPage, setShopsPage] = useState(0)
  const [shopsHasMore, setShopsHasMore] = useState(false)
  const [productsPage, setProductsPage] = useState(0)
  const [productsHasMore, setProductsHasMore] = useState(false)
  const [activityLogs, setActivityLogs] = useState([])

  const [dashboardStats, setDashboardStats] = useState(null)
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [expiringProducts, setExpiringProducts] = useState([])
  const [clearanceProducts, setClearanceProducts] = useState([])
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
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

  const [platformStats, setPlatformStats] = useState(null)
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
    fetchShopCategories()
    if (user?.role) fetchQuickActions(user.role)
    fetchCustomerActivityLogs()
    fetchCustomerOrders()
  }, [user])


  useEffect(() => {
    let ws;
    let retryAttempt = 0;
    const maxDelay = 30000;
    const connect = () => {
      ws = new WebSocket(getWebSocketUrl('api/ws'));
      ws.onopen = () => {
        retryAttempt = 0;
      };
      ws.onclose = () => {
        const delay = Math.min(1000 * Math.pow(2, retryAttempt), maxDelay);
        retryAttempt += 1;
        setTimeout(connect, delay);
      };
      ws.onerror = (event) => {
        console.error('Customer view WebSocket error', event);
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'data_update') {
            if (data.entity === 'order' || data.entity === 'product') {
              fetchCustomerActivityLogs();
              if (selectedShop) {
                fetchShopProducts(selectedShop, 0, true);
              }
            }
          }
        } catch (err) {
          console.error('Error handling WebSocket message in customer view', err);
        }
      };
    };
    connect();
    return () => {
      if (ws) ws.close();
    };
  }, [selectedShop]);


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


  useEffect(() => {
    if (selectedShopCategory) {
      fetchShopsByCategory(selectedShopCategory, 0, true)
    }
  }, [selectedShopCategory])


  useEffect(() => {
    if (selectedShop) {
      if (shopTab === 'orders') {
        fetchCustomerOrders(selectedShop)
      } else {
        fetchShopProducts(selectedShop, 0, true)
      }
    }
  }, [selectedShop, shopTab])


  useEffect(() => {
    if (mainTab === 'orders') {
      fetchCustomerOrders()
    }
  }, [mainTab])


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
    if (isLoading) return
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
    if (isLoading) return
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

  const fetchCustomerOrders = async (shopId = null) => {
    setCustomerOrdersLoading(true)
    try {
      let url = `api/orders?customer_email=${encodeURIComponent(user.email)}`
      if (shopId) {
        url += `&shop_id=${shopId}`
      }
      const res = await fetch(getApiUrl(url))
      if (res.ok) {
        const data = await res.json()
        setCustomerOrders(data)
      }
    } catch (err) {
      console.error('Error fetching customer orders:', err)
    } finally {
      setCustomerOrdersLoading(false)
    }
  }

  const downloadInvoice = async (orderId) => {
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
      } else {
        alert('Failed to download invoice')
      }
    } catch (err) {
      console.error('Error downloading invoice:', err)
      alert('Error downloading invoice')
    }
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
    if (isLoading) return
    setIsLoading(true)
    try {
      let url = `api/shops/${shopId}/products?include_inactive=true&skip=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`
      if (adminProductSearch) url += `&search=${encodeURIComponent(adminProductSearch)}`
      const res = await fetch(getApiUrl(url))
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
    if (isLoading) return
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

  const fetchPlatformStats = async () => {
    try {
      const res = await fetch(getApiUrl('api/platform/stats'))
      if (res.ok) setPlatformStats(await res.json())
    } catch (err) { console.error('Error fetching platform stats:', err) }
  }

  const fetchAllShops = async (page = 0, reset = false) => {
    if (isLoading) return
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
    if (isLoading) return
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

  const fetchCustomerActivityLogs = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await fetch(getApiUrl(`api/command/logs/customer/${user.id}`))
      if (res.ok) {
        setActivityLogs(await res.json())
      }
    } catch (err) {
      console.error('Error fetching customer activity logs:', err)
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
      if (selectedShop) context.shop_id = selectedShop
      if (user?.id) context.user_id = user.id
      if (user?.role) context.role = user.role
      if (user?.name) context.customer_name = user.name
      if (user?.email) context.customer_email = user.email
      
      const payload = { text: command.trim(), context }
      const res = await fetch(getApiUrl('api/command'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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

        fetchCustomerActivityLogs()

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
    setIsCartOpen(true)
    addLog(`Added ${product.name} to cart`, 'success')
  }

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id))
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0)

  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const checkout = async () => {
    if (cart.length === 0 || isCheckingOut) return
    setIsCheckingOut(true)
    addLog(`Placing ${cart.length} order(s)...`, 'info')
    let successCount = 0
    let failCount = 0
    for (const item of cart) {
      try {
        const res = await fetch(getApiUrl('api/orders'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: item.id,
            quantity: item.qty,
            customer_name: user?.name || 'Customer',
            customer_email: user?.email || null,
            customer_phone: user?.phone || null,
            notes: 'Ordered from cart',
          })
        })
        if (res.ok) {
          successCount++
          addLog(`✅ Ordered ${item.qty}x ${item.name}`, 'success')
        } else {
          const err = await res.json()
          failCount++
          addLog(`❌ Failed: ${item.name} — ${err.detail || 'Unknown error'}`, 'error')
        }
      } catch (err) {
        failCount++
        addLog(`❌ Error ordering ${item.name}: ${err.message}`, 'error')
      }
    }
    setIsCheckingOut(false)
    if (successCount > 0) {
      addLog(`🎉 ${successCount} order(s) placed successfully!`, 'success')
      setCart([])
      fetchCustomerActivityLogs()
      fetchCustomerOrders(selectedShop)
      if (selectedShop) fetchShopProducts(selectedShop, 0, true)
    }
    if (failCount > 0) {
      addLog(`⚠️ ${failCount} order(s) failed. Check stock or try again.`, 'warning')
    }
  }


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

  const renderCustomerOrders = (shopOnly = false) => {
    if (customerOrdersLoading) {
      return <div className="loading-spinner" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Loading orders...</div>
    }
    if (customerOrders.length === 0) {
      return (
        <div className="empty-state" style={{ textAlign: 'center', padding: '48px' }}>
          <p className="empty" style={{ color: 'var(--text-muted)' }}>🛒 No orders found {shopOnly ? 'from this store' : ''} yet. Place an order to see it here!</p>
        </div>
      )
    }
    return (
      <div className="data-table customer-orders-table" style={{ marginTop: '24px' }}>
        <table>
          <thead>
            <tr>
              <th>Order #</th>
              {!shopOnly && <th>Store</th>}
              <th>Product</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Status</th>
              <th>Date</th>
              <th>Invoice</th>
            </tr>
          </thead>
          <tbody>
            {customerOrders.map(order => {
              const shopName = shops.find(s => s.id === order.shop_id)?.name || "TechHub Electronics"
              return (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  {!shopOnly && <td style={{ fontWeight: 600, color: 'var(--accent-secondary)' }}>{shopName}</td>}
                  <td>
                    <div>{order.product_name}</div>
                    {order.notes && (
                      <div style={{ fontSize: '0.85em', color: '#f97316', fontStyle: 'italic', marginTop: '2px' }}>
                        📝 Note: {order.notes}
                      </div>
                    )}
                  </td>
                  <td>{order.quantity}</td>
                  <td className="price" style={{ fontWeight: 600, color: 'var(--success)' }}>₹{order.total_amount.toFixed(2)}</td>
                  <td>
                    <span className={`status ${order.status}`} style={{ fontSize: '11px', padding: '4px 8px' }}>{order.status}</span>
                  </td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      onClick={() => downloadInvoice(order.id)}
                      className="btn-download-invoice"
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        backgroundColor: '#ea580c',
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
              )
            })}
          </tbody>

        </table>
      </div>
    )
  }

  const renderCartPanel = () => {
    if (!isCartOpen) return null
    return (
      <div className="cart-panel">
        <div className="cart-header">
          <h3>Cart ({cart.reduce((sum, i) => sum + i.qty, 0)} items)</h3>
          <button className="close-cart-btn" onClick={() => setIsCartOpen(false)}>×</button>
        </div>
        <div className="cart-items">
          {cart.map(item => (
            <div key={item.id} className="cart-item">
              <span>{item.name} x{item.qty}</span>
              <span>₹{(item.price * item.qty).toFixed(2)}</span>
              <button onClick={() => removeFromCart(item.id)}>×</button>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="empty-cart-message">
              🛒 Your cart is empty. Add products from the shops!
            </div>
          )}
        </div>
        {cart.length > 0 && (
          <>
            <div className="cart-total"><span>Total:</span><span>₹{cartTotal.toFixed(2)}</span></div>
            <button
              className="checkout-btn"
              onClick={checkout}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? '⏳ Placing Orders...' : `🛒 Checkout (₹${cartTotal.toFixed(2)})`}
            </button>
          </>
        )}
      </div>
    )
  }

  if (!selectedShopCategory && !selectedShop) {
    return (
      <div className="marketplace">
        <header className="marketplace-header">
          <div className="header-left"><h1>Prompt-DB Marketplace</h1><p>Shop from your favorite stores</p></div>
          <div className="header-right">
            <ThemeSelector currentTheme={colorTheme} setTheme={setColorTheme} />
            <span className="user-info">Hi, {user.name}</span>
            <button className="cart-toggle-btn" onClick={() => setIsCartOpen(!isCartOpen)}>
              🛒 Cart ({cart.reduce((sum, i) => sum + i.qty, 0)})
            </button>
            <button className="logout-btn" onClick={logout}>Logout</button>
          </div>
        </header>
        <div className="command-panel customer-command">
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
              <span className="command-icon">🔍</span>
              <input
                type="text"
                value={command}
                onChange={e => setCommand(e.target.value)}
                onKeyDown={handleCommandKeyDown}
                onFocus={() => command.trim() && suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder={isListening ? "🎤 सुन रहा हूं..." : "खोजो या बोलो... (Hindi/English)"}
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
        
        <div className="tabs" style={{ marginBottom: '24px' }}>
          <button className={`tab ${mainTab === 'shops' ? 'active' : ''}`} onClick={() => setMainTab('shops')}>
            🏬 Stores (दुकानें)
          </button>
          <button className={`tab ${mainTab === 'orders' ? 'active' : ''}`} onClick={() => setMainTab('orders')}>
            📋 My Orders (मेरे ऑर्डर)
          </button>
        </div>

        {mainTab === 'shops' ? (
          <>
            <div className="categories-grid">
              {shopCategories.map(cat => (
                <div key={cat.id} className="category-card" onClick={() => setSelectedShopCategory(cat.id)}>
                  <span className="category-icon">{cat.icon}</span>
                  <h3>{cat.name}</h3>
                  <p>{cat.description}</p>
                  <span className="shop-count">{cat.shop_count} shops</span>
                </div>
              ))}
            </div>
            
            <div className="panel logs-panel" style={{ marginTop: '32px' }}>
              <h2>Your Activity History (खरीदारी का इतिहास)</h2>
              {activityLogs.length === 0 ? (
                <p className="empty" style={{ padding: '16px', color: 'var(--text-muted)' }}>No purchase history yet. Speak or type a command above to buy things! (जैसे: "order 1 lipstick")</p>
              ) : (
                <div className="log-list">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="log-item success">
                      <span className="log-time" style={{ marginRight: '12px', fontSize: '12px', opacity: 0.8 }}>
                        {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="panel orders-panel" style={{ background: 'var(--bg-elevated)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-primary)' }}>
            <h2>My Order History (मेरे ऑर्डर का इतिहास)</h2>
            {renderCustomerOrders()}
          </div>
        )}
        
        {cart.length > 0 && (
          <div className="floating-cart" onClick={() => setIsCartOpen(true)} style={{ cursor: 'pointer' }}>
            <span>{cart.reduce((sum, i) => sum + i.qty, 0)} items</span>
            <span>₹{cartTotal.toFixed(2)}</span>
          </div>
        )}
        {renderCartPanel()}
      </div>
    )
  }

  if (selectedShopCategory && !selectedShop) {
    const category = shopCategories.find(c => c.id === selectedShopCategory)
    return (
      <div className="marketplace">
        <header className="marketplace-header">
          <button className="back-btn" onClick={() => { setSelectedShopCategory(null); setShops([]) }}>← Back</button>
          <h1>{category?.icon} {category?.name}</h1>
          <div className="header-right">
            <ThemeSelector currentTheme={colorTheme} setTheme={setColorTheme} />
            <span className="user-info">Hi, {user.name}</span>
            <button className="cart-toggle-btn" onClick={() => setIsCartOpen(!isCartOpen)}>
              🛒 Cart ({cart.reduce((sum, i) => sum + i.qty, 0)})
            </button>
            <button className="logout-btn" onClick={logout}>Logout</button>
          </div>
        </header>
        <div className="search-bar">
          <input type="text" placeholder="Search shops..." value={shopsSearch} onChange={e => setShopsSearch(e.target.value)} />
        </div>
        <div className="shops-grid">
          {shops.filter(s => !shopsSearch || s.name.toLowerCase().includes(shopsSearch.toLowerCase())).map(shop => (
            <div key={shop.id} className="shop-card" onClick={() => setSelectedShop(shop.id)}>
              <div className="shop-logo">{shop.name[0]}</div>
              <div className="shop-info">
                <h3>{shop.name}</h3>
                <p>{shop.description}</p>
                <div className="shop-meta"><span className="rating">★ {shop.rating.toFixed(1)}</span><span className="city">{shop.city}</span></div>
              </div>
            </div>
          ))}
          {shops.length === 0 && <p className="empty">No shops in this category yet</p>}
        </div>
        <LoadMoreButton hasMore={shopsHasMore} isLoading={isLoading} onClick={() => fetchShopsByCategory(selectedShopCategory, shopsPage + 1)} />
        {cart.length > 0 && (
          <div className="floating-cart" onClick={() => setIsCartOpen(true)} style={{ cursor: 'pointer' }}>
            <span>{cart.reduce((sum, i) => sum + i.qty, 0)} items</span>
            <span>₹{cartTotal.toFixed(2)}</span>
          </div>
        )}
        {renderCartPanel()}
      </div>
    )
  }

  if (selectedShop) {
    const shop = shops.find(s => s.id === selectedShop)
    return (
      <div className="marketplace">
        <header className="shop-header">
          <button className="back-btn" onClick={() => { setSelectedShop(null); setShopProducts([]); setSearchQuery(''); setShopTab('products'); }}>← Back</button>
          <div className="shop-title"><h1>{shop?.name}</h1><span className="rating">★ {shop?.rating.toFixed(1)}</span></div>
          <div className="header-right">
            <ThemeSelector currentTheme={colorTheme} setTheme={setColorTheme} />
            <span className="user-info">Hi, {user.name}</span>
            <button className="cart-toggle-btn" onClick={() => setIsCartOpen(!isCartOpen)}>
              🛒 Cart ({cart.reduce((sum, i) => sum + i.qty, 0)})
            </button>
            <button className="logout-btn" onClick={logout}>Logout</button>
          </div>
        </header>
        <div className="search-bar">
          <input type="text" placeholder={`Search in ${shop?.name}...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>

        <div className="tabs" style={{ marginBottom: '24px' }}>
          <button className={`tab ${shopTab === 'products' ? 'active' : ''}`} onClick={() => setShopTab('products')}>
            🏷️ Products (सामान)
          </button>
          <button className={`tab ${shopTab === 'orders' ? 'active' : ''}`} onClick={() => setShopTab('orders')}>
            📋 My Orders from this Shop (मेरे ऑर्डर)
          </button>
        </div>

        {shopTab === 'products' ? (
          <>
            <div className="products-grid">
              {shopProducts.map((p, index) => (
                <div key={p.id} className="product-card" ref={index === shopProducts.length - 1 ? lastItemRef : null}>
                  <div className="product-image">
                    {p.image_url ? <img src={p.image_url} alt={p.name} /> : <div className="placeholder">{p.name[0]}</div>}
                    {p.compare_at_price && <span className="sale-badge">Sale</span>}
                  </div>
                  <div className="product-info">
                    {p.brand && <span className="product-brand">{p.brand}</span>}
                    <h3>{p.name}</h3>
                    <div className="product-price">
                      <span className="current-price">₹{p.price}</span>
                      {p.compare_at_price && <span className="original-price">₹{p.compare_at_price}</span>}
                    </div>
                    <button className="add-to-cart" onClick={() => addToCart(p)} disabled={p.quantity === 0}>
                      {p.quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              ))}
              {shopProducts.length === 0 && <p className="empty">No products found</p>}
            </div>
            <LoadMoreButton hasMore={productsHasMore} isLoading={isLoading} onClick={() => fetchShopProducts(selectedShop, productsPage + 1)} />
          </>
        ) : (
          <div className="panel orders-panel" style={{ background: 'var(--bg-elevated)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-primary)' }}>
            <h2>My Orders from {shop?.name} (मेरे ऑर्डर)</h2>
            {renderCustomerOrders(true)}
          </div>
        )}

        {cart.length > 0 && (
          <div className="floating-cart" onClick={() => setIsCartOpen(true)} style={{ cursor: 'pointer' }}>
            <span>{cart.reduce((sum, i) => sum + i.qty, 0)} items</span>
            <span>₹{cartTotal.toFixed(2)}</span>
          </div>
        )}
        {renderCartPanel()}
      </div>
    )
  }

}

export default CustomerView
