// Copyright (c) 2015 Christopher Robert Philabaum

/// <reference path="./typings/tsd.d.ts" />

import https = require('https');
import cheerio = require('cheerio');
import urlLib = require('url');
import events = require('events');
import fs = require('fs');

import * as WDC from './modules/wdc';

// Cannot import, no definition.
let cookie = require('cookie');
let querystring = require('querystring');
const HOST = 'www.writing.com';

const STORIES_PATH = 'stories/';

if(process.argv.indexOf('-u') < 0 || process.argv.indexOf('-p') < 0) {
    console.error("-u {username} and -p {password} required.");
    process.exit(-1);
}

let username = process.argv[process.argv.indexOf("-u") + 1];
let passwd = process.argv[process.argv.indexOf("-p") + 1];
let url = process.argv[process.argv.length - 1];

getLoginSession(username, passwd, function(session) {
    getStory(session, url, function(story: WDC.Story) {
        const USER_PATH = STORIES_PATH + (story.author.user || 'null') + '/';
        const FILE_PATH = USER_PATH + story.id + '-' + story.title.replace(/\s/g, '_') + '.json';

        // Call all final I/O in synchronous.
        if(!fs.existsSync(STORIES_PATH)) {
            fs.mkdirSync(STORIES_PATH);
        }
        if(!fs.existsSync(USER_PATH)) {
            fs.mkdirSync(USER_PATH);
        }
        // Save prettified JSON
        fs.writeFileSync(FILE_PATH, JSON.stringify(story, null, 4), {
            encoding: 'utf8'
        });
        console.log('Story saved to ' + FILE_PATH);
        logout(session, function() {
            console.log("Logged out.")
        });
    });
});

function getLoginSession(user: string, passwd: string, callback: (session: string[]) => void): void {
  let data: string = querystring.stringify({
    'login_username': user,
    'login_password': passwd,
    'send_to': "",
    'submit': "submit"
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
    let session: string[] = [];
    res.headers['set-cookie'].forEach(function(rawCookie) {
      let parsedCookie = cookie.parse(rawCookie);
      if('my_session' in parsedCookie) {
          session.push('my_session=' + encodeURI(parsedCookie['my_session']))
      }
      else if('username' in parsedCookie) {
          session.push('username=' + encodeURI(parsedCookie['username']))
      }
      else if('crypt_pw' in parsedCookie) {
          session.push('crypt_pw=' + encodeURI(parsedCookie['crypt_pw']))
      }
    });
    callback(session);
  });

  req.on('error', function(e) {
    console.error("Err: ", e.message);
  });
  req.end(data, 'utf8');
}

function getStory(session: string[], url: string, callback: (story: WDC.Story) => void) {
    grabStoryMain(session, url, function(story: WDC.Story) {
        getPaths(session, url, function(paths: string[]) {
            let posts: WDC.Post[] = [];
            let i = 0;
            setInterval(function() {
                getStoryPost(session, url, paths[i], (post: WDC.Post) => {
                    posts.push(post);
                    if(posts.length === paths.length) {
                        story.posts = posts;
                        callback(story);
                    }
                });
                i++;
                if(i >= paths.length) {
                    clearInterval(this);
                }
            }, 600);
        });
    });
}

function grabStoryMain(session: string[], url: string, callback: (story: WDC.Story) => void) {
    let uri = urlLib.parse(url);
    let options: https.RequestOptions = {
      hostname: uri.hostname,
      path: uri.path,
      headers: {
        'Cookie': session.join('; ')
      }
    };

    let story: WDC.Story = new WDC.Story();

    console.log('Requesting https://%s%s...', options.host, options.path)
    let req = https.get(options, function(res) {
      //console.log("Status: " + res.statusCode);
      //console.log('Headers: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      let data = '';
      res.on('data', function(chunk) {
         data += chunk;
      });
      res.on('end', function() {
        let $ = cheerio.load(data);
        fs.writeFile('test.html', data)
        if(data.indexOf(`<blockquote>Due to heavy server volume, <b>Interactive Stories</b> are <i>temporarily</i> unavailable to guest visitors.<br>Please try again later.</blockquote>`) >= 0) {
          console.error('Err: Writing.com under load');
          process.exit(-1);
        }
        story.title = $('#Content_Column_Inner .proll').text();
        let userDOM = $('#updateTitle').next().find('span a').first();
        story.author = {
            user: userDOM.length > 0 ? userDOM.attr('title').split(' ')[1].split('\r\n')[0] : null,
            name: userDOM.length > 0 ? userDOM.text() : null
        };
        story.rating = WDC.Rating.parse(
            $("#updateTitle").siblings().eq(1).find('a').first().text()
        );

        story.id = parseInt(url.match(/[0-9]+-/)[0].substring(0, url.length-1));
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

// Path must be in the format '14322231...', or '1' if root.
function getStoryPost(session: string[], mainUrl: string, path: string, callback: (post: WDC.Post) => void) {
    let uri = urlLib.parse(mainUrl);
    let options: https.RequestOptions = {
      hostname: uri.hostname,
      path: uri.path + '/map/' + path,
      headers: {
        'Cookie': session.join('; ')
      }
    };

    let post: WDC.Post = new WDC.Post();

    console.log('Requesting https://%s%s...', options.hostname, options.path)
    let req = https.get(options, function(res) {
      //console.log("Status: " + res.statusCode);
      //console.log('Headers: ' + JSON.stringify(res.headers));
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
        post.id = parseInt($('#chapterContent td td').first().first().find('b').text());
        post.title = $('#chapterContent td td big > big > b').text();
        let userDOM = $('#chapterContent td td .noselect > a');
        post.author = {
            user: userDOM.length > 0 ? userDOM.attr('title').split(' ')[1].split('\r\n')[0] : null,
            name: userDOM.length > 0 ? userDOM.text().split('\r\n')[0] : null
        };
        post.text = $("#chapterContent .KonaBody").text();
        if(path.length > 1) {
            post.choiceTitle = $('#chapterContent td td').children().eq(1).find('b').first().text();
        }
        post.path = path;
        callback(post);
      });
    })
    .on('error', function(e) {
      console.error("Err: ", e.message);
    });
}

function getPaths(session: string[], mainUrl: string, callback: (paths: string[]) => void) {
    let uri = urlLib.parse(mainUrl);
    let options: https.RequestOptions = {
      hostname: uri.hostname,
      path: uri.path + '/action/outline',
      headers: {
        'Cookie': session.join('; ')
      }
    };

    console.log('Requesting https://%s%s...', options.hostname, options.path)
    let req = https.get(options, function(res) {
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
            let paths = $('pre.norm').text().match(/([0-9]-)+/gm);
            for(let i = 0; i < paths.length; i++) {
                paths[i] = paths[i].replace(/-/g, '');
            }
            callback(paths);
        });
    })
    .on('error', function(e) {
      console.error("Err: ", e.message);
    });
}

function logout(session, callback: () => void) {
    let options: https.RequestOptions = {
      host: HOST,
      path: '/main/logout',
      headers: {
        'Cookie': session.join('; ')
      }
    };

    console.log('Requesting https://%s%s...', options.host, options.path)
    let req = https.get(options, function(res) {
        res.setEncoding('utf8');
        res.resume();
        res.on('end', callback);
    });
}
