const Joi = require("joi");
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (!error) return next();
  return res.status(400).json({ success: false, message: error.details.map(d => d.message.replace(/['"]/g,"")).join(", ") });
};
const authValidators = {
  login:    validate(Joi.object({ email: Joi.string().email().required(), password: Joi.string().required() })),
  register: validate(Joi.object({ username: Joi.string().min(2).required(), email: Joi.string().email().required(), password: Joi.string().min(6).required(), role: Joi.string().valid("admin","librarian").default("admin") })),
};
module.exports = { authValidators };
