const { validationResult } = require('express-validator');

function validate(checks) {
  return async (req, res, next) => {
    for (const check of checks) await check.run(req);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }
    next();
  };
}

module.exports = validate;
