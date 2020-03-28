import { User } from "discord.js";
import { Card, Color } from "./Game";

export default class Player {
  public color: Color = Color.BLUE;
  public user: User;
  public cards: Card[] = [];

  constructor(user: User) {
    this.user = user;
  }
}
