'use client';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import { useEffect, useState } from 'react';

export default function Docs() {
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    fetch('/api/swagger')
      .then(res => res.json())
      .then(setSpec);
  }, []);

  return (
    <div>
      {spec ? <SwaggerUI spec={spec} /> : <p>Loading API documentation...</p>}
    </div>
  );
} 