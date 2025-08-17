export default function handler(req: any, res: any) {
  const { method, url, body } = req;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Basic routing
  if (url === '/api/health' || url === '/api') {
    return res.status(200).json({ 
      status: 'ok',
      message: 'Basketball League API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0-emergency'
    });
  }
  
  if (url.startsWith('/api/auth')) {
    return res.status(200).json({
      message: 'Auth endpoint - emergency mode',
      endpoint: url
    });
  }
  
  if (url.startsWith('/api/games')) {
    return res.status(200).json({
      message: 'Games endpoint - emergency mode',
      endpoint: url,
      games: []
    });
  }
  
  if (url.startsWith('/api/teams')) {
    return res.status(200).json({
      message: 'Teams endpoint - emergency mode',
      endpoint: url,
      teams: []
    });
  }
  
  return res.status(404).json({ 
    error: 'Not found',
    path: url 
  });
}