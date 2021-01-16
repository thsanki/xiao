const Command = require('../../structures/Command');
const minesweeper = require('minesweeper');
const { stripIndents } = require('common-tags');
const nums = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

module.exports = class MinesweeperCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'minesweeper',
			aliases: ['bombsweeper', 'mines', 'bombs', 'msweeper', 'minesweep', 'msweep'],
			group: 'games-sp',
			memberName: 'minesweeper',
			description: 'Play a game of Minesweeper.',
			args: [
				{
					key: 'size',
					prompt: 'What size board do you want to use?',
					type: 'integer',
					default: 9,
					max: 9,
					min: 3
				}
			]
		});
	}

	async run(msg, { size }) {
		const current = this.client.games.get(msg.channel.id);
		if (current) return msg.reply(`Please wait until the current game of \`${current.name}\` is finished.`);
		try {
			const arr = minesweeper.generateMineArray({
				rows: size,
				cols: size,
				mines: size + 1
			});
			const game = new minesweeper.Board(arr);
			this.client.games.set(msg.channel.id, { name: this.name, data: game });
			while (this.checkStatus(game) === null) {
				const grid = game.grid();
				await msg.say(stripIndents`
					${msg.author}, what coordinates do you pick (ex. 4,5)? Type \`end\` to forefeit.

					${this.displayBoard(grid)}
				`);
				const filter = res => {
					if (res.author.id !== msg.author.id) return false;
					const pick = res.content;
					if (pick.toLowerCase() === 'end') return true;
					const coordPicked = pick.match(/(\d), ?(\d)/i);
					if (!coordPicked) return false;
					const x = Number.parseInt(coordPicked[1], 10);
					const y = Number.parseInt(coordPicked[2], 10);
					if (this.checkCellShow(grid[x - 1][y - 1])) return false;
					return true;
				};
				const turn = await msg.channel.awaitMessages(filter, {
					max: 1,
					time: 30000
				});
				if (!turn.size) {
					await msg.say('Sorry, time is up!');
					break;
				}
				const choice = turn.first().content;
				if (choice.toLowerCase() === 'end') break;
				const coordPicked = choice.match(/(\d), ?(\d)/i);
				const x = Number.parseInt(coordPicked[1], 10);
				const y = Number.parseInt(coordPicked[2], 10);
				game.openCell(x - 1, y - 1);
			}
			this.client.games.delete(msg.channel.id);
			if (this.checkStatus(game) === null) return msg.say('Game ended due to inactivity.');
			return msg.say(stripIndents`
				${this.checkStatus(game) ? 'Nice job! You win!' : 'Sorry... You lose.'}

				${this.displayBoard(game.grid(), true)}
			`);
		} catch (err) {
			this.client.games.delete(msg.channel.id);
			throw err;
		}
	}

	displayBoard(board, forceShowAll = false) {
		let str = '';
		str += '⬛';
		str += nums.slice(0, board.length).join('');
		str += '\n';
		for (let i = 0; i < board.length; i++) {
			str += nums[i];
			board[i].forEach(cell => {
				if (forceShowAll || this.checkCellShow(cell)) {
					if (cell.isMine) {
						str += '💣';
					} else if (cell.numAdjacentMines === 0) {
						str += '⬜';
					} else {
						str += nums[cell.numAdjacentMines - 1];
					}
				} else {
					str += '❓';
				}
			});
			str += '\n';
		}
		return str;
	}

	checkStatus(game) {
		if (game.status() === minesweeper.BoardStateEnum.WON) return true;
		if (game.status() === minesweeper.BoardStateEnum.LOST) return false;
		return null;
	}

	checkCellShow(cell) {
		if (cell.state === minesweeper.CellStateEnum.OPEN) return true;
		return false;
	}
};
