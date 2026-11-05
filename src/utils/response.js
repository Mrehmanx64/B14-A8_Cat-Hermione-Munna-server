export const sendSuccess = (res, data, status = 200) => {
  res.status(status).json(data);
};

export const sendError = (res, message, status = 500, details = null) => {
  res.status(status).json({
    message,
    ...(details ? { errors: details } : {}),
  });
};
