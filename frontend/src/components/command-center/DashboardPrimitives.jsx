import clsx from "clsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const palette = ["#38bdf8", "#22c55e", "#f59e0b", "#ef4444", "#a78bfa", "#14b8a6"];

export function SectionHeader({ eyebrow, title, actions }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-sky-300/80">{eyebrow}</div>
        <h2 className="mt-1 text-2xl font-semibold text-foreground">{title}</h2>
      </div>
      {actions}
    </div>
  );
}

export function Panel({ children, className = "" }) {
  return (
    <section className={clsx("rounded-lg border border-border bg-card/80 shadow-lg shadow-black/20", className)}>
      {children}
    </section>
  );
}

export function PanelTitle({ icon: Icon, title, right }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon className="h-4 w-4 text-sky-300" />}
        <h3 className="truncate text-sm font-semibold">{title}</h3>
      </div>
      {right}
    </div>
  );
}

export function MetricTile({ label, value, tone = "sky" }) {
  const toneClass = {
    sky: "text-sky-300",
    green: "text-emerald-300",
    amber: "text-amber-300",
    red: "text-red-300",
  }[tone];

  return (
    <div className="rounded-md border border-border bg-muted/35 px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={clsx("mt-1 text-2xl font-semibold tabular-nums", toneClass)}>{value}</div>
    </div>
  );
}

export function MetricStrip({ metrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map((metric) => (
        <MetricTile key={metric.label} {...metric} />
      ))}
    </div>
  );
}

export function ConfusionMatrix({ matrix, labels }) {
  const max = Math.max(...matrix.flat(), 1);
  return (
    <div className="overflow-x-auto p-4">
      <div className="grid gap-1" style={{ gridTemplateColumns: `96px repeat(${labels.length}, minmax(72px, 1fr))` }}>
        <div />
        {labels.map((label) => (
          <div key={label} className="text-center text-xs text-muted-foreground">Pred {label}</div>
        ))}
        {matrix.map((row, rowIndex) => (
          <div key={`row-${labels[rowIndex]}`} className="contents">
            <div key={`${labels[rowIndex]}-label`} className="flex items-center text-xs text-muted-foreground">
              Actual {labels[rowIndex]}
            </div>
            {row.map((value, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="rounded-md border border-border px-3 py-2 text-center text-sm font-semibold tabular-nums"
                style={{ backgroundColor: `rgba(56, 189, 248, ${0.08 + (value / max) * 0.38})` }}
              >
                {value}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeatureImportanceChart({ data }) {
  return (
    <div className="h-72 px-2 py-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 18, right: 20, top: 4, bottom: 4 }}>
          <CartesianGrid stroke="#1f2a44" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis dataKey="feature" type="category" width={150} tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Tooltip cursor={{ fill: "rgba(148,163,184,0.08)" }} contentStyle={{ background: "#07111f", border: "1px solid #1f2a44", color: "#e5edf7" }} />
          <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => <Cell key={index} fill={palette[index % palette.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RocCurve({ data }) {
  return (
    <div className="h-64 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 18, top: 12, bottom: 8 }}>
          <CartesianGrid stroke="#1f2a44" />
          <XAxis dataKey="fpr" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} domain={[0, 1]} />
          <Tooltip contentStyle={{ background: "#07111f", border: "1px solid #1f2a44", color: "#e5edf7" }} />
          <Line type="monotone" dataKey="tpr" stroke="#38bdf8" strokeWidth={2} dot={false} />
          <Line dataKey="baseline" stroke="#64748b" strokeDasharray="4 4" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DistributionChart({ data }) {
  return (
    <div className="h-64 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={86} paddingAngle={3}>
            {data.map((_, index) => <Cell key={index} fill={palette[index % palette.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: "#07111f", border: "1px solid #1f2a44", color: "#e5edf7" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function InsightCard({ title, body, tone = "sky" }) {
  const toneClass = {
    sky: "border-sky-400/30 bg-sky-400/10 text-sky-100",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    red: "border-red-400/30 bg-red-400/10 text-red-100",
  }[tone];
  return (
    <div className={clsx("rounded-md border px-4 py-3", toneClass)}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs leading-5 opacity-85">{body}</div>
    </div>
  );
}
