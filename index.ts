/// <reference path="./typings/tsd.d.ts" />
/// <reference path="./modules/wdc.ts" />

import https = require('https');
import cheerio = require('cheerio');
import urlLib = require('url');

// Cannot import, no definition.
// User readline-sync for password hiding.
let readlineSync = require('readline-sync');
let cookie = require('cookie');
let querystring = require('querystring');
const HOST = 'www.writing.com';
let testUrl = "https://www.writing.com/main/interact/item_id/1424917-Really-Random-Questions";
// var testUrl = "https://www.writing.com/main/interact/item_id/787831-Giant-Guys";

let username = process.argv[process.argv.indexOf("-u") + 1];
let passwd = process.argv[process.argv.indexOf("-p") + 1];
console.log(process.argv);
//var url = process.argv[process.argv.length - 1];
let url = testUrl;

getLoginSession(username, passwd, function(session) {
    getStory(session, url, function(story: WDC.Story) {
        // Print prettified JSON
        console.log(JSON.stringify(story, null, 2));
    });
});

function getCookies(session: Object[]): string[] {
    let cookies: string[] = [];
    session.forEach(function(elem) {
      let key = Object.keys(elem)[0];
      cookies.push(key + '=' + encodeURI(elem[key]));
    });

    return cookies;
}

function getLoginSession(user: string, passwd: string, callback: (session: Object[]) => void): void {
  let data: string = querystring.stringify({
    'login_username': user,
    'login_password': passwd,
    'submit': "submit",
    'send_to': "/"
  });
  let options: https.RequestOptions = {
    host: HOST,
    path: '/main/login.php',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': data.length
    }
  };
  let req = https.request(options, function(res) {
    //console.log("Login Status: " + res.statusCode);
    //console.log('Login Headers: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    let session: Object[] = [];
    let rawCookies = res.headers['set-cookie'].forEach(function(rawCookie) {
      session.push(cookie.parse(rawCookie));
    });
    callback(session);
  });

  req.on('error', function(e) {
    console.error("Err: ", e.message);
  });
  req.end(data, 'utf8');
}

function getStory(session: Object[], url: string, callback: (story) => void) {
    grabStoryMain(session, url, function(story: WDC.Story) {
        callback(story);
    });
}

function grabStoryMain(session: Object[], url: string, callback: (story) => void) {
    let uri = urlLib.parse(url);
    let options: https.RequestOptions = {
      hostname: uri.hostname,
      path: uri.path,
      headers: {
        'Cookie': getCookies(session)
      }
    };

    let story: WDC.Story = new WDC.Story();

    //console.log('Requesting https://%s%s...', options.host, options.path)
    let req = https.get(options, function(res) {
      console.log("Status: " + res.statusCode);
      console.log('Headers: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      let data = '';
      res.on('data', function(chunk) {
         data += chunk;
      });
      res.on('end', function() {
        let $ = cheerio.load(data);
        if(data.indexOf(`<blockquote>Due to heavy server volume, <b>Interactive Stories</b> are <i>temporarily</i> unavailable to guest visitors.<br>Please try again later.</blockquote>`) >= 0) {
          console.error('Err: Writing.com under load');
          process.exit(-1);
        }
        story.title = $('#Content_Column_Inner .proll').text();
        story.author = {
            user: $('#Content_Column_Inner .noselect > a').text(),
            name: $('#Content_Column_Inner .noselect > a').text()
        };
        story.rating = WDC.Rating.parse(
            $("#showDetailsArea .blue2roll").first().text()
        );
        //story.numChapters = $('#showDetailsArea div[style="float:right;"]');
        story.description = $("#Content_Column_Inner .shadowBox .norm td.norm").text();
        $("#showDetailsArea > div > div").eq(3).find('a').each(function(i, elem) {
          story.genres.push(WDC.Genre.parse($(this).text()));
        });

        callback(story);
      });
    })
    .on('error', function(e) {
      console.error("Err: ", e.message);
    });
}
