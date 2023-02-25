// aplication runner
(async () => {
  // env configuration
  process.env.NODE_ENV || (await require("dotenv").config({ debug: false }));
  // req discord framework
  const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice')
  
  const URL = require('node:url')
  const ytdl = require('play-dl')// require('ytdl-core');
  const ytpl = require('ytpl');
  
  // create bot
  const bot = new (require('discord.js-selfbot-v13').Client)({
    checkUpdate: false,
  });

  const mentionLib = ['жаб','жабка']

  const commandsLib = {
    play: ['грай', 'запусти', 'зіграй', 'додай'],
    stop: ['вийди', 'зупинись', 'досить', 'стоп'],
    skip: ['скіп', 'наступна', 'пропусти', 'далі'],
    pause: ['пауза', 'зачекай']
  }

  const playList = []

  const TIMEOUT = 5000
  const timeout = {}
  let busyID = false
  let busy = false;
  let connection, subscription

  // create player
  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play
    }
  });

  const queryToObj = query => {
    const res = {}

    query.split("&").forEach(e => {
      const r = e.split("=")
      res[r[0]] = r[1]
    });

    return Object.keys(res).length < 1 ? false : res
  }

  const validateURL = ({protocol, host, query, pathname}) => {
    if(
      protocol !== 'https:' ||
      !['www.youtube.com', 'youtube.com', 'music.youtube.com', 'youtu.be'].includes(host)
    ) return false

    const q = queryToObj(query)

    if (q['list']) {
      return 'list'
    } else if (q['v'] || (!q && host === 'youtu.be')){
      return 'video'
    }

    return false
  }

  const hasMentions = ({content = false, mentions = false}) => {
    // if all empty
    if(!content && !mentions) return false
    // to lovercase
    content = content.toLowerCase()
    // if ping
    if (mentions?.users?.has(bot.user.id)) {
      // replace if incide content
      return content.replace(`<@${bot.user.id}>`, '')
    }
    // find mention from lib
    for (const synonym of mentionLib) {
      //
      if (content.includes(synonym)) {
        return content.replace(synonym, '')
      }
    }

    return false
  }

  const hasTimeout = id => {
    const currTime = new Date().getTime()
    if (timeout[id] && currTime - timeout[id] < TIMEOUT) {
      return true
    } else return timeout[id] = currTime, false;
  }

  bot.play = async (msg) => {
    let url = msg.content.match(/(?:(?:https|http):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#\/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#\/%=~_|$?!:,.]*\)|[A-Z0-9+&@#\/%=~_|$])/igm);
    if (url) {
      url = url[0]?.replace("https://youtu.be/", 'https://www.youtube.com/watch?v=')
    }
    const url_p = URL.parse(url)
    const isValidURL = validateURL(url_p) || false
    if (!url && busy == 'pause') {
      player.unpause()
      return
    } else if(isValidURL && ['play', 'ready'].includes(busy)) {
      // push
      playList.push(url)
      await msg.react("✅")
      return
    } else if (!url) {
      msg.reply("Вибач, але я не розумію що грати 👀")
      return
    }
    // join to channel    
    const {id, guildId, guild} = msg?.member?.voice?.channel
    // create connection
    connection = joinVoiceChannel({
      channelId: id,
      guildId,
      adapterCreator: guild.voiceAdapterCreator,
    });
    // create busy state
    busy = "play"
    // listening event of voice state
    connection.on("stateChange", ({status}) => status === 'ready' ? busy = status : busy = false)
    connection.on("error", e => console.log(e) && connection.destroy())
    // check is playlist
    if (!isValidURL) {
      msg.reply("Вибач, але посилання не вірне 👀")
      return
    } else if (isValidURL == 'list') {
      // plist
      let playListRaw = []
      try {
        const list = await ytpl(queryToObj(url_p.query)['list'])
        playListRaw = list?.items?.map(x => x.shortUrl);
      } catch (error) {
        msg.reply("Я не можу переглянути вміст цьго плейлисту, спробуй інше посилання 🐸")
        return
      }

      playList.push(...playListRaw)

      let stream = await ytdl.stream(playListRaw[0])

      const resource = createAudioResource(stream.stream, {
        inputType: stream.type
      })

      subscription = connection.subscribe(player)
      player.play(resource)
      player.on(AudioPlayerStatus.Idle, async () => {
        playList.shift()
        if (playList.length < 1 ) {
          subscription.unsubscribe()
          connection.disconnect()
          busy = false
          busyID = false
        } else {
          let stream = await ytdl.stream(playList[0])
          player.play(createAudioResource(stream.stream, {
            inputType: stream.type
          }))
        }
      })

      msg.react("✅")
    } else {
      // song
      if ( playList.length < 1 ) {
        let stream = await ytdl.stream(url)
        // const stream = ytdl(url, {filter: 'audioonly', type: 'opus'})
        const resource = createAudioResource(stream.stream, {
          inputType: stream.type
        })
        subscription = connection.subscribe(player)
        player.play(resource)
        player.on(AudioPlayerStatus.Idle, async () => {
          playList.shift()
          if (playList.length < 1 ) {
            subscription.unsubscribe()
            connection.disconnect()
            busy = false
            busyID = false
          } else {
            let stream = await ytdl.stream(playList[0])
            player.play(createAudioResource(stream.stream, {
              inputType: stream.type
            }))
          }
        })
        msg.react("✅")
      }
      playList.push(url)
    }
    
    
    // // create stream    
    // const resource = createAudioResource('https://streams.ilovemusic.de/iloveradio8.mp3')
    // // link player
    // connection.subscribe(player)
    // // play resource
    // player.play(resource)
  }

  bot.skip = msg => (player.emit(AudioPlayerStatus.Idle, true), msg.react("✅"))

  bot.pause = msg => (player.pause(), busy = 'pause', msg.react("✅"))
  bot.stop = msg => (connection.disconnect(), busy = false, busyID = false, playList.length = 0, msg.react("✅"))

  bot.once("ready", ({user}) => (mentionLib.push(user.username), console.log(`${user.username}#${user.discriminator} is up!`)))

  bot.on("messageCreate", async function(msg) {
    // console.log(msg.author.username, msg.content);
    // only owner mode
    // if (msg.author.id !== process.env.OWNER) return
    // skip self and bots
    if (msg.author.id === bot.user.id || msg.author.bot) return;
    // check mention and clear content    
    const mention = hasMentions(msg)
    // exit if not mentioned
    if (!mention) return
    // spam protect
    if (hasTimeout(msg.author.id)) {
      msg.reply("Занадто швидко пишеш, я не встигаю. Заспокойся прошу 😥")
      return
    }
    // check if see channel
    let ch;
    if (!(ch = msg?.member?.voice?.channel)) {
      msg.reply("Я не бачу тебе 👀, ти де?") 
      return
    };
    // check if can`t join
    if ((!ch.members.get(this.user.id) && busy !== false) || !ch.joinable || !(ch.members.size < (ch.userLimit || 99))) {
      msg.reply("Я не можу зайти до тебе 🙃")
      return
    };
    // check if not busy
    if (!['pause','play', 'ready', false].includes(busy) && (busyID || busyID == ch.id)) {
      msg.reply("Я зараз зайнята, давай пізніше 🐸")
      return
    }
    let allCommands = ''
    // parce trigger command words
    for (const command in commandsLib) {
      for (const word of commandsLib[command]) {
        if (mention.includes(word)) {
          busyID = ch.id
          this[command](msg, mention.replace(word, ''))
          return
        }
      }
      allCommands+= `\`${command}\`: ${commandsLib[command].toString()}\n`
    }
    // send list of command
    msg.reply(`🐸 Я реагую на наступні команди 👀\n\n${allCommands}Можеш мене називати ${mentionLib.join(", ")}`)
  });
  // auth
  bot.login(process.env.TOKEN);
})();
