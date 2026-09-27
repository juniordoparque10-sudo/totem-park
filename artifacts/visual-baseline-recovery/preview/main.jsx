import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../../src/index.css';
import '../../../src/App.css';
import TelemetryDashboard from '../../../src/TelemetryDashboard.jsx';

createRoot(document.getElementById('root')).render(<div className="app"><main className="content"><TelemetryDashboard /></main></div>);

const view = new URLSearchParams(location.search).get('view');
if (view) setTimeout(() => {
  if (view === 'detail') document.querySelector('.telemetry-table-v2 button')?.click();
  const selector = ({ graphs: '#telemetry-overview', screens: '#telemetry-screens', detail: '.telemetry-detail' })[view];
  const target = selector && document.querySelector(selector);
  if (target) window.scrollTo(0, Math.max(0, target.getBoundingClientRect().top + window.scrollY - 20));
}, 500);
