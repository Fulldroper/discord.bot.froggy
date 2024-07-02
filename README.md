The purpose of the project was to create a Discord bot for convenient and high-quality music listening from audio services in a voice channel.

The project is useful as it provides an easy way for users to play music in their Discord voice channels without interruptions and with high quality.

## How the project works

The bot connects to a Discord server and listens for specific commands from users in a voice channel. When a user requests a song, the bot searches for the song on supported audio services, streams the audio to the voice channel, and manages playback controls.

### Repository Link and Installation

You can find the repository and installation instructions at the following link:
[Discord Bot Froggy](https://github.com/Fulldroper/discord.bot.froggy)

### Algorithm and Code Examples

1. **Connecting to Discord Server**
```javascript
const Discord = require('discord.js');
const client = new Discord.Client();
client.login('YOUR_BOT_TOKEN');
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});
```

2. **Listening for Commands**
```javascript
client.on('message', message => {
  if (message.content === '!play') {
    // Code to play music
  }
});
```

3. **Playing Music**
```javascript
const ytdl = require('ytdl-core');
const connection = await message.member.voice.channel.join();
const dispatcher = connection.play(ytdl('YOUTUBE_VIDEO_URL', { filter: 'audioonly' }));

dispatcher.on('finish', () => {
  message.member.voice.channel.leave();
});
```

## Skills Acquired

- Advanced JavaScript and Node.js programming
- Working with the Discord API
- Managing asynchronous operations and event handling
- Integrating with third-party audio services

