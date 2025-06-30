'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { InteractiveMapSimple } from '@/components/interactive-map-simple';
import { getDefaultAuthToken } from '@/lib/config';

export default function DemoAPIPage() {
  const [coordinates, setCoordinates] = useState({
    latitude: 21.0282993,
    longitude: 105.8539963,
  });
  
  const [authToken, setAuthToken] = useState(getDefaultAuthToken());
  
  const [propertyDetails, setPropertyDetails] = useState({
    type: 'town_house',
    landArea: 60.0,
    houseArea: 55.0,
    bedRoom: 3,
    bathRoom: 2,
    legal: 'pink_book',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'simple' | 'individual' | 'map'>('simple');

  // Complete flow (simple demo)
  const handleCompleteFlow = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/complete-flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          property_details: propertyDetails,
          auth_token: authToken,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({ error: 'Failed to call API' });
    } finally {
      setIsLoading(false);
    }
  };

  // Individual API calls
  const handleLocationAPI = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/location?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}`
      );
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to call location API' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePayload = async () => {
    if (!result?.parsed_address) {
      setResult({ error: 'Please call location API first' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/create-payload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address_info: result.parsed_address,
          property_details: propertyDetails,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to create payload' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleValuation = async () => {
    if (!result?.valuation_payload) {
      setResult({ error: 'Please create payload first' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/valuation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: result.valuation_payload,
          auth_token: authToken,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to perform valuation' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Real Estate Valuation API Demo</h1>
        <p className="text-gray-600">
          Test the complete real estate valuation flow using Resta.vn APIs.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b mb-6">
        <button
          className={`px-4 py-2 ${activeTab === 'simple' ? 'border-b-2 border-blue-500 font-semibold' : ''}`}
          onClick={() => setActiveTab('simple')}
        >
          Complete Flow
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'individual' ? 'border-b-2 border-blue-500 font-semibold' : ''}`}
          onClick={() => setActiveTab('individual')}
        >
          Individual APIs
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'map' ? 'border-b-2 border-blue-500 font-semibold' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          Interactive Map
        </button>
      </div>

      {activeTab === 'map' ? (
        <div className="grid grid-cols-1 gap-6">
          <InteractiveMapSimple
            authToken={authToken}
            showValuationButton={true}
            onLocationSelect={(location) => {
              setCoordinates({
                latitude: location.latitude,
                longitude: location.longitude,
              });
              setResult(null);
            }}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Input Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Coordinates */}
                <div className="space-y-2">
                  <Label>Coordinates</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-sm">Latitude</Label>
                      <Input
                        type="number"
                        step="any"
                        value={coordinates.latitude}
                        onChange={(e) => setCoordinates(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Longitude</Label>
                      <Input
                        type="number"
                        step="any"
                        value={coordinates.longitude}
                        onChange={(e) => setCoordinates(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Auth Token */}
                <div className="space-y-2">
                  <Label>Auth Token</Label>
                  <Textarea
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="Bearer token"
                    className="h-20"
                  />
                </div>

                {/* Property Details */}
                <div className="space-y-2">
                  <Label>Property Details</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-sm">Type</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={propertyDetails.type}
                        onChange={(e) => setPropertyDetails(prev => ({ ...prev, type: e.target.value }))}
                      >
                        <option value="town_house">Town House</option>
                        <option value="apartment">Apartment</option>
                        <option value="villa">Villa</option>
                        <option value="house">House</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm">Legal</Label>
                      <Input
                        value={propertyDetails.legal}
                        onChange={(e) => setPropertyDetails(prev => ({ ...prev, legal: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Land Area (m²)</Label>
                      <Input
                        type="number"
                        value={propertyDetails.landArea}
                        onChange={(e) => setPropertyDetails(prev => ({ ...prev, landArea: parseFloat(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">House Area (m²)</Label>
                      <Input
                        type="number"
                        value={propertyDetails.houseArea}
                        onChange={(e) => setPropertyDetails(prev => ({ ...prev, houseArea: parseFloat(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Bedrooms</Label>
                      <Input
                        type="number"
                        value={propertyDetails.bedRoom}
                        onChange={(e) => setPropertyDetails(prev => ({ ...prev, bedRoom: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Bathrooms</Label>
                      <Input
                        type="number"
                        value={propertyDetails.bathRoom}
                        onChange={(e) => setPropertyDetails(prev => ({ ...prev, bathRoom: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {activeTab === 'simple' ? (
                    <Button
                      onClick={handleCompleteFlow}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? 'Processing...' : 'Run Complete Flow'}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        onClick={handleLocationAPI}
                        disabled={isLoading}
                        className="w-full"
                        variant="outline"
                      >
                        1. Get Location
                      </Button>
                      <Button
                        onClick={handleCreatePayload}
                        disabled={isLoading}
                        className="w-full"
                        variant="outline"
                      >
                        2. Create Payload
                      </Button>
                      <Button
                        onClick={handleValuation}
                        disabled={isLoading}
                        className="w-full"
                        variant="outline"
                      >
                        3. Perform Valuation
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Result Panel */}
            <Card>
              <CardHeader>
                <CardTitle>API Response</CardTitle>
              </CardHeader>
              <CardContent>
                {result ? (
                  <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96 text-sm">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                ) : (
                  <p className="text-gray-500">No results yet. Click a button to test the API.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Info */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>API Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Complete Flow:</strong> POST /api/complete-flow</p>
                <p><strong>Get Location:</strong> GET /api/location?latitude=X&longitude=Y</p>
                <p><strong>Create Payload:</strong> POST /api/create-payload</p>
                <p><strong>Perform Valuation:</strong> POST /api/valuation</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
} 