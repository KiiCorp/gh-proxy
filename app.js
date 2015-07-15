"use strict"
var express        = require('express'),
    passport       = require('passport'),
    GitHubStrategy = require('passport-github').Strategy,
    assets         = require("connect-assets"),
    bodyParser     = require('body-parser'),
    methodOverride = require('method-override'),
    logger         = require("morgan"),
    cookieParser   = require("cookie-parser"),
    cookieSession  = require("cookie-session"),
    path           = require("path"),
    jade           = require("jade"),
    ghm            = require("github-flavored-markdown"),
    xhr            = require("jquery-xhr");

//
var PORT    = process.env.PORT || 3000;
var BASEURL = process.env.BASEURL || ("http://localhost:" + PORT);
var CALLBACK_URL = BASEURL + "/auth/github/callback"
var COOKIE_SESSION_KEY = process.env.COOKIE_SESSION_KEY || 'adf19dfe1a4bbdd949326870e3997d799b758b9b'
console.log("CALLBACK_URL:", CALLBACK_URL);

//----------------------------------------------------------------
// Configure passport
//----------------------------------------------------------------
passport.use(new GitHubStrategy({
    clientID:     process.env['GITHUB_CLIENT_ID'],
    clientSecret: process.env['GITHUB_CLIENT_SECRET'],
    callbackURL: CALLBACK_URL,  //NOTE: Must be matched to the confiuration in github.com
    scope: ["repo", "read:org"],
  },
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function() {
      done(null, {
        github: {
          profile: profile,
          accessToken: accessToken,
        },
      });
    });
  }
));

// NOTE: This stores serialized user in req.session.user.
//       Unique ID must be stored to deserialize.
passport.serializeUser(function(user, done) {
  done(null, user);
});

// NOTE: This restore a user object in req.user.
passport.deserializeUser(function(user, done) {
  done(null, user);
});

//----------------------------------------------------------------
// Configure express
//----------------------------------------------------------------
var app = express();
app.set('port', PORT);
app.set("views", path.join(__dirname, 'views'));
app.set("view engine", "jade");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride());
app.use(cookieParser());
app.use(cookieSession({keys: [COOKIE_SESSION_KEY]}));  //TODO: secure
app.use(passport.initialize());
app.use(passport.session());
app.use(logger('dev'));
app.use(function(req, res, next) {
  res.locals.session = req.session
  next()
});

//----------------------------------------------------------------
// Configure paths
//----------------------------------------------------------------
function options(req) {
  return {
    baseurl: BASEURL,
    user: req.session.passport.user
  }
}
app.get('/', function(req, res) {
  res.render('index', options(req));
})

app.get('/auth/github',
  passport.authenticate('github'),
  function(req, res) {
    // never called becase of redirect to github
  });

app.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/login?reason=failureRedirect' }),
  function(req, res) {
    res.redirect('/')
  });

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.get('/github.com/*', function(req, res) {
  if (!req.session.passport.user) {
    return res.status(404).render("index", options(req));
  }

  var path = req.params[0]
  var url = "https://raw.githubusercontent.com/" + path
  var username = req.session.passport.user.github.accessToken
  var password = "x-oauth-basic"
  
  //
  $.ajax({
    type: 'GET',
    url: url,
    headers: {
      Authorization: "Basic " + (new Buffer(username + ":" + password)).toString('base64'),
    },
  })
  .fail(function(err) {
    console.error(err);
    res.set('content-type', 'application/json')
       .status(err.status)
       .send({ responseText: err.responseText, status: err.status, url: url, })
  })
  .done(function(resbody, stat, ajax) {
    var page = '' +
               '<head>' +
               '<link  type="text/css"  href="/github-markdown.css" rel="stylesheet"/>' +
               '</head>' +
               '<body>' +
               '  <main class="markdown-body">' +
               ghm.parse(resbody) +
               '  </main>' +
               '  <div>' +
               '    <hr>' +
               '    <span>Served by <a href="' + BASEURL + '">' + BASEURL + '</a></span>' +
               '  </div>' +
               '</body>'
    res.send(page);
  })
});

//
app.use('/', express.static(__dirname + "/"));
app.use(function(req, res, next) {
  if (req.is('text/*')) {
    req.text = '';
    req.setEncoding('utf8');
    req.on('data', function(chunk) { req.text += chunk; });
    req.on('end', next);
  } else {
    next();
  }
});

app.listen(app.get("port"), function() { console.log("server started.") });

