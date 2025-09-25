module.exports.requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  next();
};

// Model must be a Mongoose model. ownerField can be 'members' (array) or single id field.
module.exports.requireOwnershipOrRole = (Model, ownerField, idParamName = 'id', ...allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    try {
      const id = req.params[idParamName];
      const doc = await Model.findById(id).lean();
      if (!doc) return res.status(404).json({ message: 'Resource not found' });

      const ownerVal = doc[ownerField];
      let isOwner = false;
      if (Array.isArray(ownerVal)) {
        isOwner = ownerVal.map(String).includes(String(req.user._id));
      } else {
        isOwner = String(ownerVal) === String(req.user._id);
      }
      if (isOwner) return next();
      if (allowedRoles.includes(req.user.role)) return next();
      return res.status(403).json({ message: 'Forbidden' });
    } catch (err) {
      next(err);
    }
  };
};
