"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Modlog viewer
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * Actually reading, writing, and searching modlog is handled in modlog.ts.
 *
 * @license MIT
 */

var _dashycode = require('../../.lib-dist/dashycode'); var Dashycode = _dashycode;

var _utils = require('../../.lib-dist/utils');


const MAX_QUERY_LENGTH = 2500;
const DEFAULT_RESULTS_LENGTH = 100;
const MORE_BUTTON_INCREMENTS = [200, 400, 800, 1600, 3200];
const LINES_SEPARATOR = 'lines=';
const MAX_RESULTS_LENGTH = MORE_BUTTON_INCREMENTS[MORE_BUTTON_INCREMENTS.length - 1];
const IPS_REGEX = /[([]?([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})[)\]]?/g;

const ALIASES = {
	'helpticket': 'help-rooms',
	'groupchat': 'groupchat-rooms',
	'battle': 'battle-rooms',
};

/*********************************************************
 * Modlog Functions
 *********************************************************/

function getMoreButton(
	roomid, searchCmd,
	lines, maxLines, onlyPunishments
) {
	let newLines = 0;
	for (const increase of MORE_BUTTON_INCREMENTS) {
		if (increase > lines) {
			newLines = increase;
			break;
		}
	}
	if (!newLines || lines < maxLines) {
		return ''; // don't show a button if no more pre-set increments are valid or if the amount of results is already below the max
	} else {
		return _utils.Utils.html`<br /><div style="text-align:center"><button class="button" name="send" value="/${onlyPunishments ? 'punish' : 'mod'}log room=${roomid}, ${searchCmd}, ${LINES_SEPARATOR}${newLines}" title="View more results">Older results<br />&#x25bc;</button></div>`;
	}
}

function getRoomID(id) {
	if (id in ALIASES) return ALIASES[id] ;
	return id ;
}

function prettifyResults(
	resultArray, roomid, search, searchCmd,
	addModlogLinks, hideIps, maxLines, onlyPunishments
) {
	if (resultArray === null) {
		return "|popup|The modlog query crashed.";
	}
	let roomName;
	switch (roomid) {
	case 'all':
		roomName = "all rooms";
		break;
	case 'public':
		roomName = "all public rooms";
		break;
	default:
		roomName = `room ${roomid}`;
	}
	const scope = onlyPunishments ? 'punishment-related ' : '';
	let searchString = ``;
	if (search.anyField) searchString += `containing ${search.anyField} `;
	if (search.note) searchString += `with a note including any of: ${search.note.searches.join(', ')} `;
	if (search.user) searchString += `taken against ${search.user.search} `;
	if (search.ip) searchString += `taken against a user on the IP ${search.ip} `;
	if (search.action) searchString += `of the type ${search.action} `;
	if (search.actionTaker) searchString += `taken by ${search.actionTaker} `;
	if (!resultArray.length) {
		return `|popup|No ${scope}moderator actions ${searchString}found on ${roomName}.`;
	}
	const title = `[${roomid}] ${searchCmd}`;
	const lines = resultArray.length;
	let curDate = '';
	const resultString = resultArray.map(result => {
		if (!result) return '';
		const date = new Date(result.time || Date.now());
		const entryRoom = result.visualRoomID || result.roomID || 'global';
		let [dateString, timestamp] = Chat.toTimestamp(date, {human: true}).split(' ');
		let line = `<small>[${timestamp}] (${entryRoom})</small> ${result.action}`;
		if (result.userid) {
			line += `: [${result.userid}]`;
			if (result.autoconfirmedID) line += ` ac: [${result.autoconfirmedID}]`;
			if (result.alts.length) line += ` alts: [${result.alts.join('], [')}]`;
			if (!hideIps && result.ip) line += ` [${result.ip}]`;
		}

		if (result.loggedBy) line += `: by ${result.loggedBy}`;
		if (result.note) line += `: ${result.note}`;

		if (dateString !== curDate) {
			curDate = dateString;
			dateString = `</p><p>[${dateString}]<br />`;
		} else {
			dateString = ``;
		}
		const thisRoomID = _optionalChain([entryRoom, 'optionalAccess', _ => _.split, 'call', _2 => _2(' '), 'access', _3 => _3[0]]);
		if (addModlogLinks) {
			const url = Config.modloglink(date, thisRoomID);
			if (url) timestamp = `<a href="${url}">${timestamp}</a>`;
		}
		line = _utils.Utils.escapeHTML(line.slice(line.indexOf(')') + ` </small>`.length));
		line = line.replace(
			IPS_REGEX,
			hideIps ? '' : `[<a href="https://whatismyipaddress.com/ip/$1" target="_blank">$1</a>]`
		);
		return `${dateString}<small>[${timestamp}] (${thisRoomID})</small>${line}`;
	}).join(`<br />`);
	const [dateString, timestamp] = Chat.toTimestamp(new Date(), {human: true}).split(' ');
	let preamble;
	const modlogid = roomid + (searchString ? '-' + Dashycode.encode(searchString) : '');
	if (searchString) {
		preamble = `>view-modlog-${modlogid}\n|init|html\n|title|[Modlog]${title}\n` +
			`|pagehtml|<div class="pad"><p>The last ${scope}${Chat.count(lines, "logged actions")} ${_utils.Utils.escapeHTML(searchString)} on ${roomName}.`;
	} else {
		preamble = `>view-modlog-${modlogid}\n|init|html\n|title|[Modlog]${title}\n` +
			`|pagehtml|<div class="pad"><p>The last ${Chat.count(lines, `${scope}lines`)} of the Moderator Log of ${roomName}.`;
	}
	preamble += `</p><p>[${dateString}]<br /><small>[${timestamp}] \u2190 current server time</small>`;
	const moreButton = getMoreButton(roomid, searchCmd, lines, maxLines, onlyPunishments);
	return `${preamble}${resultString}${moreButton}</div>`;
}

