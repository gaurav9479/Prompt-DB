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

function SuperAdminDashboard({ user, setUser, logout }) {
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
  const [shopsPage, setShopsPage] = useState(0)
  const [shopsHasMore, setShopsHasMore] = useState(false)
  const [productsPage, setProductsPage] = useState(0)
  const [productsHasMore, setProductsHasMore] = useState(false)
  const [dashboardStats, setDashboardStats] = useState({})
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [expiringProducts, setExpiringProducts] = useState([])
  const [clearanceProducts, setClearanceProducts] = useState([])
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
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
    address: '', city: '', pincode: '', gst_number: '',
    password: ''
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


  const { isListening, voiceSupported, toggleListening, error: voiceError } = useVoiceRecognition(setCommand)


  const lastItemRef = useRef(null)


  useEffect(() => {
    fetchPlatformStats()
    fetchAllShops(0, true)
    fetchAllUsers(0, true)
    fetchShopCategories()
    if (user?.role) fetchQuickActions(user.role)
  }, [user])


  useEffect(() => {
    if (superAdminTab === 'transactions') {
      fetchPlatformOrders(0, true)
    }
  }, [superAdminTab, orderStatusFilter, orderSearch])



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

  const fetchPlatformOrders = async (page = 0, reset = false) => {
    if (isLoading) return
    setIsLoading(true)
    try {
      let url = `api/orders?skip=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`
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
    } catch (err) { console.error('Error fetching platform orders:', err) }
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

  const addLog = (message, type = 'info') => {
    setLogs(prev => [{ message, type, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 30))
  }


  const sendCommand = async (e) => {
    e?.preventDefault()
    if (!command.trim() || isProcessing) return
    setIsProcessing(true)
    addLog(`Processing: "${command}"`, 'info')
    try {
      const res = await fetch(getApiUrl('api/command'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: command.trim() })
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
      address: '', city: '', pincode: '', gst_number: '',
      password: ''
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
    <div className="super-admin-app">
      <header className="super-header">
        <div className="header-left">
          <h1>Prompt-DB Platform</h1>
          <p>Super Admin Dashboard</p>
        </div>
        <div className="header-right">
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
              placeholder={isListening ? "🎤 Listening... speak now" : "Type or speak... (Hindi/English दोनों चलेगा)"}
              disabled={isProcessing}
              className={`command-input ${isListening ? 'listening' : ''}`}
            />
            <VoiceButton
              isListening={isListening}
              isSupported={voiceSupported}
              onClick={toggleListening}
              disabled={isProcessing}
              error={voiceError}
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

      <div className="stats-grid platform-stats">
        <div className="stat-card primary"><div className="stat-value">{platformStats.total_shops || 0}</div><div className="stat-label">Total Shops</div></div>
        <div className="stat-card success"><div className="stat-value">{platformStats.verified_shops || 0}</div><div className="stat-label">Verified Shops</div></div>
        <div className="stat-card"><div className="stat-value">{platformStats.total_shop_owners || 0}</div><div className="stat-label">Shop Owners</div></div>
        <div className="stat-card"><div className="stat-value">{platformStats.total_customers || 0}</div><div className="stat-label">Customers</div></div>
        <div className="stat-card success"><div className="stat-value">${platformStats.platform_revenue?.toLocaleString() || 0}</div><div className="stat-label">Total Revenue</div></div>
        <div className="stat-card"><div className="stat-value">{platformStats.total_users || 0}</div><div className="stat-label">Total Users</div></div>
      </div>

      <div className="tabs">
        {['overview', 'shops', 'transactions', 'analytics', 'users', 'categories', 'settings'].map(tab => (
          <button key={tab} className={`tab ${superAdminTab === tab ? 'active' : ''}`} onClick={() => setSuperAdminTab(tab)}>
            {tab === 'transactions' ? 'Transactions' : (tab === 'analytics' ? 'Analytics' : tab.charAt(0).toUpperCase() + tab.slice(1))}
          </button>
        ))}
      </div>

      {superAdminTab === 'overview' && (
        <div className="dashboard-grid">
          <div className="panel">
            <h2>Pending Verification</h2>
            <div className="shop-list">
              {allShops.filter(s => !s.is_verified).slice(0, 5).map(shop => (
                <div key={shop.id} className="shop-item">
                  <div className="shop-info"><strong>{shop.name}</strong><span>{shop.owner_email}</span><span className="city">{shop.city}</span></div>
                  <div className="shop-actions"><button className="verify-btn" onClick={() => verifyShop(shop.id)}>Verify</button></div>
                </div>
              ))}
              {allShops.filter(s => !s.is_verified).length === 0 && <p className="empty">No shops pending verification</p>}
            </div>
          </div>
          <div className="panel logs-panel">
            <h2>Activity Log</h2>
            <div className="log-list">
              {logs.slice(0, 10).map((log, i) => (
                <div key={i} className={`log-item ${log.type}`}><span className="log-time">{log.time}</span><span>{log.message}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {superAdminTab === 'shops' && (
        <div className="tab-content">
          {showShopForm ? (
            <div className="form-panel">
              <h2>{editingShop ? 'Edit Shop' : 'Register New Shop'}</h2>
              <form onSubmit={submitShopForm}>
                <div className="form-section">
                  <h3>Shop Details</h3>
                  <div className="form-group">
                    <label>Shop Name *</label>
                    <input type="text" value={shopForm.name} onChange={e => setShopForm({ ...shopForm, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea value={shopForm.description} onChange={e => setShopForm({ ...shopForm, description: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={shopForm.category_id} onChange={e => setShopForm({ ...shopForm, category_id: e.target.value })}>
                      <option value="">Select Category</option>
                      {shopCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-section">
                  <h3>Owner Information</h3>
                  <div className="form-group">
                    <label>Owner Name</label>
                    <input type="text" value={shopForm.owner_name} onChange={e => setShopForm({ ...shopForm, owner_name: e.target.value })} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Owner Email</label>
                      <input type="email" value={shopForm.owner_email} onChange={e => setShopForm({ ...shopForm, owner_email: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Owner Phone</label>
                      <input type="text" value={shopForm.owner_phone} onChange={e => setShopForm({ ...shopForm, owner_phone: e.target.value })} />
                    </div>
                  </div>
                  {!editingShop && (
                    <div className="form-group">
                      <label>Owner Password *</label>
                      <input type="password" value={shopForm.password} onChange={e => setShopForm({ ...shopForm, password: e.target.value })} required />
                    </div>
                  )}
                </div>
                <div className="form-section">
                  <h3>Location</h3>
                  <div className="form-group">
                    <label>Address</label>
                    <textarea value={shopForm.address} onChange={e => setShopForm({ ...shopForm, address: e.target.value })} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>City</label>
                      <input type="text" value={shopForm.city} onChange={e => setShopForm({ ...shopForm, city: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Pincode</label>
                      <input type="text" value={shopForm.pincode} onChange={e => setShopForm({ ...shopForm, pincode: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>GST Number</label>
                    <input type="text" value={shopForm.gst_number} onChange={e => setShopForm({ ...shopForm, gst_number: e.target.value })} placeholder="Optional" />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="submit-btn">{editingShop ? 'Update Shop' : 'Register Shop'}</button>
                  <button type="button" className="cancel-btn" onClick={resetShopForm}>Cancel</button>
                </div>
              </form>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
              <button className="submit-btn" onClick={() => setShowShopForm(true)}>+ Register New Shop</button>
            </div>
          )}
          <div className="data-panel">
            <SearchFilterBar search={shopSearch} setSearch={setShopSearch} placeholder="Search shops by name, email, city..." />
            <h2>All Shops ({allShops.length})</h2>
            <div className="data-table">
              <table>
                <thead>
                  <tr><th>Shop Name</th><th>Owner</th><th>City</th><th>Orders</th><th>Revenue</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {allShops.map(shop => (
                    <tr key={shop.id} className={!shop.is_active ? 'suspended' : ''}>
                      <td><div className="shop-cell"><strong>{shop.name}</strong>{shop.is_verified && <span className="verified-badge">✓</span>}</div></td>
                      <td>{shop.owner_email || '-'}</td>
                      <td>{shop.city || '-'}</td>
                      <td>{shop.total_orders}</td>
                      <td>${shop.total_revenue?.toLocaleString()}</td>
                      <td><span className={`status ${shop.is_active ? 'active' : 'suspended'}`}>{shop.is_active ? 'Active' : 'Suspended'}</span></td>
                      <td>
                        <button className="edit-btn" onClick={() => startEditShop(shop)}>Edit</button>
                        {!shop.is_verified && <button className="verify-btn" onClick={() => verifyShop(shop.id)}>Verify</button>}
                        {shop.is_active ? <button className="suspend-btn" onClick={() => suspendShop(shop.id)}>Suspend</button> : <button className="activate-btn" onClick={() => activateShop(shop.id)}>Activate</button>}
                        <button className="delete-btn" onClick={() => deleteShop(shop.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <LoadMoreButton hasMore={allShopsHasMore} isLoading={isLoading} onClick={() => fetchAllShops(allShopsPage + 1)} />
          </div>
        </div>
      )}

      {superAdminTab === 'transactions' && (
        <div className="data-panel" style={{ marginTop: '20px' }}>
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
            <h2>All Transactions ({orders.length})</h2>
            {orders.length === 0 ? <p className="empty">No transactions found</p> : (
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
            <LoadMoreButton hasMore={ordersHasMore} isLoading={isLoading} onClick={() => fetchPlatformOrders(ordersPage + 1)} />
          </div>
      )}

      {superAdminTab === 'analytics' && (
        <div className="data-panel" style={{ marginTop: '20px' }}>
          <AnalyticsView shopId={null} getApiUrl={getApiUrl} />
        </div>
      )}

      {superAdminTab === 'users' && (
        <div className="data-panel">
          <SearchFilterBar
            search={userSearch}
            setSearch={setUserSearch}
            placeholder="Search users by name or email..."
            filters={
              <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)} className="filter-select">
                <option value="">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="customer">Customer</option>
              </select>
            }
          />
          <h2>All Users ({allUsers.length})</h2>
          <div className="data-table">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Status</th><th>Created</th></tr></thead>
              <tbody>
                {allUsers.map(u => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className={`role ${u.role}`}>{u.role}</span></td>
                    <td>{u.phone || '-'}</td>
                    <td><span className={`status ${u.is_active ? 'active' : 'inactive'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <LoadMoreButton hasMore={usersHasMore} isLoading={isLoading} onClick={() => fetchAllUsers(usersPage + 1)} />
        </div>
      )}

      {superAdminTab === 'categories' && (
        <div className="data-panel">
          {selectedAdminCategory && categoryInfo ? (

            <div className="category-detail-view">
              <div className="category-detail-header">
                <button className="back-btn" onClick={closeCategoryDetail}>← Back to Categories</button>
                <div className="category-title">
                  <span className="cat-icon-large">{categoryInfo.icon}</span>
                  <div>
                    <h2>{categoryInfo.name}</h2>
                    <p>{categoryInfo.description}</p>
                  </div>
                </div>
              </div>

              <div className="category-stats-bar">
                <div className="cat-stat"><span className="cat-stat-value">{categoryShops.length}</span><span className="cat-stat-label">Total Shops</span></div>
                <div className="cat-stat"><span className="cat-stat-value">{categoryShops.filter(s => s.is_active).length}</span><span className="cat-stat-label">Active</span></div>
                <div className="cat-stat"><span className="cat-stat-value">{categoryShops.filter(s => s.is_verified).length}</span><span className="cat-stat-label">Verified</span></div>
                <div className="cat-stat success"><span className="cat-stat-value">₹{categoryShops.reduce((sum, s) => sum + (s.stats?.total_revenue || 0), 0).toLocaleString()}</span><span className="cat-stat-label">Total Revenue</span></div>
                <div className="cat-stat profit"><span className="cat-stat-value">₹{categoryShops.reduce((sum, s) => sum + (s.stats?.total_profit || 0), 0).toLocaleString()}</span><span className="cat-stat-label">Total Profit</span></div>
              </div>

              <h3>Shops in {categoryInfo.name}</h3>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Shop Name</th>
                      <th>Owner</th>
                      <th>City</th>
                      <th>Rating</th>
                      <th>Orders</th>
                      <th>Revenue</th>
                      <th>Profit</th>
                      <th>Margin</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryShops.map(shop => (
                      <tr key={shop.id} className={!shop.is_active ? 'suspended' : ''}>
                        <td>
                          <div className="shop-cell">
                            <strong>{shop.name}</strong>
                            {shop.is_verified && <span className="verified-badge">✓</span>}
                          </div>
                        </td>
                        <td>
                          <div className="owner-cell">
                            <span className="owner-name">{shop.owner_name || '-'}</span>
                            <span className="owner-email">{shop.owner_email || '-'}</span>
                          </div>
                        </td>
                        <td>{shop.city || '-'}</td>
                        <td><span className="rating-badge">★ {shop.rating?.toFixed(1) || '-'}</span></td>
                        <td>{shop.stats?.total_orders || 0}</td>
                        <td className="revenue">₹{(shop.stats?.total_revenue || 0).toLocaleString()}</td>
                        <td className={`profit ${(shop.stats?.total_profit || 0) >= 0 ? 'positive' : 'negative'}`}>
                          ₹{(shop.stats?.total_profit || 0).toLocaleString()}
                        </td>
                        <td className={`margin ${(shop.stats?.profit_margin || 0) > 20 ? 'good' : (shop.stats?.profit_margin || 0) > 0 ? 'ok' : 'low'}`}>
                          {shop.stats?.profit_margin || 0}%
                        </td>
                        <td>
                          <span className={`status ${shop.is_active ? 'active' : 'suspended'}`}>
                            {shop.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td>
                          <button className="view-btn" onClick={() => fetchShopDetailStats(shop.id)} disabled={loadingShopDetail}>
                            {loadingShopDetail ? '...' : 'View Details'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {categoryShops.length === 0 && <p className="empty">No shops in this category</p>}
            </div>
          ) : (

            <>
              <h2>Shop Categories</h2>
              <p className="subtitle">Click on a category to view all shops and their performance metrics</p>
              <div className="categories-admin clickable">
                {shopCategories.map(cat => (
                  <div key={cat.id} className="category-admin-card" onClick={() => openCategoryDetail(cat.id)}>
                    <span className="cat-icon">{cat.icon}</span>
                    <div className="cat-info">
                      <h3>{cat.name}</h3>
                      <p>{cat.description}</p>
                      <span className="shop-count">{cat.shop_count} shops</span>
                    </div>
                    <span className="view-arrow">→</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Shop Detail Modal */}
      {showShopDetailModal && shopDetailStats && (
        <div className="modal-overlay" onClick={closeShopDetailModal}>
          <div className="shop-detail-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeShopDetailModal}>×</button>

            <div className="shop-modal-header">
              <div className="shop-info-main">
                <span className="cat-icon-large">{shopDetailStats.shop.category_icon || '🏪'}</span>
                <div>
                  <h2>{shopDetailStats.shop.name}</h2>
                  <p className="shop-category">{shopDetailStats.shop.category || 'Uncategorized'}</p>
                  <div className="shop-badges">
                    {shopDetailStats.shop.is_verified && <span className="badge verified">Verified</span>}
                    <span className={`badge ${shopDetailStats.shop.is_active ? 'active' : 'suspended'}`}>
                      {shopDetailStats.shop.is_active ? 'Active' : 'Suspended'}
                    </span>
                    <span className="badge rating">★ {shopDetailStats.shop.rating?.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="shop-modal-stats">
              <div className="stats-section">
                <h3>Financial Overview</h3>
                <div className="stats-grid-modal">
                  <div className="stat-box revenue">
                    <span className="stat-label">Total Revenue</span>
                    <span className="stat-value">₹{shopDetailStats.financials.total_revenue.toLocaleString()}</span>
                  </div>
                  <div className="stat-box cost">
                    <span className="stat-label">Total Cost</span>
                    <span className="stat-value">₹{shopDetailStats.financials.total_cost.toLocaleString()}</span>
                  </div>
                  <div className="stat-box profit">
                    <span className="stat-label">Total Profit</span>
                    <span className="stat-value">₹{shopDetailStats.financials.total_profit.toLocaleString()}</span>
                  </div>
                  <div className="stat-box margin">
                    <span className="stat-label">Profit Margin</span>
                    <span className="stat-value">{shopDetailStats.financials.profit_margin}%</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Total Orders</span>
                    <span className="stat-value">{shopDetailStats.total_orders}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Avg Order Value</span>
                    <span className="stat-value">₹{shopDetailStats.financials.avg_order_value.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="stats-row">
                <div className="stats-section half">
                  <h3>Today's Performance</h3>
                  <div className="today-stats">
                    <div><span>Orders:</span><strong>{shopDetailStats.today.orders}</strong></div>
                    <div><span>Revenue:</span><strong>₹{shopDetailStats.today.revenue.toLocaleString()}</strong></div>
                    <div><span>Profit:</span><strong className="profit positive">₹{shopDetailStats.today.profit.toLocaleString()}</strong></div>
                  </div>
                </div>
                <div className="stats-section half">
                  <h3>This Month</h3>
                  <div className="month-stats">
                    <div><span>Orders:</span><strong>{shopDetailStats.this_month.orders}</strong></div>
                    <div><span>Revenue:</span><strong>₹{shopDetailStats.this_month.revenue.toLocaleString()}</strong></div>
                    <div><span>Growth:</span><strong className={shopDetailStats.this_month.revenue_growth >= 0 ? 'positive' : 'negative'}>
                      {shopDetailStats.this_month.revenue_growth >= 0 ? '+' : ''}{shopDetailStats.this_month.revenue_growth}%
                    </strong></div>
                  </div>
                </div>
              </div>

              <div className="stats-section">
                <h3>Inventory</h3>
                <div className="inventory-stats">
                  <div><span>Total Products:</span><strong>{shopDetailStats.products.total}</strong></div>
                  <div><span>Active:</span><strong>{shopDetailStats.products.active}</strong></div>
                  <div><span>Low Stock:</span><strong className="warning">{shopDetailStats.products.low_stock}</strong></div>
                  <div><span>Out of Stock:</span><strong className="danger">{shopDetailStats.products.out_of_stock}</strong></div>
                  <div><span>Inventory Value:</span><strong>₹{shopDetailStats.products.inventory_value.toLocaleString()}</strong></div>
                </div>
              </div>

              {shopDetailStats.top_products.length > 0 && (
                <div className="stats-section">
                  <h3>Top Selling Products</h3>
                  <table className="top-products-table">
                    <thead>
                      <tr><th>Product</th><th>Units Sold</th><th>Revenue</th><th>Profit</th></tr>
                    </thead>
                    <tbody>
                      {shopDetailStats.top_products.map((p, i) => (
                        <tr key={i}>
                          <td>{p.name}</td>
                          <td>{p.units_sold}</td>
                          <td>₹{p.revenue.toLocaleString()}</td>
                          <td className="profit positive">₹{p.profit.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="stats-section">
                <h3>Owner Information</h3>
                <div className="owner-info">
                  <div><span>Name:</span><strong>{shopDetailStats.shop.owner_name || '-'}</strong></div>
                  <div><span>Email:</span><strong>{shopDetailStats.shop.owner_email || '-'}</strong></div>
                  <div><span>Phone:</span><strong>{shopDetailStats.shop.owner_phone || '-'}</strong></div>
                  <div><span>Address:</span><strong>{shopDetailStats.shop.address || '-'}, {shopDetailStats.shop.city || ''} {shopDetailStats.shop.pincode || ''}</strong></div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              {!shopDetailStats.shop.is_verified && (
                <button className="verify-btn" onClick={() => { verifyShop(shopDetailStats.shop.id); closeShopDetailModal(); }}>Verify Shop</button>
              )}
              {shopDetailStats.shop.is_active ? (
                <button className="suspend-btn" onClick={() => { suspendShop(shopDetailStats.shop.id); closeShopDetailModal(); }}>Suspend Shop</button>
              ) : (
                <button className="activate-btn" onClick={() => { activateShop(shopDetailStats.shop.id); closeShopDetailModal(); }}>Activate Shop</button>
              )}
              <button className="edit-btn" onClick={() => { startEditShop(shopDetailStats.shop); closeShopDetailModal(); }}>Edit Shop</button>
            </div>
          </div>
        </div>
      )}

      {superAdminTab === 'settings' && (
        <div className="data-panel" style={{ padding: '24px', backgroundColor: '#1e1e1e', borderRadius: '12px', border: '1px solid #2e2e2e', marginTop: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '24px', borderBottom: '1px solid #2e2e2e', paddingBottom: '10px' }}>
            ⚙️ Settings & Connection Panel
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {/* Company Code Management Card */}
            <div style={{ backgroundColor: '#171717', border: '1px solid #2b2b2b', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', color: '#f97316', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Employee Registration Code
              </h3>
              <p style={{ fontSize: '12px', color: '#a3a3a3', marginBottom: '20px' }}>
                Provide this code to your employees during registration. It links them to your shop.
              </p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <code style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', backgroundColor: '#121212', padding: '8px 16px', borderRadius: '6px', border: '1px solid #3e3e3e', letterSpacing: '0.1em' }}>
                  {user.company_code || 'SHOP-CODE'}
                </code>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(user.company_code);
                    addLog('Company code copied to clipboard!', 'success');
                  }}
                  style={{ padding: '10px 14px', backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                >
                  📋 Copy Code
                </button>
              </div>

              <button 
                onClick={async () => {
                  if (window.confirm('Are you sure you want to regenerate the employee registration code? The old code will become invalid.')) {
                    try {
                      const token = user.token || localStorage.getItem('promptdb_token') || sessionStorage.getItem('promptdb_token');
                      const res = await fetch(getApiUrl('api/auth/company-code/regenerate'), {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`
                        }
                      });
                      if (res.ok) {
                        const data = await res.json();
                        const updatedUser = { ...user, company_code: data.company_code };
                        setUser(updatedUser);
                        localStorage.setItem('promptdb_user', JSON.stringify(updatedUser));
                        addLog('Company code regenerated successfully!', 'success');
                      } else {
                        alert('Failed to regenerate company code');
                      }
                    } catch (err) {
                      alert('Connection error');
                    }
                  }
                }}
                style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', border: '1px solid #FF6B00', color: '#FF6B00', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
              >
                🔄 Regenerate Registration Code
              </button>
            </div>

            {/* Custom Database Connection Card */}
            <div style={{ backgroundColor: '#171717', border: '1px solid #2b2b2b', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', color: '#f97316', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                PostgreSQL Database Connection
              </h3>
              <p style={{ fontSize: '12px', color: '#a3a3a3', marginBottom: '20px' }}>
                Enable advanced analytics computations by pointing to your direct Postgres server database.
              </p>

              {user.db_connected ? (
                <div style={{ padding: '15px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '14px', fontWeight: 'bold' }}>
                    <span>✓ Connected to PostgreSQL</span>
                  </div>
                  <button 
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to disconnect your custom PostgreSQL database connection?')) {
                        try {
                          const token = user.token || localStorage.getItem('promptdb_token') || sessionStorage.getItem('promptdb_token');
                          const res = await fetch(getApiUrl('api/profile/db-credential'), {
                            method: 'DELETE',
                            headers: {
                              'Authorization': `Bearer ${token}`
                            }
                          });
                          if (res.ok) {
                            const updatedUser = { ...user, db_connected: false };
                            setUser(updatedUser);
                            localStorage.setItem('promptdb_user', JSON.stringify(updatedUser));
                            addLog('Database connection string removed', 'info');
                          } else {
                            alert('Failed to remove connection');
                          }
                        } catch (err) {
                          alert('Connection error');
                        }
                      }
                    }}
                    style={{ padding: '8px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', width: 'fit-content' }}
                  >
                    Disconnect Database
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input 
                    id="db_connection_str_input"
                    type="password"
                    placeholder="postgresql://user:password@host:port/dbname"
                    style={{ width: '100%', backgroundColor: '#121212', border: '1px solid #3e3e3e', color: 'white', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                  />
                  <button 
                    onClick={async () => {
                      const inputVal = document.getElementById('db_connection_str_input').value;
                      if (!inputVal) {
                        alert('Please enter a connection string');
                        return;
                      }
                      try {
                        const token = user.token || localStorage.getItem('promptdb_token') || sessionStorage.getItem('promptdb_token');
                        const res = await fetch(getApiUrl('api/profile/db-credential'), {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({ connection_string: inputVal })
                        });
                        if (res.ok) {
                          const updatedUser = { ...user, db_connected: true };
                          setUser(updatedUser);
                          localStorage.setItem('promptdb_user', JSON.stringify(updatedUser));
                          document.getElementById('db_connection_str_input').value = '';
                          addLog('Database connected successfully!', 'success');
                        } else {
                          const err = await res.json();
                          alert('Failed to connect: ' + err.detail);
                        }
                      } catch (err) {
                        alert('Connection error');
                      }
                    }}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#FF6B00', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                  >
                    Connect Database
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )

}

export default SuperAdminDashboard
