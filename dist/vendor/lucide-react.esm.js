/**
 * ESM shim — exposes the host app's lucide-react icons to dynamic widgets.
 */
const lucide = window.__SHARED_LUCIDE_REACT__;
export default lucide;

// Re-export all icons from the shared instance
// Dynamic widgets will import specific icons: import { Search, Plus } from 'lucide-react'
if (lucide) {
  for (const [key, value] of Object.entries(lucide)) {
    // We can't use static exports for dynamic keys, but the import map
    // resolution + the namespace export covers named imports.
  }
}

// Common icons explicitly exported for tree-shaking compatibility
export const {
  Search, Plus, Minus, Trash, Edit, Check, X, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, ArrowUp, ArrowDown,
  Home, Settings, User, Users, Bell, Mail, Calendar, Clock, Star, Heart,
  Download, Upload, File, Folder, Image, Camera, Video, Music, Globe,
  Link, ExternalLink, Copy, Clipboard, Save, Printer, Share, Filter,
  SortAsc, SortDesc, MoreHorizontal, MoreVertical, Menu, Grid, List,
  Eye, EyeOff, Lock, Unlock, Shield, Key, AlertCircle, AlertTriangle,
  Info, HelpCircle, CheckCircle, XCircle, Loader, RefreshCw, RotateCcw,
  Zap, TrendingUp, TrendingDown, BarChart2, PieChart, Activity,
  DollarSign, CreditCard, ShoppingCart, Package, Truck, MapPin, Phone,
  MessageSquare, Send, Inbox, Archive, Tag, Bookmark, Flag, Award,
  Target, Crosshair, Layers, Layout, Columns, Rows, Move, Maximize,
  Minimize, Expand, Shrink, ZoomIn, ZoomOut, ToggleLeft, ToggleRight,
} = lucide || {};
