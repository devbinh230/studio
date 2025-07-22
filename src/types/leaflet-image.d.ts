declare module 'leaflet-image' {
  import * as L from 'leaflet';
  
  /**
   * Captures a leaflet map as a canvas
   * 
   * @param map The Leaflet map instance to capture
   * @param callback Callback function with error and canvas parameters
   */
  function leafletImage(
    map: L.Map, 
    callback: (error: Error | null, canvas: HTMLCanvasElement) => void
  ): void;
  
  export = leafletImage;
} 