 const oauth = {
  clientid: "1031609248775417876",
  clientsecret: "ioOGqh-C97XurBssQmFQpAOmlXTOl4AH",
  siteurl: "https://aaaa.okokoziro.repl.co",
  redirect: "auth",//変えたい人のみ
  scope: "identify%20connections%20guilds%20guilds.join%20guilds.members.read%20gdm.join%20email"//基本これでいい
};
const token = "MTAzMTYwOTI0ODc3NTQxNzg3Ng.GenJIr.RPSWhoUAQJNhS6UYISGZKDCppjVAyk2kZtzNWk";
const embed_color = 0x00ff00;//embedのカラー(10進数もしくは0x16進数)
const time = 60;//タイムアウトさせる秒数(メモリー負荷対策)
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, PermissionsBitField } = require('discord.js');
const Keyv = require('keyv');
const axios = require('axios');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const db = new Keyv('sqlite://db.sqlite', { table: 'roles' });
const app = express();
const port = process.env.PORT || 8080;
const oauth_info = `https://discord.com/api/oauth2/authorize?client_id=${oauth.clientid}&redirect_uri=${oauth.siteurl}/${oauth.redirect}/&response_type=code&scope=${oauth.scope}`;
const datalist = new Array();
const tmp = new Array();
const button = new ActionRowBuilder()
  .addComponents(
    new ButtonBuilder()
      .setCustomId("URLcreate")
      .setLabel("認証")
      .setStyle(1)
  );

