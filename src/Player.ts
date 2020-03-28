import { User } from "discord.js";
import { Card, Color } from "./Game";

export type PlayerStats = {
  discovered: Card[];
  cut: Card[];
};

export default class Player {
  public color: Color = Color.BLUE;
  public user: User;
  public cards: Card[] = [];
  public stats: PlayerStats = {
    discovered: [],
    cut: []
  };

  constructor(user: User) {
    this.user = user;
  }
}
