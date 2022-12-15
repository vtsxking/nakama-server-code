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
        state: { presences: presences, player_info: {}, player_bases: {}, player_outposts: {}, player_allainces: {}, player_armies: {}, player_presences: {}, emptyTicks: 0, match_name: params.match_name, map_name: params.map_name, someone_joined: false, started: false, start_countdown: testwarsMatchCountdownTimer + 1, current_tick: 0, ending: false, },
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
        state.player_presences[presence.userId] = presence;
        if (state.player_info[presence.userId] != null){
            logger.info('%v was already in test match', presence.userId);
        }
        else {
            logger.info('%v joined test match', presence.userId);
            state.player_info[presence.userId] = null;
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
    //logger.info('tick: %v', tick);
    messages.forEach(function (message) {
        switch (message.opCode){
            case 2:
                // opCode to initialize player instance...
                // Given player coords...
                // TODO: vaildate user coords serverside and ask for username...
                let playerCoords = JSON.parse(nk.binaryToString(message.data));
                state.player_info[message.sender.userId] = initPlayer(playerCoords.x, playerCoords.y, "test1", "Reee-ers", 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1);
            break;
            case 3:
                // opCode that signals user asked server to spend resources...
                // run player purchase function to accept or reject purchase...
                let result = playerPurchase(state.player_info[message.sender.userId].playerInfo, "population");
                // if result is not an error code update user json...
                if (result != 0 && result != 1) {
                    state.player_info[message.sender.userId] = result;
                }
                // TODO create error handling for when user does not have proper resources or other issues...
            break;
            default:
            break;
        }
    });
    /*#######################################################################################################################################################*/
    logger.debug('%v', state.player_bases);
    
    // iterate over all players in current match...
    for (let playerIndex in state.player_info) {
        // if player's base has been placed but does exist in the global array of bases we want to append it into said array...
        if (state.player_info[playerIndex] != null && state.player_bases[playerIndex] == null) {
            // temp var to store player data...
            let allBases:GlobalPlayerbase = {
                displayName: state.player_info[playerIndex].playerInfo.displayName,
                playerBase: state.player_info[playerIndex].playerInfo.playerBase
            };
            // append to array at index 'playerIndex'...
            state.player_bases[playerIndex] = allBases;
        } // end-if

        // if player does not have a base placed in world yet send opCode 1 to signal user to place base down...
        if (state.player_info[playerIndex] == null){
            //logger.debug('sending data for %v', playerIndex);
            let send_data = JSON.stringify(state.player_bases);
            dispatcher.broadcastMessage(1, send_data, [state.player_presences[playerIndex]], null, true);
        }
        // otherwise everytick send user data to only that user...
        else {
            state.player_info[playerIndex].playerInfo.gold += state.player_info[playerIndex].playerInfo.gpt;
            state.player_info[playerIndex].playerInfo.steel += state.player_info[playerIndex].playerInfo.spt;
            state.player_info[playerIndex].playerInfo.power += state.player_info[playerIndex].playerInfo.ppt;
            // append global data to data send to user...
            // TODO: only send this data every x amount of ticks as to not bumbard users with redundant data...
            state.player_info[playerIndex].playerInfo.globalData = state.player_bases;
            //logger.debug('%v', state.player_info[playerIndex]);
            let send_data = JSON.stringify(state.player_info[playerIndex]);    
            dispatcher.broadcastMessage(2, send_data, [state.player_presences[playerIndex]], null, true);
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

type PlayerBase = {
    x: number,
    y: number
}

type BuildingInfo = {
    populationBuildingLvl: number,
    steelBuildingLvl: number,
    powerBuildingLvl: number,
    convertBuildingLvl: number,
    militaryBuildingLvl: number,
    weaponsBuildingLvl: number,
    outpostBuildingLvl: number
}

type PlayerInfo = {
    playerBase?: PlayerBase,
    displayName?: string,
    allianceName?: string,
    gold: number,
    steel: number,
    power: number,
    gpt: number,
    spt: number,
    ppt: number,
    buildingInfo: BuildingInfo,
    globalData?: [GlobalPlayerbase]
}

type GlobalPlayerbase = {
    displayName?: string,
    playerBase?: PlayerBase
}

const initPlayer = function(x: number, y: number, displayName: string, allianceName: string, gold: number, steel: number, power: number,gpt: number, spt: number, ppt: number,
    populationBuildingLevel: number, steelBuildingLevel: number, powerBuildingLevel: number, convertBuildingLevel: number, militaryBuildingLevel: number, weaponsBuildingLevel: number, outpostBuildingLevel: number): {playerInfo : PlayerInfo} {
    let playerBase: PlayerBase = {
        x: x,
        y: y
    };
    let buildingInfo: BuildingInfo = {
        populationBuildingLvl: populationBuildingLevel,
        steelBuildingLvl: steelBuildingLevel,
        powerBuildingLvl: powerBuildingLevel,
        convertBuildingLvl: convertBuildingLevel,
        militaryBuildingLvl: militaryBuildingLevel,
        weaponsBuildingLvl: weaponsBuildingLevel,
        outpostBuildingLvl: outpostBuildingLevel
    };
    let playerInfo: PlayerInfo = {
        playerBase: playerBase,
        displayName: displayName,
        allianceName: allianceName,
        gold: gold,
        steel: steel,
        power: power,
        gpt: gpt,
        spt: spt,
        ppt: ppt,
        buildingInfo: buildingInfo
    }
    return {playerInfo};
}

const playerPurchase = function(playerInfo: PlayerInfo, item: string, goldprice: number = 0, steelprice: number = 0, powerprice: number = 0): {playerInfo: PlayerInfo} | number {
    switch(item) {
        case "population":
            if (playerInfo.gold > (300*playerInfo.buildingInfo.populationBuildingLvl)) {
                playerInfo.gold -= (300*playerInfo.buildingInfo.populationBuildingLvl);
                playerInfo.buildingInfo.populationBuildingLvl += 1;
                playerInfo.gpt += 1;
            }
            else {
                return 1;
            }
        break;
        case "steel":
            if (playerInfo.gold > (300*playerInfo.buildingInfo.steelBuildingLvl)) {
                playerInfo.gold -= (300*playerInfo.buildingInfo.steelBuildingLvl);
                playerInfo.buildingInfo.steelBuildingLvl += 1;
                playerInfo.spt += 1;
            }
            else {
                return 1;
            }
        break;
        case "power":
            if (playerInfo.gold > (300*playerInfo.buildingInfo.powerBuildingLvl)) {
                playerInfo.gold -= (300*playerInfo.buildingInfo.powerBuildingLvl);
                playerInfo.buildingInfo.powerBuildingLvl += 1;
                playerInfo.ppt += 1;
            }
            else {
                return 1;
            }
        break;
        case "convert":
            if (playerInfo.gold > (300*playerInfo.buildingInfo.convertBuildingLvl)) {
                playerInfo.gold -= (300*playerInfo.buildingInfo.convertBuildingLvl);
                playerInfo.buildingInfo.convertBuildingLvl += 1;
            }
            else {
                return 1;
            }
        break;
        case "military":
            if (playerInfo.gold > (300*playerInfo.buildingInfo.militaryBuildingLvl)) {
                playerInfo.gold -= (300*playerInfo.buildingInfo.militaryBuildingLvl);
                playerInfo.buildingInfo.militaryBuildingLvl += 1;
            }
            else {
                return 1;
            }
        break;
        case "weapons":
            if (playerInfo.gold > (300*playerInfo.buildingInfo.weaponsBuildingLvl)) {
                playerInfo.gold -= (300*playerInfo.buildingInfo.weaponsBuildingLvl);
                playerInfo.buildingInfo.weaponsBuildingLvl += 1;
            }
            else {
                return 1;
            }
        break;
        case "outpost":
            if (playerInfo.gold > (300*playerInfo.buildingInfo.outpostBuildingLvl)) {
                playerInfo.gold -= (300*playerInfo.buildingInfo.outpostBuildingLvl);
                playerInfo.buildingInfo.outpostBuildingLvl += 1;
            }
            else {
                return 1;
            }
        break;
        default:
            return 0;
    }
    return {playerInfo};
}