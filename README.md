# stateless-captcha
Node module to easily implement stateless captcha rendering and validations, for use in express and restify.
You can easily define the three routes needed to support a captcha protected function in your applications

<pre>
app.post('/captcha', captchaHandler.getCaptcha);
app.post('/captcha/verify', captchaHandler.verifyCaptcha);
app.post('/captcha/audio', captchaHandler.getCaptchaAudio);
</pre>

and finally your captcha protected route with middleware

<pre>
app.get('/', captchaHandler.verifyJWTResponseMiddleware, (req, res) =>
    res.send('Hello There! You must have entered a valid Captcha response')
);
</pre>

# Overview
This module provides functionality to add 3 routes and 1 middleware function to your restify or express application.

1. Get the Captcha. This returns the Captcha svg that you can render on your front end. It also includes an encrypted validation string.
2. Verify the Captcha. Your front end supplies the answer your user typed in, along with the validation string from step 1. It returns an object indicating whether the response was correct. If it as correct, you also receive a jwt token in the response.
3. use the middleware on the captcha secured route (the submit), and pass the jwt token in a request header. If the token is invalid then the request will fail with a 401.
4. get audio for the current captcha, returns a playable mp3 of the spoken content of the captcha.

<pre>
const express = require('express');
const app = express();
const captcha = require('stateless-captcha');
const bodyParser = require('body-parser');
const port = 3000;

const options = {
    CAPTCHA_TOKEN_HEADER: 'authorization',
    CAPTCHA_NONCE_HEADER: 'captcha-nonce',
    CAPTCHA_TOKEN_SECRET: 'defaultSecret',
    CAPTCHA_EXPIRY_MINUTES: '15'
};
const captchaHandler = captcha(options);

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

/** Getting the Captcha for your front-end 
 * Submit: a client side nonce
 *         {
 *            nonce: '1223dsfdres-434-dd'
 *         };
 *
 *  the returned object containes the captcha as well as the encrypted validation for future use.
 *  {
 *     "captcha": {
 *         "data": "svg ... "
 *      },
 *     "validation": "ksafrp348573pfsldkfjlj.............."
 * };
 */
app.post('/captcha', captchaHandler.getCaptcha);



/**  verify the user's answer 
* Submit: an object with the nonce, the anser and the validation string.
* {
*     nonce: '1223dsfdres-434-dd',
*     answer: 'mk4f8h',
*     validation: "ksafrp348573pfsldkfjlj.............."
* };
* 
* the returned obect:
*  {
*     "valid": true,
*     "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6Ik....."
*  }
*/
app.post('/captcha/verify', captchaHandler.verifyCaptcha);


/** Secure a route using the jwt token obtained with the correct answer, we're using middleware for this 
* both the token and the nonce are required to be submitted in the request headers
* the token may be preceded by 'Bearer ' even if the header is not 'authorization'
*/
app.get('/', captchaHandler.verifyJWTResponseMiddleware, (req, res) =>
    res.send('Hello There! You must have entered a valid Captcha response')
);

/**
 * The user may wish to listen to the captcha, rather than trying to read it
 * This method returns an MP3 encoded audio clip that you plan play on the client 
 * Submit: an object with the nonce, and the validation string.
 * {
 *     nonce: '1223dsfdres-434-dd',
 *     validation: "ksafrp348573pfsldkfjlj.............."
 * };
 * 
 * the returned object
 * {
 *   "audio": "data:audio/mp3;base64,//NAxAAAAANIAAAAAPGANnlgXPAYEJ+JgAAk/B2...."
 * }
 */
app.post('/captcha/audio', captchaHandler.getCaptchaAudio);



// start the app !!
app.listen(port, () => console.log(`Example app listening on port ${port}!`));

</pre>