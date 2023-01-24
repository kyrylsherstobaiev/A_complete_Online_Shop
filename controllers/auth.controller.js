const User = require('../models/user.model');
const authUtil = require('../util/authentication');
const validation = require('../util/validation');
const sessionFlash = require("../util/session-flash");

function getSignUp(req, res) {
    let sessionData = sessionFlash.getSessionData(req);

    if (!sessionData) {
        sessionData = {
            email: '',
            confirmEmail: '',
            password: '',
            fullname: '',
            street: '',
            postal: '',
            city: '',
        };
    }
    res.render("customer/auth/signup", {inputData: sessionData});
}

async function signup(req, res, next) {
    const enterData = {
        email: req.body.email,
        confirmEmail: req.body["confirm-email"],
        password: req.body.password,
        fullname: req.body.fullname,
        street: req.body.street,
        postal: req.body.postal,
        city: req.body.city,
    }

    if (!validation.userDetailsAreValid(
        req.body.email,
        req.body.password,
        req.body.fullname,
        req.body.street,
        req.body.postal,
        req.body.city
    ) || !validation.emailIsConfirm(req.body.email, req.body["confirm-email"])
    ) {

        sessionFlash.flashDataSession(req, {
            errorMessage:
                "Please check your input. Password must be at least 6 characters long, postal code must be 5 characters long.",
            ...enterData

        }, function () {
            res.redirect('/signup');
        })
        return;
    }

    const user = new User(
        req.body.email,
        req.body.password,
        req.body.fullname,
        req.body.street,
        req.body.postal,
        req.body.city
    );


    try {
        const existAlready = await user.existAlready();

        if (existAlready) {
            sessionFlash.flashDataSession(req, {
                errorMessage: "User exists already! Try logging in instead!",
                ...enterData,
            }, function () {
                res.redirect('/signup');
            });
            return;
        }
        await user.signup();
    } catch (error) {
        next(error);
        return;
    }

    res.redirect('/login');
}

function getLogin(req, res) {
    let sessionData = sessionFlash.getSessionData(req);

    if (!sessionData) {
        sessionData = {
            email: '',
            password: '',
        }
    }

    res.render("customer/auth/login", {inputData: sessionData});
}

async function login(req, res, next) {
    const user = new User(req.body.email, req.body.password);
    let existingUser;
    try {
        existingUser = await user.getUserWithSameEmail();
    } catch (error) {
        next(error);
        return;
    }

    const sessionErrorData = {
        errorMessage: "Invalid credentials - please double-check your email and password!",
        email: user.email,
        password: user.password
    }

    if (!existingUser) {
        sessionFlash.flashDataSession(req, sessionErrorData, function () {
            res.redirect('/login');
        });
        return;
    }

    const passwordIsCorrect = await user.hasMatchingPassword(existingUser.password);

    if (!passwordIsCorrect) {
        sessionFlash.flashDataSession(req, sessionErrorData, function () {
            res.redirect('/login');
        });
        return;
    }

    authUtil.createUserSession(req, existingUser, function () {
        res.redirect('/');
    });
}

function logout(req, res) {
    authUtil.destroyUserAuthSession(req);
    res.redirect('/login');
}


module.exports = {
    getSignUp: getSignUp,
    signup: signup,
    getLogin: getLogin,
    login: login,
    logout: logout,
}