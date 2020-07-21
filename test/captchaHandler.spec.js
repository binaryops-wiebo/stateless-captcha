"use strict";
const expect = require('chai').expect;
// const sinon = require('sinon');
const captcHandle = require('../lib/captchaHandler');

describe('stateless-captcha', function () {

    const preDefined = { nonce: '1234', answer: 'ICOuV5' }
    preDefined.validation = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjEyMzQiLCJhbnN3ZXIiOiJJQ091VjUiLCJpYXQiOjE1NTA3OTg0MjUsImV4cCI6MTU1MDg4MjQyNX0.2I2EzGCxZ0BaES0Ol9zAlKlA-qEw1qBpR5V-jq_CsWs';

    beforeEach(function () {
        
    });

    afterEach(function () {
        
    });
    
    it('can create a new captchaHandler', function () {
        const dummyOptions = {};
        const captchaHandler = captcHandle(dummyOptions);

        expect(captchaHandler).to.be.an.instanceof(Object);
    });

    it('can create a new captcha', function () {
        const dummyOptions = {};
        const captchaHandler = captcHandle(dummyOptions);

        var wrapper = captchaHandler.createCaptcha('1234');

        expect(wrapper.validation).to.be.a('string');
        expect(wrapper.captcha).to.be.an.instanceof(Object);
        expect(wrapper.captcha.data).to.be.a('string');

    });

    // it('can verify a captcha', function () {
    //     const dummyOptions = {};
    //     const captchaHandler = captcHandle(dummyOptions);

    //     const ret1 = captchaHandler.verifyCaptcha(preDefined);
    //     expect(ret1).to.be.an.instanceof(Object);
    //     expect(ret1.valid).to.be.true;
    //     expect(ret1.jwt).to.be.a('string');

    //     const ret2 = captchaHandler.verifyJWTResponse(ret1.jwt, preDefined.nonce);
    //     expect(ret2).to.be.an.instanceOf(Object);
    //     expect(ret2.valid).to.be.true;

    // });

    
});