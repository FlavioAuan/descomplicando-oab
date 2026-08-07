'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const BAR_COLORS = [
  '#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626',
  '#0891B2', '#9333EA', '#65A30D', '#EA580C', '#BE185D',
  '#0D9488', '#4338CA', '#B45309',
]

interface SubjectChartProps {
  data: Array<{
    name: string
    count: number
    percentage: number
    trend: string
  }>
}

export function SubjectChart({ data }: SubjectChartProps) {
  const chartData = data.map((d, i) => ({
    name: d.name.length > 14 ? d.name.substring(0, 14) + '…' : d.name,
    fullName: d.name,
    questões: d.count,
    percent: (d.percentage * 100).toFixed(1),
    color: BAR_COLORS[i % BAR_COLORS.length],
  }))

  const chartHeight = Math.max(280, chartData.length * 22)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuição por Disciplina</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11 }}
              width={145}
            />
            <Tooltip
              formatter={(value: number) => [`${value} questões`, 'Total']}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
            />
            <Bar dataKey="questões" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
