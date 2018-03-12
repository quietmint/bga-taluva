/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Taluva implementation : © quietmint
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
        return declare("bgagame.taluva", ebg.core.gamegui, {
            constructor: function() {
                // Scrollable area
                this.scrollmap = new ebg.scrollmap();
                this.hexWidth = 84;
                this.hexHeight = 71;
                this.tryTile = null;
                this.zoom = 1;

                // Set defaults for 3D mode
                this.control3dxaxis = 30;
                this.control3dzaxis = 0;
                this.control3dscale = 1.2;
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


                // Setup remaining tile counter
                dojo.place($('remain'), 'game_play_area_wrap', 'first');

                // Setup player boards
                for (var player_id in gamedatas.players) {
                    var player = gamedatas.players[player_id];
                    dojo.place(this.format_block('jstpl_player_board', player), 'player_board_' + player_id);
                    $('count_temples_' + player_id).innerText = player.temples;
                    $('count_towers_' + player_id).innerText = player.towers;
                    $('count_huts_' + player_id).innerText = player.huts;
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
                this.scrollmap.create(mapContainer, $('map_scrollable'), $('map_surface'), $('map_scrollable_oversurface'));
                this.scrollmap.setupOnScreenArrows(this.hexWidth * 3);
                if (dojo.isFF) {
                    dojo.connect(mapContainer, 'DOMMouseScroll', this, 'onMouseWheel');
                } else {
                    dojo.connect(mapContainer, 'mousewheel', this, 'onMouseWheel');
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
                    var player = gamedatas.players[player_id];
                    dojo.addClass('tile_' + prior_tile[player_id], 'prior-move-' + player.color);
                }

                // Setup game notifications
                this.setupNotifications();
            },

            change3d: function(_dc2, xpos, ypos, _dc3, _dc4, _dc5, _dc6) {
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
                        $('game_play_area').style.width = (max_x - min_x) + 'px';
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
                        $('game_play_area').style.width = null;
                        $('map_container').style.height = null;
                        this.scrollmap.enableScrolling();
                        this.scrollmap.scrollToCenter();
                    }
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
                        this.showPossibleTile();
                    }
                }
            },

            // onLeavingState: this method is called each time we are leaving a game state.
            //                 You can use this method to perform some user interface changes at this moment.
            //
            onLeavingState: function(stateName) {
                console.info('Leaving state: ' + stateName);
                if (stateName == 'tile') {
                    this.clearPossibleTile();
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
                            this.addActionButton('button_reset', _('Reset'), 'onClickReset');
                            this.addActionButton('button_commit', _('Done'), 'onClickCommit');
                        }
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
                var face1 = tile.tile_type.charAt(0);
                var face2 = tile.tile_type.charAt(1);
                var tileEl = $('tile_' + tile.tile_id);
                if (tileEl != null) {
                    dojo.destroy(tileEl);
                }
                tileEl = dojo.place(this.format_block('jstpl_tile', {
                    id: tile.tile_id,
                    z: tile.z || 1,
                    rotate: tile.r || 0,
                    face0: 0,
                    face1: face1,
                    face2: face2,
                    title0: _(this.gamedatas.terrain[0]),
                    title1: _(this.gamedatas.terrain[face1]),
                    title2: _(this.gamedatas.terrain[face2]),
                }), 'map_scrollable');
                return tileEl;
            },

            positionTile: function(tileEl, coords) {
                tileEl.style.left = (coords.left - (this.hexWidth / 2)) + 'px';
                tileEl.style.top = coords.top + 'px';
            },

            removeTile: function(tileEl) {
                dojo.addClass(tileEl, 'fade-out');
            },

            getCoords: function(x, y) {
                var top = this.hexHeight * y;
                var left = this.hexWidth * x;
                if (y % 2 != 0) {
                    left += this.hexWidth / 2;
                }
                return {
                    top: top,
                    left: left,
                    style: 'top:' + top + 'px;left:' + left + 'px',
                };
            },

            clearPossibleTile: function() {
                this.tryTile = null;
                this.removeActionButtons();
                this.onUpdateActionButtons(this.gamedatas.gamestate.name, this.gamedatas.gamestate.args);
                dojo.query('.face.possible').forEach(dojo.destroy);
            },

            showPossibleTile: function() {
                this.clearPossibleTile();
                for (var i in this.gamedatas.gamestate.args.possible) {
                    var possible = this.gamedatas.gamestate.args.possible[i];
                    var coords = this.getCoords(possible.x, possible.y);
                    var possibleEl = dojo.place('<div id="possible_' + i + '" class="face possible" style="' + coords.style + '">' + (possible.z > 1 ? possible.z : '') +
                        '</div>', 'map_scrollable_oversurface');
                }
                dojo.query('.face.possible').connect('onclick', this, 'onClickPossible');
            },

            ///////////////////////////////////////////////////
            //// Player's action

            onClickPossible: function(evt) {
                dojo.stopEvent(evt);
                this.clearPossibleTile();

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

                // Create tile
                var tileEl = this.createTile(this.tryTile);
                this.placeOnObject(tileEl.id, 'tile_p_' + this.player_id);
                this.positionTile(tileEl, coords);

                // Create rotator
                if (possible.r.length > 1) {
                    var rotateEl = dojo.place('<div class="face possible rotate" style="' + coords.style + '">↻</div>', 'map_scrollable_oversurface');
                    dojo.connect(rotateEl, 'onclick', this, 'onClickRotate');
                }

                this.removeActionButtons();
                this.onUpdateActionButtons(this.gamedatas.gamestate.name, this.gamedatas.gamestate.args);
            },

            onClickRotate: function(evt) {
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

            onClickReset: function(evt) {
                dojo.stopEvent(evt);
                if (this.tryTile != null) {
                    var player_id = this.getActivePlayerId();
                    var tileEl = $('tile_' + this.tryTile.tile_id);
                    this.removeTile(tileEl);
                    this.showPossibleTile();
                }
            },

            onClickCommit: function(evt) {
                dojo.stopEvent(evt);
                if (this.tryTile == null) {
                    this.showMessage(_('You must place a tile.'), 'error');
                    return;
                }
                this.doAction('commitTile', this.tryTile);
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
                dojo.subscribe('building', this, 'notif_building');
            },

            notif_draw: function(n) {
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
                var player_id = this.getActivePlayerId();
                var player = this.gamedatas.players[player_id];
                var colorClass = 'prior-move-' + player.color;


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

            notif_building: function(n) {},
        });
    });