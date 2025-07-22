'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TestFixPage() {
  const [lat, setLat] = useState('21.0285');
  const [lng, setLng] = useState('105.8542');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testDirectCoordinates = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // Use absolute URL
      const apiUrl = new URL('/api/planning-analysis', window.location.origin);
      const response = await fetch(apiUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat: parseFloat(lat),
          lng: parseFloat(lng),
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Planning analysis succeeded:', data);
        setResult(data.data);
      } else {
        setError(data.error || 'Unknown API error');
        console.error('Planning analysis failed:', data);
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Error testing coordinates:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container py-8 px-4 mx-auto">
      <h1 className="text-2xl font-bold mb-6">Planning Analysis Fix Test</h1>
      
      <Card className="p-6 mb-8">
        <div className="mb-4">
          <Label htmlFor="lat">Latitude</Label>
          <Input 
            id="lat" 
            value={lat} 
            onChange={(e) => setLat(e.target.value)} 
            className="max-w-xs"
          />
        </div>
        
        <div className="mb-6">
          <Label htmlFor="lng">Longitude</Label>
          <Input 
            id="lng" 
            value={lng} 
            onChange={(e) => setLng(e.target.value)} 
            className="max-w-xs"
          />
        </div>
        
        <Button 
          onClick={testDirectCoordinates}
          disabled={loading}
        >
          {loading ? 'Testing...' : 'Test With Coordinates'}
        </Button>
      </Card>
      
      {error && (
        <Card className="p-6 mb-6 bg-red-50 border-red-200">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
          <pre className="bg-white p-4 rounded border border-red-100 text-red-700 text-sm overflow-auto">
            {error}
          </pre>
        </Card>
      )}
      
      {result && (
        <Card className="p-6 mb-6 bg-green-50 border-green-200">
          <h2 className="text-lg font-semibold text-green-800 mb-2">Success!</h2>
          <div className="space-y-4">
            {/* Show each key-value pair */}
            {Object.entries(result).map(([key, value]) => (
              <div key={key} className="bg-white p-4 rounded border border-green-100">
                <h3 className="font-medium text-green-700 mb-1">{key}</h3>
                <div className="text-gray-800">
                  {typeof value === 'string' ? (
                    value
                  ) : (
                    <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      
      <div className="mt-8 text-sm text-gray-500">
        <p>This test uses the simplified direct coordinate approach to bypass any issues with handling arrays of image paths.</p>
      </div>
    </div>
  );
} 