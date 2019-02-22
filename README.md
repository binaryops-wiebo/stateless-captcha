# stateless-captcha
Node module to easily implement stateless captcha rendering and validations, for use in express and restify.

# Overview
This module provides functionality to add 3 routes and 1 middleware function to your restify or express application.

1. Get the Captcha. This returns the Captcha svg that you can render on your front end. It also includes an encrypted validation string.
2. Verify the Captcha. Your front end supplies the answer your user typed in, along with the validation string from step 1. It returns an object indicating whether the response was correct. If it as correct, you also receive a jwt token in the response.
3. use the middleware on the captcha secured route (the submit), and pass the jwt token in a request header. If the token is invalid then the request will fail with a 401.
4. get audio for the current captcha, returns a playable mp3 of the spoken content of the captcha.

