'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface SubjectChartProps {
  data: Array<{
    name: string
    count: number
    percentage: number
    trend: string
  }>
}

export function SubjectChart({ data }: SubjectChartProps) {
  const chartData = data.slice(0, 10).map(d => ({
    name: d.name.length > 12 ? d.name.substring(0, 12) + '...' : d.name,
    questões: d.count,
    percent: (d.percentage * 100).toFixed(1),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuição por Disciplina</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value} questões`,
                'Total',
              ]}
            />
            <Bar dataKey="questões" fill="#2563EB" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
