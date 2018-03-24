{OVERALL_GAME_HEADER}
<div id="playareascaler">
  <div id="playArea">
    <div id="remain" class="whiteblock"><span id="count_remain">{count_remain}</span> {I18N_Remain} &#11042;<sup>&#11042;</sup>&#11042;</div>

    <div id="map_container">
      <div id="map_scrollable"></div>
      <div id="map_surface"></div>
      <div id="map_scrollable_oversurface"></div>
      <a class="move movetop" href="#"></a>
      <a class="move moveleft" href="#"></a>
      <a class="move moveright" href="#"></a>
      <a class="move movedown" href="#"></a>
    </div>
  </div>
</div>

<script type="text/javascript">
  var jstpl_player_board =
    '<div class="counters">\
    <div title="{I18N_Temples}">\
      <div id="icon_temples_${id}" class="templeicon color_${color}"></div>\
      <span id="count_temples_${id}">0</span>\
    </div>\
    <div title="{I18N_Towers}">\
      <div id="icon_towers_${id}" class="towericon color_${color}"></div>\
      <span id="count_towers_${id}">0</span>\
    </div>\
    <div title="{I18N_Huts}">\
      <div id="icon_huts_${id}" class="huticon color_${color}"></div>\
      <span id="count_huts_${id}">0</span>\
    </div>\
</div>\
<div id="preview_${id}" class="preview"></div>';

  var jstpl_tile =
    '<div id="tile_${id}" class="tile rotate${rotate} level${z}">\
  <div id="hex_${id}_0" class="subface0 face face-${face0}" title="${title0}"><div class="side side1"></div><div class="side side2"></div><div class="side side3"></div></div>\
  <div id="hex_${id}_1" class="subface1 face face-${face1}" title="${title1}"><div class="side side1"></div><div class="side side2"></div><div class="side side3"></div></div>\
  <div id="hex_${id}_2" class="subface2 face face-${face2}" title="${title2}"><div class="side side1"></div><div class="side side2"></div><div class="side side3"></div></div>\
</div>';

  var jstpl_possible =
    '<div id="possible_${id}" class="face possible level${z}" style="${style}"><span class="facelabel">${label}</span></div>';

  // Hut
  var jstpl_building_1 =
    '<div class="hut ${colorName}" title="{I18N_Huts}" ><div class="hutside"></div><div class="hutroof"></div></div>';

  // Temple
  var jstpl_building_2 =
    '<div class="temple ${colorName}" title="{I18N_Temples}"><div class="templeside"></div><div class="templeroof"></div></div>';

  // Tower
  var jstpl_building_3 =
    '<div class="tower ${colorName}" title="{I18N_Towers}"><div class="towerside"></div><div class="towerroof"></div></div>';
</script>

{OVERALL_GAME_FOOTER}