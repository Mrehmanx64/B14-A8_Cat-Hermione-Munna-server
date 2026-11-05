export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;

  if (status >= 500) {
    console.error("[error]", err);
  }

  if (err.message?.includes("not allowed by CORS")) {
    return res.status(403).json({ message: "This origin is not allowed to call the API." });
  }

  res.status(status).json({
    message: err.message || "Something went wrong on our side.",
    ...(err.details ? { errors: err.details } : {}),
  });
}