async function getModlog(
	connection, roomid = 'global', search = {},
	searchCmd, maxLines = 20, onlyPunishments = false, timed = false
) {
	const targetRoom = Rooms.search(roomid);
	const user = connection.user;
	roomid = getRoomID(roomid);

	// permission checking
	if (roomid === 'all' || roomid === 'public') {
		if (!user.can('modlog')) {
			return connection.popup("Access denied");
		}
	} else {
		if (!user.can('modlog', null, targetRoom) && !user.can('modlog')) {
			return connection.popup("Access denied");
		}
	}

	const hideIps = !user.can('lock');
	const addModlogLinks = !!(
		Config.modloglink && (user.tempGroup !== ' ' || (targetRoom && targetRoom.settings.isPrivate !== true))
	);
	if (hideIps && search.ip) {
		connection.popup(`You cannot search for IPs.`);
		return;
	}
	if (Object.values(search).join('').length > MAX_QUERY_LENGTH) {
		connection.popup(`Your search query is too long.`);
		return;
	}

	if (_optionalChain([search, 'access', _4 => _4.note, 'optionalAccess', _5 => _5.searches])) {
		for (const [i, noteSearch] of search.note.searches.entries()) {
			if (/^["'].+["']$/.test(noteSearch)) {
				search.note.searches[i] = noteSearch.substring(1, noteSearch.length - 1);
				search.note.isExact = true;
			}
		}
	}

	if (search.user) {
		if (/^["'].+["']$/.test(search.user.search)) {
			search.user.search = search.user.search.substring(1, search.user.search.length - 1);
			search.user.isExact = true;
		}
		search.user.search = toID(search.user.search);
	}

	const response = await Rooms.Modlog.search(roomid, search, maxLines, onlyPunishments);

	connection.send(
		prettifyResults(
			response.results,
			roomid,
			search,
			searchCmd,
			addModlogLinks,
			hideIps,
			maxLines,
			onlyPunishments
		)
	);
	if (timed) connection.popup(`The modlog query took ${response.duration} ms to complete.`);
}

const shouldSearchGlobal = ['staff', 'adminlog'];

 const commands = {
	ml: 'modlog',
	punishlog: 'modlog',
	pl: 'modlog',
	timedmodlog: 'modlog',
	modlog(target, room, user, connection, cmd) {
		let roomid = (!room || shouldSearchGlobal.includes(room.roomid) ? 'global' : room.roomid);
		let lines;
		const search = {};
		const targets = target.split(',');
		for (const [i, option] of targets.entries()) {
			let [param, value] = option.split('=').map(part => part.trim());
			if (!value) {
				// If no specific parameter is specified, we should search all fields
				value = param.trim();
				if (i === 0 && targets.length > 1) {
					// they might mean a roomid, as per the old format of /modlog
					param = 'room';
				} else {
					param = 'any';
				}
			}
			param = toID(param);
			switch (param) {
			case 'any':
				search.anyField = value;
				break;
			case 'note': case 'text':
				if (!_optionalChain([search, 'access', _6 => _6.note, 'optionalAccess', _7 => _7.searches])) search.note = {searches: []};
				search.note.searches.push(value);
				break;
			case 'user': case 'name': case 'username': case 'userid':
				search.user = {search: value};
				break;
			case 'ip': case 'ipaddress': case 'ipaddr':
				search.ip = value;
				break;
			case 'action': case 'punishment':
				search.action = value.toUpperCase();
				break;
			case 'actiontaker': case 'moderator': case 'staff': case 'mod':
				search.actionTaker = toID(value);
				break;
			case 'room': case 'roomid':
				roomid = value.toLowerCase().replace(/[^a-z0-9-]+/g, '') ;
				break;
			case 'lines': case 'maxlines':
				lines = parseInt(value);
				if (isNaN(lines) || lines < 1) return this.errorReply(`Invalid linecount: '${value}'.`);
				break;
			default:
				this.errorReply(`Invalid modlog parameter: '${param}'.`);
				return this.errorReply(`Please specify 'room', 'note', 'user', 'ip', 'action', 'staff', 'any', or 'lines'.`);
			}
		}

		const targetRoom = Rooms.search(roomid);
		// if a room alias was used, replace alias with actual id
		if (targetRoom) roomid = targetRoom.roomid;

		if (roomid.includes('-')) {
			if (user.can('modlog')) {
				// default to global modlog for staff convenience
				roomid = 'global';
			} else {
				return this.errorReply(`Only global staff may view battle and groupchat modlogs.`);
			}
		}

		if (!target && !lines) {
			lines = 20;
		}
		if (!lines) lines = DEFAULT_RESULTS_LENGTH;
		if (lines > MAX_RESULTS_LENGTH) lines = MAX_RESULTS_LENGTH;

		void getModlog(
			connection,
			roomid,
			search,
			target.replace(/^\s?([^,=]*),\s?/, '').replace(/,?\s*(room|lines)\s*=[^,]*,?/g, ''),
			lines,
			(cmd === 'punishlog' || cmd === 'pl'),
			cmd === 'timedmodlog'
		);
	},
	modloghelp() {
		this.sendReplyBox(
			`<code>/modlog [comma-separated list of parameters]</code>: searches the moderator log, defaulting to the current room unless specified otherwise.<br />` +
			`If an unnamed parameter is specified, <code>/modlog</code> will search all fields at once.<br />` +
			`<details><summary>Parameters:</summary>` +
			`<ul>` +
			`<li><code>room=[room]</code> - searches a room's modlog</li>` +
			`<li><code>any=[text]</code> - searches for modlog entries containing the specified text in any field</li>` +
			`<li><code>userid=[user]</code> - searches for a username (or fragment of one)</li>` +
			`<li><code>note=[text]</code> - searches the contents of notes/reasons</li>` +
			`<li><code>ip=[IP address]</code> - searches for an IP address (or fragment of one)</li>` +
			`<li><code>staff=[user]</code> - searches for actions taken by a particular staff member</li>` +
			`<li><code>action=[type]</code> - searches for a particular type of action</li>` +
			`<li><code>lines=[number]</code> - displays the given number of lines</li>` +
			`</ul>` +
			`</details>`
		);
	},
}; exports.commands = commands;
