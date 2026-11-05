import { HttpError } from "../utils/helpers.js";

export const validateProfileInput = (body) => {
  const { name, image } = body ?? {};
  const errors = {};

  if (name !== undefined) {
    const value = String(name).trim();
    if (value.length < 2) errors.name = "Name must be at least 2 characters.";
    if (value.length > 60) errors.name = "Name must be 60 characters or fewer.";
  }

  if (image !== undefined && String(image).trim() !== "") {
    try {
      const url = new URL(String(image).trim());
      if (!["http:", "https:"].includes(url.protocol)) {
        errors.image = "Profile photo must be a valid http(s) URL.";
      }
    } catch {
      errors.image = "Profile photo must be a valid http(s) URL.";
    }
  }

  return errors;
};

export const validateProfile = (req, res, next) => {
  const errors = validateProfileInput(req.body);
  if (Object.keys(errors).length) {
    throw new HttpError(422, "Please fix the highlighted fields.", errors);
  }
  next();
};
