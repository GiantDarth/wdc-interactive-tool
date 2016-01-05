/// <reference path="./typings/node/node.d.ts" />
/// <reference path="./typings/cheerio/cheerio.d.ts" />

import https = require('https');
import cheerio = require('cheerio');
// Cannot import, no definition.
// User readline-sync for password hiding.
var readlineSync = require('readline-sync');
var cookie = require('cookie');
var querystring = require('querystring');
var domain = "www.writing.com";
var testPath = "/main/interact/item_id/1424917-Really-Random-Questions";

var username = readlineSync.question('Writing.com Username: ');
var passwd = readlineSync.question('Writing.com Password: ', {
  hideEchoBack: true
});

getLoginSession(username, passwd, function(session) {
  getStory(session, 'https://' + domain + testPath);
});

function getLoginSession(user, passwd, callback) {
  var data = querystring.stringify({
    'login_username': user,
    'login_password': passwd,
    'submit': "submit",
    'send_to': "/"
  });
  var options = {
    host: domain,
    path: '/main/login.php',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': data.length
    }
  };
  var req = https.request(options, function(res) {
    //console.log("Login Status: " + res.statusCode);
    //console.log('Login Headers: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    var cookies = [];
    var rawCookies = res.headers['set-cookie'].forEach(function(rawCookie) {
      cookies.push(cookie.parse(rawCookie));
    });
    console.log(cookies);
    callback(cookies);
  });

  req.on('error', function(e) {
    console.error("Err: ", e.message);
  });
  req.end(data, 'utf8');
}

function getStory(session, url) {
  var cookieString = '';
  session.forEach(function(elem) {
  });
  var options = {
    hostname: url,
    headers: {
      'cookie': cookieString
    }
  };
  var story = {
    title: null,
    author: null,
    rating: null,
    desc: null
  };
  //console.log('Requesting https://%s%s...', options.host, options.path)
  var req = https.get(options, function(res) {
    console.log("Status: " + res.statusCode);
    console.log('Headers: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    var data = '';
    res.on('data', function(chunk) {
       data += chunk;
    });
    res.on('end', function() {
      var $ = cheerio.load(data);
      if(data.indexOf(`<blockquote>Due to heavy server volume, <b>Interactive Stories</b> are <i>temporarily</i> unavailable to guest visitors.<br>Please try again later.</blockquote>`) >= 0) {
        console.error('Err: Writing.com under load');
        process.exit(-1);
      }
      story.title = $('#Content_Column_Inner .proll').text();
      story.author = $('#Content_Column_Inner .noselect > a').text();
      story.rating = $("#showDetailsArea .blue2roll").text();
      //story.numChapters = $('#showDetailsArea div[style="float:right;"]')
      story.desc = $("#Content_Column_Inner .shadowBox .norm td.norm").text();
      // Print prettified JSON
      console.log(JSON.stringify(story, null, 2));
    });
  }).on('error', function(e) {
    console.error("Err: ", e.message);
  });
}
