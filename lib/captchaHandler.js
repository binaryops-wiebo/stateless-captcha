'use strict';
const svgCaptcha = require('svg-captcha');
const jwt = require('jsonwebtoken');
const wav = require('wav');
const text2wav = require('text2wav');
const arrayBufferToBuffer = require('arraybuffer-to-buffer');
const streamifier = require('streamifier');
const lame = require('lame');

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

  function getAudio(body, req) {
    return new Promise(function(resolve, reject) {
      try {
        // decrypt payload to get captcha text
        const decryptedBody = decrypt(body.validation);
        const captchaCharArray = decryptedBody.answer.toString().split('');
        let language = 'en';
        if (body.translation) {
          if (typeof body.translation === 'string') {
            if (languageMap.hasOwnProperty(body.translation)) {
              language = body.translation;
            }
          } else if (body.translation === true && req && req.headers['accept-language']) {
            let lang = req.headers['accept-language']
              .split(',')
              .map(e => e.split(';')[0].split('-')[0])
              .find(e => languageMap.hasOwnProperty(e));
            if (lang) {
              language = lang;
            }
          }
        }
        let spokenCatpcha = languageMap[language] + ': ';
        captchaCharArray.map(m => {
          spokenCatpcha += `${m}, `;
        });
        getMp3DataUriFromText(spokenCatpcha, language).then(audioDataUri => {
          // Now pass back the full payload ,
          resolve({
            audio: audioDataUri
          });
        });
      } catch (err) {
        console.log('Error getting audio:', err);
        reject({
          error: 'unknown'
        });
      }
    });
  }

  ////////////////////////////////////////////////////////
  /*
   * Audio routines
   */
  ////////////////////////////////////////////////////////
  function getMp3DataUriFromText(text, language = 'en') {
    return new Promise(async function(resolve) {
      // init wave reader, used to convert WAV to PCM
      const reader = new wav.Reader();

      // we have to wait for the "format" event before we can start encoding
      reader.on('format', format => {
        // init encoder
        const encoder = new lame.Encoder(format);

        // Pipe Wav reader to the encoder and capture the output stream
        // As the stream is encoded, convert the mp3 array buffer chunks into base64 string with mime type
        let dataUri = 'data:audio/mp3;base64,';
        encoder.on('data', arrayBuffer => {
          if (!dataUri) {
            return;
          }
          dataUri += arrayBuffer.toString('base64');
          // by observation encoder hung before finish due to event loop being empty
          // setTimeout injects an event to mitigate the issue
          setTimeout(() => {}, 0);
        });

        // When encoding is complete, callback with data uri
        encoder.on('finish', () => {
          resolve(dataUri);
          dataUri = undefined;
        });

        reader.pipe(encoder);
      });

      // Generate audio, Base64 encoded WAV in DataUri format including mime type header
      text2wav(text, { voice: language }).then(audioArrayBuffer => {
        const audioBuffer = arrayBufferToBuffer(audioArrayBuffer);

        // Convert ArrayBuffer to Streamable type for input to the encoder
        const audioStream = streamifier.createReadStream(audioBuffer);

        // once all events setup we can the pipeline
        audioStream.pipe(reader);
      });
    });
  }

  return {
    createCaptcha,
    getAudio,
    verifyCaptcha,
    verifyJWTResponse
  };
};
