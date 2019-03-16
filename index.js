const https = require('https');

// eslint-disable-next-line prefer-destructuring
const VERIFICATION_TOKEN = process.env.VERIFICATION_TOKEN;
const BOT_TOKEN = process.env.BOT_TOKEN;
const wordlist = "(bread|cash|change|chips|coinage|copper|currency|doubloon|dough|gold|jack|mintage|money|piece|scratch|silver|change|specie)";
const regex = new RegExp("(^|\\s)" + wordlist + "(\\s|$)", 'ig');


// Verify Url - https://api.slack.com/events/url_verification
function verify(token, challenge, callback) {
  const response = {
    statusCode: 200,
    body: JSON.stringify(challenge),
  };
  if (token === VERIFICATION_TOKEN) {
    callback(null, response);
  } else callback('verification failed');
}

// Post message to Slack - https://api.slack.com/methods/chat.postMessage
function reply(event, callback) {

  // send 200 immediately
  callback(null, { statusCode: 200 });

  var attachmentTitle = "";
  
  if (event.attachments) {
    attachmentTitle = event.attachments[0].title;
  }

  // check for non-bot message and keywords  
  if (!event.subtype && event.type === 'message' && (regex.test(event.text) || regex.test(attachmentTitle))) {
    const attachment = JSON.stringify([
        {
            "fallback": "The SACKO has been summoned",
            "color": "#2eb886",
            "title": `<@${event.user}> is the SACKO`,
            "title_link": "https://66.media.tumblr.com/f5c030cba4abe8541661eb90f9237185/tumblr_inline_nvhjp2bCDU1qbdfh0_500.gif",
            "image_url": "https://66.media.tumblr.com/f5c030cba4abe8541661eb90f9237185/tumblr_inline_nvhjp2bCDU1qbdfh0_500.gif",
            "thumb_url": "http://example.com/path/to/thumb.png",
            "footer": "SackoBot",
            "footer_icon": "https://i.pinimg.com/originals/5b/99/d0/5b99d08f538428098192eddbd8b03e61.png"
        }
    ]);
    
    const message = JSON.stringify({
      statusCode: 200,
      token: BOT_TOKEN,
      channel: event.channel,
      text: "",
      attachments: attachment,
    });

    console.log('request: ' + message);

    // HTTP POST request setup
    const options = {
      hostname: 'slack.com',
      port: 443,
      path: '/api/chat.postMessage',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${BOT_TOKEN}`,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': message.length,
      },
    };

    const req = https.request(options, (res) => {
      console.log(`statusCode: ${res.statusCode}`);

      // Slack response output
      res.on('data', (d) => {
        process.stdout.write(d);
      });
    });
    
    req.on('error', (error) => {
      console.error(error);
    });

    // send HTTP POST with message as the data
    req.write(message);
    req.end();
    
  }
}

// Lambda handler
exports.handler = (data, context, callback) => {
  let body;
  console.log(data.body);
  if (data.body !== null && data.body !== undefined) {
    body = JSON.parse(data.body);
  }

  switch (body.type) {
    case 'url_verification': verify(body.token, body.challenge, callback); break;
    case 'event_callback': reply(body.event, callback); break;
    default: callback(null, { statusCode: 200 });
  }
};
