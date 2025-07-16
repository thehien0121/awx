const { createProxyMiddleware } = require('http-proxy-middleware');

const TARGET = process.env.TARGET || 'https://localhost:8043';

module.exports = (app) => {
  app.use(
    ['/api', '/websocket', '/sso'],
    createProxyMiddleware({
      target: TARGET,
      changeOrigin: true,           // <== GIỮ LẠI HEADER ORIGIN
      secure: false,                // <== Cho phép self-signed cert (dev)
      ws: true,
      cookieDomainRewrite: "localhost", // hoặc "192.168.10.199" nếu truy cập qua IP
      onProxyReq: (proxyReq, req, res) => {
        // Bắt buộc giữ lại cookie và origin (nếu cần)
      },
      onProxyRes: (proxyRes, req, res) => {
        // Có thể debug header tại đây
      },
      logLevel: 'debug',            // (Tùy chọn, để debug proxy)
    })
  );
};
