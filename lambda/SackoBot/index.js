/* eslint-disable no-console */
const https = require('https');
const AWS = require('aws-sdk');

const docClient = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });
const querystring = require('querystring');

const wordlist = '(bread|cash|change|chips|coinage|copper|currency|doubloon|dough|gold|jack|mintage|money|piece|scratch|silver|change|specie)';
const regex = new RegExp(`(^|\\s)${wordlist}(\\s|$)`, 'ig');
const slackIcons = {
  U312UCZLN: 'https://ca.slack-edge.com/T2ZM12732-U312UCZLN-g279c4f0b923-48',
  U318QLFF1: 'https://ca.slack-edge.com/T2ZM12732-U318QLFF1-7a93098a4d4a-24',
  U3130P5AA: 'https://ca.slack-edge.com/T2ZM12732-U3130P5AA-af61e8efa7a2-24',
};

function isSacko() {
  const rNumber = Math.random();
  console.log(`Random number: ${rNumber}`);
  return (rNumber < envConfig.SACKO_CHANCE);
}

// Verify Url - https://api.slack.com/events/url_verification
function verify(token, challenge, envConfig, callback) {
  const response = {
    statusCode: 200,
    body: JSON.stringify(challenge),
  };
  if (token === envConfig.VERIFICATION_TOKEN) {
    callback(null, response);
  } else callback('verification failed');
}

// Post message to Slack - https://api.slack.com/methods/chat.postMessage
function reply(event, envConfig, callback) {
  // send 200 immediately
  callback(null, { statusCode: 200 });

  let messageText = '';
  if (event.attachments) messageText = event.attachments[0].title;
  // check for non-bot message and keywords
  //if (!event.subtype && event.type === 'message' && (regex.test(messageText))) {
  console.log(`BOT NAME: ${event.bot_profile.name}`);
  console.log(`Sacko chance: ${envConfig.SACKO_CHANCE}`);
  if (!event.subtype && event.bot_profile.name === 'giphy' && isSacko()) {
    // DynamoDB Put
    const params = {
      Item: {
        UserID: event.user,
        TimeStamp: event.ts,
        MessageText: messageText,
      },
      TableName: envConfig.DYNAMODB,
    };
    docClient.put(params, (err, data) => {
      if (err) {
        console.log(`Database write error:${err.message}`);
      } else {
        console.log(`Successful database write:${data}`);
      }
    });

    const attachment = JSON.stringify([
      {
        fallback: 'The SACKO has been summoned',
        color: '#2eb886',
        title: `<@${event.user}> is the SACKO`,
        title_link: 'https://66.media.tumblr.com/f5c030cba4abe8541661eb90f9237185/tumblr_inline_nvhjp2bCDU1qbdfh0_500.gif',
        image_url: 'https://66.media.tumblr.com/f5c030cba4abe8541661eb90f9237185/tumblr_inline_nvhjp2bCDU1qbdfh0_500.gif',
        thumb_url: 'http://example.com/path/to/thumb.png',
        footer: 'SackoBot',
        footer_icon: 'https://i.pinimg.com/originals/5b/99/d0/5b99d08f538428098192eddbd8b03e61.png',
      },
    ]);

    const message = JSON.stringify({
      statusCode: 200,
      token: envConfig.BOT_TOKEN,
      channel: event.channel,
      text: '',
      attachments: attachment,
    });

    // HTTP POST request setup
    const options = {
      hostname: 'slack.com',
      port: 443,
      path: '/api/chat.postMessage',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${envConfig.BOT_TOKEN}`,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': message.length,
      },
    };

    const req = https.request(options, (res) => {
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

function slashCommand(envConfig, callback) {
  const numAttachment = 3;
  const params = {
    TableName: envConfig.DYNAMODB,
  };
  docClient.scan(params, (err, data) => {
    if (err) console.log(err, err.stack); // an error occurred
    else {
      const items = data.Items;
      items.sort((a, b) => b.TimeStamp - a.TimeStamp);
      console.log(items[0]);

      const attachmentTest = [];
      for (let i = 0; i < numAttachment; i += 1) {
        attachmentTest[i] = {
          color: '#0CDEF0',
          author_name: `<@${items[i].UserID}>`,
          author_icon: slackIcons[`${items[i].UserID}`],
          text: `${items[i].MessageText}`,
          ts: items[i].TimeStamp,
        };
      }
      const attachment = JSON.stringify(attachmentTest);
      const body = JSON.stringify({
        response_type: 'in_channel',
        text: '*Ice Cream Social Top 3*',
        attachments: attachment,
      });
      console.log(body);
      callback(null, {
        statusCode: 200,
        body,
      });
      // successful response
    }
  });
}

function loadConfig(context) {
  const { invokedFunctionArn } = context;
  const alias = invokedFunctionArn.split(':').pop().toUpperCase();

  const envConfig = {};
  envConfig.VERIFICATION_TOKEN = process.env[`VERIFICATION_TOKEN_${alias}`];
  envConfig.BOT_TOKEN = process.env[`BOT_TOKEN_${alias}`];
  envConfig.DYNAMODB = process.env[`DYNAMODB_${alias}`];
  envConfig.SACKO_CHANCE = process.env[`SACKO_CHANCE_${alias}`];
  return envConfig;
}

// Lambda handler
exports.handler = (data, context, callback) => {
  let body;
  let messageType = '';
  const contentType = data.headers['Content-Type'];
  const envConfig = loadConfig(context);
  console.log(data.body);
  if (data.body !== null && data.body !== undefined) {
    if (contentType === 'application/json') {
      body = JSON.parse(data.body);
      messageType = body.type;
    } else if (contentType === 'application/x-www-form-urlencoded') {
      body = querystring.parse(data.body);
      messageType = 'slash_command';
    }
  }

  switch (messageType) {
    case 'url_verification': verify(body.token, body.challenge, envConfig, callback); break;
    case 'event_callback': reply(body.event, envConfig, callback); break;
    case 'slash_command': slashCommand(envConfig, callback); break;
    default: callback(null, { statusCode: 200 });
  }
};
