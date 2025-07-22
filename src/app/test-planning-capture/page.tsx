'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import dynamic from 'next/dynamic';

// Dynamically import the map component with SSR disabled
const HanoiPlanningMap = dynamic(
  () => import('@/components/hanoi-planning-map'),
  { ssr: false }
);

export default function TestPlanningCapturePage() {
  const [lat, setLat] = useState('21.0285');
  const [lng, setLng] = useState('105.8542');
  const [zoom, setZoom] = useState(18);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedTiles, setCapturedTiles] = useState<{[key: string]: any} | null>(null);
  const [landInfo, setLandInfo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Reference to map functions
  const mapFunctionsRef = useRef<{ 
    capturePlanningMapImages?: (lat: number, lng: number, options?: any) => Promise<any> 
  } | null>(null);

  // Set isClient to true when component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);

  const captureImage = async () => {
    if (!isClient) return;
    
    setLoading(true);
    try {
      // Use global mapFunctions if available, otherwise use the ref
      const mapFunctions = 
        (typeof window !== 'undefined' && (window as any).mapFunctions) || 
        mapFunctionsRef.current;

      if (!mapFunctions?.capturePlanningMapImages) {
        console.error('Map capture function not available');
        alert('Map capture function not ready yet. Please wait for the map to load completely.');
        setLoading(false);
        return;
      }

      const result = await mapFunctions.capturePlanningMapImages(
        parseFloat(lat), 
        parseFloat(lng), 
        { 
          zoom, 
          useMosaic: true, 
          includeBaseMap: true,
          // Không thêm cache parameter
        }
      );
      console.log('Captured result:', result);
      
      if (result?.imageDataUrl) {
        setCapturedImage(result.imageDataUrl);
        setCapturedTiles(result);
      } else {
        console.error('No image data URL in result');
        alert('Failed to capture image: No image data URL');
      }
      
      // Also fetch planning data to get land info
      await fetchLandInfo();
    } catch (error) {
      console.error('Error capturing image:', error);
      alert(`Error capturing image: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchLandInfo = async () => {
    if (!isClient) return;
    
    try {
      const apiUrl = new URL('/api/guland-proxy/planning', window.location.origin);
      const response = await fetch(apiUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marker_lat: parseFloat(lat),
          marker_lng: parseFloat(lng),
          province_id: 1
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.html) {
          // Extract text from HTML with a simple regex
          const text = data.data.html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          setLandInfo(text);
        }
      }
    } catch (error) {
      console.error('Error fetching land info:', error);
    }
  };

  const testPlanningAnalysis = async () => {
    if (!isClient || !capturedImage) {
      alert('Please capture an image first');
      return;
    }
    
    setLoading(true);
    try {
      const apiUrl = new URL('/api/planning-analysis', window.location.origin);
      const response = await fetch(apiUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePath: capturedImage,
          landInfo: landInfo || `Location: ${lat}, ${lng}`
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Planning analysis result:', result);
        alert('Planning analysis successful! See console for results.');
      } else {
        const error = await response.text();
        console.error('Planning analysis failed:', error);
        alert(`Planning analysis failed: ${error}`);
      }
    } catch (error) {
      console.error('Error calling planning analysis API:', error);
      alert(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testPlanningAnalysisCoordinates = async () => {
    if (!isClient) return;
    
    setLoading(true);
    try {
      const apiUrl = new URL('/api/planning-analysis', window.location.origin);
      const response = await fetch(apiUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: parseFloat(lat),
          lng: parseFloat(lng)
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Planning analysis result (from coordinates):', result);
        alert('Planning analysis successful! See console for results.');
      } else {
        const error = await response.text();
        console.error('Planning analysis failed:', error);
        alert(`Planning analysis failed: ${error}`);
      }
    } catch (error) {
      console.error('Error calling planning analysis API:', error);
      alert(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Planning Map Capture Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <Card className="p-4">
            <h2 className="text-xl font-semibold mb-4">Capture Settings</h2>
            
            <div className="space-y-4">
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
              
              <div>
                <Label htmlFor="zoom">Zoom Level: {zoom}</Label>
                <Slider
                  id="zoom"
                  min={10}
                  max={18}
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
              
              <Button 
                className="w-full" 
                disabled={loading || !isClient}
                onClick={captureImage}
              >
                {loading ? 'Capturing...' : 'Capture Map'}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full" 
                disabled={loading || !isClient || !capturedImage}
                onClick={testPlanningAnalysis}
              >
                Test AI Analysis (with Image)
              </Button>
              
              <Button 
                variant="secondary" 
                className="w-full" 
                disabled={loading || !isClient}
                onClick={testPlanningAnalysisCoordinates}
              >
                Test AI Analysis (with Coordinates)
              </Button>
            </div>
          </Card>
          
          {landInfo && (
            <Card className="p-4">
              <h2 className="text-xl font-semibold mb-2">Land Information</h2>
              <div className="text-sm bg-gray-50 p-3 rounded max-h-60 overflow-y-auto">
                {landInfo}
              </div>
            </Card>
          )}
        </div>
        
        <div className="md:col-span-2">
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div style={{ height: '500px', width: '100%' }}>
                {isClient && (
                  <HanoiPlanningMap 
                    height="500px"
                    initialLat={parseFloat(lat)} 
                    initialLng={parseFloat(lng)}
                    initialZoom={zoom}
                    mapFunctionsRef={mapFunctionsRef}
                    autoClickOnLoad={true}
                  />
                )}
              </div>
            </Card>
            
            {capturedImage && (
              <Card className="p-4">
                <h2 className="text-xl font-semibold mb-2">Captured Image</h2>
                <div className="border rounded overflow-hidden">
                  <img 
                    src={capturedImage} 
                    alt="Captured Planning Map" 
                    className="w-full"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {capturedImage.startsWith('data:') 
                    ? 'Image captured as Data URL' 
                    : capturedImage}
                </p>
              </Card>
            )}
            
            {capturedTiles && capturedTiles.qh2030 && Array.isArray(capturedTiles.qh2030) && (
              <Card className="p-4">
                <h2 className="text-xl font-semibold mb-2">QH2030 Tiles</h2>
                <div className="grid grid-cols-3 gap-2">
                  {capturedTiles.qh2030.map((tile: string, index: number) => (
                    <div key={index} className="border rounded overflow-hidden">
                      <img 
                        src={tile} 
                        alt={`QH2030 Tile ${index + 1}`} 
                        className="w-full h-auto"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 