import { validateEventInput, HttpError } from "../utils/helpers.js";

export const validateEvent = (partial = false) => (req, res, next) => {
  const errors = validateEventInput(req.body, { partial });
  if (Object.keys(errors).length) {
    throw new HttpError(422, "Please fix the highlighted fields.", errors);
  }
  next();
};
