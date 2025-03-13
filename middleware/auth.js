const jwt = require('jsonwebtoken');
// Updated auth middleware
module.exports.requireAuth = (req, res, next) => {
  const token = req.cookies.auth_token;
  if (token) {
    jwt.verify(token, process.env.SECRET_KEY, (err, decodedToken) => {
      if (err) {
        return res.status(401).json({ msg: "Unauthorized" });
      } else {
        // Store the entire decoded token in req.user
        req.user = {
          user: decodedToken.user,
          department: decodedToken.department
        };
        next();
      }
    });
  } else {
    res.status(401).json({ msg: "Unauthorized" });
  }
};