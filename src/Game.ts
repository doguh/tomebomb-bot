import { User, Message, TextChannel, DMChannel, NewsChannel } from "discord.js";
import Player from "./Player";

export enum Card {
  NOTHING,
  WIRE,
  BOMB
}

export enum Color {
  RED,
  BLUE
}

function generateCards(numPlayers: number): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < numPlayers * 5; i++) {
    cards.push(
      i === 0 ? Card.BOMB : i < numPlayers + 1 ? Card.WIRE : Card.NOTHING
    );
  }
  return cards;
}

function getAndRemoveRandomCard(cards: Card[]): Card {
  const index = Math.floor(Math.random() * cards.length);
  const removed = cards.splice(index, 1);
  return removed[0];
}

function cardToString(card: Card): string {
  switch (card) {
    case Card.NOTHING:
      return "⚪";
    case Card.WIRE:
      return "🟢";
    case Card.BOMB:
      return "💥";
    default:
      return `unknown:${card}`;
  }
}

export default class Game {
  private channel: TextChannel | DMChannel | NewsChannel;
  private players: Player[] = [];
  private turn = 0;
  private started = false;
  private currentPlayer: Player;
  private cardsCutThisTurn = 0;
  private cardsFound = 0;

  constructor(channel: TextChannel | DMChannel | NewsChannel) {
    this.channel = channel;
  }

  infos = () => {
    this.channel.send(`!join : rejoindre la partie
!start : démarre la partie
!reset : annule la partie en cours
!cut <@user> <numero> : coupe la carte <numero> du joueur @user
!list : affiche la liste des joueurs`);
  };

  reset = () => {
    this.channel.send("Game reset");
    this.started = false;
    this.turn = 0;
    this.cardsFound = 0;
    this.players = [];
    this.currentPlayer = undefined;
  };

  join = (author: User) => {
    for (let i = 0; i < this.players.length; i++) {
      if (author.id === this.players[i].user.id) {
        return this.channel.send("T'es déjà dans la game mon gars");
      }
    }
    this.players.push(new Player(author));
    this.channel.send(`${author.username} a rejoint la partie 🎉`);
  };

  start = () => {
    if (this.players.length < 5) {
      return this.channel.send("Faut au moins 5 personnes pour jouer :(");
    }
    this.started = true;
    this.beginNewTurn();
  };

  list = () => {
    this.channel.send(
      `Nombre de fils trouvés : ${this.cardsFound}\n` +
        `Fils restants à couper ce tour : ${this.players.length -
          this.cardsCutThisTurn}` +
        this.players
          .map(
            player =>
              `- ${player.user.username} : ${player.cards.length} cartes`
          )
          .join("\n")
    );
  };

  setTeams = () => {
    const numRed =
      this.players.length <= 6
        ? 2
        : this.players.length == 7
        ? 2 + (Math.random() > 0.5 ? 1 : 0)
        : 3;

    const playersCopy = this.players.slice();
    for (let i = 0; i < numRed; i++) {
      const [p] = playersCopy.splice(
        Math.floor(Math.random() * playersCopy.length),
        1
      );
      p.color = Color.RED;
    }
  };

  getRemainingCards = (): Card[] => {
    const cards: Card[] = [];
    this.players.forEach(player => cards.push(...player.cards));
    return cards;
  };

  beginNewTurn = () => {
    this.turn++;
    this.cardsCutThisTurn = 0;
    this.channel.send(`Début du tour ${this.turn}. Tic ⌚ tac 💣`);

    if (this.turn >= 2) {
      this.channel.send(`So far on a trouvé ${this.cardsFound} cables 👌`);
    }

    if (this.turn === 1) {
      this.setTeams();
      this.players.forEach(player =>
        player.user.send(
          `T'es dans la team ${
            player.color === Color.BLUE ? "Bleue" : "Rouge"
          } !`
        )
      );
    }

    if (!this.currentPlayer) {
      this.currentPlayer = this.players[
        Math.floor(Math.random() * this.players.length)
      ];
      this.channel.send(
        `${this.currentPlayer.user.username} a les ciseaux ! ✂`
      );
    }

    // get cards list
    const cards =
      this.turn === 1
        ? generateCards(this.players.length)
        : this.getRemainingCards();

    // distribute cards
    this.players.forEach(player => {
      player.cards = [];
      for (let i = 0; i < 6 - this.turn; i++) {
        player.cards.push(getAndRemoveRandomCard(cards));
      }

      player.user.send(
        `${player.user.username} : ${player.cards
          .map(card => cardToString(card))
          .join(", ")}`
      );
    });
  };

