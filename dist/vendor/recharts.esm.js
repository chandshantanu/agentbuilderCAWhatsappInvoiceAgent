/**
 * ESM shim — exposes the host app's recharts to dynamic widgets.
 */
const recharts = window.__SHARED_RECHARTS__;
export default recharts;
export const {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar,
  ScatterChart,
  Scatter,
  ComposedChart,
} = recharts || {};
