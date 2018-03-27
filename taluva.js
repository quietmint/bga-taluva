/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Taluva implementation : © quietmint & Morgalad
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * taluva.js
 *
 * taluva user interface script
 *
 * In this file, you are describing the logic of your user interface, in Javascript language.
 *
 */

define([
        "dojo", "dojo/_base/declare",
        "ebg/core/gamegui",
        "ebg/counter",
        "ebg/stock",
        "ebg/scrollmap"
    ],
    function(dojo, declare) {
        // Terrain constants
        const JUNGLE = 1;
        const GRASS = 2;
        const SAND = 3;
        const ROCK = 4;
        const LAKE = 5;
        const VOLCANO = 6;

        // Building constants
        const HUT = 1;
        const TEMPLE = 2;
        const TOWER = 3;

        // Zoom limits
        const ZOOM_MAX = 3;

        return declare("bgagame.taluva", ebg.core.gamegui, {
            constructor: function() {
                // Scrollable area
                this.scrollmap = new ebg.scrollmap();
                this.hexWidth = 84;
                this.hexHeight = 71;
                this.tryTile = null;
                this.zoom = 1;

                if (!dojo.hasClass("ebd-body", "mode_3d")) {
                    dojo.addClass("ebd-body", "mode_3d");
                    //dojo.addClass("ebd-body", "enableTransitions");
                    $("globalaction_3d").innerHTML = "2D"; // controls the upper right button
                    this.control3dxaxis = 40; // rotation in degrees of x axis (it has a limit of 0 to 80 degrees in the frameword so users cannot turn it upsidedown)
                    this.control3dzaxis = 0; // rotation in degrees of z axis
                    this.control3dxpos = -100; // center of screen in pixels
                    this.control3dypos = -50; // center of screen in pixels
                    this.control3dscale = 0.8; // zoom level, 1 is default 2 is double normal size,
                    this.control3dmode3d = true; // is the 3d enabled
                    //    transform: rotateX(10deg) translate(-100px, -100px) rotateZ(0deg) scale3d(0.7, 0.7, 0.7);
                    $("game_play_area").style.transform = "rotatex(" + this.control3dxaxis + "deg) translate(" + this.control3dypos + "px," + this.control3dxpos + "px) rotateZ(" + this.control3dzaxis + "deg) scale3d(" + this.control3dscale + "," + this.control3dscale + "," + this.control3dscale + ")";
                }
            },

            /*
                setup:

                This method must set up the game user interface according to current game situation specified
                in parameters.

                The method is called each time the game interface is displayed to a player, ie:
                _ when the game starts
                _ when a player refreshes the game page (F5)

                "gamedatas" argument contains all datas retrieved by your "getAllDatas" PHP method.
            */

            setup: function(gamedatas) {
                // Setup 'fade-out' element destruction
                $('overall-content').addEventListener('animationend', function(e) {
                    if (e.animationName == 'fade-out') {
                        dojo.destroy(e.target);
                    }
                }, false);
                this.dragElement3d($("pagesection_gameview"));

                // Setup remaining tile counter
                dojo.place($('count_remain'), 'game_play_area_wrap', 'first');

                // Setup player boards
                colorNames = {
                    'ff0000': 'red',
                    'ffa500': 'yellow',
                    'ffffff': 'white',
                    'b1634f': 'brown',
                    '000000': 'black'
                };
                for (var player_id in gamedatas.players) {
                    var player = gamedatas.players[player_id];
                    player.colorName = colorNames[player.color];
                    dojo.place(this.format_block('jstpl_player_board', player), 'player_board_' + player_id);
                    this.updatePlayerCounters(player);
                    if (player.preview) {
                        // Show a tile preview
                        player.preview.player_id = player_id;
                        player.preview.remain = gamedatas.remain;
                        this.notif_draw({
                            args: player.preview
                        });
                    } else if (player.unknownPreview) {
                        // Show an unknown tile preview
                        this.notif_draw({
                            args: {
                                player_id: player_id
                            }
                        });
                    }
                }
				
				this.addTooltipToClass("templeBoard",  "<div class='pieceicon templeicon'></div>" + 
				                                      _(" <b>TEMPLE:</b><hr>It must be adjacent to your existing Settlement of three hex spaces or larger: <br>" +
														" - There must not already be a Temple in the Settlement.<br>" +
														" - It is allowed to build a Temple which connects multiple settlements, as long as <br>" + 
														"  one of the Settlements does not already have a Temple. <BR>" +
														"  (In this way, it is possible to have multiple Temples in the same Settlement)."), "");
														
				this.addTooltipToClass("towerBoard",  "<div class='pieceicon towericon'></div>" + 
				                                      _(" <b>TOWER:</b><hr>It must be adjacent to your existing Settlement and in at least level 3 high: <br>" +
														" - There must not already be a Tower in the Settlement.<br>" +
														" - It is allowed to build a Tower which connects multiple settlements, as long as <br>" + 
														"  one of the Settlements does not already have a Tower. <BR>" +
														"  (In this way, it is possible to have multiple Tower in the same Settlement)."), "")	;									
				
				this.addTooltipToClass("hutBoard",  "<div class='pieceicon huticon'></div>" + 
				                                      _(" <b>HUT:</b><hr> There are 2 ways to place huts in a hexagon: <br>" +
														" - A single hut in a level 1 space not connected to an existing settlement.<br>" +
														" - Multiple huts on every space of a terrain type adjacent to your <br>"+
														" existing Settlement placing 1 hut per space level (i.e. 3 Huts on a space on level 3 tile) <br>"+
														" <b> You need to have enough Huts as is required to expand to all spaces of that type </b>"+
														" (i.e. you cannot leave one adjacent terrain of the chosen type with 2 huts if it is at level 3."), "")	;									
                // Setup scrollable map
                var mapContainer = $('map_container');
                this.scrollmap.onMouseDown = this.myonMouseDown;
                this.scrollmap.create(mapContainer, $('map_scrollable'), $('map_surface'), $('map_scrollable_oversurface'));
                if (dojo.isFF) {
                    dojo.connect($('pagesection_gameview'), 'DOMMouseScroll', this, 'onMouseWheel');
                } else {
                    dojo.connect($('pagesection_gameview'), 'mousewheel', this, 'onMouseWheel');
                }

                // Setup tiles and buildings
                if (Array.isArray(gamedatas.spaces)) {
                    var prior_tile = {};
                    // Sort by play order to create tiles before buildings
                    gamedatas.spaces.sort(function(a, b) {
                        return a.id - b.id;
                    });
                    for (var s in gamedatas.spaces) {
                        var space = gamedatas.spaces[s];
                        if (space.subface == 0) {
                            // Create a tile for each volcano
                            var coords = this.getCoords(space.x, space.y);
                            var tileEl = this.createTile(space);
                            this.positionTile(tileEl, coords);
                            prior_tile[space.tile_player_id] = space.tile_id;
                        } else if (space.bldg_player_id) {
                            this.placeBuilding(space);
                        }
                    }
                    for (var player_id in prior_tile) {
                        var player = this.gamedatas.players[player_id];
                        dojo.addClass('tile_' + prior_tile[player_id], 'prior-move-' + player.colorName);
                    }
                }

                // Setup game notifications
                this.setupNotifications();
            },

            change3d: function(_dc2, xpos, ypos, _dc3, _dc4, _dc5, _dc6) {
                this.control3dscale = Math.min(ZOOM_MAX, this.control3dscale);
                if (arguments[4] > 0 && this.control3dscale >= ZOOM_MAX) {
                    arguments[4] = 0;
                }
                return this.inherited(arguments);
            },

            ///////////////////////////////////////////////////
            //// Game & client states

            // onEnteringState: this method is called each time we are entering into a new game state.
            //                  You can use this method to perform some user interface changes at this moment.
            //
            onEnteringState: function(stateName, args) {
                console.log('Entering state: ' + stateName, args.args);
                if (this.isCurrentPlayerActive()) {
                    if (stateName == 'tile') {
                        if (args.args.possible.length == 1) {
                            // Auto-choose only option
                            this.onClickPossibleTile(null, 0);
                        } else {
                            this.showPossibleTile();
                        }
                    } else if (stateName == 'selectSpace') {
                        this.showPossibleSpaces();
                    } else if (stateName == 'building') {
                        this.showPossibleBuilding();

                    }
                }
            },

            // onLeavingState: this method is called each time we are leaving a game state.
            //                 You can use this method to perform some user interface changes at this moment.
            //
            onLeavingState: function(stateName) {
                console.log('Leaving state: ' + stateName);
                if (stateName == 'tile' || stateName == 'building') {
                    this.clearPossible();
                }
            },

            // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
            //                        action status bar (ie: the HTML links in the status bar).
            //
            onUpdateActionButtons: function(stateName, args) {
                if (this.isCurrentPlayerActive()) {
                    if (stateName == 'tile' && this.tryTile) {
                        this.addActionButton('button_reset', _('Cancel'), 'onClickCancelTile', null, false, 'gray');
                        this.addActionButton('button_commit', _('Done'), 'onClickCommitTile');

                    } else if (stateName == 'building' && this.tryBuilding) {
                        this.addActionButton('button_reset', _('Cancel'), 'onClickCancelBuilding', null, false, 'gray');
                        this.addActionButton('button_commit', _('Done'), 'onClickCommitBuilding');
                    }
                }
            },

            onMouseWheel: function(evt) {
                dojo.stopEvent(evt);
                var d = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail))) * 0.1;
                this.change3d(0, 0, 0, 0, d, true, false);
            },

            myonMouseDown: function(evt) {
                if (!this.bEnableScrolling) {
                    return;
                }
                if (evt.which == 100) {
                    this.isdragging = true;
                    var _101c = dojo.position(this.scrollable_div);
                    var _101d = dojo.position(this.container_div);
                    this.dragging_offset_x = evt.pageX - (_101c.x - _101d.x);
                    this.dragging_offset_y = evt.pageY - (_101c.y - _101d.y);
                    this.dragging_handler = dojo.connect($("ebd-body"), "onmousemove", this, "onMouseMove");
                    this.dragging_handler_touch = dojo.connect($("ebd-body"), "ontouchmove", this, "onMouseMove");
                }
            },

            dragElement3d: function(elmnt) {
                dojo.connect(elmnt, "onmousedown", this, "drag3dMouseDown");
                dojo.connect(elmnt, "onmouseup", this, "closeDragElement3d");
                elmnt.oncontextmenu = function() {
                    return false;
                }
                this.drag3d = elmnt;
            },

            drag3dMouseDown: function(e) {
                e = e || window.event;
                if (e.which == 3) {
                    dojo.stopEvent(e);
                    $("ebd-body").onmousemove = dojo.hitch(this, this.elementDrag3d);
					dojo.addClass( $("pagesection_gameview") , "grabbinghand");
                }
            },

            elementDrag3d: function(e) {
                e = e || window.event;
                this.change3d(e.movementY / (-10), 0, 0, e.movementX / (-10), 0, true, false);
            },

            closeDragElement3d: function(evt) {
                /* stop moving when mouse button is released:*/
                if (evt.which == 3) {
                    dojo.stopEvent(evt);
                    $("ebd-body").onmousemove = null;
					dojo.removeClass( $("pagesection_gameview") , "grabbinghand");
                }
            },

            ///////////////////////////////////////////////////
            //// Utility methods
            doAction: function(action, args) {
                if (this.checkAction(action)) {
                    console.info('Taking action: ' + action, args);
                    args = args || {};
                    //args.lock = true;
                    this.ajaxcall('/taluva/taluva/' + action + '.html', args, this, function(result) {});
                }
            },

            updatePlayerCounters: function(player) {
                var player_id = player.player_id || player.id;
                $('count_huts_' + player_id).innerText = player.huts;
                $('count_temples_' + player_id).innerText = player.temples;
                $('count_towers_' + player_id).innerText = player.towers;
            },

            createTile: function(tile) {
                var face0 = VOLCANO;
                var face1 = tile.tile_type.charAt(0);
                var face2 = tile.tile_type.charAt(1);
                var tileEl = $('tile_' + tile.tile_id);
                if (tileEl != null) {
                    dojo.destroy(tileEl);
                }
                var levelSuffix = '';
                if (tile.z) {
                    levelSuffix = ', ' + this.format_string_recursive(_('level ${z}'), {
                        z: tile.z
                    });
                }
                tileEl = dojo.place(this.format_block('jstpl_tile', {
                    id: tile.tile_id,
                    z: tile.z || '',
                    rotate: tile.r || 0,
                    face0: face0,
                    face1: face1,
                    face2: face2,
                    title0: _(this.gamedatas.terrain[face0]) + levelSuffix,
                    title1: _(this.gamedatas.terrain[face1]) + levelSuffix,
                    title2: _(this.gamedatas.terrain[face2]) + levelSuffix,
                }), 'map_scrollable');
                return tileEl;
            },

            placeBuilding: function(building) {
                var hexId = 'hex_' + building.tile_id + '_' + building.subface;
                var container = $('bldg_' + hexId) || dojo.place('<div id="bldg_' + hexId + '" class="bldg-container"></div>', $(hexId));
                if (building.bldg_player_id) {
                    building.colorName = this.gamedatas.players[building.bldg_player_id].colorName;
                    dojo.addClass(hexId, 'has-bldg');
                } else {
                    building.colorName = 'tempbuilding';
                }
                var buildingHtml = this.format_block('jstpl_building_' + building.bldg_type, building);
                var buildingCount = building.bldg_type == HUT ? +building.z : 1;
                for (var i = 1; i <= buildingCount; i++) {
                    var buildingEl = dojo.place(buildingHtml, container);
                }
            },

            positionTile: function(tileEl, coords) {
                tileEl.style.left = (coords.left - (this.hexWidth / 2)) + 'px';
                tileEl.style.top = coords.top + 'px';
            },

            removeTile: function(tileEl) {
                dojo.destroy(tileEl);
            },

            getCoords: function(x, y) {
                var top = this.hexHeight * y - 70;
                var left = this.hexWidth * x - 35;
                if (y % 2 != 0) {
                    left += this.hexWidth / 2;
                }
                return {
                    top: top,
                    left: left,
                    style: 'top:' + top + 'px;left:' + left + 'px',
                };
            },

            clearPossible: function() {
                this.tryTile = null;
                this.tryBuilding = null;
                this.removeActionButtons();
                this.onUpdateActionButtons(this.gamedatas.gamestate.name, this.gamedatas.gamestate.args);
                dojo.destroy('buildPalette');
                dojo.query('.possible').forEach(dojo.destroy);
                dojo.query('.tempbuilding').forEach(dojo.destroy);
            },

            showPossibleTile: function() {
                this.clearPossible();
                for (var i in this.gamedatas.gamestate.args.possible) {
                    var possible = this.gamedatas.gamestate.args.possible[i];
                    var coords = this.getCoords(possible.x, possible.y);
                    var possibleHtml = this.format_block('jstpl_possible', {
                        id: i,
                        z: possible.z - 1,
                        style: coords.style,
                        label: '',
                    });
                    var possibleEl = dojo.place(possibleHtml, 'map_scrollable_oversurface');
                }
                dojo.query('.face.possible').connect('onclick', this, 'onClickPossibleTile');
            },

            showPossibleSpaces: function() {
                this.clearPossible();
                for (var i in this.gamedatas.gamestate.args.spaces) {
                    var possible = this.gamedatas.gamestate.args.spaces[i];
                    var coords = this.getCoords(possible.x, possible.y);
                    var possibleHtml = this.format_block('jstpl_possible', {
                        id: i,
                        z: possible.z,
                        style: coords.style,
                        label: '',
                    });
                    var possibleEl = dojo.place(possibleHtml, 'map_scrollable_oversurface');
                }
                dojo.query('.face.possible').connect('onclick', this, 'onClickPossibleSpaces');
            },

            showPossibleBuilding: function() {
                this.clearPossible();
                var options = this.gamedatas.gamestate.args.options;
                var tile_id = this.gamedatas.gamestate.args.tile_id;
                var subface = this.gamedatas.gamestate.args.subface;
                var option_keys = Object.keys(options);
                if (option_keys.length == 1) {
                    var option_nbr = option_keys[0];
                    this.onClickPossibleBuilding(null, option_nbr);
                } else {
                    var paletteEl = dojo.place("<div id='buildPalette' class='palette possible'></div>", "hex_" + tile_id + "_" + subface);
                    dojo.connect(paletteEl, 'onclick', this, 'onClickCancelBuilding');
                    var cancelatorEl = dojo.place("<div id='cancelator'><span class='facelabel'> ✗ </span></div>", 'buildPalette');
                    //dojo.connect(cancelatorEl, 'onclick', this, 'onClickCancelBuilding');
                    for (var option_nbr in options) {
                        var spaces = options[option_nbr];
                        var bldg_type = Math.floor(option_nbr / 10);
                        var possibleHtml = this.format_block('jstpl_building_' + bldg_type, {
                            colorName: 'tempbuilding'
                        });
                        if (bldg_type == HUT) {
                            var hutCount = spaces.reduce(function(sum, space) {
                                return sum + space.z;
                            }, 0);
                            possibleHtml += "<span class='facelabel'>" + hutCount + "</span>";
                        }
                        var rotaEl = dojo.place("<div id='rota_" + option_nbr + "' class='rotator'>" + possibleHtml + "</div>", 'buildPalette');
                        dojo.connect(rotaEl, 'onclick', this, 'onClickPossibleBuilding')
                    }
                }
            },

            ///////////////////////////////////////////////////
            //// Player's action

            /////
            // Tile actions
            /////

            onClickPossibleTile: function(evt, possible_nbr) {
                this.clearPossible();
                if (possible_nbr == null) {
                    dojo.stopEvent(evt);
                    var idParts = evt.currentTarget.id.split('_');
                    possible_nbr = idParts[1];
                }
                var possible = this.gamedatas.gamestate.args.possible[possible_nbr];
                var coords = this.getCoords(possible.x, possible.y);
                this.tryTile = {
                    tile_id: this.gamedatas.gamestate.args.tile_id,
                    tile_type: this.gamedatas.gamestate.args.tile_type,
                    x: possible.x,
                    y: possible.y,
                    z: possible.z,
                    r: possible.r[0],
                    possible: possible,
                };
                console.info('Try tile ' + this.tryTile.tile_id + ' at [' + possible.x + ',' + possible.y + ',' + possible.z + ']');

                // Create tile
                var tileEl = this.createTile(this.tryTile);
                this.placeOnObject(tileEl.id, 'tile_p_' + this.player_id);
                this.positionTile(tileEl, coords);

                // Create rotator
                if (possible.r.length > 1) {
                    var rotatorHtml = this.format_block('jstpl_possible', {
                        id: 'rotator',
                        z: possible.z,
                        style: coords.style,
                        label: '↻',
                    });
                    var rotateEl = dojo.place(rotatorHtml, 'map_scrollable_oversurface');
                    dojo.connect(rotateEl, 'onclick', this, 'onClickRotateTile');
                }

                this.removeActionButtons();
                this.onUpdateActionButtons(this.gamedatas.gamestate.name, this.gamedatas.gamestate.args);
            },

            onClickRotateTile: function(evt) {
                dojo.stopEvent(evt);

                // Determine new rotation
                var rotations = this.tryTile.possible.r;
                var index = rotations.indexOf(this.tryTile.r);
                this.tryTile.r = rotations[(index + 1) % rotations.length];

                // Apply to tile
                var tileEl = $('tile_' + this.tryTile.tile_id);
                tileEl.style.transform = null;
                dojo.removeClass(tileEl, 'rotate0 rotate60 rotate120 rotate180 rotate240 rotate300');
                dojo.addClass(tileEl, 'rotate' + this.tryTile.r);
            },

            onClickCancelTile: function(evt) {
                dojo.stopEvent(evt);
                if (this.tryTile != null) {
                    var player_id = this.getActivePlayerId();
                    var tileEl = $('tile_' + this.tryTile.tile_id);
                    this.removeTile(tileEl);
                    this.showPossibleTile();
                }
            },

            onClickCommitTile: function(evt) {
                dojo.stopEvent(evt);
                if (this.tryTile == null) {
                    this.showMessage(_('You must place a tile.'), 'error');
                    return;
                }
                this.doAction('commitTile', this.tryTile);
            },

            /////
            // Building actions
            /////

            onClickPossibleSpaces: function(evt) {
                // This click trigger network request
                // Don't clear possible spaces here, wait for state change event
                dojo.stopEvent(evt);
                var idParts = evt.currentTarget.id.split('_');
                var possible = this.gamedatas.gamestate.args.spaces[idParts[1]];
                console.info('Select space [' + possible.x + ',' + possible.y + ',' + possible.z + ']');
                this.doAction('selectSpace', {
                    x: possible.x,
                    y: possible.y,
                    z: possible.z,
                    tile_id: possible.tile_id,
                    subface: possible.subface
                });
            },

            onClickPossibleBuilding: function(evt, option_nbr) {
                this.clearPossible();
                if (option_nbr == null) {
                    dojo.stopEvent(evt);
                    var idParts = evt.currentTarget.id.split('_');
                    option_nbr = idParts[1];
                }
                this.tryBuilding = {
                    x: this.gamedatas.gamestate.args.x,
                    y: this.gamedatas.gamestate.args.y,
                    z: this.gamedatas.gamestate.args.z,
                    option_nbr: +option_nbr,
                };
                var bldg_type = Math.floor(option_nbr / 10);
                var spaces = this.gamedatas.gamestate.args.options[option_nbr];
                console.info('Try building option ' + option_nbr + ' at [' + this.tryBuilding.x + ',' + this.tryBuilding.y + ',' + this.tryBuilding.z + ']');

                // Create temp buildings
                for (var b in spaces) {
                    var possible = spaces[b];
                    this.placeBuilding({
                        x: possible.x,
                        y: possible.y,
                        z: possible.z,
                        tile_id: possible.tile_id,
                        subface: possible.subface,
                        bldg_type: bldg_type,
                    });
                }
                dojo.query('.tempbuilding').connect('onclick', this, 'showPossibleBuilding');

                this.removeActionButtons();
                this.onUpdateActionButtons(this.gamedatas.gamestate.name, this.gamedatas.gamestate.args);
            },

            onClickCancelBuilding: function(evt) {
                // This click trigger network request
                // Don't clear possible spaces here, wait for state change event
                dojo.stopEvent(evt);
                this.doAction('cancel');
            },

            onClickCommitBuilding: function(evt) {
                dojo.stopEvent(evt);
                if (this.tryBuilding == null) {
                    this.showMessage(_('You must place a building.'), 'error');
                    return;
                }
                this.doAction('commitBuilding', this.tryBuilding);
            },


            ///////////////////////////////////////////////////
            //// Reaction to cometD notifications

            /*
                setupNotifications:

                In this method, you associate each of your game notifications with your local method to handle it.

                Note: game notification names correspond to "notifyAllPlayers" and "notifyPlayer" calls in
                      your taluva.game.php file.

            */
            setupNotifications: function() {
                dojo.subscribe('draw', this, 'notif_draw');
                dojo.subscribe('commitTile', this, 'notif_tile');
                dojo.subscribe('commitBuilding', this, 'notif_building');
                dojo.subscribe('destroyBuilding', this, 'notif_destroyBuilding');
                dojo.subscribe('scores', this, 'notif_scores');
            },

            notif_draw: function(n) {
                // Show preview tile
                var player_id = n.args.player_id;
                if (n.args.tile_type) {
                    var tileEl = this.createTile({
                        tile_id: 'p_' + player_id,
                        tile_type: n.args.tile_type
                    });
                    dojo.place(tileEl, 'preview_' + player_id, 'only');
                    dojo.removeClass('preview_' + player_id, 'unknown');
                } else {
                    $('preview_' + player_id).innerHTML = '';
                    dojo.addClass('preview_' + player_id, 'unknown');
                }

                // Update remaining tile counter
                if (n.args.remain != null) {
                    $('count_remain').innerText = n.args.remain;
                }
            },

            notif_tile: function(n) {
                var player_id = this.getActivePlayerId();
                var player = this.gamedatas.players[player_id];
                var colorClass = 'prior-move-' + player.colorName;

                // Create tile
                var tileEl = this.createTile(n.args);
                this.placeOnObject(tileEl, 'tile_p_' + player_id);
                dojo.query('.tile.' + colorClass).removeClass(colorClass)
                dojo.addClass(tileEl, colorClass);

                // Move into position
                var coords = this.getCoords(n.args.x, n.args.y);
                this.positionTile(tileEl, coords);

                // Destroy preview
                var previewEl = $('tile_p_' + player_id);
                this.removeTile(previewEl);
            },

            notif_building: function(n) {
                this.updatePlayerCounters(n.args);
                for (var i in n.args.buildings) {
                    var building = n.args.buildings[i];
                    this.placeBuilding(building);
                }
            },

            notif_destroyBuilding: function(n) {
                $('bldg_hex_' + n.args.tile_id + '_' + n.args.subface).innerHTML = '';
            },

            notif_scores: function(n) {
                var scores = n.args.scores;
                for (player_id in scores) {
                    this.scoreCtrl[player_id].toValue(scores[player_id]);
                }
            },
        });
    });