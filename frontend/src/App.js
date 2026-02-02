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
      <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400 text-sm">
        © {new Date().getFullYear()} CarGlassHub. All rights reserved. Platform for connecting businesses only.
      </div>
    </div>
  </footer>
);

// Home Page - Public Search
const Home = () => {
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

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
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
                  <input
                    type="text"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    placeholder="Enter part number (NAGS, OEM, Interchange)"
                    className="flex-1 h-12 px-4 bg-white text-slate-900 rounded-lg border-0 focus:ring-2 focus:ring-blue-500"
                    data-testid="part-number-input"
                  />
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
                        <a href={`tel:${product.seller.phone}`} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium">
                          <Phone size={16} />
                          {product.seller.phone}
                        </a>
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
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user || !["business", "admin"].includes(user.user_type)) {
      navigate("/login");
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [productsRes] = await Promise.all([
        axios.get(`${API}/products/my-inventory`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setProducts(productsRes.data);
      
      if (user?.user_type === "admin") {
        const statsRes = await axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
        setStats(statsRes.data);
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

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600">Welcome back, {user?.name}</p>
          </div>
          <div className="flex gap-3">
            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleBulkUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-100" data-testid="bulk-upload-btn">
              <Upload size={18} /> Bulk Upload
            </button>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" data-testid="add-product-btn">
              <Plus size={18} /> Add Product
            </button>
          </div>
        </div>

        {/* Stats for Admin */}
        {user?.user_type === "admin" && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-slate-600 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total_users}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-slate-600 text-sm">Businesses</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total_businesses}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-slate-600 text-sm">Products</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total_products}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <p className="text-slate-600 text-sm">New Contacts</p>
              <p className="text-2xl font-bold text-slate-900">{stats.new_contacts}</p>
            </div>
          </div>
        )}

        {/* Inventory Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">My Inventory ({products.length})</h2>
            <a href={`${API}/products/template`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Download size={16} /> CSV Template
            </a>
          </div>
          
          {products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Part #</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Vehicle</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Qty</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Price</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Visibility</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map(product => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-mono">{product.part_number}</td>
                      <td className="px-4 py-3 text-sm capitalize">{product.category?.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-sm">{product.year_start}-{product.year_end} {product.make} {product.model}</td>
                      <td className="px-4 py-3 text-sm">{product.quantity}</td>
                      <td className="px-4 py-3 text-sm">{product.call_for_price ? "Call" : `$${product.price}`}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleVisibility(product)} className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${product.listing_type === "public" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                          {product.listing_type === "public" ? <Eye size={14} /> : <EyeOff size={14} />}
                          {product.listing_type}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-700">
                          <Trash2 size={18} />
                        </button>
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
      </div>

      {/* Add Product Modal */}
      {showAddModal && <AddProductModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchData(); }} token={token} setToast={setToast} />}
    </div>
  );
};

// Add Product Modal
const AddProductModal = ({ onClose, onSuccess, token, setToast }) => {
  const [formData, setFormData] = useState({
    part_number: "", nags_number: "", category: "windshield",
    year_start: 2020, year_end: 2024, make: "", model: "",
    condition: "New", price: "", call_for_price: false, quantity: 1,
    listing_type: "public", description: ""
  });
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);

  useEffect(() => {
    axios.get(`${API}/vehicles/categories`).then(res => setCategories(res.data));
    axios.get(`${API}/vehicles/makes`).then(res => setMakes(res.data));
  }, []);

  useEffect(() => {
    if (formData.make) {
      axios.get(`${API}/vehicles/models/${formData.make}`).then(res => setModels(res.data));
    }
  }, [formData.make]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/products`, {
        ...formData,
        price: formData.call_for_price ? null : parseFloat(formData.price),
        year_start: parseInt(formData.year_start),
        year_end: parseInt(formData.year_end),
        quantity: parseInt(formData.quantity)
      }, { headers: { Authorization: `Bearer ${token}` } });
      setToast({ message: "Product added!", type: "success" });
      onSuccess();
    } catch (error) {
      setToast({ message: error.response?.data?.detail || "Failed to add product", type: "error" });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold">Add Product</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Part Number *</label>
              <input type="text" required value={formData.part_number} onChange={(e) => setFormData({...formData, part_number: e.target.value})}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">NAGS Number</label>
              <input type="text" value={formData.nags_number} onChange={(e) => setFormData({...formData, nags_number: e.target.value})}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <select required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full h-10 px-3 border border-slate-200 rounded-lg">
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Year Start</label>
              <input type="number" value={formData.year_start} onChange={(e) => setFormData({...formData, year_start: e.target.value})}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Year End</label>
              <input type="number" value={formData.year_end} onChange={(e) => setFormData({...formData, year_end: e.target.value})}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Make *</label>
              <select required value={formData.make} onChange={(e) => setFormData({...formData, make: e.target.value, model: ""})}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg">
                <option value="">Select</option>
                {makes.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Model *</label>
              <select required value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg">
                <option value="">Select</option>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Condition</label>
              <select value={formData.condition} onChange={(e) => setFormData({...formData, condition: e.target.value})}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg">
                <option>New</option><option>Used</option><option>OEM</option><option>Aftermarket</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price</label>
              <input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})}
                disabled={formData.call_for_price} className="w-full h-10 px-3 border border-slate-200 rounded-lg disabled:bg-slate-100" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formData.call_for_price} onChange={(e) => setFormData({...formData, call_for_price: e.target.checked})} />
              <span className="text-sm">Call for Price</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={formData.listing_type === "public"} onChange={() => setFormData({...formData, listing_type: "public"})} />
              <span className="text-sm">Public (Searchable)</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={formData.listing_type === "private"} onChange={() => setFormData({...formData, listing_type: "private"})} />
              <span className="text-sm">Private (Internal)</span>
            </label>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white h-12 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Adding..." : "Add Product"}
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
