{OVERALL_GAME_HEADER}
<div id="playArea">
  <div id="count_remain">{count_remain}</div>
  <div id="map_container">
    <div id="map_scrollable">
      <div id="bg-anchor"></div>
    </div>
    <div id="map_surface"></div>
    <div id="map_scrollable_oversurface"></div>
  </div>
</div>

<script type="text/javascript">
  var jstpl_player_board =
    '<div class="counters">\
    <div id="templeBoard_${id}" class="templeBoard">\
      <div id="icon_temples_${id}" class="pieceicon templeicon ${colorName}"></div>\
      <span id="count_temples_${id}">0</span>\
    </div>\
    <div id="towerBoard_${id}" class="towerBoard">\
      <div id="icon_towers_${id}" class="pieceicon towericon ${colorName}"></div>\
      <span id="count_towers_${id}">0</span>\
    </div>\
    <div id="hutBoard_${id}" class="hutBoard">\
      <div id="icon_huts_${id}" class="pieceicon huticon ${colorName}"></div>\
      <span id="count_huts_${id}">0</span>\
    </div>\
</div>\
<div id="preview_${id}" class="preview"></div>';

  var jstpl_tooltip =
    '<div class="pieceicon black ${icon}"></div><h3 class="bldgname">${name} <div class="bldgpoints">${points} points</div></h3><ul><li>${tooltip}</li></ul>';

  var jstpl_tile =
    '<div id="tile_${id}" class="tile rotate${rotate} level${z}">\
  <div id="hex_${id}_0" class="subface0 face face-${face0}" title="${title0}"></div>\
  <div id="hex_${id}_1" class="subface1 face face-${face1}" title="${title1}"><div class="facelabel">${z}</div></div>\
  <div id="hex_${id}_2" class="subface2 face face-${face2}" title="${title2}"><div class="facelabel">${z}</div></div>\
  <div class="sides"><div class="side side1"></div><div class="side side2"></div><div class="side side3"></div><div class="side side4"></div><div class="side side5"></div><div class="side side6"></div></div>\
</div>';

  var jstpl_possible =
    '<div id="possible_${id}" class="face possible level${z}" style="${style}"><span class="facelabel">${label}</span></div>';

  // Hut
  var jstpl_building_1 =
    '<div class="hut ${colorName}"><div class="hutside"></div><div class="hutroof"></div></div>';

  // Temple
  var jstpl_building_2 =
    '<div class="temple ${colorName}"><div class="templeside"></div><div class="templeroof"></div></div>';

  // Tower
  var jstpl_building_3 =
    '<div class="tower ${colorName}"><div class="towerside"></div><div class="towerroof"></div></div>';
</script>

{OVERALL_GAME_FOOTER}