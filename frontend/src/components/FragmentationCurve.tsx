import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FragmentationCurveProps {
  meanSizeCm: number;
}

export default function FragmentationCurve({ meanSizeCm }: FragmentationCurveProps) {
  // Generate Rosin-Rammler curve points
  // Y(x) = 100 * (1 - exp(-(x/xc)^n))
  // n = uniformity index (approx 1.2 for standard blasting)
  // xc = characteristic size = meanSizeCm / (ln(2))^(1/n)
  const chartData = useMemo(() => {
    const n = 1.25;
    const ln2 = Math.log(2);
    const xc = meanSizeCm / Math.pow(ln2, 1 / n);

    const points = [];
    const maxVal = Math.max(100, Math.ceil(meanSizeCm * 2.5));
    const step = maxVal / 15;

    for (let x = 0; x <= maxVal; x += step) {
      const xVal = Math.round(x * 10) / 10;
      let percentPassing = 0;
      if (xVal > 0) {
        percentPassing = 100 * (1 - Math.exp(-Math.pow(xVal / xc, n)));
      }
      points.push({
        size: xVal,
        passing: Math.round(percentPassing * 10) / 10
      });
    }
    return points;
  }, [meanSizeCm]);

  return (
    <div className="bg-mining-card border border-mining-border p-4 rounded-xl flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-semibold text-white">Fragmentation Size Distribution</h3>
        <p className="text-xs text-gray-400">Rosin-Rammler prediction curve (Mean: {meanSizeCm} cm)</p>
      </div>

      <div className="w-full h-[180px] bg-mining-dark/30 rounded-lg p-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorPassing" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f9a825" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#f9a825" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e24" />
            <XAxis
              dataKey="size"
              stroke="#8a8a9a"
              fontSize={10}
              tickLine={false}
              unit=" cm"
            />
            <YAxis
              stroke="#8a8a9a"
              fontSize={10}
              tickLine={false}
              unit="%"
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1b1d20',
                border: '1px solid #2a2a35',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '11px'
              }}
              formatter={(value) => [`${value}% Passing`, 'Percentage']}
              labelFormatter={(label) => `Sieve Size: ${label} cm`}
            />
            <Area
              type="monotone"
              dataKey="passing"
              stroke="#f9a825"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPassing)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
