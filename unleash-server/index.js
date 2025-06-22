'use strict';

import {AuthenticationRequired, RoleName, start} from "unleash-server";
import passport from "passport";
import OpenIdConnectStrategy from "passport-openidconnect";


let host = process.env.UNLEASH_HOST
let authHost = process.env.AUTH_HOST;
let slug = process.env.AUTH_SLUG;
let clientID = process.env.AUTH_CLIENT_ID;
let clientSecret = process.env.AUTH_CLIENT_SECRET || '';

function openIdConnect(app, config, services) {
    const {userService} = services;

    passport.use('openidconnect', new OpenIdConnectStrategy({
        issuer: `${authHost}/application/o/${slug}/`,
        authorizationURL: `${authHost}/application/o/authorize/`,
        tokenURL: `${authHost}/application/o/token/`,
        userInfoURL: `${authHost}/application/o/userinfo/`,
        clientID: clientID,
        clientSecret: clientSecret,
        callbackURL: `${host}/api/auth/callback`,
        scope: ['openid', 'profile', 'email'],
        proxy: true,


    }, async (issuer, profile, cb) => {
        const email = profile.emails[0].value
        const name = profile.username
        const user = await userService.loginUserSSO({
            email,
            name,
            rootRole: RoleName.ADMIN,
            autoCreate: true
        });
        cb(null, user);
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user, done) => done(null, user));

    app.get('/api/admin/login', passport.authenticate('openidconnect'));

    app.get('/api/auth/callback',
        passport.authenticate('openidconnect', {
            failureRedirect: '/login',
            failureMessage: true
        }),
        function (req, res) {
            res.redirect('/');
        });

    app.use('/api', (req, res, next) => {

        if (req.user) {
            return next();
        }

        // Instruct unleash-frontend to pop-up auth dialog
        return res
            .status(401)
            .json(
                new AuthenticationRequired({
                    path: '/api/admin/login',
                    type: 'custom',
                    options: {type: 'custom'},
                    message: `You have to identify yourself in order to use Unleash. Use Authentik to login.`,
                }),
            )
            .end();
    });
}


start({
    authentication: {
        type: 'custom',
        customAuthHandler: openIdConnect,
    },
}).then(unleash => {
    console.log(`Unleash started on http://0.0.0.0:${unleash.app.get('port')}`);
}).catch(console.error);
