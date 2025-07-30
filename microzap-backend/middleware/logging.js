module.exports = (req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`, {
    query: req.query,
    body: req.body,
    headers: req.headers,
    timestamp: new Date().toISOString(),
  });
  next();
};
