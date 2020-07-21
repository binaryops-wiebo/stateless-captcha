'use strict';
const svgCaptcha = require('svg-captcha');
const jwt = require('jsonwebtoken');
const wav = require('wav');
const text2wav = require('text2wav');
const arrayBufferToBuffer = require('arraybuffer-to-buffer');
const streamifier = require('streamifier');

const langMap = {
  en: 'Please type the following letters or numbers', // english
  fr: 'Veuillez saisir les lettres ou les chiffres suivants', // french
  pa: 'ਕਿਰਪਾ ਕਰਕੇ ਹੇਠ ਲਿਖੇ ਅੱਖਰ ਜਾਂ ਨੰਬਰ ਟਾਈਪ ਕਰੋ', // punjabi
  zh: '请输入以下英文字母或数字' // mandarin chinese
};

module.exports = function(options) {
  const tokenSecret = options.tokenSecret || 'defaultSecret';
  const expiryMinutes = options.expiryMinutes || 15; // minutes
  const languageMap = options.languageMap || langMap;

  // SVG Captcha setup
  const captchaSize = options.captchaSize || 6; // characters
  const ignoreChars = options.ignoreChars || '0Oo1iIl'; // is this case-sensitive?
  const noise = options.noise != null ? options.noise : 2; // lines
  const width = options.width;
  const height = options.height;
  const background = options.background;
  const color = options.color;
  const inverse = options.inverse;
  const fontSize = options.fontSize;

  function encrypt(body) {
    const token = jwt.sign(body, tokenSecret, { expiresIn: '1400m' });
    return token;
  }

  function decrypt(encrypted) {
    const decrypted = jwt.verify(encrypted, tokenSecret);
    return decrypted;
  }

  function createCaptcha(nonce) {
    const svgOptions = {
      size: captchaSize, // size of captcha string
      ignoreChars, // filter out look-alike characters
      noise, // number of lines to insert for noise
      width,
      height,
      background,
      color,
      inverse,
      fontSize
    };
    // svgCaptcha doesn't like null or undefined options!
    Object.keys(svgOptions).map(k => {
      if (svgOptions[k] == null) {
        delete svgOptions[k];
      }
    });
    const captcha = svgCaptcha.create(svgOptions);

    // add answer, nonce and expiry to body
    const unEncryptedResponse = {
      nonce,
      answer: captcha.text
    };

    const validation = encrypt(unEncryptedResponse);
    // Don't send the captcha string to the front-end, defeats the purpose!!
    delete captcha['text'];
    const fullReponse = {
      captcha,
      validation
    };
    return fullReponse;
  }

  function verifyCaptcha(payload) {
    const result = { valid: false };
    try {
      const decryptedBody = decrypt(payload.validation);
      if (decryptedBody) {
        const answerIsCorrect = decryptedBody.answer.toLowerCase() === payload.answer.toLowerCase();
        const nonceIsCorrect = decryptedBody.nonce === payload.nonce;
        if (answerIsCorrect) {
          if (nonceIsCorrect) {
            // Passed the captcha test
            const token = jwt.sign({ data: { nonce: payload.nonce } }, tokenSecret, {
              expiresIn: `${expiryMinutes}m`
            });
            result.valid = true;
            result.jwt = token;
          }
        }
      }
    } catch (e) {
      console.error('Error decrypting validation:', e);
    } finally {
      return result;
    }
  }

  function verifyJWTResponse(token, nonce) {
    const result = { valid: false };
    try {
      const decoded = jwt.verify(token, tokenSecret);
      if (decoded.data && decoded.data.nonce === nonce) {
        result.valid = true;
      }
    } catch (err) {
      console.log('Error verifying JWT response:', err);
    } finally {
      return result;
    }
  }

  

  return {
    createCaptcha,
    verifyCaptcha,
    verifyJWTResponse
  };
};
