'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

export default function TestPlanningPage() {
  const [lat, setLat] = useState('21.0285');
  const [lng, setLng] = useState('105.8542');
  const [zoom, setZoom] = useState(18); // Changed from 20 to 18 (max supported zoom)
  const [useMosaic, setUseMosaic] = useState(false);
  const [planningUrls, setPlanningUrls] = useState<{
    qh2030?: string | string[];
    qh500?: string | string[];
    qhPK?: string | string[];
    tileCoords?: { x: number; y: number; zoom: number };
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPlanningImages = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        lat: lat,
        lng: lng,
        zoom: zoom.toString(),
        mosaic: useMosaic.toString()
      });
      
      const response = await fetch(`/api/test-planning-images?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setPlanningUrls(data.result);
        console.log('Planning URLs:', data.result);
      } else {
        setError(data.error || 'Failed to generate planning images');
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Render a set of images based on URL or array of URLs
  const renderImages = (urls: string | string[] | undefined, title: string) => {
    if (!urls) return null;
    
    if (typeof urls === 'string') {
      return (
        <div className="space-y-2">
          <h3 className="text-md font-medium">{title}</h3>
          <img src={urls} alt={title} className="border border-gray-200 rounded" />
          <p className="text-xs text-gray-500 break-all">{urls}</p>
        </div>
      );
    }
    
    if (Array.isArray(urls)) {
      if (useMosaic) {
        // Display as a 3x3 grid
        return (
          <div className="space-y-2">
            <h3 className="text-md font-medium">{title} (Mosaic)</h3>
            <div className="grid grid-cols-3 gap-1">
              {urls.map((url, index) => (
                <div key={index} className="relative">
                  <img src={url} alt={`${title} ${index + 1}`} className="w-full h-auto border border-gray-200" />
                  <span className="absolute top-1 left-1 bg-black bg-opacity-50 text-white text-xs p-1 rounded">{index + 1}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">3x3 mosaic of {urls.length} tiles</p>
          </div>
        );
      } else {
        return (
          <div className="space-y-2">
            <h3 className="text-md font-medium">{title} ({urls.length} URLs)</h3>
            <div className="flex flex-wrap gap-2">
              {urls.map((url, index) => (
                <img 
                  key={index} 
                  src={url} 
                  alt={`${title} ${index + 1}`} 
                  className="w-24 h-24 object-cover border border-gray-200 rounded" 
                />
              ))}
            </div>
          </div>
        );
      }
    }
    
    return null;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Planning Map Image Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="21.0285"
                />
              </div>
              <div>
                <Label htmlFor="lng">Longitude</Label>
                <Input
                  id="lng"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="105.8542"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="zoom">Zoom Level: {zoom}</Label>
              <Slider
                id="zoom"
                min={10}
                max={18} // Changed from 20 to 18
                step={1}
                value={[zoom]}
                onValueChange={(values) => setZoom(values[0])}
                className="my-2"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>10 (City)</span>
                <span>14 (District)</span>
                <span>18 (Building)</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 my-4">
              <Switch
                id="mosaic"
                checked={useMosaic}
                onCheckedChange={setUseMosaic}
              />
              <Label htmlFor="mosaic">Generate 3×3 Mosaic</Label>
            </div>
            
            <div className="pt-4">
              <Button 
                onClick={fetchPlanningImages} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Generating...' : 'Generate Planning Map Images'}
              </Button>
            </div>
            
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md mt-4">
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {planningUrls.tileCoords && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">Tile Coordinates</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">X:</span> {planningUrls.tileCoords.x}
            </div>
            <div>
              <span className="font-medium">Y:</span> {planningUrls.tileCoords.y}
            </div>
            <div>
              <span className="font-medium">Zoom:</span> {planningUrls.tileCoords.zoom}
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-8">
        {renderImages(planningUrls.qh2030, 'QH 2030')}
        {renderImages(planningUrls.qh500, 'QH 1/500, 1/2000')}
        {renderImages(planningUrls.qhPK, 'QH Phân Khu')}
      </div>
    </div>
  );
} 