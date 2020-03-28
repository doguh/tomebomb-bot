import { Client, TextChannel, DMChannel, NewsChannel } from "discord.js";
import Game from "./Game";
import config from "./config";

const client = new Client();

const games = {};

function getGame(channel: TextChannel | DMChannel | NewsChannel) {
  if (!games[channel.id]) {
    games[channel.id] = new Game(channel);
  }
  return games[channel.id];
}

client.on("ready", () => {
  console.log(`Bot connected as ${client.user.tag}!`);
});

client.on("message", msg => {
  const game = getGame(msg.channel);
  game.handleMessage(msg);
});

client.login(config.token);