  tryCut = (msg: Message) => {
    if (msg.author.id !== this.currentPlayer.user.id) {
      return this.channel.send("C'est pas à toi de couper oooh !!");
    }

    const target = msg.mentions.members.array()[0];
    if (!target) {
      return this.channel.send("Faut dire chez qui tu coupes wesh");
    }

    const matchCardIndex = msg.content.match(/\d$/);

    if (target.id === msg.author.id) {
      return this.channel.send(`Bruh...`);
    }

    let found = false;
    this.players.forEach(player => {
      if (player.user.id === target.id) {
        found = true;
        if (!player.cards.length) {
          return this.channel.send("Tu peux pas il a pas de cartes !");
        }

        this.cut(
          msg.author,
          player,
          matchCardIndex ? parseInt(matchCardIndex[0]) : undefined
        );
      }
    });

    if (!found) {
      return this.channel.send("Mais ce gars joue même pas");
    }
  };

  cut = (user: User, target: Player, cardIndex?: number) => {
    const index = cardIndex
      ? cardIndex - 1
      : Math.floor(Math.random() * target.cards.length);

    if (index < 0 || index >= target.cards.length) {
      return this.channel.send(`Entre 1 et ${target.cards.length} stp...`);
    }

    this.cardsCutThisTurn++;
    const [card] = target.cards.splice(index, 1);
    this.currentPlayer.stats.cut.push(card);
    target.stats.discovered.push(card);

    this.channel.send(
      `@${user.username} coupe un fil chez @${target.user.username}...`
    );

    if (card === Card.WIRE) {
      this.cardsFound++;
    }

    this.currentPlayer = target;

    setTimeout(() => {
      this.channel.send(`La carte coupée était : ${cardToString(card)} !`);

      if (card === Card.BOMB) {
        return this.finish("GG les Rouges 👿");
      } else if (this.cardsFound >= this.players.length) {
        return this.finish("Les Bleus ont gagné GG ! 🙌");
      }

      if (this.cardsCutThisTurn >= this.players.length) {
        setTimeout(() => {
          this.beginNewTurn();
        }, 1000);
      } else {
        this.channel.send(
          `Encore ${this.players.length -
            this.cardsCutThisTurn} cartes à couper ce tour`
        );
      }
    }, 1000);
  };

  finish = message => {
    this.channel.send(`\n${message}\n\n${this.getRecap()}`);
    this.reset();
  };

  getRecap = () => {
    return `Résumé de la partie :\n${this.players
      .map(
        player =>
          `${player.user.username} : Team ${
            player.color === Color.BLUE ? "Bleue" : "Rouge"
          }\n - Cartes coupées : ${player.stats.cut
            .map(cardToString)
            .join(" ")}\n - Cartes découvertes : ${player.stats.discovered
            .map(cardToString)
            .join(" ")}`
      )
      .join("\n")}`;
  };

  handleMessage = (msg: Message) => {
    if (msg.content === "!help") {
      this.infos();
    }

    if (msg.content === "!reset") {
      this.reset();
    }

    if (msg.content === "!join" && !this.started) {
      this.join(msg.author);
    }

    if (msg.content === "!start" && !this.started) {
      this.start();
    }

    if (msg.content === "!list") {
      this.list();
    }

    if (msg.content.match(/^\!cut/) && this.started) {
      this.tryCut(msg);
    }
  };
}
