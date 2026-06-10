// src/middlewares/error.middleware.js

function globalErrorCatcher(err, req, res, next) {
  console.error(`[ISOLATED VECTOR BREAKDOWN]: ${err.stack}`);
  
  res.status(err.status || 500).json({
    error: 'Internal Platform Restructuring Event',
    message: err.message || 'The partition executing this service experienced an runtime exception.'
  });
}

module.exports = { globalErrorCatcher };