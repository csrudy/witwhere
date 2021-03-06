const { UserModel } = require('./UserModel');
const prompts = require('./prompts/prompts.js');

class GameSession {
  constructor(config) {
    this.gid = config.gid;
    this.users = {};
    this.player1response = {};
    this.player2response = {};
    this.player1username = '';
    this.player2username = '';
    this.prompt = '';
    this.overallGameState = 0; // 0 for waiting, 1 for active, 2 for end
    this.maxPlayers = config.maxPlayers;
    this.maxPoints = config.maxPoints;
    this.roundState = undefined; // undefined when not active, 1 for waiting for p1 and p2 responses, 2 for voting
    this.prompts = [...prompts];
  }

  sendMessageToPlayers(socket, message) {
    Object.values(this.users).forEach(user => {
      socket.to(user.socket).emit(JSON.stringify(message));
    });
  }

  sendStateToPlayers(socket) {
    sendMessageToPlayers(socket, this.getGameState());
  }

  addUser(username, socket) {
    this.users[username] = new UserModel(username, socket);
  }

  canStartGame() {
    // this will fail
    if (Object.keys(this.users).length >= this.maxPlayers) {
      this.overallGameState = 1;
      this.roundState = 1;
      return true;
    }
    return false;
  }

  getPrompt() {
    this.roundState = 2;
    // writing a test helped me figure out [0] needed to be added in order
    // for the typeof to be string, not object. typescript would have caught this.
    this.prompt = this.prompts.splice(
      Math.random() * this.prompts.length,
      1
    )[0];
    return this.prompt;
  }

  addResponse(playerNumber, response) {
    if (playerNumber === 1) {
      this.player1response.response = response;
    } else {
      this.player2response.response = response;
    }
  }

  didBothPlayersSubmitResponses() {
    if (this.player1response.response && this.player2response.response) {
      this.roundState = 3;
      return true;
    }
    return false;
  }

  submitVote(player) {
    if (player === 1) {
      this.player1response.votes += 1;
    } else {
      this.player2response.votes += 1;
    }
  }

  didAllObserversVote() {
    if (
      this.player1response.votes + this.player2response.votes ===
      this.users.length
    ) {
      return true;
    }
    return false;
  }

  determineRoundWinner() {
    this.roundState = 2;
    if (this.player1response.votes > this.player2response.votes) {
      this.users[this.player1username].score += 1;
    } else {
      this.users[this.player2username].score += 1;
    }
    return {
      player1response: this.player1response,
      player2response: this.player2response
    };
  }
  didSomeoneWin() {
    for (const [k, v] in Object.entries(this.users)) {
      if (v.votes >= this.maxPoints) {
        return k;
      }
    }
    return false;
  }

  getGameState() {
    return {
      gid: this.gid,
      users: this.users,
      player1response: this.player1response,
      player2response: this.player2response,
      player1username: this.player1username,
      player2username: this.player2username,
      prompt: this.prompt,
      overallGameState: this.overallGameState,
      maxPlayers: this.maxPlayers,
      maxPoints: this.maxPoints,
      roundState: this.roundState
    };
  }
}

module.exports = { GameSession };
