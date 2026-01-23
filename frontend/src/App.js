import { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Search, Car, MapPin, Phone, Mail, User, Shield, Truck, Menu, X, ChevronDown, Wrench, Store, CheckCircle, AlertCircle } from "lucide-react";
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
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-sm shadow-lg flex items-center gap-3 ${
      type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
    }`}>
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

  const navLinks = [
    { path: "/", label: "Part Search" },
    { path: "/browse", label: "Browse Parts" },
    { path: "/installers", label: "Find Installers" },
    { path: "/contact", label: "Contact Us" },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <Car className="h-8 w-8 text-blue-600" />
            <span className="font-heading text-xl font-bold text-slate-900 tracking-tight">CarGlassHub</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  location.pathname === link.path ? "text-blue-600" : "text-slate-600"
                }`}
                data-testid={`nav-${link.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600">Welcome, {user.name}</span>
                {user.user_type === "seller" && (
                  <Link
                    to="/dashboard"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    data-testid="dashboard-link"
                  >
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="text-sm font-medium text-slate-600 hover:text-blue-600"
                  data-testid="logout-btn"
                >
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
                  onClick={() => navigate("/sell")}
                  className="bg-slate-900 text-white px-4 py-2 text-sm font-medium rounded-sm hover:bg-slate-800 transition-colors"
                  data-testid="sell-parts-btn"
                >
                  Sell Your Parts
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
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className="block py-2 text-slate-600 hover:text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-slate-200 mt-4">
              {user ? (
                <button onClick={logout} className="text-slate-600">Logout</button>
              ) : (
                <>
                  <Link to="/login" className="block py-2 text-slate-600" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                  <Link to="/sell" className="block py-2 text-blue-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Sell Your Parts</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

// Home Page Component
const Home = () => {
  const [searchType, setSearchType] = useState("part");
  const [partNumber, setPartNumber] = useState("");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [partType, setPartType] = useState("");
  const [years, setYears] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [partTypes, setPartTypes] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Common part number prefixes and their meanings
  const partNumberHints = [
    { prefix: "FW", meaning: "Windshield (Front Window)", examples: ["FW02", "FW03", "FW04"] },
    { prefix: "DW", meaning: "Door Window", examples: ["DW01", "DW02", "DW03"] },
    { prefix: "RW", meaning: "Rear Window", examples: ["RW01", "RW02"] },
    { prefix: "QG", meaning: "Quarter Glass", examples: ["QG01", "QG02"] },
    { prefix: "VG", meaning: "Vent Glass", examples: ["VG01", "VG02"] },
    { prefix: "SR", meaning: "Sunroof Glass", examples: ["SR01", "SR02"] },
    { prefix: "DB", meaning: "Door Glass - Back", examples: ["DB01", "DB02"] },
    { prefix: "DF", meaning: "Door Glass - Front", examples: ["DF01", "DF02"] },
  ];

  // Sample NAGS numbers for suggestions
  const sampleNAGS = [
    { number: "FW02537", vehicle: "2018-2023 Toyota Camry", type: "Windshield" },
    { number: "FW02845", vehicle: "2019-2024 Honda Accord", type: "Windshield" },
    { number: "FW03125", vehicle: "2020-2024 Ford F-150", type: "Windshield" },
    { number: "FW02998", vehicle: "2017-2022 Chevrolet Silverado", type: "Windshield" },
    { number: "DW01456", vehicle: "2018-2023 Toyota Camry", type: "Front Door Glass" },
    { number: "DW01789", vehicle: "2019-2024 Honda Civic", type: "Front Door Glass" },
    { number: "RW02134", vehicle: "2020-2024 Ford Explorer", type: "Rear Window" },
    { number: "RW01876", vehicle: "2018-2023 Nissan Altima", type: "Rear Window" },
    { number: "QG00345", vehicle: "2019-2024 BMW 3 Series", type: "Quarter Glass" },
    { number: "FW04521", vehicle: "2021-2024 Tesla Model 3", type: "Windshield" },
    { number: "FW03876", vehicle: "2020-2024 Hyundai Sonata", type: "Windshield" },
    { number: "DW02234", vehicle: "2018-2023 Mazda CX-5", type: "Door Glass" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [yearsRes, makesRes, partTypesRes] = await Promise.all([
          axios.get(`${API}/vehicles/years`),
          axios.get(`${API}/vehicles/makes`),
          axios.get(`${API}/vehicles/part-types`)
        ]);
        setYears(yearsRes.data);
        setMakes(makesRes.data);
        setPartTypes(partTypesRes.data);
      } catch (error) {
        console.error("Error fetching vehicle data:", error);
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

  // Smart suggestions based on input
  useEffect(() => {
    if (partNumber.length >= 1) {
      const input = partNumber.toUpperCase();
      let newSuggestions = [];

      // Check if input starts with known prefix
      const matchingHints = partNumberHints.filter(h => 
        h.prefix.startsWith(input) || input.startsWith(h.prefix)
      );

      if (matchingHints.length > 0 && input.length <= 2) {
        // Show what the prefix means
        newSuggestions = matchingHints.map(h => ({
          type: "hint",
          prefix: h.prefix,
          meaning: h.meaning,
          examples: h.examples
        }));
      }

      // Show matching NAGS numbers
      const matchingNAGS = sampleNAGS.filter(n => 
        n.number.toUpperCase().includes(input) ||
        n.vehicle.toUpperCase().includes(input) ||
        n.type.toUpperCase().includes(input)
      ).slice(0, 5);

      if (matchingNAGS.length > 0) {
        newSuggestions = [
          ...newSuggestions,
          ...matchingNAGS.map(n => ({
            type: "part",
            number: n.number,
            vehicle: n.vehicle,
            partType: n.type
          }))
        ];
      }

      // If just numbers, suggest it might be OEM or interchange
      if (/^\d+$/.test(input) && input.length >= 2) {
        newSuggestions.unshift({
          type: "info",
          message: `Looking for OEM or interchange number "${input}"...`,
          hint: "Try adding a prefix like FW, DW, or RW for NAGS numbers"
        });
      }

      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [partNumber]);

  const handlePartSearch = async (e) => {
    e.preventDefault();
    if (!partNumber.trim()) return;
    setLoading(true);
    setSearched(true);
    setShowSuggestions(false);
    try {
      const res = await axios.post(`${API}/parts/search/number`, { part_number: partNumber });
      setSearchResults(res.data);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    }
    setLoading(false);
  };

  const handleVehicleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const res = await axios.post(`${API}/parts/search/vehicle`, {
        year: year ? parseInt(year) : null,
        make: make || null,
        model: model || null,
        part_type: partType || null
      });
      setSearchResults(res.data);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    }
    setLoading(false);
  };

  const quickSearch = (type) => {
    setPartType(type);
    setSearchType("vehicle");
  };

  const selectSuggestion = (suggestion) => {
    if (suggestion.type === "part") {
      setPartNumber(suggestion.number);
    } else if (suggestion.type === "hint") {
      setPartNumber(suggestion.prefix);
    }
    setShowSuggestions(false);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="font-heading text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              Find the Correct <span className="text-blue-400">Auto Glass</span> For Your Vehicle in Your Area
            </h1>
            <p className="text-slate-300 text-lg mb-8">
              The nation's leading marketplace for automotive glass. Search thousands of windshields, door glass, and more from trusted sellers near you, or add your shop inventory in our database private or public for free and list unlimited items.
            </p>
          </div>

          {/* Search Box */}
          <div className="bg-white/10 backdrop-blur-xl rounded-sm p-6 border border-white/20">
            {/* Search Type Tabs */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setSearchType("part")}
                className={`px-4 py-2 text-sm font-medium rounded-sm transition-colors ${
                  searchType === "part" 
                    ? "bg-white text-slate-900" 
                    : "text-white hover:bg-white/10"
                }`}
                data-testid="search-by-part-tab"
              >
                Search by Part Number
              </button>
              <button
                onClick={() => setSearchType("vehicle")}
                className={`px-4 py-2 text-sm font-medium rounded-sm transition-colors ${
                  searchType === "vehicle" 
                    ? "bg-white text-slate-900" 
                    : "text-white hover:bg-white/10"
                }`}
                data-testid="search-by-vehicle-tab"
              >
                Search by Vehicle
              </button>
            </div>

            {searchType === "part" ? (
              <form onSubmit={handlePartSearch} className="relative">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">#</span>
                    <input
                      type="text"
                      value={partNumber}
                      onChange={(e) => setPartNumber(e.target.value)}
                      onFocus={() => partNumber.length >= 1 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="Enter part number (NAGS, OEM, or Interchange)..."
                      className="w-full h-12 pl-10 pr-4 bg-white text-slate-900 rounded-sm border-0 focus:ring-2 focus:ring-blue-500"
                      data-testid="part-number-input"
                      autoComplete="off"
                    />
                    
                    {/* Smart Suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-sm shadow-xl border border-slate-200 z-50 max-h-80 overflow-y-auto" data-testid="suggestions-dropdown">
                        {suggestions.map((suggestion, idx) => (
                          <div key={idx}>
                            {suggestion.type === "info" && (
                              <div className="px-4 py-3 bg-blue-50 border-b border-slate-100">
                                <p className="text-sm text-blue-800 font-medium">{suggestion.message}</p>
                                <p className="text-xs text-blue-600 mt-1">{suggestion.hint}</p>
                              </div>
                            )}
                            {suggestion.type === "hint" && (
                              <button
                                type="button"
                                onClick={() => selectSuggestion(suggestion)}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="bg-slate-900 text-white px-2 py-1 rounded text-sm font-mono font-bold">{suggestion.prefix}</span>
                                  <div>
                                    <p className="text-slate-900 font-medium">{suggestion.meaning}</p>
                                    <p className="text-xs text-slate-500">Examples: {suggestion.examples.join(", ")}</p>
                                  </div>
                                </div>
                              </button>
                            )}
                            {suggestion.type === "part" && (
                              <button
                                type="button"
                                onClick={() => selectSuggestion(suggestion)}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 transition-colors"
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="text-slate-900 font-mono font-bold">{suggestion.number}</p>
                                    <p className="text-sm text-slate-600">{suggestion.vehicle}</p>
                                  </div>
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{suggestion.partType}</span>
                                </div>
                              </button>
                            )}
                          </div>
                        ))}
                        <div className="px-4 py-2 bg-slate-50 text-xs text-slate-500">
                          Type prefix (FW, DW, RW) or any part of the number to search
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 rounded-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                    data-testid="part-search-btn"
                  >
                    <Search size={18} />
                    Search
                  </button>
                </div>
                
                {/* Part Number Guide */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-slate-400 text-xs">Common prefixes:</span>
                  {[
                    { code: "FW", label: "Windshield" },
                    { code: "DW", label: "Door" },
                    { code: "RW", label: "Rear" },
                    { code: "QG", label: "Quarter" }
                  ].map(item => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setPartNumber(item.code)}
                      className="text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded transition-colors"
                    >
                      <span className="font-mono font-bold">{item.code}</span>
                      <span className="ml-1 opacity-70">= {item.label}</span>
                    </button>
                  ))}
                </div>
              </form>
            ) : (
              <form onSubmit={handleVehicleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="h-12 px-4 bg-white text-slate-900 rounded-sm border-0 focus:ring-2 focus:ring-blue-500"
                  data-testid="year-select"
                >
                  <option value="">Year</option>
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className="h-12 px-4 bg-white text-slate-900 rounded-sm border-0 focus:ring-2 focus:ring-blue-500"
                  data-testid="make-select"
                >
                  <option value="">Make</option>
                  {makes.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="h-12 px-4 bg-white text-slate-900 rounded-sm border-0 focus:ring-2 focus:ring-blue-500"
                  disabled={!make}
                  data-testid="model-select"
                >
                  <option value="">{make ? "Model" : "Select Make first"}</option>
                  {models.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  value={partType}
                  onChange={(e) => setPartType(e.target.value)}
                  className="h-12 px-4 bg-white text-slate-900 rounded-sm border-0 focus:ring-2 focus:ring-blue-500"
                  data-testid="part-type-select"
                >
                  <option value="">Part Type</option>
                  {partTypes.map(pt => (
                    <option key={pt} value={pt}>{pt}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  data-testid="vehicle-search-btn"
                >
                  <Search size={18} />
                  Search
                </button>
              </form>
            )}

            {/* Quick Search */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-slate-400 text-sm">Popular:</span>
              {["Windshield", "Front Door Glass - Driver", "Rear Window/Back Glass"].map(type => (
                <button
                  key={type}
                  onClick={() => quickSearch(type)}
                  className="text-blue-400 text-sm hover:text-blue-300 hover:underline"
                  data-testid={`quick-search-${type.toLowerCase().replace(/\s/g, '-')}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Search Results */}
      {searched && (
        <section className="py-12 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-heading text-2xl font-bold text-slate-900 mb-6">
              Search Results ({searchResults.length})
            </h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-4">
                {searchResults.map(part => (
                  <div key={part.id} className="bg-white p-6 border border-slate-200 rounded-sm hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-heading text-lg font-bold text-slate-900">{part.part_type}</h3>
                        <p className="text-slate-600">{part.year_start}-{part.year_end} {part.make} {part.model}</p>
                        <p className="text-sm text-slate-500 mt-1">Part #: {part.part_number}</p>
                        {part.nags_number && <p className="text-sm text-slate-500">NAGS: {part.nags_number}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-heading text-2xl font-bold text-blue-600">${part.price}</p>
                        <p className="text-sm text-slate-500">{part.condition}</p>
                        <p className="text-sm text-green-600">{part.quantity} in stock</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-sm border border-slate-200">
                <Car className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No parts found matching your search criteria.</p>
                <p className="text-sm text-slate-500 mt-2">Try adjusting your search or browse all parts.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-sm flex items-center justify-center">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-900">Verified Sellers</h3>
                <p className="text-slate-600 mt-1">All sellers are verified businesses with quality auto glass inventory.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-sm flex items-center justify-center">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-900">Nationwide Coverage</h3>
                <p className="text-slate-600 mt-1">Find parts from sellers across all 50 states with local pickup options.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-sm flex items-center justify-center">
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-900">Flexible Delivery</h3>
                <p className="text-slate-600 mt-1">Choose pickup, local delivery, or nationwide shipping options.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// Login Page
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isRegister) {
        const res = await axios.post(`${API}/auth/register`, { email, password, name });
        login(res.data.token, res.data.user);
        setToast({ message: "Account created successfully!", type: "success" });
        setTimeout(() => navigate("/"), 1500);
      } else {
        const res = await axios.post(`${API}/auth/login`, { email, password });
        login(res.data.token, res.data.user);
        setToast({ message: "Login successful!", type: "success" });
        // Redirect sellers to dashboard
        const redirectPath = res.data.user.user_type === "seller" ? "/dashboard" : "/";
        setTimeout(() => navigate(redirectPath), 1500);
      }
    } catch (error) {
      setToast({ 
        message: error.response?.data?.detail || "An error occurred", 
        type: "error" 
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold text-slate-900">
            {isRegister ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-slate-600 mt-2">
            {isRegister ? "Sign up to start buying or selling auto glass" : "Sign in to your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 border border-slate-200 rounded-sm">
          {isRegister && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="register-name-input"
              />
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="login-email-input"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="login-password-input"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white h-12 rounded-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
            data-testid="login-submit-btn"
          >
            {loading ? "Please wait..." : (isRegister ? "Create Account" : "Sign In")}
          </button>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-blue-600 hover:text-blue-700 text-sm"
              data-testid="toggle-auth-mode"
            >
              {isRegister ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-600 text-sm">Are you a business?</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link to="/sell" className="text-blue-600 hover:text-blue-700 text-sm font-medium" data-testid="register-seller-link">
              Register as Seller
            </Link>
            <span className="text-slate-300">|</span>
            <Link to="/installer-register" className="text-blue-600 hover:text-blue-700 text-sm font-medium" data-testid="register-installer-link">
              Register as Installer
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// Seller Registration Page
const SellerRegister = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    business_name: "",
    contact_name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    website: "",
    description: ""
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await axios.post(`${API}/sellers/register`, formData);
      login(res.data.token, res.data.user);
      setToast({ message: "Seller account created successfully!", type: "success" });
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (error) {
      console.error("Registration error:", error.response?.data);
      setToast({ 
        message: error.response?.data?.detail || "Registration failed. Please try again.", 
        type: "error" 
      });
    }
    setLoading(false);
  };

  const states = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
    "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
    "VA", "WA", "WV", "WI", "WY"
  ];

  return (
    <div className="py-12 px-4">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Store className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="font-heading text-3xl font-bold text-slate-900">Sell Your Parts</h1>
          <p className="text-slate-600 mt-2">Create a seller account to list your auto glass inventory</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 border border-slate-200 rounded-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Business Name *</label>
              <input
                type="text"
                name="business_name"
                value={formData.business_name}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="seller-business-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name *</label>
              <input
                type="text"
                name="contact_name"
                value={formData.contact_name}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="seller-contact-name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="seller-email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="seller-password"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="seller-phone"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Website <span className="text-slate-400">(Optional)</span></label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://"
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="seller-website"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Street Address <span className="text-slate-400">(Optional)</span></label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter your business address"
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="seller-address"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="seller-city"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">State *</label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="seller-state"
              >
                <option value="">Select</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ZIP Code *</label>
              <input
                type="text"
                name="zip_code"
                value={formData.zip_code}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="seller-zip"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Business Description <span className="text-slate-400">(Optional)</span></label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tell us about your business..."
              data-testid="seller-description"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white h-12 rounded-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
            data-testid="seller-submit-btn"
          >
            {loading ? "Creating Account..." : "Create Seller Account"}
          </button>

          <p className="text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:text-blue-700">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

// Installer Registration Page
const InstallerRegister = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    business_name: "",
    contact_name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    services: [],
    website: "",
    description: "",
    certifications: ""
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const serviceOptions = [
    "Windshield Replacement",
    "Windshield Repair",
    "Side Window Replacement",
    "Rear Window Replacement",
    "Window Regulator/Motor Replacement",
    "Sunroof Repair",
    "Sunroof Replacement",
    "Panoramic Roof Replacement",
    "Mobile Service",
    "ADAS Calibration",
    "Insurance Claims"
  ];

  const states = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
    "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
    "VA", "WA", "WV", "WI", "WY"
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleServiceToggle = (service) => {
    const newServices = formData.services.includes(service)
      ? formData.services.filter(s => s !== service)
      : [...formData.services, service];
    setFormData({ ...formData, services: newServices });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await axios.post(`${API}/installers/register`, formData);
      login(res.data.token, res.data.user);
      setToast({ message: "Installer account created successfully!", type: "success" });
      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      console.error("Registration error:", error.response?.data);
      setToast({ 
        message: error.response?.data?.detail || "Registration failed. Please try again.", 
        type: "error" 
      });
    }
    setLoading(false);
  };

  return (
    <div className="py-12 px-4">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Wrench className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="font-heading text-3xl font-bold text-slate-900">Register as Installer</h1>
          <p className="text-slate-600 mt-2">Join our network of professional auto glass installers</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 border border-slate-200 rounded-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Business Name *</label>
              <input
                type="text"
                name="business_name"
                value={formData.business_name}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="installer-business-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name *</label>
              <input
                type="text"
                name="contact_name"
                value={formData.contact_name}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="installer-contact-name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="installer-email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="installer-password"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="installer-phone"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Website <span className="text-slate-400">(Optional)</span></label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://"
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="installer-website"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Street Address <span className="text-slate-400">(Optional)</span></label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter your business address"
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="installer-address"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="installer-city"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">State *</label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="installer-state"
              >
                <option value="">Select</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ZIP Code *</label>
              <input
                type="text"
                name="zip_code"
                value={formData.zip_code}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="installer-zip"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Services Offered *</label>
            <div className="grid grid-cols-2 gap-2">
              {serviceOptions.map(service => (
                <label key={service} className="flex items-center gap-2 p-3 border border-slate-200 rounded-sm cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={formData.services.includes(service)}
                    onChange={() => handleServiceToggle(service)}
                    className="h-4 w-4 text-blue-600 rounded"
                    data-testid={`service-${service.toLowerCase().replace(/\s/g, '-')}`}
                  />
                  <span className="text-sm text-slate-700">{service}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Certifications <span className="text-slate-400">(Optional)</span></label>
            <input
              type="text"
              name="certifications"
              value={formData.certifications}
              onChange={handleChange}
              placeholder="e.g., ASE Certified, NGA Certified"
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="installer-certifications"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Business Description <span className="text-slate-400">(Optional)</span></label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tell us about your installation services..."
              data-testid="installer-description"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white h-12 rounded-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
            data-testid="installer-submit-btn"
          >
            {loading ? "Creating Account..." : "Create Installer Account"}
          </button>

          <p className="text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:text-blue-700">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

// Contact Page
const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API}/contact`, formData);
      setToast({ message: "Message sent successfully! We'll get back to you soon.", type: "success" });
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (error) {
      setToast({ 
        message: error.response?.data?.detail || "Failed to send message. Please try again.", 
        type: "error" 
      });
    }
    setLoading(false);
  };

  return (
    <div className="py-12 px-4">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <Mail className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="font-heading text-4xl font-bold text-slate-900">Contact Us</h1>
          <p className="text-slate-600 mt-4 max-w-xl mx-auto">
            Have questions about our auto glass marketplace? We're here to help. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        {/* Contact Form */}
        <form onSubmit={handleSubmit} className="bg-white p-8 border border-slate-200 rounded-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Your Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="contact-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="contact-email"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
            <select
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="contact-subject"
            >
              <option value="">Select a subject</option>
              <option value="General Inquiry">General Inquiry</option>
              <option value="Seller Support">Seller Support</option>
              <option value="Buyer Support">Buyer Support</option>
              <option value="Technical Issue">Technical Issue</option>
              <option value="Partnership">Partnership</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Message *</label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={6}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="How can we help you?"
              data-testid="contact-message"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white h-12 rounded-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
            data-testid="contact-submit-btn"
          >
            {loading ? "Sending..." : "Send Message"}
          </button>
          
          {/* Hidden email reference for backend */}
          <input type="hidden" name="to_email" value="carglasshub44@gmail.com" />
          
          <p className="text-center text-xs text-slate-400 mt-4">
            We typically respond within 24 hours
          </p>
        </form>
      </div>
    </div>
  );
};

// Browse Parts Page
const BrowseParts = () => {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/parts`)
      .then(res => setParts(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-heading text-3xl font-bold text-slate-900 mb-8">Browse Parts</h1>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : parts.length > 0 ? (
          <div className="space-y-4">
            {parts.map(part => (
              <div key={part.id} className="bg-white p-6 border border-slate-200 rounded-sm hover:shadow-lg transition-shadow" data-testid={`part-${part.id}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-slate-900">{part.part_type}</h3>
                    <p className="text-slate-600">{part.year_start}-{part.year_end} {part.make} {part.model}</p>
                    <p className="text-sm text-slate-500 mt-1">Part #: {part.part_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading text-2xl font-bold text-blue-600">${part.price}</p>
                    <p className="text-sm text-slate-500">{part.condition}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-sm border border-slate-200">
            <Car className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No parts available yet.</p>
            <p className="text-sm text-slate-500 mt-2">Check back soon or <Link to="/sell" className="text-blue-600 hover:underline">become a seller</Link> to list your parts.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Star Rating Component
const StarRating = ({ rating, size = 16, interactive = false, onChange }) => {
  const [hoverRating, setHoverRating] = useState(0);
  
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type={interactive ? "button" : undefined}
          disabled={!interactive}
          onClick={() => interactive && onChange && onChange(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          className={`${interactive ? "cursor-pointer" : "cursor-default"}`}
        >
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={(interactive ? hoverRating || rating : rating) >= star ? "#FBBF24" : "none"}
            stroke={(interactive ? hoverRating || rating : rating) >= star ? "#FBBF24" : "#D1D5DB"}
            strokeWidth="2"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  );
};

// Review Modal Component
const ReviewModal = ({ installer, onClose, onSubmit }) => {
  const [rating, setRating] = useState(5);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/reviews`, {
        installer_id: installer.id,
        rating,
        reviewer_name: reviewerName,
        reviewer_email: reviewerEmail || null,
        comment
      });
      onSubmit();
    } catch (error) {
      console.error("Error submitting review:", error);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-sm max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-heading text-xl font-bold text-slate-900">Write a Review</h3>
            <p className="text-slate-600 text-sm mt-1">for {installer.business_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Your Rating *</label>
            <StarRating rating={rating} size={32} interactive onChange={setRating} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Your Name *</label>
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              required
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Doe"
              data-testid="review-name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-slate-400">(Optional)</span></label>
            <input
              type="email"
              value={reviewerEmail}
              onChange={(e) => setReviewerEmail(e.target.value)}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="john@example.com"
              data-testid="review-email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Your Review *</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              rows={4}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Share your experience with this installer..."
              data-testid="review-comment"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 border border-slate-200 text-slate-700 rounded-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 bg-blue-600 text-white rounded-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              data-testid="review-submit-btn"
            >
              {loading ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Reviews List Component
const ReviewsList = ({ installerId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/reviews/${installerId}`)
      .then(res => setReviews(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [installerId]);

  if (loading) return <div className="text-sm text-slate-500">Loading reviews...</div>;
  if (reviews.length === 0) return <div className="text-sm text-slate-500">No reviews yet</div>;

  return (
    <div className="space-y-3 mt-4 pt-4 border-t border-slate-100">
      <h4 className="text-sm font-medium text-slate-700">Recent Reviews</h4>
      {reviews.slice(0, 3).map(review => (
        <div key={review.id} className="bg-slate-50 p-3 rounded-sm">
          <div className="flex items-center gap-2 mb-1">
            <StarRating rating={review.rating} size={14} />
            <span className="text-sm font-medium text-slate-700">{review.reviewer_name}</span>
          </div>
          <p className="text-sm text-slate-600">{review.comment}</p>
          <p className="text-xs text-slate-400 mt-1">
            {new Date(review.created_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
};

// Find Installers Page
const FindInstallers = () => {
  const [installers, setInstallers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchZip, setSearchZip] = useState("");
  const [selectedInstaller, setSelectedInstaller] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [expandedInstaller, setExpandedInstaller] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchInstallers = async (zipCode = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (zipCode) params.append("zip_code", zipCode);
      const res = await axios.get(`${API}/installers?${params.toString()}`);
      setInstallers(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInstallers();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchInstallers(searchZip);
  };

  const handleReviewSubmit = () => {
    setShowReviewModal(false);
    setToast({ message: "Review submitted successfully! Thank you for your feedback.", type: "success" });
    fetchInstallers(searchZip); // Refresh to get updated ratings
  };

  return (
    <div className="py-12 px-4">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {showReviewModal && selectedInstaller && (
        <ReviewModal 
          installer={selectedInstaller} 
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleReviewSubmit}
        />
      )}
      
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-slate-900">Find Installers</h1>
            <p className="text-slate-600 mt-1">Professional auto glass installation services near you</p>
          </div>
          <Link
            to="/installer-register"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-sm font-medium hover:bg-blue-700 transition-colors"
            data-testid="become-installer-btn"
          >
            <Wrench size={18} />
            Register as Installer
          </Link>
        </div>

        {/* Search Form - ZIP Code Only */}
        <form onSubmit={handleSearch} className="bg-white p-6 border border-slate-200 rounded-sm mb-8">
          <label className="block text-sm font-medium text-slate-700 mb-2">Search by ZIP Code</label>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={searchZip}
                onChange={(e) => setSearchZip(e.target.value)}
                placeholder="Enter ZIP code (e.g., 33101, 90210)"
                className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                data-testid="installer-search-zip"
              />
            </div>
            <button
              type="submit"
              className="bg-slate-900 text-white px-8 h-12 rounded-sm font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              data-testid="installer-search-btn"
            >
              <Search size={18} />
              Find Installers
            </button>
          </div>
          <p className="text-sm text-slate-500 mt-2">Enter your ZIP code to find installers in your area</p>
        </form>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : installers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {installers.map(installer => (
              <div key={installer.id} className="bg-white p-6 border border-slate-200 rounded-sm hover:shadow-lg transition-shadow" data-testid={`installer-${installer.id}`}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-sm flex items-center justify-center flex-shrink-0">
                    <Wrench className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <h3 className="font-heading text-lg font-bold text-slate-900">{installer.business_name}</h3>
                      {installer.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <StarRating rating={Math.round(installer.rating)} size={14} />
                          <span className="text-sm text-slate-600">({installer.review_count})</span>
                        </div>
                      )}
                    </div>
                    {installer.address && <p className="text-slate-600 text-sm">{installer.address}</p>}
                    <p className="text-slate-600 text-sm">{installer.city}, {installer.state} {installer.zip_code}</p>
                    
                    <div className="flex items-center gap-4 mt-3">
                      <a href={`tel:${installer.phone}`} className="text-blue-600 text-sm flex items-center gap-1 hover:underline">
                        <Phone size={14} />
                        {installer.phone}
                      </a>
                      {installer.website && (
                        <a href={installer.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">
                          Website
                        </a>
                      )}
                    </div>
                    
                    {installer.services && installer.services.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {installer.services.slice(0, 3).map(service => (
                          <span key={service} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                            {service}
                          </span>
                        ))}
                        {installer.services.length > 3 && (
                          <span className="text-xs text-slate-500">+{installer.services.length - 3} more</span>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => {
                          setSelectedInstaller(installer);
                          setShowReviewModal(true);
                        }}
                        className="text-sm bg-blue-600 text-white px-4 py-2 rounded-sm hover:bg-blue-700 transition-colors"
                        data-testid={`write-review-${installer.id}`}
                      >
                        Write a Review
                      </button>
                      <button
                        onClick={() => setExpandedInstaller(expandedInstaller === installer.id ? null : installer.id)}
                        className="text-sm border border-slate-200 text-slate-700 px-4 py-2 rounded-sm hover:bg-slate-50 transition-colors"
                        data-testid={`view-reviews-${installer.id}`}
                      >
                        {expandedInstaller === installer.id ? "Hide Reviews" : "View Reviews"}
                      </button>
                    </div>

                    {expandedInstaller === installer.id && (
                      <ReviewsList installerId={installer.id} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-sm border border-slate-200">
            <MapPin className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No installers found in this area.</p>
            <p className="text-sm text-slate-500 mt-2">
              Are you an installer? <Link to="/installer-register" className="text-blue-600 hover:underline">Register your business</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Seller Dashboard Component
const SellerDashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [editingPart, setEditingPart] = useState(null);

  useEffect(() => {
    if (!user || user.user_type !== "seller") {
      navigate("/login");
      return;
    }
    fetchParts();
  }, [user, navigate]);

  const fetchParts = async () => {
    try {
      const res = await axios.get(`${API}/parts/my-listings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setParts(res.data);
    } catch (error) {
      console.error("Error fetching parts:", error);
    }
    setLoading(false);
  };

  const handleDelete = async (partId) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    try {
      await axios.delete(`${API}/parts/${partId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setToast({ message: "Part deleted successfully", type: "success" });
      fetchParts();
    } catch (error) {
      setToast({ message: "Failed to delete part", type: "error" });
    }
  };

  const handleBulkSuccess = (count) => {
    setShowBulkModal(false);
    setToast({ message: `Successfully uploaded ${count} parts!`, type: "success" });
    fetchParts();
  };

  const forSaleParts = parts.filter(p => p.listing_type !== "private");
  const privateParts = parts.filter(p => p.listing_type === "private");

  if (!user || user.user_type !== "seller") return null;

  return (
    <div className="py-8 px-4">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {showAddModal && (
        <AddPartModal 
          token={token}
          onClose={() => { setShowAddModal(false); setEditingPart(null); }}
          onSuccess={() => { fetchParts(); setShowAddModal(false); setEditingPart(null); setToast({ message: editingPart ? "Part updated!" : "Part added successfully!", type: "success" }); }}
          editingPart={editingPart}
        />
      )}
      {showBulkModal && (
        <BulkUploadModal
          token={token}
          onClose={() => setShowBulkModal(false)}
          onSuccess={handleBulkSuccess}
        />
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-slate-900">Seller Dashboard</h1>
            <p className="text-slate-600 mt-1">Welcome back, {user.name}! Manage your inventory here.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowBulkModal(true)}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-sm font-medium hover:bg-slate-50 transition-colors"
              data-testid="bulk-upload-btn"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Bulk Upload
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-sm font-medium hover:bg-blue-700 transition-colors"
              data-testid="add-part-btn"
            >
              <span className="text-xl">+</span>
              Add New Part
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 border border-slate-200 rounded-sm">
            <p className="text-sm text-slate-500">Total Listings</p>
            <p className="font-heading text-3xl font-bold text-slate-900">{parts.length}</p>
          </div>
          <div className="bg-white p-6 border border-slate-200 rounded-sm">
            <p className="text-sm text-slate-500">For Sale</p>
            <p className="font-heading text-3xl font-bold text-green-600">{forSaleParts.length}</p>
          </div>
          <div className="bg-white p-6 border border-slate-200 rounded-sm">
            <p className="text-sm text-slate-500">Private (Inventory Only)</p>
            <p className="font-heading text-3xl font-bold text-slate-600">{privateParts.length}</p>
          </div>
        </div>

        {/* Parts List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : parts.length > 0 ? (
          <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-700">Part</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-700">Vehicle</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-700">Price</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-700">Qty</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-700">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parts.map(part => (
                    <tr key={part.id} className="hover:bg-slate-50" data-testid={`part-row-${part.id}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {part.images && part.images.length > 0 ? (
                            <img src={part.images[0]} alt="" className="w-12 h-12 object-cover rounded-sm" />
                          ) : (
                            <div className="w-12 h-12 bg-slate-100 rounded-sm flex items-center justify-center">
                              <Car className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-900">{part.part_type}</p>
                            <p className="text-sm text-slate-500 font-mono">{part.part_number}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-700">{part.year_start}-{part.year_end} {part.make}</p>
                        <p className="text-sm text-slate-500">{part.model}</p>
                      </td>
                      <td className="px-6 py-4">
                        {part.call_for_price ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                            <Phone size={14} />
                            Call
                          </span>
                        ) : (
                          <p className="font-heading font-bold text-slate-900">${part.price}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-700">{part.quantity}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                          part.listing_type === "private" 
                            ? "bg-slate-100 text-slate-700" 
                            : "bg-green-100 text-green-700"
                        }`}>
                          {part.listing_type === "private" ? "Private" : "For Sale"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditingPart(part); setShowAddModal(true); }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            data-testid={`edit-part-${part.id}`}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(part.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                            data-testid={`delete-part-${part.id}`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-sm border border-slate-200">
            <Store className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No parts listed yet.</p>
            <p className="text-sm text-slate-500 mt-2">Click "Add New Part" to start listing your inventory.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Add Part Modal Component
const AddPartModal = ({ token, onClose, onSuccess, editingPart }) => {
  const [formData, setFormData] = useState({
    part_number: editingPart?.part_number || "",
    nags_number: editingPart?.nags_number || "",
    oem_number: editingPart?.oem_number || "",
    part_type: editingPart?.part_type || "",
    year_start: editingPart?.year_start || "",
    year_end: editingPart?.year_end || "",
    make: editingPart?.make || "",
    model: editingPart?.model || "",
    price: editingPart?.price || "",
    call_for_price: editingPart?.call_for_price || false,
    quantity: editingPart?.quantity || "",
    condition: editingPart?.condition || "New",
    description: editingPart?.description || "",
    listing_type: editingPart?.listing_type || "for_sale",
    images: editingPart?.images || []
  });
  const [loading, setLoading] = useState(false);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [partTypes, setPartTypes] = useState([]);
  const [years, setYears] = useState([]);
  const [imagePreviews, setImagePreviews] = useState(editingPart?.images || []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [makesRes, partTypesRes, yearsRes] = await Promise.all([
          axios.get(`${API}/vehicles/makes`),
          axios.get(`${API}/vehicles/part-types`),
          axios.get(`${API}/vehicles/years`)
        ]);
        setMakes(makesRes.data);
        setPartTypes(partTypesRes.data);
        setYears(yearsRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.make) {
      axios.get(`${API}/vehicles/models/${formData.make}`)
        .then(res => setModels(res.data))
        .catch(err => console.error(err));
    }
  }, [formData.make]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === "checkbox" ? checked : value 
    });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (imagePreviews.length + files.length > 3) {
      alert("You can only upload up to 3 images");
      return;
    }

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result]);
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.call_for_price && !formData.price) {
      alert("Please enter a price or select 'Call for Price'");
      return;
    }
    
    setLoading(true);
    
    try {
      const payload = {
        ...formData,
        year_start: parseInt(formData.year_start),
        year_end: parseInt(formData.year_end),
        price: formData.call_for_price ? null : parseFloat(formData.price),
        quantity: parseInt(formData.quantity)
      };

      if (editingPart) {
        await axios.put(`${API}/parts/${editingPart.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API}/parts`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving part:", error);
      alert(error.response?.data?.detail || "Failed to save part");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-sm max-w-2xl w-full my-8" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <h3 className="font-heading text-xl font-bold text-slate-900">
              {editingPart ? "Edit Part" : "Add New Part"}
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Listing Type Toggle - At the top */}
          <div className="bg-slate-50 p-4 rounded-sm border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-3">Listing Type *</label>
            <div className="flex gap-4">
              <label className={`flex-1 p-4 border-2 rounded-sm cursor-pointer transition-colors ${
                formData.listing_type === "for_sale" 
                  ? "border-green-500 bg-green-50" 
                  : "border-slate-200 hover:border-slate-300"
              }`}>
                <input
                  type="radio"
                  name="listing_type"
                  value="for_sale"
                  checked={formData.listing_type === "for_sale"}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className="text-center">
                  <div className={`text-2xl mb-1 ${formData.listing_type === "for_sale" ? "text-green-600" : "text-slate-400"}`}>🏷️</div>
                  <p className="font-medium text-slate-900">For Sale</p>
                  <p className="text-xs text-slate-500 mt-1">Visible to buyers</p>
                </div>
              </label>
              <label className={`flex-1 p-4 border-2 rounded-sm cursor-pointer transition-colors ${
                formData.listing_type === "private" 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-slate-200 hover:border-slate-300"
              }`}>
                <input
                  type="radio"
                  name="listing_type"
                  value="private"
                  checked={formData.listing_type === "private"}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className="text-center">
                  <div className={`text-2xl mb-1 ${formData.listing_type === "private" ? "text-blue-600" : "text-slate-400"}`}>🔒</div>
                  <p className="font-medium text-slate-900">Private</p>
                  <p className="text-xs text-slate-500 mt-1">Inventory only</p>
                </div>
              </label>
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="bg-slate-50 p-4 rounded-sm border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Product Images <span className="text-slate-400">(Up to 3 images)</span>
            </label>
            <div className="flex gap-3 flex-wrap">
              {imagePreviews.map((img, index) => (
                <div key={index} className="relative w-24 h-24 rounded-sm overflow-hidden border border-slate-200">
                  <img src={img} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
              {imagePreviews.length < 3 && (
                <label className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-sm flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <span className="text-2xl text-slate-400">+</span>
                  <span className="text-xs text-slate-500">Add Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    multiple
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">Max 5MB per image. JPG, PNG supported.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">NAGS Part Number</label>
              <input
                type="text"
                name="part_number"
                value={formData.part_number}
                onChange={handleChange}
                placeholder="e.g., FW02537 (optional)"
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">Will auto-generate if left empty</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">OEM Part Number</label>
              <input
                type="text"
                name="nags_number"
                value={formData.nags_number}
                onChange={handleChange}
                placeholder="Optional"
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Part Type</label>
            <select
              name="part_type"
              value={formData.part_type}
              onChange={handleChange}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Select part type (default: Windshield)</option>
              {partTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Year Start</label>
              <select
                name="year_start"
                value={formData.year_start}
                onChange={handleChange}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Select (default: {new Date().getFullYear()})</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Year End</label>
              <select
                name="year_end"
                value={formData.year_end}
                onChange={handleChange}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Select (default: {new Date().getFullYear()})</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Make</label>
              <select
                name="make"
                value={formData.make}
                onChange={handleChange}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Select make (default: Universal)</option>
                {makes.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
              <select
                name="model"
                value={formData.model}
                onChange={handleChange}
                disabled={!formData.make}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">{formData.make ? "Select model" : "Select make first (default: All Models)"}</option>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Price Section with Call for Price option */}
          <div className="bg-slate-50 p-4 rounded-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-slate-700">Pricing *</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="call_for_price"
                  checked={formData.call_for_price}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-sm text-slate-700">Call for Price</span>
              </label>
            </div>
            {!formData.call_for_price ? (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full h-10 pl-7 pr-3 bg-white border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            ) : (
              <div className="h-10 px-3 bg-amber-50 border border-amber-200 rounded-sm flex items-center">
                <Phone size={16} className="text-amber-600 mr-2" />
                <span className="text-sm text-amber-700">Buyers will contact you for pricing</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                min="1"
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Condition *</label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                required
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="New">New</option>
                <option value="Used - Like New">Used - Like New</option>
                <option value="Used - Good">Used - Good</option>
                <option value="Used - Fair">Used - Fair</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Additional details about this part..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 border border-slate-200 text-slate-700 rounded-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 bg-blue-600 text-white rounded-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : (editingPart ? "Update Part" : "Add Part")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Bulk Upload Modal Component
const BulkUploadModal = ({ token, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState([]);

  const templateHeaders = [
    "part_number", "nags_number", "oem_number", "part_type", 
    "year_start", "year_end", "make", "model", "price", 
    "call_for_price", "quantity", "condition", "listing_type", "description"
  ];

  const downloadTemplate = () => {
    const csvContent = [
      templateHeaders.join(","),
      "FW02537,FW02537,,Windshield,2018,2023,Toyota,Camry,150,false,5,New,for_sale,OEM Quality windshield",
      "DW01456,,,Front Door Glass - Driver,2019,2024,Honda,Accord,,true,3,Used - Like New,for_sale,Call for best price",
      "RW02134,,,Rear Window/Back Glass,2020,2024,Ford,F-150,200,false,2,New,private,Inventory item"
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "carglasshub_bulk_upload_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text) => {
    const lines = text.split("\n").filter(line => line.trim());
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      const row = {};
      headers.forEach((header, idx) => {
        let value = values[idx]?.trim() || "";
        // Convert types
        if (header === "year_start" || header === "year_end" || header === "quantity") {
          value = parseInt(value) || 0;
        } else if (header === "price") {
          value = value ? parseFloat(value) : null;
        } else if (header === "call_for_price") {
          value = value.toLowerCase() === "true";
        }
        row[header] = value;
      });
      
      // Set smart defaults for missing fields
      if (!row.listing_type) row.listing_type = "for_sale";
      if (!row.condition) row.condition = "New";
      if (!row.images) row.images = [];
      if (!row.quantity || row.quantity === 0) row.quantity = 1;
      if (!row.year_start) row.year_start = new Date().getFullYear();
      if (!row.year_end) row.year_end = row.year_start || new Date().getFullYear();
      if (!row.part_type) row.part_type = "Windshield";
      if (!row.make) row.make = "Universal";
      if (!row.model) row.model = "All Models";
      if (!row.part_number) row.part_number = `PART-${Date.now()}-${i}`;
      if (!row.price && !row.call_for_price) row.call_for_price = true;
      
      data.push(row);
    }
    return data;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setLoading(true);
    setErrors([]);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const data = parseCSV(text);
        setParsedData(data);
      } catch (err) {
        setErrors([{ row: 0, error: "Failed to parse file. Please check the format." }]);
      }
      setLoading(false);
    };
    reader.readAsText(selectedFile);
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) {
      setErrors([{ row: 0, error: "No data to upload" }]);
      return;
    }
    
    setUploading(true);
    setErrors([]);
    try {
      const res = await axios.post(`${API}/parts/bulk`, { parts: parsedData }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.errors && res.data.errors.length > 0) {
        setErrors(res.data.errors);
      }
      
      onSuccess(res.data.created_count);
    } catch (error) {
      setErrors([{ row: 0, error: error.response?.data?.detail || "Upload failed" }]);
    }
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-sm max-w-4xl w-full my-8" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-heading text-xl font-bold text-slate-900">Bulk Upload Parts</h3>
              <p className="text-sm text-slate-600 mt-1">Upload a CSV file to add multiple parts at once</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Download Template */}
          <div className="bg-blue-50 p-4 rounded-sm border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Step 1: Download Template (Optional)</h4>
            <p className="text-sm text-blue-700 mb-3">
              Download our CSV template for reference. You can also create your own spreadsheet - missing fields will use smart defaults.
            </p>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-sm text-sm font-medium hover:bg-blue-700 transition-colors"
              data-testid="download-template-btn"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download CSV Template
            </button>
            
            <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
              <p className="text-xs text-green-800 font-medium mb-1">✓ Smart Defaults Applied</p>
              <p className="text-xs text-green-700">
                Missing fields will auto-fill: Quantity → 1, Condition → New, Year → Current Year, 
                No Price → Call for Price, Missing Make → Universal, Missing Model → All Models
              </p>
            </div>
          </div>

          {/* Step 2: Upload File */}
          <div className="bg-slate-50 p-4 rounded-sm border border-slate-200">
            <h4 className="font-medium text-slate-900 mb-2">Step 2: Upload Your File</h4>
            <p className="text-sm text-slate-600 mb-3">
              Fill in your parts data and upload the CSV file.
            </p>
            <label className="block">
              <div className="border-2 border-dashed border-slate-300 rounded-sm p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {file ? (
                  <p className="text-slate-900 font-medium">{file.name}</p>
                ) : (
                  <p className="text-slate-600">Click to select CSV file or drag and drop</p>
                )}
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="bulk-upload-input"
                />
              </div>
            </label>
          </div>

          {/* Preview */}
          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-slate-600 mt-2">Parsing file...</p>
            </div>
          )}

          {parsedData.length > 0 && !loading && (
            <div>
              <h4 className="font-medium text-slate-900 mb-2">
                Preview ({parsedData.length} parts found)
              </h4>
              <div className="border border-slate-200 rounded-sm overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">#</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Part #</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Vehicle</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Price</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Qty</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedData.slice(0, 50).map((part, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                          <td className="px-3 py-2 font-mono text-slate-900">{part.part_number}</td>
                          <td className="px-3 py-2 text-slate-700">{part.part_type}</td>
                          <td className="px-3 py-2 text-slate-700">{part.year_start}-{part.year_end} {part.make} {part.model}</td>
                          <td className="px-3 py-2">
                            {part.call_for_price ? (
                              <span className="text-amber-600">Call</span>
                            ) : (
                              <span className="text-slate-900">${part.price}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{part.quantity}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              part.listing_type === "private" 
                                ? "bg-slate-100 text-slate-600" 
                                : "bg-green-100 text-green-700"
                            }`}>
                              {part.listing_type === "private" ? "Private" : "For Sale"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.length > 50 && (
                  <div className="bg-slate-50 px-3 py-2 text-sm text-slate-600 border-t border-slate-200">
                    Showing first 50 of {parsedData.length} parts
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 p-4 rounded-sm border border-red-200">
              <h4 className="font-medium text-red-900 mb-2">Errors Found</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((err, idx) => (
                  <li key={idx}>Row {err.row}: {err.error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Column Reference */}
          <details className="text-sm">
            <summary className="cursor-pointer text-slate-600 hover:text-slate-900">
              View column reference
            </summary>
            <div className="mt-2 bg-slate-50 p-4 rounded-sm text-xs">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-1 pr-4">Column</th>
                    <th className="text-left py-1 pr-4">Required</th>
                    <th className="text-left py-1">Description</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  <tr><td className="py-1 pr-4 font-mono">part_number</td><td>Yes</td><td>Your part number</td></tr>
                  <tr><td className="py-1 pr-4 font-mono">nags_number</td><td>No</td><td>NAGS number</td></tr>
                  <tr><td className="py-1 pr-4 font-mono">oem_number</td><td>No</td><td>OEM number</td></tr>
                  <tr><td className="py-1 pr-4 font-mono">part_type</td><td>Yes</td><td>Windshield, Front Door Glass, etc.</td></tr>
                  <tr><td className="py-1 pr-4 font-mono">year_start</td><td>Yes</td><td>Starting year (e.g., 2018)</td></tr>
                  <tr><td className="py-1 pr-4 font-mono">year_end</td><td>Yes</td><td>Ending year (e.g., 2023)</td></tr>
                  <tr><td className="py-1 pr-4 font-mono">make</td><td>Yes</td><td>Vehicle make (e.g., Toyota)</td></tr>
                  <tr><td className="py-1 pr-4 font-mono">model</td><td>Yes</td><td>Vehicle model (e.g., Camry)</td></tr>
                  <tr><td className="py-1 pr-4 font-mono">price</td><td>No*</td><td>Price in dollars (leave empty if call_for_price)</td></tr>
                  <tr><td className="py-1 pr-4 font-mono">call_for_price</td><td>No</td><td>true or false</td></tr>
                  <tr><td className="py-1 pr-4 font-mono">quantity</td><td>Yes</td><td>Number in stock</td></tr>
                  <tr><td className="py-1 pr-4 font-mono">condition</td><td>No</td><td>New, Used - Like New, Used - Good, Used - Fair</td></tr>
                  <tr><td className="py-1 pr-4 font-mono">listing_type</td><td>No</td><td>for_sale or private (default: for_sale)</td></tr>
                  <tr><td className="py-1 pr-4 font-mono">description</td><td>No</td><td>Additional details</td></tr>
                </tbody>
              </table>
            </div>
          </details>
        </div>

        <div className="p-6 border-t border-slate-200 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 border border-slate-200 text-slate-700 rounded-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || parsedData.length === 0}
            className="flex-1 h-12 bg-blue-600 text-white rounded-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            data-testid="bulk-upload-submit"
          >
            {uploading ? "Uploading..." : `Upload ${parsedData.length} Parts`}
          </button>
        </div>
      </div>
    </div>
  );
};

// Footer Component
const Footer = () => {
  return (
    <footer className="bg-slate-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Car className="h-8 w-8 text-blue-400" />
              <span className="font-heading text-xl font-bold">CarGlassHub</span>
            </div>
            <p className="text-slate-400 text-sm">
              The nation's leading marketplace for automotive glass parts and services.
            </p>
          </div>
          <div>
            <h4 className="font-heading font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/" className="hover:text-white">Part Search</Link></li>
              <li><Link to="/browse" className="hover:text-white">Browse Parts</Link></li>
              <li><Link to="/installers" className="hover:text-white">Find Installers</Link></li>
              <li><Link to="/contact" className="hover:text-white">Contact Us</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-bold mb-4">For Business</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/sell" className="hover:text-white">Sell Your Parts</Link></li>
              <li><Link to="/installer-register" className="hover:text-white">Register as Installer</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading font-bold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/contact" className="hover:text-white">Send us a message</Link></li>
            </ul>
          </div>
        </div>
        
        {/* Disclaimer */}
        <div className="border-t border-slate-800 mt-8 pt-8">
          <div className="bg-slate-800/50 rounded-sm p-4 mb-6">
            <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Disclaimer</h5>
            <p className="text-xs text-slate-400 leading-relaxed">
              CarGlassHub is an online marketplace platform that connects buyers with sellers of automotive glass products and services. 
              We do not participate in, facilitate, or guarantee any transactions between buyers and sellers. CarGlassHub is not responsible 
              for the quality, safety, legality, or any other aspect of the products or services listed. All transactions are conducted 
              directly between buyers and sellers at their own risk. We strongly recommend that users exercise due diligence, verify seller 
              credentials, inspect products before purchase, and use secure payment methods. CarGlassHub shall not be held liable for any 
              financial loss, damages, disputes, or issues arising from transactions conducted through this platform. By using this website, 
              you acknowledge and agree to these terms.
            </p>
          </div>
          
          <div className="text-center text-sm text-slate-500">
            © {new Date().getFullYear()} CarGlassHub. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <Navigation />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/sell" element={<SellerRegister />} />
              <Route path="/installer-register" element={<InstallerRegister />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/browse" element={<BrowseParts />} />
              <Route path="/installers" element={<FindInstallers />} />
              <Route path="/dashboard" element={<SellerDashboard />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
