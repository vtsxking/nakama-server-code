var InitModule = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer) {
    initializer.registerRpc('healthcheck', rpcHealthCheck);
    initializer.registerRpc('createtestwarsmatch', rpcCreatetestwarsMatch);
    //initializer.registerMatchmakerMatched(makeMatch);
    //auto create lobby match?
    //var matchId = nk.matchCreate(lobbyModule);
    initializer.registerMatch(testwarsMatchModule, {
        matchInit: matchInittestwarsMatch,
        matchJoinAttempt: matchJoinAttempttestwarsMatch,
        matchJoin: matchJointestwarsMatch,
        matchLeave: matchLeavetestwarsMatch,
        matchLoop: matchLooptestwarsMatch,
        matchSignal: matchSignaltestwarsMatch,
        matchTerminate: matchTerminatetestwarsMatch
    });
};
function rpcHealthCheck(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) {
    logger.info("Worlds RPC health check called");
}
function rpcCreatetestwarsMatch(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string) {
    var payloadParts = payload.split(",");
    var matchName = payloadParts[0];
    var mapName = "default";
    if (payloadParts.length > 1) {
        //map name is given
        mapName = payloadParts[1];
    }
    var matchId = nk.matchCreate(testwarsMatchModule, { match_name: matchName, map_name: mapName });
    logger.info("test wars match created manually");
    return JSON.stringify({ success: true, matchid: matchId });
}

var testwarsMatchModule = "testwarsMatch";
var testwarsMatchTickRate = 5;
var testwarsMatchCountdownTimer = 10;
var testwarsMatchMaxScore = 10;
const matchInittestwarsMatch = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, params: {[key: string]: string}): {state: nkruntime.MatchState, tickRate: number, label: string} {
    logger.debug('Death Match created %v', ctx.matchId);
    // const presences: {[userId: string]: nkruntime.Presence}
    var presences:nkruntime.Presence[] = [];
    return {
        state: { presences: presences, player_info: {}, player_bases: {}, player_outposts: {}, player_allainces: {}, player_armies: {}, emptyTicks: 0, match_name: params.match_name, map_name: params.map_name, someone_joined: false, started: false, start_countdown: testwarsMatchCountdownTimer + 1, current_tick: 0, ending: false, },
        tickRate: testwarsMatchTickRate,
        label: JSON.stringify({ mode: 'testwarsmatch', match_name: params.match_name, map_name: params.map_name, started: false })
    };
};
const matchJoinAttempttestwarsMatch = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, presence: nkruntime.Presence, metadata: {[key: string]: any}): {state: nkruntime.MatchState, accept: boolean, rejectMessage?: string | undefined } | null {
    logger.debug('%q attempted to join testwars match', ctx.userId);
        return {
            state: state,
            accept: true
        };
};
const matchJointestwarsMatch = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, presences: nkruntime.Presence[]): { state: nkruntime.MatchState} | null {
    presences.forEach(function (presence) {
        //state.player_presences[presence.userId] = presence;
        if (state.player_bases[presence.userId] != null || state.player_bases[presence.userId] != undefined){
            logger.info('%v was already in test match', presence.userId);
        }
        else {
            logger.info('%v joined test match', presence.userId);
            state.player_bases[presence.userId] = null;
        }
        state.someone_joined = true;
        logger.info('%v joined test match', presence.userId);
    });
    return {
        state: state
    };
};
const matchLeavetestwarsMatch = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, presences: nkruntime.Presence[]): { state: nkruntime.MatchState} | null {
    logger.debug('left Lobby presences');
    logger.debug('%v left Lobby presences', presences);
    presences.forEach(function (presence) {
        logger.debug('%v left Lobby match', presence.userId);
    });
    return {
        state: state
    };
};
const matchLooptestwarsMatch = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, messages: nkruntime.MatchMessage[]): { state: nkruntime.MatchState} | null {
    logger.info('tick: %v', tick);
    messages.forEach(function (message) {
        //logger.info('Received data');
        //logger.info(nk.base16Decode(nk.binaryToString(message.data)));
        //logger.info('Received data [%v]', nk.base64Decode(nk.binaryToString(message.data)));

        //logger.info('Received data #########################################');
        logger.info('message received: %v', message);
        if (message.opCode == 2) {
            state.player_bases[message.sender.userId] = JSON.parse(nk.binaryToString(message.data));
            state.player_info[message.sender.userId] = {displayName: "Test", alliance: "Reee-ers", gold: 0, steel: 0, power: 0, gpt: 1, spt: 1, ppt: 1}
        }
        let data = JSON.parse(nk.binaryToString(message.data));
        logger.info('data: %v', JSON.stringify({userid:message.sender.userId, data:data}));
        
        //state.player_data[message.sender.userId] = data;
        //state.player_data['tick'] = tick;
        //let send_data = JSON.stringify(state.player_data);
        
        //dispatcher.broadcastMessage(10, send_data, null, null, true);
        //logger.info('Received data [%v]', JSON.parse(nk.binaryToString(message.data)));      
        //var message_json = JSON.parse(nk.binaryToString(message.data));
        //logger.debug('messagedata', message_json);
    });
    /*#######################################################################################################################################################*/
    logger.debug('%v', state.player_bases);
    for (let playerIndex in state.player_bases) {
        logger.debug('%v', state.player_bases[playerIndex]);
        if (state.player_bases[playerIndex] == null){
            logger.debug('sending data for %v', playerIndex);
            let send_data = JSON.stringify(state.player_bases);
            dispatcher.broadcastMessage(1, send_data, null, null, true);
        }
        else {
            let gold = state.player_info[playerIndex].gold;
            let steel = state.player_info[playerIndex].steel;
            let power = state.player_info[playerIndex].power;
            state.player_info[playerIndex] = {displayName: "Test", alliance: "Reee-ers", gold: gold+state.player_info[playerIndex].gpt, steel: steel+state.player_info[playerIndex].spt, power: power+state.player_info[playerIndex].ppt, gpt: 1, spt: 1, ppt: 1}
            let send_data = JSON.stringify({playerBase:state.player_bases[playerIndex], playerInfo: state.player_info[playerIndex]});    
            dispatcher.broadcastMessage(2, send_data, null, null, true);
        }
    }
    /*#######################################################################################################################################################*/

    if (state.presences.length === 0) {
        state.emptyTicks++;
    }
    
    // If the match has been empty for more than 100 ticks, end the match by returning null
    if (state.emptyTicks > 10000) {
        return null;
    }
    return {
        state: state
    };
};
const matchTerminatetestwarsMatch = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, graceSeconds: Number): { state: nkruntime.MatchState} | null {
    logger.debug('Death match terminated');
    //delete presences array
    state.presences = [];
    //var message = "Server shutting down in ".concat(graceSeconds, " seconds.");
    //dispatcher.broadcastMessage(2, message, null, null);
    return {
        state: state
    };
};
const matchSignaltestwarsMatch = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, data: string): { state: nkruntime.MatchState, data?: string } | null {
    logger.debug('Death match signal received: ' + data);
    return {
        state: state,
        data: "Death match signal received: " + data
    };
};