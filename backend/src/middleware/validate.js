// ═══════════════════════════════════════════════════════════════
//  Middleware de validation Zod
//  Usage : router.post('/', validate(schema), controller.create)
//  Le payload validé est attaché à req.validated
// ═══════════════════════════════════════════════════════════════

function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      req.validated = schema.parse(req[source]);
      next();
    } catch (err) {
      next(err); // sera intercepté par errorHandler (Zod)
    }
  };
}

module.exports = { validate };