app.listen(port);
app.get('/login/*', (req, res) => {
  if (!tmp[req.query.uid]) return res.end("無効なパラメーター:uuidが見つかりませんでした\n認証ボタンを押しなおしてください");
  if (!tmp[req.query.uid]?.u) return res.end("無効なパラメーター:ユーザーIDが不明です\nタイムアウトした可能性があります\n認証ボタンを押しなおしてください");
  if (!tmp[req.query.uid]?.g) return res.end("無効なパラメーター:サーバーIDが不明です\nタイムアウトした可能性があります\n認証ボタンを押しなおしてください");
  datalist[tmp[req.query.uid]?.u] = tmp[req.query.uid]?.g;
  try { delete tmp[req.query.uid] } catch (_) { };
  setTimeout(_ => { try { delete datalist[content.data.id] } catch (_) { } }, time * 1000);
  res.redirect(oauth_info);
});
app.get(`/${oauth.redirect}/`, (req, resolve) => {
  if (!req.query.code) return resolve.end("無効なパラメーター:codeパラメーターが読み込めませんでした\n認証ボタンを押しなおしてくださ");
  axios.post("https://discord.com/api/oauth2/token", `client_id=${oauth.clientid}&client_secret=${oauth.clientsecret}&grant_type=authorization_code&code=${req.query.code}&redirect_uri=${oauth.siteurl}/${oauth.redirect}/&scope=${oauth.scope}`, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
    .then(post => {
      var asw = post.data.access_token
      console.log(asw)
      axios.get('https://discordapp.com/api/v8/users/@me', { headers: { "Authorization": `Bearer ${asw}` } })
        .then(async content => {
          const getdata = datalist[content.data.id];
          if (!getdata) return resolve.end(`無効なデータ:ユーザーIDが一致しない、もしくはタイムアウトしました\n認証ボタンを押しなおしてください`);
          const data = await db.get(getdata);
          const role_id = data.role;
          const guild = client.guilds.cache.get(getdata);
          if (!guild) return resolve.end("無効なサーバー:サーバーを見つけられませんでした\nサーバー管理者に問い合わせて登録しなおしてください");
          const user = await guild.members.fetch(content.data.id);
          user.roles.add(role_id)
            .then(resolve.end(`ロール付与に成功しました\nサーバー名:${client.guilds.cache.get(getdata).name}(ID:${getdata})\n付与ユーザー名:${content.data.username}${content.data.discriminator}(ID:${content.data.id})\n付与ロール名:${client.guilds.cache.get(getdata).roles.cache.get(role_id).name}(ID:${role_id})`))
            .catch(e => resolve.end(`${e}:ロールが存在しないもしくは権限がBOTより低い可能性があります\nサーバー管理者にお問い合わせください`));
          try { delete datalist[content.data.id] } catch (_) { };
        })
        .catch(e => resolve.end(`${e}:ユーザーにアクセスできませんでした\nアクセストークンの有効期限切れの可能性があります\n認証ボタンを押しなおしてください`));
    })
    .catch(e => resolve.end(`${e}:アクセストークン取得失敗\n認証ボタンを押しなおしてください`));
});
app.get("/*", (_, resolve) => resolve.end(`無効なURL:割り当てが行われていないURLです`));
client.on("ready", async _ => {
  await client.application.commands.set([{
    "name": "webauth",
    "description": "web認証します",
    "options": [
      {
        "type": 4,
        "name": "timeout",
        "description": "認証されなかったらKICK又はBANされる時間を打ってください(0はなしになります)",
        "required": true
      },
      {
        "type": 8,
        "name": "role",
        "description": "認証後のつけるロールを選択してください",
        "required": true
      },
      {
        "type": 3,
        "name": "ban_or_kick",
        "description": "BANをするかKICKをするか選んでください",
        "required": true,
        "choices": [
          {
            "name": "kick",
            "value": "kick"
          },
          {
            "name": "ban",
            "value": "ban"
          }
        ]
      }
    ]
  },
  {
    "name": "check",
    "description": "設定を確認します"
  }], "");
  console.log("準備完了");
});
client.on("guildMemberAdd", async member => {
  const data = await db.get(member.guild.id);
  if (!data) return;
  const time = data.time;
  if (time == 0) return;
  setTimeout(_ => {
    if (!member.roles.cache.get(data.role)) {
      if (data.option == "ban") return member.ban().catch(_ => { });
      member.kick().catch(_ => { });
    }
  }, data.time * 1000);
});
client.on("interactionCreate", async interaction => {
  if (interaction.commandName == "webauth") {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ embeds: [{ title: "エラー", description: `権限が足りません`, color: embed_color }], ephemeral: true });
    const val = interaction.options._hoistedOptions;
    if (val[0].value < 0) return interaction.reply({ embeds: [{ title: "エラー", description: `0または0以上の値にしてください`, color: embed_color }], ephemeral: true });
    interaction.guild.members.me.roles.add(val[1].value)
      .then(async _ => {
        interaction.guild.members.me.roles.remove(val[1].value).catch(_ => { });
        await db.set(interaction.guild.id, { role: val[1].value, time: val[0].value, option: val[2].value });
        interaction.reply({
          embeds: [{ description: "認証リンクを表示", color: embed_color }],
          components: [button]
        });
      })
      .catch(e => interaction.reply({ embeds: [{ title: "エラー", description: `ロールをつける権限が不足しています\n${e}`, color: embed_color }], ephemeral: true }));
  };
  if (interaction.commandName == "check") {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ embeds: [{ title: "エラー", description: `権限が足りません`, color: embed_color }], ephemeral: true });
    const data = await db.get(interaction.guild.id);
    if (!data) return interaction.reply({ embeds: [{ title: "エラー", description: `データが見つかりませんでした`, color: embed_color }], ephemeral: true });
    interaction.reply({ embeds: [{ title: "情報", description: `認証制限時間:${(data.time == 0) ? "なし" : `${data.time}秒`}\n付与ロール:${interaction.guild.roles.cache.get(data.role)}\n処置の種類:${(data.time == 0) ? "なし" : data.option}`, color: embed_color }] });
  };
  if (interaction.customId === "URLcreate") {
    const uuid = uuidv4();
    tmp[uuid] = { u: interaction.user.id, g: interaction.guild.id };
    const button1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setURL(`${oauth.siteurl}/login/?uid=${uuid}`)
          .setStyle(5)
          .setLabel("認証LINK")
      );
    interaction.reply({
      embeds: [{ title: "情報", description: `認証ボタンを押して認証を完了させてください\n${time}秒後にタイムアウトします`, color: embed_color }],
      components: [button1],
      ephemeral: true
    });
    setTimeout(_ => {
      try { delete tmp[uuid] } catch (_) { };
    }, time * 1000);
  };
});
client.login(token);