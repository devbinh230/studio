'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CombinedResult } from '@/lib/types';
import { TrendingDown, TrendingUp, DollarSign, Calculator, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

type RightPanelValuationProps = {
  result: CombinedResult;
};

const formatCurrency = (value: number) => {
  if (value >= 1000000000) {
    return `${Math.round(value / 1000000000)} T ₫`;
  } else if (value >= 1000000) {
    return `${Math.round(value / 1000000)} Tr ₫`;
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
};

export function RightPanelValuation({ result }: RightPanelValuationProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if it's API result or old format
  const isApiResult = 'valuation_result' in result;
  
  const lowValue = isApiResult 
    ? Math.round(result.valuation_result.evaluation.price * 0.85) // 85% of price
    : result.valuation.lowValue;
    
  const reasonableValue = isApiResult
    ? result.valuation_result.evaluation.price
    : result.valuation.reasonableValue;
    
  const highValue = isApiResult
    ? Math.round(result.valuation_result.evaluation.totalPrice)
    : result.valuation.highValue;

  return (
    <Card className="professional-card bg-gradient-to-br from-emerald-50 via-white to-blue-50 border-emerald-200 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl shadow-lg">
            <Calculator className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-800">Định giá BĐS</h3>
              <Sparkles className="h-4 w-4 text-yellow-500" />
            </div>
            <p className="text-sm text-slate-600 font-normal">Phân tích AI chuyên nghiệp</p>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 items-center text-center divide-x divide-slate-200">
          <div className="flex flex-col items-center gap-2 px-3 py-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              <h4 className="text-sm font-semibold text-slate-700">Thấp nhất</h4>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {isMounted ? formatCurrency(lowValue) : '...'}
            </p>
            <p className="text-xs text-orange-500 font-medium">Bán nhanh</p>
          </div>
          
          <div className="flex flex-col items-center gap-2 px-4 py-4 bg-gradient-to-b from-yellow-50 to-amber-50 mx-1 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-5 w-5 text-amber-600" />
              <h4 className="text-base font-bold text-slate-750">Phù hợp</h4>
            </div>
            <p className="text-3xl font-black text-amber-700 tracking-tight">
              {isMounted ? formatCurrency(reasonableValue) : '...'}
            </p>
            <p className="text-xs text-amber-600 font-semibold">Đề xuất AI</p>
          </div>
          
          <div className="flex flex-col items-center gap-2 px-3 py-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-semibold text-slate-700">Cao nhất</h4>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {isMounted ? formatCurrency(highValue) : '...'}
            </p>
            <p className="text-xs text-blue-500 font-medium">Thời điểm tốt</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 