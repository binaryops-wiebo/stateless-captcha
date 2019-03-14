'use strict';
const handler = require('./lib/captchaHandler');

function captchaInit(options) {
  options = options || {};
  // the request header where we expect the jwt token
  const tokenHeader = options.tokenHeader || 'Authorization';
  // the request header where we expect the client nonce
  const nonceHeader = options.nonceHeader || 'captcha-nonce';

  const captchaHandler = handler({
    tokenSecret: options.tokenSecret,
    expiryMinutes: options.expiryMinutes,
    languageMap: options.languageMap,
    // SVG Captcha configs
    captchaSize: options.captchaSize,
    ignoreChars: options.ignoreChars,
    noise: options.noise,
    width: options.width,
    height: options.height,
    background: options.background,
    color: options.color,
    inverse: options.inverse,
    fontSize: options.fontSize
  });

  return {
    getCaptcha: function(req, res, next) {
      const fullReponse = captchaHandler.createCaptcha(req.body.nonce);
      res.send(fullReponse);
      next();
    },
    verifyCaptcha: function(req, res, next) {
      const ret = captchaHandler.verifyCaptcha(req.body);
      res.send(ret);
      next();
    },
    getCaptchaAudio: function(req, res, next) {
      captchaHandler.getAudio(req.body, req).then(ret => {
        res.send(ret);
        next();
      });
    },
    verifyJWTResponseMiddleware: function(req, res, next) {
      let token = req.headers[tokenHeader.toLowerCase()] || '';
      token = token.replace('Bearer ', '');
      const nonce = req.headers[nonceHeader];
      const ret = captchaHandler.verifyJWTResponse(token, nonce);
      if (ret.valid) {
        next();
      } else {
        res.send(401, 'Not Authorized');
        next('Invalid Captcha Token');
      }
    }
  };
}

module.exports = captchaInit;
