export const checkDatabaseForAuth = (req, res, next) => {
  if (req.app.locals.dbIsDown) {
    return res.status(503).json({
      message: "Authentication services are temporarily unavailable.",
      error: "DATABASE_UNAVAILABLE"
    });
  }
  next();
};
