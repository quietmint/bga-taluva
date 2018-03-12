{OVERALL_GAME_HEADER}
<div id="remain" class="whiteblock"><span id="count_remain">{count_remain}</span> {I18N_Remain}</div>

<div id="map_container">
  <div id="map_scrollable"></div>
  <div id="map_surface"></div>
  <div id="map_scrollable_oversurface"></div>
  <a class="move movetop" href="#"></a>
  <a class="move moveleft" href="#"></a>
  <a class="move moveright" href="#"></a>
  <a class="move movedown" href="#"></a>
</div>


<script type="text/javascript">
  var jstpl_player_board =
    '<div class="counters">\
    <div title="{I18N_Temples}">\
      <i id="icon_temples_${id}" class="mdi mdi-city" style="color: #${color}"></i>\
      <span id="count_temples_${id}">0</span>\
    </div>\
    <div title="{I18N_Towers}">\
      <i id="icon_towers_${id}" class="mdi mdi-atlassian" style="color: #${color}"></i>\
      <span id="count_towers_${id}">0</span>\
    </div>\
    <div title="{I18N_Huts}">\
      <i id="icon_huts_${id}" class="mdi mdi-home" style="color: #${color}"></i>\
      <span id="count_huts_${id}">0</span>\
    </div>\
</div>\
<div id="preview_${id}" class="preview">?</div>';

  var jstpl_tile =
    '<div id="tile_${id}" class="tile rotate${rotate}">\
  <div class="top face face-${face0}" title="${title0}"></div>\
  <div class="left face face-${face1}" title="${title1}"></div>\
  <div class="right face face-${face2}" title="${title2}"></div>\
</div>';
</script>

{OVERALL_GAME_FOOTER}