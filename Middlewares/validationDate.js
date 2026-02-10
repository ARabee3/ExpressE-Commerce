export const validateData = (entityValidation) => {
  return (req, res, next) => {
    const validation = entityValidation.validate(req.body,{abortEarly:false});
    if (validation.error) {
      return res.status(402).json({
        message: validation.error.details.map(err=>err.message)
      });
    }
    next();
  };
};
