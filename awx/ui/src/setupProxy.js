const { createProxyMiddleware } = require('http-proxy-middleware');

const TARGET = process.env.TARGET || 'http://192.168.10.46:32000';

module.exports = (app) => {
  app.use(
    ['/api', '/websocket', '/sso'],
    createProxyMiddleware({
      target: TARGET,
      changeOrigin: false,          // QUAN TRỌNG: Không thay đổi origin
      secure: false,
      ws: true,
      cookieDomainRewrite: "localhost",
      onProxyReq: (proxyReq, req, res) => {
        // Giữ lại CSRF token và cookies
        if (req.headers.cookie) {
          proxyReq.setHeader('Cookie', req.headers.cookie);
        }

        // Giữ lại Origin header
        if (req.headers.origin) {
          proxyReq.setHeader('Origin', req.headers.origin);
        }

        // Giữ lại Referer header
        if (req.headers.referer) {
          proxyReq.setHeader('Referer', req.headers.referer);
        }

        console.log('Proxy Request to:', TARGET + req.url);
        console.log('Origin:', req.headers.origin);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('Proxy Response Status:', proxyRes.statusCode);
      },
      logLevel: 'debug',
    })
  );
};