import { useState, useEffect, createContext, useContext, useRef } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  Search, Car, MapPin, Phone, Mail, User, Shield, Menu, X, 
  ChevronDown, Wrench, Store, CheckCircle, AlertCircle, Upload,
  Package, Settings, LogOut, Users, BarChart3, FileText, Download,
  Building2, Eye, EyeOff, Trash2, Edit, Plus, Info
} from "lucide-react";
import "./App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setUser(res.data);
      }).catch(() => {
        localStorage.removeItem("token");
        setToken(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (newToken, userData) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 max-w-md ${
      type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
    }`} data-testid="toast-message">
      {type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">
        <X size={18} />
      </button>
    </div>
  );
};

// Navigation Component
const Navigation = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const publicLinks = [
    { path: "/", label: "Search Parts", icon: Search },
    { path: "/installers", label: "Find Installers", icon: Wrench },
    { path: "/contact", label: "Contact Us", icon: Mail },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <Car className="h-8 w-8 text-blue-600" />
            <span className="font-bold text-xl text-slate-900 tracking-tight">CarGlassHub</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {publicLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-blue-600 flex items-center gap-1 ${
                  location.pathname === link.path ? "text-blue-600" : "text-slate-600"
                }`}
                data-testid={`nav-${link.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                <link.icon size={16} />
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600">Welcome, {user.name}</span>
                {(user.user_type === "business" || user.user_type === "admin") && (
                  <Link
                    to="/dashboard"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    data-testid="dashboard-link"
                  >
                    <BarChart3 size={16} />
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={() => { logout(); navigate("/"); }}
                  className="text-sm font-medium text-slate-600 hover:text-red-600 flex items-center gap-1"
                  data-testid="logout-btn"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="text-sm font-medium text-slate-600 hover:text-blue-600"
                  data-testid="login-btn"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate("/register/business")}
                  className="bg-blue-600 text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  data-testid="register-business-btn"
                >
                  Register Business
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200">
            {publicLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className="flex items-center gap-2 py-2 text-slate-600 hover:text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                <link.icon size={16} />
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-slate-200 mt-4">
              {user ? (
                <div className="space-y-2">
                  {(user.user_type === "business" || user.user_type === "admin") && (
                    <Link to="/dashboard" className="block py-2 text-blue-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                  )}
                  <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="block py-2 text-slate-600">Logout</button>
                </div>
              ) : (
                <>
                  <Link to="/login" className="block py-2 text-slate-600" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                  <Link to="/register/business" className="block py-2 text-blue-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Register Business</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

// Footer Component
const Footer = () => (
  <footer className="bg-slate-900 text-white py-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Car className="h-8 w-8 text-blue-400" />
            <span className="font-bold text-xl">CarGlassHub</span>
          </div>
          <p className="text-slate-400 text-sm">
            The auto glass industry's leading marketplace and inventory management platform.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-4">Quick Links</h4>
          <div className="space-y-2">
            <Link to="/" className="block text-slate-400 hover:text-white text-sm">Search Parts</Link>
            <Link to="/installers" className="block text-slate-400 hover:text-white text-sm">Find Installers</Link>
            <Link to="/contact" className="block text-slate-400 hover:text-white text-sm">Contact Us</Link>
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-4">For Business</h4>
          <div className="space-y-2">
            <Link to="/register/business" className="block text-slate-400 hover:text-white text-sm">Register Business</Link>
            <Link to="/register/installer" className="block text-slate-400 hover:text-white text-sm">Become an Installer</Link>
            <Link to="/login" className="block text-slate-400 hover:text-white text-sm">Login</Link>
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-4">Legal</h4>
          <div className="space-y-2">
            <Link to="/terms" className="block text-slate-400 hover:text-white text-sm">Terms & Conditions</Link>
            <Link to="/privacy" className="block text-slate-400 hover:text-white text-sm">Privacy Policy</Link>
            <Link to="/disclaimer" className="block text-slate-400 hover:text-white text-sm">Disclaimer</Link>
          </div>
        </div>
      </div>
      {/* Disclaimer */}
      <div className="border-t border-slate-800 mt-8 pt-6">
        <p className="text-yellow-500 text-xs text-center mb-2 font-medium">DISCLAIMER</p>
        <p className="text-slate-400 text-xs text-center max-w-3xl mx-auto">
          CarGlassHub is a platform that connects businesses to help find the right auto glass parts. We are NOT responsible for the quality of parts listed, and we hold NO financial responsibility for transactions between parties. All transactions are conducted directly between businesses at their own risk.
        </p>
      </div>
      <div className="border-t border-slate-800 mt-6 pt-6 text-center text-slate-500 text-sm">
        © {new Date().getFullYear()} CarGlassHub. All rights reserved. Platform for connecting businesses only.
      </div>
    </div>
  </footer>
);

// Home Page - Public Search
const Home = () => {
  const { user, token } = useAuth();
  const [searchType, setSearchType] = useState("part");
  const [partNumber, setPartNumber] = useState("");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [category, setCategory] = useState("");
  const [years, setYears] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showContactModal, setShowContactModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [yearsRes, makesRes, categoriesRes] = await Promise.all([
          axios.get(`${API}/vehicles/years`),
          axios.get(`${API}/vehicles/makes`),
          axios.get(`${API}/vehicles/categories`)
        ]);
        setYears(yearsRes.data);
        setMakes(makesRes.data);
        setCategories(categoriesRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (make) {
      axios.get(`${API}/vehicles/models/${make}`)
        .then(res => setModels(res.data))
        .catch(err => console.error(err));
    } else {
      setModels([]);
      setModel("");
    }
  }, [make]);

  // Autocomplete effect
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (partNumber.length < 1) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      
      setLoadingSuggestions(true);
      try {
        const res = await axios.get(`${API}/search/autocomplete?q=${encodeURIComponent(partNumber)}`);
        setSuggestions(res.data.suggestions || []);
        setShowSuggestions(res.data.suggestions?.length > 0);
      } catch (error) {
        console.error("Autocomplete error:", error);
      }
      setLoadingSuggestions(false);
    };

    const debounce = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounce);
  }, [partNumber]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (suggestion) => {
    setPartNumber(suggestion.value);
    setShowSuggestions(false);
    // Auto search when selecting
    handleSearchWithValue(suggestion.value);
  };

  const handleSearchWithValue = async (searchValue) => {
    setLoading(true);
    setSearched(true);
    setShowSuggestions(false);
    try {
      const res = await axios.post(`${API}/search`, { part_number: searchValue });
      setSearchResults(res.data.results);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    }
    setLoading(false);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    setShowSuggestions(false);
    try {
      const searchData = {};
      if (searchType === "part" && partNumber) {
        searchData.part_number = partNumber;
      } else {
        if (year) searchData.year = parseInt(year);
        if (make) searchData.make = make;
        if (model) searchData.model = model;
        if (category) searchData.category = category;
      }
      const res = await axios.post(`${API}/search`, searchData);
      setSearchResults(res.data.results);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    }
    setLoading(false);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-10">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              Find <span className="text-blue-400">Auto Glass Parts</span> From Trusted Sellers
            </h1>
            <p className="text-slate-300 text-lg">
              The nation's leading B2B marketplace for the auto glass industry. Search thousands of parts from verified businesses across the country or add your unlimited inventory in our database for free.
            </p>
          </div>

          {/* Search Box */}
          <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setSearchType("part")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  searchType === "part" ? "bg-white text-slate-900" : "text-white hover:bg-white/10"
                }`}
                data-testid="search-by-part-tab"
              >
                Search by Part Number
              </button>
              <button
                onClick={() => setSearchType("vehicle")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  searchType === "vehicle" ? "bg-white text-slate-900" : "text-white hover:bg-white/10"
                }`}
                data-testid="search-by-vehicle-tab"
              >
                Search by Vehicle
              </button>
            </div>

            <form onSubmit={handleSearch}>
              {searchType === "part" ? (
                <div className="flex gap-4">
                  <div className="flex-1 relative" ref={searchInputRef}>
                    <input
                      type="text"
                      value={partNumber}
                      onChange={(e) => setPartNumber(e.target.value)}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      placeholder="Start typing part number (FW, DW, BG...)"
                      className="w-full h-12 px-4 bg-white text-slate-900 rounded-lg border-0 focus:ring-2 focus:ring-blue-500"
                      data-testid="part-number-input"
                      autoComplete="off"
                    />
                    {/* Autocomplete Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-80 overflow-y-auto">
                        <div className="p-2 bg-slate-50 border-b border-slate-200">
                          <p className="text-xs text-slate-500 font-medium">Select a part number:</p>
                        </div>
                        {suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectSuggestion(suggestion)}
                            className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center justify-between border-b border-slate-100 last:border-0 transition-colors"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900">{suggestion.label}</span>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{suggestion.type}</span>
                              </div>
                              {suggestion.sublabel && (
                                <p className="text-sm text-slate-500 mt-0.5">{suggestion.sublabel}</p>
                              )}
                            </div>
                            <Search size={16} className="text-slate-400" />
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Loading indicator */}
                    {loadingSuggestions && partNumber.length > 0 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                    data-testid="search-btn"
                  >
                    <Search size={18} />
                    Search
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="h-12 px-4 bg-white text-slate-900 rounded-lg border-0"
                    data-testid="year-select"
                  >
                    <option value="">Year</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    className="h-12 px-4 bg-white text-slate-900 rounded-lg border-0"
                    data-testid="make-select"
                  >
                    <option value="">Make</option>
                    {makes.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="h-12 px-4 bg-white text-slate-900 rounded-lg border-0"
                    disabled={!make}
                    data-testid="model-select"
                  >
                    <option value="">{make ? "Model" : "Select Make"}</option>
                    {models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-12 px-4 bg-white text-slate-900 rounded-lg border-0"
                    data-testid="category-select"
                  >
                    <option value="">Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-lg font-medium flex items-center justify-center gap-2"
                    data-testid="search-btn"
                  >
                    <Search size={18} />
                    Search
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* Search Results */}
      {searched && (
        <section className="py-12 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Search Results ({searchResults.length})
            </h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid gap-4">
                {searchResults.map(product => (
                  <div key={product.id} className="bg-white p-6 rounded-xl border border-slate-200 hover:shadow-lg transition-shadow" data-testid="search-result-item">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{product.category?.replace('_', ' ').toUpperCase()}</h3>
                        <p className="text-slate-600">{product.year_start}-{product.year_end} {product.make} {product.model}</p>
                        <p className="text-sm text-slate-500 mt-1">Part #: {product.part_number}</p>
                        {product.nags_number && <p className="text-sm text-slate-500">NAGS: {product.nags_number}</p>}
                        <p className="text-sm text-slate-500">Condition: {product.condition}</p>
                      </div>
                      <div className="text-right">
                        {product.call_for_price ? (
                          <p className="text-lg font-bold text-blue-600">Call for Price</p>
                        ) : (
                          <p className="text-2xl font-bold text-blue-600">${product.price?.toFixed(2)}</p>
                        )}
                        <p className="text-sm text-green-600 font-medium">{product.quantity} in stock</p>
                      </div>
                    </div>
                    {product.seller && (
                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Building2 size={16} />
                          <span>{product.seller.business_name}</span>
                          <span>•</span>
                          <MapPin size={16} />
                          <span>{product.seller.city}, {product.seller.state}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <a href={`tel:${product.seller.phone}`} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium">
                            <Phone size={16} />
                            {product.seller.phone}
                          </a>
                          {user ? (
                            <button 
                              onClick={() => setShowContactModal(product)}
                              className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"
                              data-testid="contact-seller-btn"
                            >
                              <Mail size={14} />
                              Message
                            </button>
                          ) : (
                            <Link to="/login" className="flex items-center gap-1 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200">
                              <Mail size={14} />
                              Login to Message
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <Car className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No parts found matching your search.</p>
                <p className="text-sm text-slate-500 mt-2">Try different search criteria.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Features Section */}
      {!searched && (
        <section className="py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Why Choose CarGlassHub?</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">The complete platform for auto glass professionals</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Easy Part Search</h3>
                <p className="text-slate-600">Search by part number, vehicle details, or glass type. Find what you need fast.</p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Inventory Management</h3>
                <p className="text-slate-600">Track your inventory, list products publicly or keep them private. Bulk upload supported.</p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Verified Businesses</h3>
                <p className="text-slate-600">Connect with verified auto glass businesses across the nation.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Contact Seller Modal */}
      {showContactModal && (
        <ContactSellerModal 
          product={showContactModal} 
          onClose={() => setShowContactModal(null)} 
          token={token}
          setToast={setToast}
        />
      )}
      
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
};

// Contact Seller Modal
const ContactSellerModal = ({ product, onClose, token, setToast }) => {
  const [subject, setSubject] = useState(`Inquiry about ${product.nags_number || 'your part'}`);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    try {
      await axios.post(`${API}/messages`, {
        recipient_id: product.business_id,
        product_id: product.id,
        subject,
        message
      }, { headers: { Authorization: `Bearer ${token}` } });
      setToast({ message: "Message sent to seller!", type: "success" });
      onClose();
    } catch (error) {
      setToast({ message: error.response?.data?.detail || "Failed to send message", type: "error" });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl">
          <h2 className="font-bold text-white">Contact Seller</h2>
          <button onClick={onClose} className="text-white hover:text-blue-200"><X size={24} /></button>
        </div>
        <div className="p-6">
          {/* Product Info */}
          <div className="bg-slate-50 p-4 rounded-lg mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 size={16} className="text-slate-500" />
              <span className="font-medium">{product.seller?.business_name}</span>
            </div>
            <p className="text-sm text-slate-600">
              <span className="font-medium">Part:</span> {product.nags_number} {product.oem_number && `/ ${product.oem_number}`}
            </p>
            {product.make && (
              <p className="text-sm text-slate-600">
                {product.year_start}-{product.year_end} {product.make} {product.model}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi, I'm interested in this part..."
                rows={4}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white h-10 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Login Page
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password });
      login(res.data.token, res.data.user);
      setToast({ message: "Login successful!", type: "success" });
      const redirectPath = ["business", "admin"].includes(res.data.user.user_type) ? "/dashboard" : "/";
      setTimeout(() => navigate(redirectPath), 1000);
    } catch (error) {
      setToast({ message: error.response?.data?.detail || "Login failed", type: "error" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Welcome Back</h1>
          <p className="text-slate-600 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="login-email-input"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="login-password-input"
            />
          </div>
          <div className="mb-6 text-right">
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700" data-testid="forgot-password-link">
              Forgot Password?
            </Link>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white h-12 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            data-testid="login-submit-btn"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-slate-600 text-sm">Don't have an account?</p>
          <div className="flex justify-center gap-4">
            <Link to="/register/business" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Register as Business
            </Link>
            <span className="text-slate-300">|</span>
            <Link to="/register/installer" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Register as Installer
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// Business Registration
const BusinessRegister = () => {
  const [formData, setFormData] = useState({
    email: "", password: "", business_name: "", contact_name: "",
    phone: "", address: "", city: "", state: "", zip_code: "", website: "", description: ""
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const states = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register/business`, formData);
      login(res.data.token, res.data.user);
      setToast({ message: "Business registered successfully!", type: "success" });
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (error) {
      setToast({ message: error.response?.data?.detail || "Registration failed", type: "error" });
    }
    setLoading(false);
  };

  return (
    <div className="py-12 px-4">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Building2 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-900">Register Your Business</h1>
          <p className="text-slate-600 mt-2">Create a business account to list and manage inventory</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-slate-200 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Business Name *</label>
              <input type="text" required value={formData.business_name} onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" data-testid="business-name-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name *</label>
              <input type="text" required value={formData.contact_name} onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" data-testid="contact-name-input" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" data-testid="business-email-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
              <input type="password" required minLength={6} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" data-testid="business-password-input" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
              <input type="tel" required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" data-testid="business-phone-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
              <input type="url" value={formData.website} onChange={(e) => setFormData({...formData, website: e.target.value})} placeholder="https://"
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
              <input type="text" required value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" data-testid="business-city-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">State *</label>
              <select required value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" data-testid="business-state-input">
                <option value="">Select</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ZIP *</label>
              <input type="text" required value={formData.zip_code} onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" data-testid="business-zip-input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg" placeholder="Tell us about your business..." />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white h-12 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50" data-testid="business-submit-btn">
            {loading ? "Creating Account..." : "Create Business Account"}
          </button>
          <p className="text-center text-sm text-slate-600">
            Already have an account? <Link to="/login" className="text-blue-600 hover:text-blue-700">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

// Installer Registration
const InstallerRegister = () => {
  const [formData, setFormData] = useState({
    email: "", password: "", name: "", phone: "", service_area: "",
    city: "", state: "", zip_code: "", experience: "", availability: "", certifications: "", description: ""
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const states = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register/installer`, formData);
      login(res.data.token, res.data.user);
      setToast({ message: "Installer registered successfully!", type: "success" });
      setTimeout(() => navigate("/"), 1500);
    } catch (error) {
      setToast({ message: error.response?.data?.detail || "Registration failed", type: "error" });
    }
    setLoading(false);
  };

  return (
    <div className="py-12 px-4">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Wrench className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-900">Register as Installer</h1>
          <p className="text-slate-600 mt-2">Join our network of mobile auto glass installers</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-slate-200 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" data-testid="installer-name-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
              <input type="tel" required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" data-testid="installer-phone-input" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" data-testid="installer-email-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
              <input type="password" required minLength={6} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" data-testid="installer-password-input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Service Area *</label>
            <input type="text" required value={formData.service_area} onChange={(e) => setFormData({...formData, service_area: e.target.value})}
              placeholder="e.g., Los Angeles Metro, 50 mile radius" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
              <input type="text" required value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">State *</label>
              <select required value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg">
                <option value="">Select</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ZIP *</label>
              <input type="text" required value={formData.zip_code} onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Experience</label>
              <input type="text" value={formData.experience} onChange={(e) => setFormData({...formData, experience: e.target.value})}
                placeholder="e.g., 5 years" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Availability</label>
              <input type="text" value={formData.availability} onChange={(e) => setFormData({...formData, availability: e.target.value})}
                placeholder="e.g., Mon-Fri 8am-6pm" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Certifications</label>
            <input type="text" value={formData.certifications} onChange={(e) => setFormData({...formData, certifications: e.target.value})}
              placeholder="e.g., NGA Certified, AGRSS" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white h-12 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50" data-testid="installer-submit-btn">
            {loading ? "Creating Account..." : "Register as Installer"}
          </button>
        </form>
      </div>
    </div>
  );
};

// Forgot Password
const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/forgot-password`, null, { params: { email } });
      setToast({ message: res.data.message, type: "success" });
      setStep(2);
    } catch (error) {
      setToast({ message: "Failed to send reset code", type: "error" });
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, null, { params: { email, code, new_password: newPassword } });
      setToast({ message: "Password reset successfully!", type: "success" });
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      setToast({ message: error.response?.data?.detail || "Invalid code", type: "error" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Reset Password</h1>
        </div>
        <div className="bg-white p-8 rounded-xl border border-slate-200">
          {step === 1 ? (
            <form onSubmit={handleRequestCode}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" data-testid="forgot-email-input" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 text-white h-12 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                {loading ? "Sending..." : "Send Reset Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Reset Code</label>
                <input type="text" required value={code} onChange={(e) => setCode(e.target.value)} maxLength={6}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-2xl tracking-widest" data-testid="reset-code-input" />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" data-testid="new-password-input" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 text-white h-12 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}
          <div className="mt-6 text-center">
            <Link to="/login" className="text-blue-600 hover:text-blue-700 text-sm">Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard
const Dashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("inventory");
  const [products, setProducts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [showReplyModal, setShowReplyModal] = useState(null);
  const [stats, setStats] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [allMessages, setAllMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user || !["business", "admin", "customer"].includes(user.user_type)) {
      navigate("/login");
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      // Get messages for all user types
      const [inboxRes, sentRes, unreadRes] = await Promise.all([
        axios.get(`${API}/messages/inbox`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/messages/sent`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/messages/unread-count`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setMessages(inboxRes.data);
      setSentMessages(sentRes.data);
      setUnreadCount(unreadRes.data.unread_count);

      // Get products for business users
      if (user?.user_type === "business" || user?.user_type === "admin") {
        const productsRes = await axios.get(`${API}/products/my-inventory`, { headers: { Authorization: `Bearer ${token}` } });
        setProducts(productsRes.data);
      }
      
      // Admin data
      if (user?.user_type === "admin") {
        const [statsRes, usersRes, allMsgRes, contactsRes] = await Promise.all([
          axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/admin/messages`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/admin/contacts`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setStats(statsRes.data);
        setAllUsers(usersRes.data);
        setAllMessages(allMsgRes.data);
        setContacts(contactsRes.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${API}/products/bulk`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      setToast({ message: `Uploaded ${res.data.created_count} products!`, type: "success" });
      fetchData();
    } catch (error) {
      setToast({ message: error.response?.data?.detail || "Upload failed", type: "error" });
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await axios.delete(`${API}/products/${productId}`, { headers: { Authorization: `Bearer ${token}` } });
      setToast({ message: "Product deleted", type: "success" });
      fetchData();
    } catch (error) {
      setToast({ message: "Failed to delete", type: "error" });
    }
  };

  const handleDeleteAllProducts = async () => {
    if (!window.confirm("⚠️ Are you sure you want to DELETE ALL products in your inventory?\n\nThis action cannot be undone!")) return;
    if (!window.confirm("This will permanently delete " + products.length + " products. Type 'yes' mentally and click OK to confirm.")) return;
    try {
      const res = await axios.delete(`${API}/products`, { headers: { Authorization: `Bearer ${token}` } });
      setToast({ message: res.data.message || "All products deleted!", type: "success" });
      fetchData();
    } catch (error) {
      setToast({ message: "Failed to delete products", type: "error" });
    }
  };

  const toggleVisibility = async (product) => {
    try {
      await axios.put(`${API}/products/${product.id}`, 
        { listing_type: product.listing_type === "public" ? "private" : "public" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData();
    } catch (error) {
      setToast({ message: "Failed to update", type: "error" });
    }
  };

  const markAsRead = async (msgId) => {
    try {
      await axios.put(`${API}/messages/${msgId}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const deleteMessage = async (msgId) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await axios.delete(`${API}/messages/${msgId}`, { headers: { Authorization: `Bearer ${token}` } });
      setToast({ message: "Message deleted", type: "success" });
      fetchData();
    } catch (error) {
      setToast({ message: "Failed to delete", type: "error" });
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/status?is_active=${!currentStatus}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setToast({ message: `User ${!currentStatus ? 'activated' : 'deactivated'}`, type: "success" });
      fetchData();
    } catch (error) {
      setToast({ message: "Failed to update user", type: "error" });
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Delete this user and all their data? This cannot be undone.")) return;
    try {
      await axios.delete(`${API}/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      setToast({ message: "User deleted", type: "success" });
      fetchData();
    } catch (error) {
      setToast({ message: "Failed to delete user", type: "error" });
    }
  };

  const updateContactStatus = async (contactId, status) => {
    try {
      await axios.put(`${API}/admin/contacts/${contactId}/status?status=${status}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (error) {
      setToast({ message: "Failed to update", type: "error" });
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  const tabs = [
    { id: "inbox", label: "Inbox", icon: Mail, count: unreadCount },
    ...(user?.user_type === "business" || user?.user_type === "admin" ? [{ id: "inventory", label: "Inventory", icon: Package }] : []),
    ...(user?.user_type === "admin" ? [
      { id: "users", label: "Users", icon: Users },
      { id: "all-messages", label: "All Messages", icon: Mail },
      { id: "contacts", label: "Contact Forms", icon: FileText, count: contacts.filter(c => c.status === "new").length }
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {user?.user_type === "admin" ? "Admin Dashboard" : "Dashboard"}
            </h1>
            <p className="text-slate-600">Welcome back, {user?.name}</p>
          </div>
          {(user?.user_type === "business" || user?.user_type === "admin") && activeTab === "inventory" && (
            <div className="flex gap-3">
              <input type="file" accept=".csv" ref={fileInputRef} onChange={handleBulkUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-100 bg-white" data-testid="bulk-upload-btn">
                <Upload size={18} /> Bulk Upload
              </button>
              <button onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" data-testid="add-product-btn">
                <Plus size={18} /> Add Product
              </button>
            </div>
          )}
        </div>

        {/* Admin Stats */}
        {user?.user_type === "admin" && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-slate-600 text-sm">Users</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total_users}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-slate-600 text-sm">Businesses</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total_businesses}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-slate-600 text-sm">Installers</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total_installers}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-slate-600 text-sm">Products</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total_products}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-slate-600 text-sm">Messages</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total_messages}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-slate-600 text-sm">New Contacts</p>
              <p className="text-2xl font-bold text-blue-600">{stats.new_contacts}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id ? "bg-white text-blue-600" : "bg-blue-600 text-white"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Inbox Tab */}
        {activeTab === "inbox" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h2 className="font-bold text-slate-900">Inbox ({messages.length})</h2>
              </div>
              {messages.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {messages.map(msg => (
                    <div key={msg.id} className={`p-4 hover:bg-slate-50 ${!msg.is_read ? "bg-blue-50" : ""}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1" onClick={() => markAsRead(msg.id)}>
                          <div className="flex items-center gap-2 mb-1">
                            {!msg.is_read && <span className="w-2 h-2 bg-blue-600 rounded-full"></span>}
                            <span className="font-semibold text-slate-900">{msg.sender_name}</span>
                            {msg.sender_business && <span className="text-sm text-slate-500">({msg.sender_business})</span>}
                          </div>
                          <p className="font-medium text-slate-800">{msg.subject}</p>
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">{msg.message}</p>
                          {msg.product_info && (
                            <p className="text-xs text-blue-600 mt-1">Re: {msg.product_info.nags_number} - {msg.product_info.make} {msg.product_info.model}</p>
                          )}
                          <p className="text-xs text-slate-400 mt-2">{new Date(msg.created_at).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button onClick={() => setShowReplyModal(msg)} className="text-blue-600 hover:text-blue-700 p-2">
                            <Mail size={18} />
                          </button>
                          <button onClick={() => deleteMessage(msg.id)} className="text-red-600 hover:text-red-700 p-2">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Mail className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No messages in your inbox</p>
                </div>
              )}
            </div>

            {/* Sent Messages */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h2 className="font-bold text-slate-900">Sent Messages ({sentMessages.length})</h2>
              </div>
              {sentMessages.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {sentMessages.slice(0, 5).map(msg => (
                    <div key={msg.id} className="p-4 hover:bg-slate-50">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-slate-500">To:</span>
                        <span className="font-medium text-slate-900">{msg.recipient_name}</span>
                      </div>
                      <p className="font-medium text-slate-700">{msg.subject}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(msg.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">No sent messages</div>
              )}
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === "inventory" && (user?.user_type === "business" || user?.user_type === "admin") && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">My Inventory ({products.length})</h2>
              <div className="flex items-center gap-4">
                {products.length > 0 && (
                  <button 
                    onClick={handleDeleteAllProducts}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1 px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50"
                    data-testid="delete-all-btn"
                  >
                    <Trash2 size={14} /> Delete All
                  </button>
                )}
                <a href={`${API}/products/template`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  <Download size={16} /> CSV Template
                </a>
              </div>
            </div>
            {products.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">NAGS #</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">OEM #</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Vehicle</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Qty</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Price</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Location</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Visibility</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map(product => (
                      <tr key={product.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-mono">{product.nags_number}</td>
                        <td className="px-4 py-3 text-sm font-mono">{product.oem_number}</td>
                        <td className="px-4 py-3 text-sm">{product.year_start && product.year_end ? `${product.year_start}-${product.year_end}` : ''} {product.make} {product.model}</td>
                        <td className="px-4 py-3 text-sm">{product.quantity}</td>
                        <td className="px-4 py-3 text-sm">{product.call_for_price ? "Call" : product.price ? `$${product.price}` : '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{product.location || '-'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleVisibility(product)} className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${product.listing_type === "public" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                            {product.listing_type === "public" ? <Eye size={14} /> : <EyeOff size={14} />}
                            {product.listing_type}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setEditProduct(product)} className="text-blue-600 hover:text-blue-700" title="Edit">
                              <Edit size={18} />
                            </button>
                            <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-700" title="Delete">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No products yet. Add your first product!</p>
              </div>
            )}
          </div>
        )}

        {/* Admin: Users Tab */}
        {activeTab === "users" && user?.user_type === "admin" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h2 className="font-bold text-slate-900">All Users ({allUsers.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Joined</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-sm">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          u.user_type === "admin" ? "bg-purple-100 text-purple-700" :
                          u.user_type === "business" ? "bg-blue-100 text-blue-700" :
                          u.user_type === "installer" ? "bg-green-100 text-green-700" :
                          "bg-slate-100 text-slate-700"
                        }`}>{u.user_type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => toggleUserStatus(u.id, u.is_active)} className={`text-xs px-2 py-1 rounded ${u.is_active ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                            {u.is_active ? "Deactivate" : "Activate"}
                          </button>
                          {u.user_type !== "admin" && (
                            <button onClick={() => deleteUser(u.id)} className="text-red-600 hover:text-red-700">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Admin: All Messages Tab */}
        {activeTab === "all-messages" && user?.user_type === "admin" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h2 className="font-bold text-slate-900">All Messages ({allMessages.length})</h2>
            </div>
            {allMessages.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {allMessages.map(msg => (
                  <div key={msg.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{msg.sender_name}</span>
                          <span className="text-slate-400">→</span>
                          <span className="font-medium">{msg.recipient_name}</span>
                          {!msg.is_read && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Unread</span>}
                        </div>
                        <p className="font-medium text-slate-800 mt-1">{msg.subject}</p>
                        <p className="text-sm text-slate-600 mt-1">{msg.message}</p>
                        <p className="text-xs text-slate-400 mt-2">{new Date(msg.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500">No messages yet</div>
            )}
          </div>
        )}

        {/* Admin: Contact Forms Tab */}
        {activeTab === "contacts" && user?.user_type === "admin" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h2 className="font-bold text-slate-900">Contact Form Submissions ({contacts.length})</h2>
            </div>
            {contacts.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {contacts.map(contact => (
                  <div key={contact.id} className={`p-4 hover:bg-slate-50 ${contact.status === "new" ? "bg-yellow-50" : ""}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">{contact.name}</span>
                          <span className="text-sm text-slate-500">&lt;{contact.email}&gt;</span>
                          {contact.phone && <span className="text-sm text-slate-500">{contact.phone}</span>}
                        </div>
                        <p className="font-medium text-slate-800">{contact.subject}</p>
                        <p className="text-sm text-slate-600 mt-1">{contact.message}</p>
                        <p className="text-xs text-slate-400 mt-2">{new Date(contact.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <select
                          value={contact.status}
                          onChange={(e) => updateContactStatus(contact.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded border ${
                            contact.status === "new" ? "bg-yellow-100 border-yellow-200" :
                            contact.status === "read" ? "bg-blue-100 border-blue-200" :
                            "bg-green-100 border-green-200"
                          }`}
                        >
                          <option value="new">New</option>
                          <option value="read">Read</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500">No contact submissions</div>
            )}
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && <AddProductModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchData(); }} token={token} setToast={setToast} />}

      {/* Reply Modal */}
      {showReplyModal && <ReplyModal message={showReplyModal} onClose={() => setShowReplyModal(null)} token={token} setToast={setToast} onSuccess={() => { setShowReplyModal(null); fetchData(); }} />}
    </div>
  );
};

// Reply Modal Component
const ReplyModal = ({ message, onClose, token, setToast, onSuccess }) => {
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setLoading(true);
    try {
      await axios.post(`${API}/messages/${message.id}/reply`, { message: reply }, { headers: { Authorization: `Bearer ${token}` } });
      setToast({ message: "Reply sent!", type: "success" });
      onSuccess();
    } catch (error) {
      setToast({ message: "Failed to send reply", type: "error" });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold">Reply to {message.sender_name}</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        <div className="p-4">
          <div className="bg-slate-50 p-3 rounded-lg mb-4">
            <p className="text-sm font-medium text-slate-700">{message.subject}</p>
            <p className="text-sm text-slate-600 mt-1">{message.message}</p>
          </div>
          <form onSubmit={handleSubmit}>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your reply..."
              rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
            <button type="submit" disabled={loading}
              className="mt-4 w-full bg-blue-600 text-white h-10 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Sending..." : "Send Reply"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Add Product Modal
const AddProductModal = ({ onClose, onSuccess, token, setToast }) => {
  const [formData, setFormData] = useState({
    part_number: "", nags_number: "", oem_number: "", category: "",
    year_start: "", year_end: "", make: "", model: "",
    condition: "", price: "", call_for_price: false, quantity: 1,
    listing_type: "public", description: "", location: "", images: []
  });
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  useEffect(() => {
    axios.get(`${API}/vehicles/categories`).then(res => setCategories(res.data));
    axios.get(`${API}/vehicles/makes`).then(res => setMakes(res.data));
  }, []);

  useEffect(() => {
    if (formData.make) {
      axios.get(`${API}/vehicles/models/${formData.make}`).then(res => setModels(res.data));
    } else {
      setModels([]);
    }
  }, [formData.make]);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const maxImages = 3;
    const currentCount = formData.images.length;
    const remainingSlots = maxImages - currentCount;
    
    if (files.length > remainingSlots) {
      setToast({ message: `You can only upload ${remainingSlots} more image(s). Maximum is 3.`, type: "error" });
      return;
    }

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        setToast({ message: "Each image must be less than 5MB", type: "error" });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, base64].slice(0, maxImages)
        }));
        setImagePreviews(prev => [...prev, base64].slice(0, maxImages));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nags_number.trim()) {
      setToast({ message: "NAGS Number is required", type: "error" });
      return;
    }
    
    if (!formData.oem_number.trim()) {
      setToast({ message: "OEM Part Number is required", type: "error" });
      return;
    }
    
    setLoading(true);
    try {
      const submitData = {
        ...formData,
        price: formData.call_for_price || !formData.price ? null : parseFloat(formData.price),
        year_start: formData.year_start ? parseInt(formData.year_start) : null,
        year_end: formData.year_end ? parseInt(formData.year_end) : null,
        quantity: formData.quantity ? parseInt(formData.quantity) : 1
      };
      
      await axios.post(`${API}/products`, submitData, { headers: { Authorization: `Bearer ${token}` } });
      setToast({ message: "Product added successfully!", type: "success" });
      onSuccess();
    } catch (error) {
      setToast({ message: error.response?.data?.detail || "Failed to add product", type: "error" });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl">
          <h2 className="text-xl font-bold text-white">Add New Product</h2>
          <button onClick={onClose} className="text-white hover:text-blue-200"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Disclaimer */}
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>Disclaimer:</strong> CarGlassHub is not responsible for the quality of parts listed. We only connect businesses to help find the right parts. All financial transactions and quality verification are the responsibility of the parties involved.
            </p>
          </div>

          {/* Required Fields - NAGS Number & OEM Part Number */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm font-semibold text-blue-900 mb-3">Required Information</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-blue-900 mb-1">NAGS Number *</label>
                <input 
                  type="text" 
                  value={formData.nags_number} 
                  onChange={(e) => setFormData({...formData, nags_number: e.target.value})}
                  placeholder="e.g., FW02537"
                  className="w-full h-11 px-4 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  data-testid="nags-number-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-blue-900 mb-1">OEM Part Number *</label>
                <input 
                  type="text" 
                  value={formData.oem_number} 
                  onChange={(e) => setFormData({...formData, oem_number: e.target.value})}
                  placeholder="e.g., 43R-001025"
                  className="w-full h-11 px-4 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  data-testid="oem-number-input"
                />
              </div>
            </div>
          </div>

          {/* Optional Fields Section */}
          <div className="space-y-4">
            <p className="text-sm text-slate-500 font-medium">Optional Details (fill in what you know)</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Your Part Number</label>
                <input 
                  type="text" 
                  value={formData.part_number} 
                  onChange={(e) => setFormData({...formData, part_number: e.target.value})}
                  placeholder="Your internal part #"
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select 
                  value={formData.category} 
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Year From</label>
                <input 
                  type="number" 
                  value={formData.year_start} 
                  onChange={(e) => setFormData({...formData, year_start: e.target.value})}
                  placeholder="2020"
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Year To</label>
                <input 
                  type="number" 
                  value={formData.year_end} 
                  onChange={(e) => setFormData({...formData, year_end: e.target.value})}
                  placeholder="2024"
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Make</label>
                <select 
                  value={formData.make} 
                  onChange={(e) => setFormData({...formData, make: e.target.value, model: ""})}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select make</option>
                  {makes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                <select 
                  value={formData.model} 
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.make}
                >
                  <option value="">{formData.make ? "Select model" : "Select make first"}</option>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Condition</label>
                <select 
                  value={formData.condition} 
                  onChange={(e) => setFormData({...formData, condition: e.target.value})}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select condition</option>
                  <option value="New">New</option>
                  <option value="Used">Used</option>
                  <option value="OEM">OEM</option>
                  <option value="Aftermarket">Aftermarket</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={formData.price} 
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  placeholder="0.00"
                  disabled={formData.call_for_price} 
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                <input 
                  type="number" 
                  min="1" 
                  value={formData.quantity} 
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  placeholder="1"
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description / Notes</label>
              <textarea 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Any additional details about this part..."
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Part Location - Private (Only visible to business owner) */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={16} className="text-slate-500" />
                <label className="block text-sm font-semibold text-slate-700">Part Location</label>
                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">Private - Only you can see this</span>
              </div>
              <input 
                type="text" 
                value={formData.location} 
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="e.g., Warehouse A, Shelf B3, Bin 12"
                className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                data-testid="part-location-input"
              />
              <p className="text-xs text-slate-500 mt-1">This helps you find the part in your inventory. Not shown to buyers.</p>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Product Images (up to 3)</label>
              <div className="flex flex-wrap gap-3">
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200">
                    <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {imagePreviews.length < 3 && (
                  <label className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                    <Upload size={24} className="text-slate-400" />
                    <span className="text-xs text-slate-500 mt-1">Add Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">JPG, PNG up to 5MB each</p>
            </div>
          </div>

          {/* Options */}
          <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={formData.call_for_price} 
                onChange={(e) => setFormData({...formData, call_for_price: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-slate-700">Call for Price</span>
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  checked={formData.listing_type === "public"} 
                  onChange={() => setFormData({...formData, listing_type: "public"})}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-slate-700">Public (Searchable)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  checked={formData.listing_type === "private"} 
                  onChange={() => setFormData({...formData, listing_type: "private"})}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-slate-700">Private (Internal)</span>
              </label>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white h-12 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Adding Product..." : "Add Product"}
          </button>
        </form>
      </div>
    </div>
  );
};

// Find Installers Page
const FindInstallers = () => {
  const [installers, setInstallers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  useEffect(() => {
    fetchInstallers();
  }, []);

  const fetchInstallers = async (searchCity = "", searchState = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchCity) params.append("city", searchCity);
      if (searchState) params.append("state", searchState);
      const res = await axios.get(`${API}/installers?${params.toString()}`);
      setInstallers(res.data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchInstallers(city, state);
  };

  return (
    <div className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Find Auto Glass Installers</h1>
          <p className="text-slate-600 mt-2">Connect with certified mobile installers in your area</p>
        </div>

        <form onSubmit={handleSearch} className="bg-white p-6 rounded-xl border border-slate-200 mb-8 flex gap-4 flex-wrap">
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City"
            className="flex-1 min-w-[200px] h-12 px-4 border border-slate-200 rounded-lg" />
          <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="State (e.g., CA)"
            className="w-24 h-12 px-4 border border-slate-200 rounded-lg" />
          <button type="submit" className="bg-blue-600 text-white px-6 h-12 rounded-lg font-medium hover:bg-blue-700">
            Search
          </button>
        </form>

        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>
        ) : installers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {installers.map(installer => (
              <div key={installer.id} className="bg-white p-6 rounded-xl border border-slate-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{installer.name}</h3>
                    <p className="text-slate-600 flex items-center gap-1 mt-1"><MapPin size={16} /> {installer.city}, {installer.state}</p>
                    <p className="text-slate-600 flex items-center gap-1"><Phone size={16} /> {installer.phone}</p>
                  </div>
                  {installer.verified && <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">Verified</span>}
                </div>
                {installer.service_area && <p className="text-sm text-slate-500 mt-3">Service Area: {installer.service_area}</p>}
                {installer.certifications && <p className="text-sm text-slate-500">Certifications: {installer.certifications}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <Wrench className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No installers found. Try a different search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Contact Page
const Contact = () => {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/contact`, formData);
      setToast({ message: "Message sent successfully!", type: "success" });
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (error) {
      setToast({ message: "Failed to send message", type: "error" });
    }
    setLoading(false);
  };

  return (
    <div className="py-12 px-4">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Contact Us</h1>
          <p className="text-slate-600 mt-2">Have questions? We're here to help.</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full h-12 px-4 border border-slate-200 rounded-lg" data-testid="contact-name-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full h-12 px-4 border border-slate-200 rounded-lg" data-testid="contact-email-input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full h-12 px-4 border border-slate-200 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
            <input type="text" required value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})}
              className="w-full h-12 px-4 border border-slate-200 rounded-lg" data-testid="contact-subject-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Message *</label>
            <textarea required rows={5} value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg" data-testid="contact-message-input" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white h-12 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50" data-testid="contact-submit-btn">
            {loading ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </div>
  );
};

// Static Pages
const Terms = () => (
  <div className="py-12 px-4 max-w-4xl mx-auto">
    <h1 className="text-3xl font-bold text-slate-900 mb-6">Terms & Conditions</h1>
    <div className="bg-white p-8 rounded-xl border border-slate-200 prose max-w-none">
      <p>Last updated: {new Date().toLocaleDateString()}</p>
      <h2>1. Acceptance of Terms</h2>
      <p>By accessing and using CarGlassHub, you accept and agree to be bound by the terms and provision of this agreement.</p>
      <h2>2. Platform Purpose</h2>
      <p>CarGlassHub is a B2B marketplace platform that connects auto glass businesses. We facilitate connections between buyers and sellers but are not party to any transactions.</p>
      <h2>3. User Responsibilities</h2>
      <p>Users are responsible for the accuracy of their listings and for conducting their own due diligence on business partners.</p>
      <h2>4. Financial Disclaimer</h2>
      <p><strong>CarGlassHub is not responsible for any financial transactions between users. All transactions are conducted directly between businesses, and CarGlassHub bears no responsibility for payments, refunds, or disputes.</strong></p>
      <h2>5. Limitation of Liability</h2>
      <p>CarGlassHub shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the platform.</p>
    </div>
  </div>
);

const Privacy = () => (
  <div className="py-12 px-4 max-w-4xl mx-auto">
    <h1 className="text-3xl font-bold text-slate-900 mb-6">Privacy Policy</h1>
    <div className="bg-white p-8 rounded-xl border border-slate-200 prose max-w-none">
      <p>Last updated: {new Date().toLocaleDateString()}</p>
      <h2>Information We Collect</h2>
      <p>We collect information you provide directly, including business details, contact information, and inventory data.</p>
      <h2>How We Use Your Information</h2>
      <p>Your information is used to provide our marketplace services, facilitate connections between businesses, and improve our platform.</p>
      <h2>Information Sharing</h2>
      <p>Business listings marked as "public" are visible to all platform users. Private inventory is only visible to the account owner.</p>
      <h2>Data Security</h2>
      <p>We implement appropriate security measures to protect your information.</p>
    </div>
  </div>
);

const Disclaimer = () => (
  <div className="py-12 px-4 max-w-4xl mx-auto">
    <h1 className="text-3xl font-bold text-slate-900 mb-6">Disclaimer</h1>
    <div className="bg-white p-8 rounded-xl border border-slate-200 prose max-w-none">
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
        <h2 className="text-yellow-800 mt-0">Important Notice</h2>
        <p className="text-yellow-700 mb-0">CarGlassHub is a platform for connecting auto glass businesses. We are <strong>NOT</strong> responsible for any financial transactions between users.</p>
      </div>
      <h2>Platform Role</h2>
      <p>CarGlassHub serves solely as a marketplace platform to connect auto glass businesses. We do not:</p>
      <ul>
        <li>Process payments between users</li>
        <li>Guarantee the quality of products listed</li>
        <li>Verify the accuracy of all listings</li>
        <li>Mediate financial disputes</li>
      </ul>
      <h2>User Responsibility</h2>
      <p>All users are responsible for:</p>
      <ul>
        <li>Verifying business credentials of their trading partners</li>
        <li>Conducting their own due diligence</li>
        <li>Handling all financial transactions directly</li>
        <li>Resolving any disputes between parties</li>
      </ul>
      <h2>No Warranties</h2>
      <p>The platform is provided "as is" without warranties of any kind, either express or implied.</p>
    </div>
  </div>
);

// Admin Registration
const AdminRegister = () => {
  const [formData, setFormData] = useState({ email: "", password: "", name: "", admin_code: "" });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register/admin`, formData);
      login(res.data.token, res.data.user);
      setToast({ message: "Admin account created!", type: "success" });
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (error) {
      setToast({ message: error.response?.data?.detail || "Registration failed. Check your admin code.", type: "error" });
    }
    setLoading(false);
  };

  return (
    <div className="py-12 px-4">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <Shield className="h-12 w-12 text-purple-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-900">Admin Registration</h1>
          <p className="text-slate-600 mt-2">Create an admin account to manage the platform</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-slate-200 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" data-testid="admin-name-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" data-testid="admin-email-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
            <input type="password" required minLength={6} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg" data-testid="admin-password-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Admin Code *</label>
            <input type="text" required value={formData.admin_code} onChange={(e) => setFormData({...formData, admin_code: e.target.value})}
              placeholder="Enter admin registration code"
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-lg font-mono" data-testid="admin-code-input" />
            <p className="text-xs text-slate-500 mt-1">Contact the platform owner for the admin code</p>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-purple-600 text-white h-12 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50" data-testid="admin-submit-btn">
            {loading ? "Creating Admin Account..." : "Create Admin Account"}
          </button>
        </form>
      </div>
    </div>
  );
};

// Main App
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Navigation />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register/business" element={<BusinessRegister />} />
              <Route path="/register/installer" element={<InstallerRegister />} />
              <Route path="/register/admin" element={<AdminRegister />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/installers" element={<FindInstallers />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/disclaimer" element={<Disclaimer />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
