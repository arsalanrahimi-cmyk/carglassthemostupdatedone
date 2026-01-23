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
        setTimeout(() => navigate("/"), 1500);
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Street Address *</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Business Description</label>
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
    "Sunroof Repair",
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
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl font-bold text-slate-900">Contact Us</h1>
          <p className="text-slate-600 mt-4 max-w-2xl mx-auto">
            Have questions about our auto glass marketplace? We're here to help. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <div className="bg-white p-6 border border-slate-200 rounded-sm">
              <Phone className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-heading font-bold text-slate-900">Phone</h3>
              <p className="text-slate-600 mt-1">1-800-GLASS-HUB</p>
              <p className="text-sm text-slate-500">Mon-Fri 8am-6pm EST</p>
            </div>
            <div className="bg-white p-6 border border-slate-200 rounded-sm">
              <Mail className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-heading font-bold text-slate-900">Email</h3>
              <p className="text-slate-600 mt-1">support@carglasshub.com</p>
              <p className="text-sm text-slate-500">We reply within 24 hours</p>
            </div>
            <div className="bg-white p-6 border border-slate-200 rounded-sm">
              <MapPin className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-heading font-bold text-slate-900">Address</h3>
              <p className="text-slate-600 mt-1">123 Auto Glass Way</p>
              <p className="text-sm text-slate-500">Detroit, MI 48201</p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    data-testid="contact-phone"
                  />
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
            </form>
          </div>
        </div>
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

// Find Installers Page
const FindInstallers = () => {
  const [installers, setInstallers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState("");
  const [searchState, setSearchState] = useState("");

  const fetchInstallers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchCity) params.append("city", searchCity);
      if (searchState) params.append("state", searchState);
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
    fetchInstallers();
  };

  return (
    <div className="py-12 px-4">
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

        {/* Search Form */}
        <form onSubmit={handleSearch} className="bg-white p-4 border border-slate-200 rounded-sm mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              placeholder="City"
              className="flex-1 h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="installer-search-city"
            />
            <input
              type="text"
              value={searchState}
              onChange={(e) => setSearchState(e.target.value)}
              placeholder="State (e.g., CA, NY)"
              className="w-full md:w-32 h-12 px-4 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="installer-search-state"
            />
            <button
              type="submit"
              className="bg-slate-900 text-white px-8 h-12 rounded-sm font-medium hover:bg-slate-800 transition-colors"
              data-testid="installer-search-btn"
            >
              Search
            </button>
          </div>
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
                    <h3 className="font-heading text-lg font-bold text-slate-900">{installer.business_name}</h3>
                    <p className="text-slate-600 text-sm">{installer.address}</p>
                    <p className="text-slate-600 text-sm">{installer.city}, {installer.state} {installer.zip_code}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <a href={`tel:${installer.phone}`} className="text-blue-600 text-sm flex items-center gap-1 hover:underline">
                        <Phone size={14} />
                        {installer.phone}
                      </a>
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
              <li>1-800-GLASS-HUB</li>
              <li>support@carglasshub.com</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} CarGlassHub. All rights reserved.
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
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
