'use client';

import { useEffect } from 'react';
import Script from 'next/script';

import { AppShell } from '@/components/AppShell';

declare global {
  interface Window {
    SwaggerUIBundle?: any;
    SwaggerUIStandalonePreset?: any;
  }
}

export default function IntegrationsDocsPage() {
  useEffect(() => {
    const id = 'swagger-ui-css';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css';
    document.head.appendChild(link);
  }, []);

  return (
    <AppShell>
      <div className="container">
        <h1>Integration API Docs</h1>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div id="swagger-ui" />
        </div>
      </div>

      <Script
        src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (!window.SwaggerUIBundle) return;
          window.SwaggerUIBundle({
            url: '/api/openapi/integrations',
            dom_id: '#swagger-ui',
            deepLinking: true,
            persistAuthorization: true,
            displayRequestDuration: true,
            presets: [window.SwaggerUIBundle.presets.apis],
            layout: 'BaseLayout'
          });
        }}
      />
    </AppShell>
  );
}
