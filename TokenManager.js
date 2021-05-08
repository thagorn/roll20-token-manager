var TokenManager = TokenManager || (function() {
  'use strict';

  var NAME = 'TokenManager',
    bar_val = 'bar1_value',
    bar_max = 'bar1_max',
    dodgeStatus = "status_bolt-shield",
    trackedTokens = new Set(),
    

  notify = function(who, message) {
    sendChat(NAME,`/w "${who}" ${message}`);
  },

  toggleTokenDodgeStatus = function(token) {
    var curStatus = token.get(dodgeStatus);
    token.set(dodgeStatus, !Boolean(curStatus));
  },

  updateTokenHPStatus = function(token) {
    if (!trackedTokens.has(token.id)) {
      return;
    }
    var dead = false,
      q1 = false,
      q2 = false,
      q3 = false,
      q4 = false;
    var curHp = parseInt(token.get(bar_val));
    var maxHp = parseInt(token.get(bar_max));
    var percent = Math.round((curHp / maxHp) * 100);
    if (curHp <= 0) {
      dead = true;
    } else if(percent <= 25) {
      q1 = true;
    } else if (percent <= 50) {
      q2 = true;
    } else if (percent <= 75) {
      q3 = true;
    } else {
      q4 = true;
    }
    token.set("status_dead", dead);
    token.set("status_red", q1);
    token.set("status_brown", q2);
    token.set("status_yellow", q3);
    token.set("status_green", q4);
  },

  initializeTokenHealth = function(token, who) {
    if (token &&
      'graphic' === token.get('type') &&
      'token' === token.get('subtype') &&
      '' !== token.get('represents')) {
      let characterId = token.get('represents');
      let hitDieAttribute = findObjs({ type: 'attribute', characterid: characterId, name: 'npc_hpformula' })[0].get('current');
      sendChat('', '/r '+hitDieAttribute, function(responses) {
        var hp = 0;
        responses.forEach(function(response) {
          var val = JSON.parse(response.content);
          if (val.total) {
            hp += val.total;
          }
        });
        let values = {};
        values[bar_val] = hp || 1;
        values[bar_max] = hp || 1;
        token.set(values);
        trackedTokens.add(token.id);
        updateTokenHPStatus(token);
      });
    } else {
      notify(who, `Failed to initialize: ${token.get('type')}|${token.get('subtype')}|${token.get('represents')}`); 
    }
  },

  handleTokenDeletion = function(token) {
    if (trackedTokens.has(token.id)) {
      trackedTokens.delete(token.id);
    }
  },

  parseChat = function(msg) {
    if (msg.type === "api" && playerIsGM(msg.playerid) && /^!tokenmanager/i.test(msg.content)) {
      if (msg.content.indexOf("initialize") > -1) {
        let who = (getObj('player',msg.playerid)||{get:()=>'API'}).get('_displayname');
        let count = 0;
        (msg.selected || [])
          .map(o => getObj('graphic', o._id))
          .filter(Boolean)
          .forEach(token => {
            ++count;
            initializeTokenHealth(token, who);
          });
        notify(who, `Initilizing ${count} token(s).`);
      } else if (msg.content.indexOf("toggledodge") > -1) {
        (msg.selected || [])
          .map(o => getObj('graphic', o._id))
          .filter(Boolean)
          .forEach(token => {
            toggleTokenDodgeStatus(token);
          });
      }
    }
  },

  registerEventHandlers = function() {
    on('chat:message', parseChat);
    on(`change:token:${bar_val}`, updateTokenHPStatus);
    on(`change:token:${bar_max}`, updateTokenHPStatus);
    on('destroy:token', handleTokenDeletion);
  };

  return {
    RegisterEventHandlers: registerEventHandlers
  };
}());

on('ready', function() {
  'use strict';
  TokenManager.RegisterEventHandlers();
});
