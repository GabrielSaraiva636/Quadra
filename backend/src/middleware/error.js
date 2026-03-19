function errorMiddleware(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) {
    console.error('[ERROR]', err);
  }

  res.status(statusCode).json({
    message: err.message || 'Erro interno do servidor.'
  });
}

module.exports = errorMiddleware;
