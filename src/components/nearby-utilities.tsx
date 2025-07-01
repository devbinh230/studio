'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  Hospital, 
  ShoppingCart, 
  UtensilsCrossed, 
  Coffee,
  Building2,
  Store,
  AlertCircle,
  Navigation
} from 'lucide-react';
import { Utility, UtilityType } from '@/lib/types';

interface NearbyUtilitiesProps {
  latitude: number;
  longitude: number;
  distance?: number; // in km
  size?: number; // results per type
}

interface GroupedUtilities {
  [key: string]: Utility[];
}

const utilityIcons: Record<UtilityType, React.ReactNode> = {
  hospital: <Hospital className="h-4 w-4" />,
  market: <Store className="h-4 w-4" />,
  restaurant: <UtensilsCrossed className="h-4 w-4" />,
  cafe: <Coffee className="h-4 w-4" />,
  supermarket: <ShoppingCart className="h-4 w-4" />,
  commercial_center: <Building2 className="h-4 w-4" />,
};

const utilityLabels: Record<UtilityType, string> = {
  hospital: 'Bệnh viện/Y tế',
  market: 'Chợ/Siêu thị nhỏ',
  restaurant: 'Nhà hàng',
  cafe: 'Quán cà phê',
  supermarket: 'Siêu thị',
  commercial_center: 'Trung tâm thương mại',
};

const utilityColors: Record<UtilityType, string> = {
  hospital: 'bg-red-100 text-red-700 border-red-200',
  market: 'bg-green-100 text-green-700 border-green-200',
  restaurant: 'bg-orange-100 text-orange-700 border-orange-200',
  cafe: 'bg-amber-100 text-amber-700 border-amber-200',
  supermarket: 'bg-blue-100 text-blue-700 border-blue-200',
  commercial_center: 'bg-purple-100 text-purple-700 border-purple-200',
};

export function NearbyUtilities({ 
  latitude, 
  longitude, 
  distance = 10, 
  size = 3 
}: NearbyUtilitiesProps) {
  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [groupedUtilities, setGroupedUtilities] = useState<GroupedUtilities>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUtilities = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams({
          lat: latitude.toString(),
          lng: longitude.toString(),
          distance: distance.toString(),
          size: size.toString(),
        });

        const response = await fetch(`/api/utilities?${params}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Không thể lấy dữ liệu tiện ích');
        }

        const data = await response.json();
        setUtilities(data.data || []);
        setGroupedUtilities(data.groupedData || {});
      } catch (err) {
        console.error('Error fetching utilities:', err);
        setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi');
      } finally {
        setIsLoading(false);
      }
    };

    if (latitude && longitude) {
      fetchUtilities();
    }
  }, [latitude, longitude, distance, size]);

  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Tiện ích xung quanh
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Tiện ích xung quanh
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const hasUtilities = utilities.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Tiện ích xung quanh
          <Badge variant="secondary" className="ml-auto">
            {utilities.length} địa điểm
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasUtilities ? (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>Không tìm thấy tiện ích xung quanh khu vực này</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedUtilities).map(([type, items]) => {
              if (!items || items.length === 0) return null;
              
              const utilityType = type as UtilityType;
              
              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${utilityColors[utilityType]}`}>
                      {utilityIcons[utilityType]}
                    </div>
                    <h4 className="font-medium text-sm">
                      {utilityLabels[utilityType]}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {items.length}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    {items.slice(0, 3).map((utility) => (
                      <div 
                        key={utility.id} 
                        className="flex items-start justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {utility.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {utility.address}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Navigation className="h-3 w-3 text-gray-400" />
                          <span className="text-xs font-medium text-gray-600">
                            {formatDistance(utility.distance)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {items.length > 3 && (
                    <p className="text-xs text-gray-500 text-center">
                      và {items.length - 3} địa điểm khác...
                    </p>
                  )}
                </div>
              );
            })}
            
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center">
                Tìm kiếm trong bán kính {distance}km
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 