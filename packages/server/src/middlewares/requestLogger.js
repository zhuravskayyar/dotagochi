export function requestLogger(req, _res, next) {
  console.log(`[req] ${req.method} ${req.originalUrl}`);
  next();
}
