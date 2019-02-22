'use strict';

const hndl = require('./lib/captchaHandler');

function captchaInit(options) {
    const CAPTCHA_TOKEN_HEADER =
        options.CAPTCHA_TOKEN_HEADER || 'Authorization'; // the request header where we expect the jwt token
    const CAPTCHA_NONCE_HEADER =
        options.CAPTCHA_NONCE_HEADER || 'captcha-nonce'; // the request header where we expect the client nonce

    const captchaHandler = hndl(options);

    return {
        getCaptcha: function(req, res, next) {
            var fullReponse = captchaHandler.createCaptcha(req.body.nonce);
            res.send(fullReponse);
            next();
        },
        verifyCaptcha: function(req, res, next) {
            var ret = captchaHandler.verifyCaptcha(req.body);
            res.send(ret);
            next();
        },
        getCaptchaAudio: function(req, res, next) {
            captchaHandler.getAudio(req.body, req).then(function(ret) {
                res.send(ret);
                next();
            });
        },
        verifyJWTResponseMiddleware: function(req, res, next) {
            var token = req.headers[CAPTCHA_TOKEN_HEADER.toLowerCase()] || '';
            token = token.replace('Bearer ', '');
            var nonce = req.headers[CAPTCHA_NONCE_HEADER];
            var ret = captchaHandler.verifyJWTResponse(token, nonce);
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
