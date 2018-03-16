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
				
				
				 if (!dojo.hasClass("ebd-body", "mode_3d")) {
                    dojo.addClass("ebd-body", "mode_3d");
                    //dojo.addClass("ebd-body", "enableTransitions");
                    $("globalaction_3d").innerHTML = "3D";   // controls the upper right button 
                    this.control3dxaxis = 30;  // rotation in degrees of x axis (it has a limit of 0 to 80 degrees in the frameword so users cannot turn it upsidedown)
                    this.control3dzaxis = 0;   // rotation in degrees of z axis
                    this.control3dxpos = -100;   // center of screen in pixels
                    this.control3dypos = -100;   // center of screen in pixels
                    this.control3dscale = 0.8;   // zoom level, 1 is default 2 is double normal size, 
                    this.control3dmode3d = true ;  			// is the 3d enabled	
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
                this.dragElement3d ($("pagesection_gameview"));
				this.player_colors= { "ff0000": "red" , "ffa500": "yellow" , "ffffff": "white" , "a52a2a": "brown" };

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
					//////////////////////////////////   TEST BUILDINGS ///////////////////////// ;
					/* switch ( tileEl.id.slice(-1) ) { 
						case "1" : dojo.place(  '<div class="hut"><div class="hutside"></div><div class="hutroof"></div></div>'       , tileEl.children[1] );						
						 break;
						case "2" : dojo.place( '<div class="hut red"><div class="hutside"></div><div class="hutroof"></div></div>'    , tileEl.children[1] ); 				
						 break;
						case "3" : dojo.place( '<div class="hut white"><div class="hutside"></div><div class="hutroof"></div></div>'  , tileEl.children[1] );
						 break;
						case "4" : dojo.place( '<div class="tower"><div class="towerside"></div><div class="towerroof"></div></div>'  , tileEl.children[1] );				
						 break;
						case "5" : dojo.place( '<div class="temple"><div class="templeside"></div><div class="templeroof"></div></div>'   , tileEl.children[1] );
						break;
						case "6" : dojo.place( '<div class="tower red"><div class="towerside"></div><div class="towerroof"></div></div>'   , tileEl.children[1] );
						 break;
						case "7" : dojo.place( '<div class="temple red"><div class="templeside"></div><div class="templeroof"></div></div>'   , tileEl.children[1] );
						 break;
						  
					} */
                
				for (var d in gamedatas.buildings) {
                    var building = gamedatas.buildings[d]; 
                    var hex = "hex_" + building.tile_id + "_" + building.subface ;
					
                    this.placeBuilding( hex, building.bldg_player_id ,building.bldg_type)
				}	
				
                for (var player_id in prior_tile) {
                    var player = this.gamedatas.players[player_id];
                    dojo.addClass('tile_' + prior_tile[player_id], 'prior-move-' + player.color);
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
                            this.addActionButton('button_reset', _('Reset'), 'onClickResetTile');
                            this.addActionButton('button_commit', _('Done'), 'onClickCommitTile');
                        }
                    } else if (stateName == 'building') {
                        if (this.tryBuilding) {
                            this.addActionButton('button_reset', _('Reset'), 'onClickResetBuilding');
                            this.addActionButton('button_commit', _('Done'), 'onClickCommitBuilding');
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

		myonMouseDown: function(evt) {
					if (!this.bEnableScrolling) {
						return;
					}
                    if (evt.which == 1){
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
		  elmnt.oncontextmenu = function () { return false; }
		  //elmnt.style.transition = "transform 0.05s ease";
          this.drag3d=elmnt;
			
		},

		drag3dMouseDown:  function(e) {
			e = e || window.event;
			if (e.which == 3){
				dojo.stopEvent( e );
				this.dragging_3dhandler = dojo.connect($("ebd-body"), "mousemove", this, "elementDrag3d");
			}
		},

		elementDrag3d: function(e) {
			e = e || window.event;
			this.change3d( e.movementY/ (-10)   , 0, 0, e.movementX / (-10) , 0, true, false);
		  },

		closeDragElement3d:  function(evt) {
			/* stop moving when mouse button is released:*/
			console.log ("mouseup button 3");
			if (evt.which == 3){ 
				/*if(evt.preventDefault != undefined)
						evt.preventDefault();
				if(evt.stopPropagation != undefined)
					evt.stopPropagation();*/
				dojo.stopEvent( evt );
				dojo.disconnect(this.dragging_3dhandler);
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
			
			placeBuilding: function ( h , player_id, type ){
				debugger;
				container =  $(h+">.bldg-container") ||  dojo.place('<div id="bdg_' + h + '" class="bldg-container" ></div>', $(h) );
                color = this.player_colors[ this.gamedatas.players[player_id].color ];
				switch (eval(type)){
					case 1 :  hutEl = dojo.place('<div class="hut '+ color +'"><div class="hutside"></div><div class="hutroof"></div></div>', container);
					break;
					case 2 :  hutEl = dojo.place('<div class="temple '+ color +'"><div class="templeside"></div><div class="templeroof"></div></div>', container);
					break;
					case 3 :  hutEl = dojo.place('<div class="tower '+ color +'"><div class="towerside"></div><div class="towerroof"></div></div>', container);
					break;
					
					
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

            clearPossible: function() {
                this.tryTile = null;
                this.tryBuilding = null;
                this.removeActionButtons();
                this.onUpdateActionButtons(this.gamedatas.gamestate.name, this.gamedatas.gamestate.args);
                dojo.query('.face.possible').forEach(dojo.destroy);
            },

            showPossibleTile: function() {
                this.clearPossible();
                for (var i in this.gamedatas.gamestate.args.possible) {
                    var possible = this.gamedatas.gamestate.args.possible[i];
                    var coords = this.getCoords(possible.x, possible.y);
                    var possibleEl = dojo.place('<div id="possible_' + i + '" class="face possible level' + possible.z + '" style="' + coords.style + '">' +
                        '<span class="facelabel">' + (possible.z > 1 ? possible.z : '') + "</span>" +
                        ' <div class="side side1"></div><div class="side side2"></div><div class="side side3"></div>', 'map_scrollable_oversurface');
                }
                dojo.query('.face.possible').connect('onclick', this, 'onClickPossibleTile');
            },

            showPossibleBuilding: function() {
                console.log('showPossibleBuilding');
                this.clearPossible();
                for (var i in this.gamedatas.gamestate.args.possible) {
                    var possible = this.gamedatas.gamestate.args.possible[i];
                    console.log('possiblebuilding', possible);
                    var coords = this.getCoords(possible.x, possible.y);

                    var abbr = 'H' + possible.bldg_types[1].length;

                    var possibleEl = dojo.place('<div id="possible_' + i + '" class="face possible level' + possible.z + '" style="' + coords.style + '">' +
                        '<span class="facelabel">' + abbr + "</span>" +
                        '<div class="side side1"></div><div class="side side2"></div><div class="side side3"></div>', 'map_scrollable_oversurface');
                }
                dojo.query('.face.possible').connect('onclick', this, 'onClickPossibleBuilding');
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

                // Create tile
                var tileEl = this.createTile(this.tryTile);
                this.placeOnObject(tileEl.id, 'tile_p_' + this.player_id);
                this.positionTile(tileEl, coords);

                // Create rotator
                if (possible.r.length > 1) {
                    var rotateEl = dojo.place('<div class="face possible rotate level' + possible.z + '" style="' + coords.style + '"><span class="facelabel">↻</span></div>', 'map_scrollable_oversurface');
                    dojo.connect(rotateEl, 'onclick', this, 'onClickRotateTile');
                }

                this.removeActionButtons();
                this.onUpdateActionButtons(this.gamedatas.gamestate.name, this.gamedatas.gamestate.args);
            },

            onClickPossibleBuilding: function(evt) {
                dojo.stopEvent(evt);
                this.clearPossible();

                var idParts = evt.currentTarget.id.split('_');
                var possible = this.gamedatas.gamestate.args.possible[idParts[1]];
                console.log('onClickPossibleBuilding', possible);
                var coords = this.getCoords(possible.x, possible.y);
                this.tryBuilding = {
                    id: possible.x + possible.y + possible.z,
                    x: possible.x,
                    y: possible.y,
                    z: possible.z,
                    bldg_type: 1,
                    possible: possible,
                };

                var bldgEl = dojo.place('<div id="bldg_' + this.tryBuilding.id + '" class="bldg-container level'+possible.z+'" style="' + coords.style + '"></div>', 'map_scrollable_oversurface');
                if (possible.bldg_types[2] || possible.bldg_types[3]) {
                    dojo.connect(bldgEl, 'onclick', this, 'onClickSwapBuilding');
                }
                var hutEl = dojo.place('<div class="hut"><div class="hutside"></div><div class="hutroof"></div></div>', bldgEl);

                this.removeActionButtons();
                this.onUpdateActionButtons(this.gamedatas.gamestate.name, this.gamedatas.gamestate.args);
            },

            onClickSwapBuilding: function(evt) {
                var bt = Object.keys(this.tryBuilding.possible.bldg_types);
                var index = bt.indexOf(this.tryBuilding.bldg_type);
                this.tryBuilding.bldg_type = bt[(index + 1) % bt.length];
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
                    var bldgContainer = $('bldg_' + this.tryBuilding.id);
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

            notif_building: function(n) {
                console.log('notif_building', n.args);
            },
        });
    });