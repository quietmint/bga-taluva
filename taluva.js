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
                    this.control3dxaxis = 30; // rotation in degrees of x axis (it has a limit of 0 to 80 degrees in the frameword so users cannot turn it upsidedown)
                    this.control3dzaxis = 0; // rotation in degrees of z axis
                    this.control3dxpos = -100; // center of screen in pixels
                    this.control3dypos = -50; // center of screen in pixels
                    this.control3dscale = 1; // zoom level, 1 is default 2 is double normal size,
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
                console.info('SETUP', gamedatas);

                // Setup 'fade-out' element destruction
                $('overall-content').addEventListener('animationend', function(e) {
                    if (e.animationName == 'fade-out') {
                        dojo.destroy(e.target);
                    }
                }, false);
                this.dragElement3d($("pagesection_gameview"));

                // Setup remaining tile counter
                dojo.place($('remain'), 'game_play_area_wrap', 'first');

                // Setup player boards
                colorNames = {
                    'ff0000': 'red',
                    'ffa500': 'yellow',
                    'ffffff': 'white',
                    'b1634f': 'brown'
                };
                for (var player_id in gamedatas.players) {
                    var player = gamedatas.players[player_id];
                    player.colorName = colorNames[player.color];
                    dojo.place(this.format_block('jstpl_player_board', player), 'player_board_' + player_id);
                    this.updatePlayerCounters(player);
                    if (player.preview) {
                        player.preview.player_id = player_id;
                        player.preview.remain = gamedatas.remain;
                        this.notif_draw({
                            args: player.preview
                        });
                    }
                }

                // Setup scrollable map & tiles
                var mapContainer = $('map_container');
                this.scrollmap.onMouseDown = this.myonMouseDown;
                this.scrollmap.create(mapContainer, $('map_scrollable'), $('map_surface'), $('map_scrollable_oversurface'));

                this.scrollmap.setupOnScreenArrows(this.hexWidth * 3);
                if (dojo.isFF) {
                    dojo.connect($("pagesection_gameview"), 'DOMMouseScroll', this, 'onMouseWheel');
                } else {
                    dojo.connect($("pagesection_gameview"), 'mousewheel', this, 'onMouseWheel');
                }
                var prior_tile = {};
                for (var tile_id in gamedatas.tiles) {
                    var tile = gamedatas.tiles[tile_id];
                    prior_tile[tile.tile_player_id] = tile.tile_id;
                    var coords = this.getCoords(tile.x, tile.y);
                    var tileEl = this.createTile(tile);
                    this.positionTile(tileEl, coords);
                }
                for (var player_id in prior_tile) {
                    var player = this.gamedatas.players[player_id];
                    dojo.addClass('tile_' + prior_tile[player_id], 'prior-move-' + player.colorName);
                }

                // Setup buildings
                for (var b in gamedatas.buildings) {
                    var building = gamedatas.buildings[b];
                    this.placeBuilding(building);
                }

                // Setup game notifications
                this.setupNotifications();
            },

            /* change3d: function(_dc2, xpos, ypos, _dc3, _dc4, _dc5, _dc6) {
                var isModeChange = arguments[5] === false;
                if (isModeChange) {
                    newMode = !this.control3dmode3d;
                    console.log('3D mode change, new value=' + newMode);
                    if (newMode) {
                        this.setZoom(1);
                        var max_x = 0;
                        var min_x = 0;
                        var max_y = 0;
                        var min_y = 0;
                        var _1027 = "#map_scrollable > *";
                        dojo.query(_1027).forEach(dojo.hitch(this, function(node) {
                            max_x = Math.max(max_x, dojo.style(node, "left") + dojo.style(node, "width"));
                            min_x = Math.min(min_x, dojo.style(node, "left"));
                            max_y = Math.max(max_y, dojo.style(node, "top") + dojo.style(node, "height"));
                            min_y = Math.min(min_y, dojo.style(node, "top"));
                        }));
                        var _1027 = "#map_scrollable_oversurface > *";
                        dojo.query(_1027).forEach(dojo.hitch(this, function(node) {
                            max_x = Math.max(max_x, dojo.style(node, "left") + dojo.style(node, "width"));
                            min_x = Math.min(min_x, dojo.style(node, "left"));
                            max_y = Math.max(max_y, dojo.style(node, "top") + dojo.style(node, "height"));
                            min_y = Math.min(min_y, dojo.style(node, "top"));
                        }));
                        console.log('max_x', max_x, 'min_x', min_x, 'max_y', max_y, 'min_y', min_y);
                        //$('game_play_area').style.width = (max_x - min_x) + 'px';
                        $('map_container').style.height = (max_y - min_y) + 'px';
                        dojo.style('map_scrollable', {
                            left: (min_x * -1) + 'px',
                            top: (min_y * -1) + 'px'
                        });
                        dojo.style('map_scrollable_oversurface', {
                            left: (min_x * -1) + 'px',
                            top: (min_y * -1) + 'px'
                        });
                        this.scrollmap.disableScrolling();

                    } else {
                     //   $('game_play_area').style.width = null;
                        $('map_container').style.height = null;
                        this.scrollmap.enableScrolling();
                        this.scrollmap.scrollToCenter();
                    }
                }
                return this.inherited(arguments);
            },*/


            ///////////////////////////////////////////////////
            //// Game & client states

            // onEnteringState: this method is called each time we are entering into a new game state.
            //                  You can use this method to perform some user interface changes at this moment.
            //
            onEnteringState: function(stateName, args) {
                console.log('Entering state: ' + stateName, args.args);
                if (this.isCurrentPlayerActive()) {
                    if (stateName == 'tile') {
                        this.showPossibleTile();
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
                console.info('Leaving state: ' + stateName);
                if (stateName == 'tile' || stateName == 'building') {
                    this.clearPossible();
                    dojo.query(".tempbuilding").forEach(dojo.destroy);
                }
            },

            // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
            //                        action status bar (ie: the HTML links in the status bar).
            //
            onUpdateActionButtons: function(stateName, args) {
                console.info('Update action buttons: ' + stateName, args);
                if (this.isCurrentPlayerActive()) {
                    if (stateName == 'tile') {
                        if (this.tryTile) {
                            this.addActionButton('button_reset', _('Cancel'), 'onClickResetTile');
                            this.addActionButton('button_commit', _('Done'), 'onClickCommitTile');
                        }
                    } else if (stateName == 'building') {

                        this.addActionButton('button_reset', _('Cancel'), 'onClickCancel');
                        this.addActionButton('button_commit', _('Done'), 'onClickCommitBuilding');

                    }
                }
            },

            onMouseWheel: function(evt) {
                //dojo.stopEvent(evt);
                dojo.stopEvent(evt);
                var d = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail))) * 0.1;
                if (!this.control3dmode3d) {
                    // 2D mode zoom in/out
                    this.setZoom(this.zoom + d);
                } else {
                    // 3D mode adjust camera
                    this.change3d(0, 0, 0, 0, d, true, false);
                }
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
                //elmnt.style.transition = "transform 0.05s ease";
                this.drag3d = elmnt;
            },

            drag3dMouseDown: function(e) {
                e = e || window.event;
                if (e.which == 3) {
                    dojo.stopEvent(e);
                    //this.dragging_3dhandler = dojo.connect($("ebd-body"), "mousemove", this, "elementDrag3d");
					$("ebd-body").onmousemove= dojo.hitch( this , this.elementDrag3d); 
                }
            },

            elementDrag3d: function(e) {
                e = e || window.event;
                this.change3d(e.movementY / (-10), 0, 0, e.movementX / (-10), 0, true, false);
            },

            closeDragElement3d: function(evt) {
                /* stop moving when mouse button is released:*/
                console.log("mouseup button 3");
                if (evt.which == 3) {
                    /*if(evt.preventDefault != undefined)
                    		evt.preventDefault();
                    if(evt.stopPropagation != undefined)
                    	evt.stopPropagation();*/
                    dojo.stopEvent(evt);
					$("ebd-body").onmousemove=null;
                    //dojo.disconnect(this.dragging_3dhandler);
                }
            },

            ///////////////////////////////////////////////////
            //// Utility methods
            doAction: function(action, args) {
                if (this.checkAction(action)) {
                    console.info('Taking action: ' + action, args);;
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

            setZoom: function(newZoom) {
                var newZoom = Math.max(0.5, Math.min(1.5, newZoom));
                if (this.zoom != newZoom) {
                    this.zoom = newZoom;
                    var zoomStyle = 'scale(' + this.zoom + ')';
                    var mapScrollable = $('map_scrollable');
                    var mapSurface = $('map_surface');
                    var mapOversurface = $('map_scrollable_oversurface');
                    mapScrollable.style.transform = zoomStyle;
                    mapSurface.style.transform = zoomStyle;
                    mapOversurface.style.transform = zoomStyle;
                }
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
                    z: tile.z || 1,
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

            placeBuilding: function(building, temp) {
                console.log('placeBuilding', building);
                var hexId = 'hex_' + building.tile_id + '_' + building.subface;
                var container = $('bldg_' + hexId) || dojo.place('<div id="bldg_' + hexId + '" class="bldg-container"></div>', $(hexId));

                if (temp == true) {
                    building.colorName = 'tempbuilding';
                } else {
                    building.colorName = this.gamedatas.players[building.bldg_player_id].colorName;
                }

                var numbuildings = building.bldg_type == HUT ? +building.z : 1;
                for (var i = 1; i <= numbuildings; i++) {
                    var buildingHtml = this.format_block('jstpl_building_' + building.bldg_type, building);
                    var buildingEl = dojo.place(buildingHtml, container);
                }
            },

            positionTile: function(tileEl, coords) {
                tileEl.style.left = (coords.left - (this.hexWidth / 2)) + 'px';
                tileEl.style.top = coords.top + 'px';
            },

            removeTile: function(tileEl) {
                dojo.addClass(tileEl, 'fade-out');
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
                        label: (possible.z > 1 ? possible.z : ''),
                    });
                    var possibleEl = dojo.place(possibleHtml, 'map_scrollable_oversurface');
                }
                dojo.query('.face.possible').connect('onclick', this, 'onClickPossibleTile');
            },

            showPossibleSpaces: function() {
                this.clearPossible();

                for (var i in this.gamedatas.gamestate.args.spaces) {

                    var possible = this.gamedatas.gamestate.args.spaces[i];
                    console.log('possibleSpace', possible);
                    var coords = this.getCoords(possible.x, possible.y);

                    var possibleHtml = this.format_block('jstpl_possible', {
                        id: i,
                        z: possible.z,
                        style: coords.style,
                        label: "",
                    });
                    var possibleEl = dojo.place(possibleHtml, 'map_scrollable_oversurface');
                }
                dojo.query('.face.possible').connect('onclick', this, 'onClickPossibleSpaces');
            },

            showPossibleBuilding: function() {
                this.clearPossible();

                console.log('showPossibleBuilding args', this.gamedatas.gamestate.args);

                var tile_id = this.gamedatas.gamestate.args.tile_id;
                var subface = this.gamedatas.gamestate.args.subface;

                var possibleEl = dojo.place("<div id='buildPalette' class='palette possible'></div>", "hex_" + tile_id + "_" + subface);
                dojo.place("<div id='cancelator' style='transform:rotate(0deg)'><span class='facelabel'> ✗ </span></div>", 'buildPalette');

                if (Object.keys(this.gamedatas.gamestate.args.possible).length == 1) {
                    bldgoption = Object.keys(this.gamedatas.gamestate.args.possible)[0];
					
                    this.onClickPossibleBuilding(null, bldgoption);
                } else {
                    for (var bldgoption in this.gamedatas.gamestate.args.possible) {
                        var spaces = this.gamedatas.gamestate.args.possible[bldgoption];
                        var bldg_type = Math.floor(bldgoption / 10);
                        var possibleHtml = this.format_block('jstpl_building_' + bldg_type, {
                            colorName: 'tempbuilding'
                        });
                        if (bldg_type == HUT) {
                            var hutCount = spaces.reduce(function(sum, space) {
                                return sum + space.z;
                            }, 0);
                            possibleHtml += "<span class='facelabel'>" + hutCount + "</span>";
                        }
                        dojo.place("<div id='rota_" + bldgoption + "' class='rotator' style='transform:rotate(0deg)' >" + possibleHtml + "</div>", 'buildPalette');
                        dojo.query('#rota_' + bldgoption).connect('onclick', this, 'onClickPossibleBuilding');
                    }
                    var numRotators = $('buildPalette').childElementCount;

                    for (var k = 0; k < $('buildPalette').children.length; k++) {
                        $('buildPalette').children[k].style.animation = "rotator" + (k + 1) + " 1.5s ease forwards 1";
                    }
                    dojo.query('#cancelator').connect('onclick', this, 'onClickCancel');
                }

            },

            ///////////////////////////////////////////////////
            //// Player's action

            onClickPossibleTile: function(evt) {
                dojo.stopEvent(evt);
                this.clearPossible();

                var idParts = evt.currentTarget.id.split('_');
                var possible = this.gamedatas.gamestate.args.possible[idParts[1]];
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
                console.log('Trying tile at [' + possible.x + ',' + possible.y + ',' + possible.z + ']');

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


            onClickPossibleSpaces: function(evt) {
                dojo.stopEvent(evt);
                this.clearPossible();

                var idParts = evt.currentTarget.id.split('_');
                var possible = this.gamedatas.gamestate.args.spaces[idParts[1]];
                console.log('onClickPossibleSpaces', possible);

                this.selectSpaceArgs = {
                    x: possible.x,
                    y: possible.y,
                    z: possible.z,
                    tile_id: possible.tile_id,
                    subface: possible.subface
                };
                this.doAction("selectSpace", this.selectSpaceArgs)
            },

            onClickPossibleBuilding: function(evt, single_type) {
                this.clearPossible();
                if (single_type != null) {
                    var bldgoption = single_type;
                } else {
                    dojo.stopEvent(evt);
                    var idParts = evt.currentTarget.id.split('_');
                    var bldgoption = idParts[1];
                }
				bldg_type = Math.floor ( bldgoption / 10);
                var possibleBuildings = this.gamedatas.gamestate.args.possible[bldgoption]
                console.log('onClickPossibleBuilding', possibleBuildings);

                for (var b in possibleBuildings) {
                    possible = possibleBuildings[b];
                    var coords = this.getCoords(possible.x, possible.y);
                    this.tryBuilding = {
                        x: possible.x,
                        y: possible.y,
                        z: possible.z,
                        tile_id: possible.tile_id,
                        subface: possible.subface,
                        bldg_type: bldg_type,
						bldgoption : bldgoption,
                        bldg_player_id: this.player_id,
                        possible: possible,
                    };

                    // Create temp building
                    this.placeBuilding(this.tryBuilding, 1);
                }
				
				dojo.query('.tempbuilding').connect('onclick', this, 'showPossibleBuilding');

            },

            onClickSwapBuilding: function(evt) {
                dojo.query(".tempbuilding").forEach(dojo.destroy);
                var bt = Object.keys(this.tryBuilding.possible.bldg_types);
                var index = bt.indexOf(this.tryBuilding.bldg_type);
                this.tryBuilding.bldg_type = bt[(index + 1) % bt.length];
                this.placeBuilding(this.tryBuilding, 1);
            },

            onClickCancel: function(evt) {
                dojo.query(".tempbuilding").forEach(dojo.destroy);
                this.doAction("cancel");
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

            onClickResetTile: function(evt) {
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

            onClickResetBuilding: function(evt) {
                dojo.stopEvent(evt);
                if (this.tryBuilding != null) {
                    var bldgContainer = $('bldg_hex_' + this.tryBuilding.tile_id + '_' + this.tryBuilding.subface);
                    this.removeTile(bldgContainer);
                    this.showPossibleBuilding();
                }
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
            },

            notif_draw: function(n) {
                console.log('notif_draw', n.args);
                // Show preview tile
                var player_id = n.args.player_id;
                var tileEl = this.createTile({
                    tile_id: 'p_' + player_id,
                    tile_type: n.args.tile_type
                });
                dojo.place(tileEl, 'preview_' + player_id, 'only');

                // Update remaining tile counter
                $('count_remain').innerText = n.args.remain;
            },

            notif_tile: function(n) {
                console.log('notif_tile', n.args);
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
                console.log('notif_building', n.args);
                this.updatePlayerCounters(n.args);
                for (var i in n.args.buildings) {
                    var building = n.args.buildings[i];
                    this.placeBuilding(building);
                }
            },

            notif_destroyBuilding: function(n) {
                console.log('notif_destroyBuilding', n.args);
                $('bldg_hex_' + n.args.tile_id + '_' + n.args.subface).innerHTML = '';
            },
        });
    });