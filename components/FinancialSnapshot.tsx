'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { cn } from '@/lib/utils';

interface FinancialData {
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
  cashFlow: number;
  accountsReceivable: number;
  accountsPayable: number;
  previousRevenue?: number;
  previousProfit?: number;
  currency: string;
}

export function FinancialSnapshot() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        const response = await fetch('/api/financial/snapshot');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Error fetching financial data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, []);

  const formatCurrency = (value: number, currency: string = 'USD') => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return formatter.format(value);
  };

  const getRevenueChange = () => {
    if (!data?.previousRevenue) return null;
    const change = ((data.revenue - data.previousRevenue) / data.previousRevenue) * 100;
    return change;
  };

  const getProfitChange = () => {
    if (!data?.previousProfit) return null;
    const change = ((data.profit - data.previousProfit) / Math.abs(data.previousProfit)) * 100;
    return change;
  };

  const Metric = ({
    label,
    value,
    icon: Icon,
    change,
    isNegative = false,
  }: {
    label: string;
    value: string;
    icon: React.ReactNode;
    change?: number | null;
    isNegative?: boolean;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-gray-500">{label}</span>
        {Icon}
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold text-white">{value}</p>
        {change !== null && change !== undefined && (
          <Badge
            variant={change >= 0 ? 'success' : 'danger'}
            size="sm"
            icon={change >= 0 ? TrendingUp : TrendingDown}
          >
            {Math.abs(change).toFixed(1)}%
          </Badge>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card header={<h2 className="text-lg font-semibold text-white">Financial Snapshot</h2>}>
        <div className="text-gray-400 text-sm">Loading...</div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card header={<h2 className="text-lg font-semibold text-white">Financial Snapshot</h2>}>
        <div className="text-gray-400 text-sm">Unable to load financial data</div>
      </Card>
    );
  }

  const profitChangePercent = getProfitChange();
  const revenueChangePercent = getRevenueChange();

  return (
    <Card header={<h2 className="text-lg font-semibold text-white">Financial Snapshot</h2>}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <Metric
            label="Revenue"
            value={formatCurrency(data.revenue, data.currency)}
            icon={<DollarSign className="h-4 w-4 text-green-400" />}
            change={revenueChangePercent}
          />

          <Metric
            label="Expenses"
            value={formatCurrency(data.expenses, data.currency)}
            icon={<TrendingDown className="h-4 w-4 text-red-400" />}
          />

          <Metric
            label="Profit"
            value={formatCurrency(data.profit, data.currency)}
            icon={
              <span
                className={cn(
                  'h-4 w-4 rounded-full',
                  data.profit >= 0 ? 'bg-green-500' : 'bg-red-500'
                )}
              />
            }
            change={profitChangePercent}
          />

          <Metric
            label="Profit Margin"
            value={`${data.profitMargin.toFixed(1)}%`}
            icon={<Percent className="h-4 w-4 text-blue-400" />}
          />
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Distribution</p>
            <div className="flex gap-2 h-6 rounded-lg overflow-hidden bg-white/[0.05] border border-white/10">
              <div
                className="bg-gradient-to-r from-green-600 to-green-500 transition-all"
                style={{
                  width: `${(data.revenue / (data.revenue + data.expenses)) * 100}%`,
                }}
                title={`Revenue: ${formatCurrency(data.revenue, data.currency)}`}
              />
              <div
                className="bg-gradient-to-r from-red-600 to-red-500 transition-all"
                style={{
                  width: `${(data.expenses / (data.revenue + data.expenses)) * 100}%`,
                }}
                title={`Expenses: ${formatCurrency(data.expenses, data.currency)}`}
              />
            </div>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-gray-400">Revenue</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-gray-400">Expenses</span>
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Cash Flow</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-white/[0.05] border border-white/10 overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    data.cashFlow >= 0
                      ? 'bg-gradient-to-r from-green-600 to-green-500'
                      : 'bg-gradient-to-r from-red-600 to-red-500'
                  )}
                  style={{
                    width: `${Math.min(Math.abs(data.cashFlow) / (data.revenue || 1) * 100, 100)}%`,
                  }}
                />
              </div>
              <span className={cn('text-sm font-semibold min-w-fit', data.cashFlow >= 0 ? 'text-green-400' : 'text-red-400')}>
                {formatCurrency(data.cashFlow, data.currency)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
              Accounts Receivable
            </p>
            <p className="text-lg font-semibold text-blue-400">
              {formatCurrency(data.accountsReceivable, data.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
              Accounts Payable
            </p>
            <p className="text-lg font-semibold text-orange-400">
              {formatCurrency(data.accountsPayable, data.currency)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-blue-600/10 border border-blue-500/30 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-blue-300">Connected to QuickBooks</span>
        </div>
      </div>
    </Card>
  );
}

export default FinancialSnapshot;
