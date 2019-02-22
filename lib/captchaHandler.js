'use strict';

var svgCaptcha = require('svg-captcha');
var jwt = require('jsonwebtoken');

var wav = require('wav');
var text2wav = require('text2wav');
var arrayBufferToBuffer = require('arraybuffer-to-buffer');
var streamifier = require('streamifier');
var lame = require('lame');

module.exports = function(options){



const CAPTCHA_TOKEN_SECRET = options.CAPTCHA_TOKEN_SECRET || 'defaultSecret';
  const CAPTCHA_EXPIRY_MINUTES = options.CAPTCHA_EXPIRY_MINUTES || '15'; // In minutes
  

  const voicePromptLanguageMap = {
    en: 'Please type in following letters or numbers', // english
    fr: 'Veuillez saisir les lettres ou les chiffres suivants', // french
    pa: 'ਕਿਰਪਾ ਕਰਕੇ ਹੇਠ ਲਿਖੇ ਅੱਖਰ ਜਾਂ ਨੰਬਰ ਟਾਈਪ ਕਰੋ', // punjabi
    zh: '请输入以下英文字母或数字' // mandarin chinese
  };

  function encrypt(body) {
    var token = jwt.sign(body, CAPTCHA_TOKEN_SECRET, { expiresIn: '1400m' });
    return token;
  }

  function decrypt(encrypted) {
    var decrypted = jwt.verify(encrypted, CAPTCHA_TOKEN_SECRET);
    return decrypted;
  }

  function createCaptcha(nonce){
    var captcha = svgCaptcha.create({
      size: 6, // size of random string
      ignoreChars: '0o1il', // filter out some characters like 0o1i
      noise: 2 // number of lines to insert for noise
    });

    // add answer, nonce and expiry to body
    var unEncryptedResponse = {
      nonce,
      answer: captcha.text
    };

    var validation = encrypt(unEncryptedResponse);
    delete captcha['text']; //this should not go to the front-end, defeats the purpose!!
    var fullReponse = {
      captcha,
      validation
    };

    return fullReponse;

  }

  function verifyCaptcha(payload) {
    var answer = payload.answer;
    var nonce = payload.nonce;
    var validation = payload.validation;

    let decryptedBody;
    try {
      decryptedBody = decrypt(validation);
      if (decryptedBody !== null) {
        // Check answer
        if (decryptedBody.answer.toLowerCase() === answer.toLowerCase()) {
          if (decryptedBody.nonce === nonce) {
            // Passed the captcha test
            var token = jwt.sign({ data: { nonce: nonce } }, CAPTCHA_TOKEN_SECRET, {
              expiresIn: CAPTCHA_EXPIRY_MINUTES + 'm'
            });
            return { valid: true, jwt: token };
          } else {
            // incorrect nonce
            return { valid: false };
          }
        } else {
          // incorrect answer
          return { valid: false };
        }
      } else {
        // Bad decyption
        return { valid: false };
      }
    } catch (e) {
      console.log('Error decrypting validation: ', e);
      return { valid: false };
    }
  }

  function getAudio(body, req) {
    return new Promise(function(resolve, reject) {
    try {
      // pull out encrypted answer
      var validation = body.validation;

      // decrypt payload to get captcha text
      var decryptedBody = decrypt(validation);

      // Insert leading text and commas to slow down reader
      var captchaCharArray = decryptedBody.answer.toString().split('');
      let language = 'en';
      if (body.translation) {
        if (typeof body.translation == 'string') {
          if (voicePromptLanguageMap.hasOwnProperty(body.translation)) {
            language = body.translation;
          }
        } else if (
          body.translation === true &&
          req &&
          req.headers['accept-language']
        ) {
          let lang = req.headers['accept-language']
            .split(',')
            .map(e => e.split(';')[0].split('-')[0])
            .find(e => voicePromptLanguageMap.hasOwnProperty(e));
          if (lang) {
            language = lang;
          }
        }
      }
      var spokenCatpcha = voicePromptLanguageMap[language] + ': ';
      for (var i = 0; i < captchaCharArray.length; i++) {
        spokenCatpcha += captchaCharArray[i] + ', ';
      }
      getMp3DataUriFromText(spokenCatpcha, language).then(function(
        audioDataUri
      ) {
        // Now pass back the full payload ,
        resolve({
          audio: audioDataUri
        });
      });
    } catch (e) {
      console.log('Error getting audio:', e);
      resolve({
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
      var reader = new wav.Reader();

      // we have to wait for the "format" event before we can start encoding
      reader.on('format', function(format) {
        // init encoder
        var encoder = new lame.Encoder(format);

        // Pipe Wav reader to the encoder and capture the output stream
        // As the stream is encoded, convert the mp3 array buffer chunks into base64 string with mime type
        var dataUri = 'data:audio/mp3;base64,';
        encoder.on('data', function(arrayBuffer) {
          if (!dataUri) {
            return;
          }
          dataUri += arrayBuffer.toString('base64');
          // by observation encoder hung before finish due to event loop being empty
          // setTimeout injects an event to mitigate the issue
          setTimeout(() => {}, 0);
        });

        // When encoding is complete, callback with data uri
        encoder.on('finish', function() {
          resolve(dataUri);
          dataUri = undefined;
        });
        reader.pipe(encoder);
      });

      // Generate audio, Base64 encoded WAV in DataUri format including mime type header
      text2wav(text, { voice: language }).then(function(audioArrayBuffer) {
        // convert to buffer
        var audioBuffer = arrayBufferToBuffer(audioArrayBuffer);

        // Convert ArrayBuffer to Streamable type for input to the encoder
        var audioStream = streamifier.createReadStream(audioBuffer);

        // once all events setup we can the pipeline
        audioStream.pipe(reader);
      });
    });
  }

  function verifyJWTResponse(token, nonce) {
    try {
      var decoded = jwt.verify(token, CAPTCHA_TOKEN_SECRET);
      if (decoded.data && decoded.data.nonce === nonce) {
        return { valid: true };
      } else {
        return { valid: false };
      }
    } catch (e) {
      return { valid: false };
    }
  }

  return {
      createCaptcha,
      getAudio,
      verifyCaptcha,
      verifyJWTResponse
  }
}