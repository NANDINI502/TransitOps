import { useState } from 'react';
import './Charts.css';

// 1. DonutChart
export function DonutChart({ data, size = 200 }) {
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
  const radius = 60;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  
  let accumulatedPercent = 0;

  const colorMap = {
    green: 'var(--status-green)',
    blue: 'var(--status-blue)',
    amber: 'var(--status-amber)',
    red: 'var(--status-red)',
    gray: 'var(--status-gray)',
    default: 'var(--accent)'
  };

  const segments = data.map((item) => {
    const percent = total > 0 ? item.value / total : 0;
    const strokeLength = percent * circumference;
    const strokeOffset = circumference - (accumulatedPercent * circumference);
    accumulatedPercent += percent;
    
    return {
      ...item,
      percent,
      strokeLength,
      strokeOffset,
      color: colorMap[item.tone] || colorMap.default
    };
  });

  return (
    <div className="donut-chart-container">
      <div className="donut-chart-visual" style={{ width: size, height: size }}>
        <svg width="100%" height="100%" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="var(--bg-elevated)"
            strokeWidth={strokeWidth}
          />
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg.strokeLength} ${circumference}`}
              strokeDashoffset={seg.strokeOffset}
              strokeLinecap="round"
              transform="rotate(-90 80 80)"
              className="donut-segment"
            />
          ))}
          <text x="80" y="76" textAnchor="middle" className="donut-center-total">
            {total}
          </text>
          <text x="80" y="94" textAnchor="middle" className="donut-center-label">
            Total
          </text>
        </svg>
      </div>
      <div className="donut-chart-legend">
        {segments.map((seg, i) => (
          <div key={i} className="donut-legend-item">
            <span className="donut-legend-dot" style={{ backgroundColor: seg.color }} />
            <span className="donut-legend-name">{seg.label}</span>
            <span className="donut-legend-value">{seg.value} ({Math.round(seg.percent * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 2. LineChart
export function LineChart({ data, height = 200 }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!data || data.length === 0) return <div className="chart-empty">No data available</div>;

  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 30;
  const width = 500;

  const xMax = width - paddingLeft - paddingRight;
  const yMax = height - paddingTop - paddingBottom;

  const values = data.map(d => d.value);
  const maxValue = Math.max(1, ...values) * 1.1; // Add 10% headroom

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1 || 1)) * xMax;
    const y = paddingTop + yMax - (d.value / maxValue) * yMax;
    return { x, y, label: d.label, value: d.value };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + yMax} L ${points[0].x} ${paddingTop + yMax} Z`
    : '';

  // Simple grid lines (horizontal)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const val = Math.round(ratio * maxValue);
    const y = paddingTop + yMax - ratio * yMax;
    return { val, y };
  });

  return (
    <div className="line-chart-wrapper">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-strong)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map((line, i) => (
          <g key={i} className="chart-grid-line-group">
            <line
              x1={paddingLeft}
              y1={line.y}
              x2={width - paddingRight}
              y2={line.y}
              stroke="var(--border-subtle)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={paddingLeft - 10}
              y={line.y + 4}
              textAnchor="end"
              className="chart-grid-text"
            >
              ₹{line.val.toLocaleString()}
            </text>
          </g>
        ))}

        {/* Gradient Area */}
        {areaD && <path d={areaD} fill="url(#areaGrad)" />}

        {/* Line */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="var(--accent-strong)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Interaction Circles */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="5"
              fill="var(--bg-panel)"
              stroke="var(--accent-strong)"
              strokeWidth="2"
              className="chart-point"
              onMouseEnter={() => setHoveredPoint(p)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
            {/* Invisibly larger target for hover ease */}
            <circle
              cx={p.x}
              cy={p.y}
              r="15"
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredPoint(p)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          </g>
        ))}

        {/* X Axis Labels */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={height - 8}
            textAnchor="middle"
            className="chart-axis-text"
          >
            {p.label}
          </text>
        ))}
      </svg>

      {/* Tooltip Overlay */}
      {hoveredPoint && (
        <div
          className="chart-tooltip"
          style={{
            position: 'absolute',
            left: `${((hoveredPoint.x - paddingLeft) / xMax) * 80 + 10}%`,
            bottom: '40px'
          }}
        >
          <div className="chart-tooltip__label">{hoveredPoint.label}</div>
          <div className="chart-tooltip__value">₹{hoveredPoint.value.toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}

// 3. BarChart (Horizontal for Vehicles, Vertical for Revenue optionally)
export function BarChart({ data }) {
  const [hoveredBar, setHoveredBar] = useState(null);

  if (!data || data.length === 0) return <div className="chart-empty">No data available</div>;

  const maxValue = Math.max(1, ...data.map(d => d.value));

  return (
    <div className="bar-chart-wrapper">
      <div className="hbar-list">
        {data.map((item, i) => {
          const percent = Math.max(4, Math.round((item.value / maxValue) * 100));
          return (
            <div
              key={i}
              className="hbar-list__row"
              onMouseEnter={() => setHoveredBar(item)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              <div className="hbar-list__label" title={item.label}>
                {item.label}
              </div>
              <div className="hbar-list__track">
                <div
                  className="hbar-list__bar"
                  style={{
                    width: `${percent}%`,
                    background: 'linear-gradient(90deg, var(--accent), var(--accent-strong))'
                  }}
                />
              </div>
              <div className="hbar-list__value mono">
                ₹{item.value.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
      {hoveredBar && (
        <div className="bar-tooltip">
          <strong>{hoveredBar.label}</strong>: ₹{hoveredBar.value.toLocaleString()}
        </div>
      )}
    </div>
  );
}
