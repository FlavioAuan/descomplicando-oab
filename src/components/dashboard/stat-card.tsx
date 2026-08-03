import { Card, CardContent } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  description?: string
  trend?: { value: number; label: string }
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
  red: 'bg-red-50 text-red-600',
}

export function StatCard({ title, value, icon: Icon, color, description, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
            </p>
            {description && (
              <p className="text-xs text-gray-400 mt-1">{description}</p>
            )}
          </div>
          <div className={cn('p-3 rounded-xl', colorMap[color])}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center gap-1 text-sm">
            <span className={trend.value >= 0 ? 'text-green-600' : 'text-red-600'}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
            <span className="text-gray-500">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
