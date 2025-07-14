'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { propertyValuationRange } from '@/ai/flows/property-valuation';

interface TestResult {
  input: any;
  output: any;
  error?: string;
  executionTime: number;
}

export default function DemoAIPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const testCases = [
    {
      name: "Test 1: Nhà phố trung tâm Q1 HCM (giá cao)",
      input: {
        address: "10°46'35.5\"N 106°41'38.2\"E, Phường Bến Thành, Quận 1, Hồ Chí Minh",
        city: "ho_chi_minh",
        district: "quan_1", 
        ward: "ben_thanh",
        administrativeLevel: 0,
        type: "town_house",
        size: 45,
        bedrooms: 2,
        bathrooms: 2,
        lotSize: 45,
        marketData: `
Dữ liệu thị trường bất động sản (12 tháng gần nhất):
- Giá trung bình: 277 triệu VND/m²
- Khoảng giá: 158 - 425 triệu VND/m²
- Xu hướng: tăng 31.7% so với 12 tháng trước
- Giá mới nhất (T6/25): 320 triệu VND/m²
- Số lượng giao dịch trung bình: 8 giao dịch/tháng
- Nguồn dữ liệu: API
- Chi tiết từng tháng: T7/24: 245M VND/m², T8/24: 250M VND/m², T9/24: 260M VND/m², T10/24: 270M VND/m², T11/24: 280M VND/m², T12/24: 290M VND/m², T1/25: 300M VND/m², T2/25: 305M VND/m², T3/25: 310M VND/m², T4/25: 315M VND/m², T5/25: 318M VND/m², T6/25: 320M VND/m²
`.trim()
      }
    },
    {
      name: "Test 2: Nhà trong hẻm Q3 HCM (giá trung bình)",
      input: {
        address: "Hẻm 123 Đường ABC, Phường 5, Quận 3, Hồ Chí Minh",
        city: "ho_chi_minh",
        district: "quan_3",
        ward: "phuong_5", 
        administrativeLevel: 0,
        type: "lane_house",
        size: 60,
        bedrooms: 3,
        bathrooms: 2,
        lotSize: 50,
        marketData: `
Dữ liệu thị trường bất động sản (12 tháng gần nhất):
- Giá trung bình: 180 triệu VND/m²
- Khoảng giá: 120 - 250 triệu VND/m²
- Xu hướng: tăng 15.5% so với 12 tháng trước
- Giá mới nhất (T6/25): 190 triệu VND/m²
- Số lượng giao dịch trung bình: 12 giao dịch/tháng
- Nguồn dữ liệu: API
`.trim()
      }
    },
    {
      name: "Test 3: Chung cư Hà Nội (giá thấp)",
      input: {
        address: "Tòa A, Chung cư XYZ, Phường Láng Thượng, Quận Đống Đa, Hà Nội",
        city: "ha_noi",
        district: "dong_da",
        ward: "lang_thuong",
        administrativeLevel: 0,
        type: "apartment", 
        size: 80,
        bedrooms: 2,
        bathrooms: 2,
        lotSize: 80,
        marketData: `
Dữ liệu thị trường bất động sản (12 tháng gần nhất):
- Giá trung bình: 45 triệu VND/m²
- Khoảng giá: 35 - 60 triệu VND/m²
- Xu hướng: tăng 8.2% so với 12 tháng trước
- Giá mới nhất (T6/25): 48 triệu VND/m²
- Số lượng giao dịch trung bình: 25 giao dịch/tháng
- Nguồn dữ liệu: API
`.trim()
      }
    },
    {
      name: "Test 4: Biệt thự Hà Nội (giá cao end)",
      input: {
        address: "Số 15 Đường Hoàng Hoa Thám, Phường Liễu Giai, Quận Ba Đình, Hà Nội", 
        city: "ha_noi",
        district: "ba_dinh",
        ward: "lieu_giai",
        administrativeLevel: 0,
        type: "villa",
        size: 200,
        bedrooms: 4,
        bathrooms: 3,
        lotSize: 150,
        marketData: `
Dữ liệu thị trường bất động sản (12 tháng gần nhất):
- Giá trung bình: 350 triệu VND/m²
- Khoảng giá: 280 - 450 triệu VND/m²
- Xu hướng: tăng 12.3% so với 12 tháng trước
- Giá mới nhất (T6/25): 380 triệu VND/m²
- Số lượng giao dịch trung bình: 3 giao dịch/tháng
- Nguồn dữ liệu: API
`.trim()
      }
    }
  ];

  const runSingleTest = async (testCase: any, index: number) => {
    const startTime = Date.now();
    try {
      console.log(`🧪 Running test ${index + 1}: ${testCase.name}`);
      const result = await propertyValuationRange(testCase.input);
      const executionTime = Date.now() - startTime;
      
      return {
        input: testCase.input,
        output: result,
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        input: testCase.input,
        output: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime
      };
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      console.log('🚀 Starting AI Valuation Tests...');
      const testResults: TestResult[] = [];
      
      for (let i = 0; i < testCases.length; i++) {
        const result = await runSingleTest(testCases[i], i);
        testResults.push(result);
        setResults([...testResults]); // Update UI progressively
      }
      
      console.log('✅ All tests completed');
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000000) {
      return `${(price / 1000000000).toFixed(2)} tỷ`;
    } else if (price >= 1000000) {
      return `${(price / 1000000).toFixed(0)} triệu`;
    }
    return price.toLocaleString('vi-VN');
  };

  const calculatePricePerM2 = (totalPrice: number, lotSize: number) => {
    return (totalPrice / lotSize / 1000000).toFixed(0);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🧪 Demo AI Property Valuation</h1>
        <p className="text-slate-600">
          Test prompt định giá BĐS mới với dữ liệu giả từ các khu vực khác nhau
        </p>
      </div>

      <div className="mb-6">
        <Button 
          onClick={runAllTests} 
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? '🔄 Đang test...' : '🚀 Chạy tất cả test cases'}
        </Button>
      </div>

      <div className="space-y-6">
        {testCases.map((testCase, index) => {
          const result = results[index];
          
          return (
            <Card key={index} className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{testCase.name}</span>
                  {result && (
                    <Badge variant={result.error ? "destructive" : "default"}>
                      {result.error ? "❌ Error" : "✅ Success"}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {testCase.input.address} • {testCase.input.type} • {testCase.input.lotSize}m²
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {/* Input Data */}
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">📥 Input Data:</h4>
                  <div className="bg-slate-50 p-3 rounded text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>Khu vực: {testCase.input.ward}, {testCase.input.district}</div>
                      <div>Loại: {testCase.input.type}</div>
                      <div>Diện tích đất: {testCase.input.lotSize}m²</div>
                      <div>Diện tích xây dựng: {testCase.input.size}m²</div>
                      <div>Phòng ngủ: {testCase.input.bedrooms}</div>
                      <div>Phòng tắm: {testCase.input.bathrooms}</div>
                    </div>
                  </div>
                </div>

                {/* Market Data Preview */}
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">📊 Market Data Preview:</h4>
                  <div className="bg-blue-50 p-3 rounded text-sm">
                    {testCase.input.marketData.split('\n').slice(0, 4).map((line: string, i: number) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                </div>

                {/* Result */}
                {result && (
                  <div>
                    <h4 className="font-semibold mb-2">
                      📤 AI Output: 
                      <span className="text-sm font-normal text-slate-500 ml-2">
                        ({result.executionTime}ms)
                      </span>
                    </h4>
                    
                    {result.error ? (
                      <div className="bg-red-50 border border-red-200 p-3 rounded">
                        <p className="text-red-600 font-medium">Error:</p>
                        <p className="text-red-700">{result.error}</p>
                      </div>
                    ) : result.output ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-green-50 p-3 rounded">
                            <div className="text-sm text-green-600 font-medium">Giá hợp lý</div>
                            <div className="text-lg font-bold">
                              {formatPrice(result.output.reasonableValue)} VNĐ
                            </div>
                            <div className="text-sm text-slate-500">
                              {calculatePricePerM2(result.output.reasonableValue, testCase.input.lotSize)} triệu/m²
                            </div>
                          </div>
                          
                          <div className="bg-slate-50 p-3 rounded">
                            <div className="text-sm text-slate-600 font-medium">Khoảng giá</div>
                            <div className="text-sm">
                              <div>Thấp: {formatPrice(result.output.lowValue)} VNĐ</div>
                              <div>Cao: {formatPrice(result.output.highValue)} VNĐ</div>
                              <div>Giá nhà: {formatPrice(result.output.price_house)} VNĐ</div>
                            </div>
                          </div>
                        </div>

                        {/* Analysis */}
                        <div className="bg-yellow-50 p-3 rounded">
                          <div className="text-sm font-medium text-yellow-700 mb-1">📈 Phân tích:</div>
                          <div className="text-sm text-yellow-800">
                            Giá AI: {calculatePricePerM2(result.output.reasonableValue, testCase.input.lotSize)} triệu/m² vs 
                            Thị trường: {testCase.input.marketData.split('\n')[1]?.split(': ')[1] || 'N/A'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-3 rounded text-slate-500">
                        Chưa có kết quả
                      </div>
                    )}
                  </div>
                )}

                {/* Loading for this test */}
                {isLoading && index === results.length && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <span>Đang chạy test này...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {results.length > 0 && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>📊 Tổng kết kết quả</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {results.filter(r => !r.error).length}
                  </div>
                  <div className="text-sm text-slate-600">Thành công</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {results.filter(r => r.error).length}
                  </div>
                  <div className="text-sm text-slate-600">Lỗi</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {results.reduce((sum, r) => sum + r.executionTime, 0)}ms
                  </div>
                  <div className="text-sm text-slate-600">Tổng thời gian</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(results.reduce((sum, r) => sum + r.executionTime, 0) / results.length)}ms
                  </div>
                  <div className="text-sm text-slate-600">Trung bình</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 