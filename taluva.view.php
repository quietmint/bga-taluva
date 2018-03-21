<?php
/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Taluva implementation : © quietmint
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * taluva.view.php
 *
 * This is your "view" file.
 *
 * The method "build_page" below is called each time the game interface is displayed to a player, ie:
 * _ when the game starts
 * _ when a player refreshes the game page (F5)
 *
 * "build_page" method allows you to dynamically modify the HTML generated for the game interface. In
 * particular, you can set here the values of variables elements defined in taluva_taluva.tpl (elements
 * like {MY_VARIABLE_ELEMENT}), and insert HTML block elements (also defined in your HTML template file)
 *
 * Note: if the HTML of your game interface is always the same, you don't have to place anything here.
 *
 */

  require_once(APP_BASE_PATH."view/common/game.view.php");

  class view_taluva_taluva extends game_view
  {
      public function getGameName()
      {
          return 'taluva';
      }

      public function build_page($viewArgs)
      {
          global $g_user;
          $current_player_id = $g_user->get_id();
          $template = self::getGameName() . '_' . self::getGameName();

          // Translations for static text
          $this->tpl['I18N_Remain'] = self::_('tiles remain');
          $this->tpl['I18N_Temples'] = self::_($this->game->buildings[TEMPLE]);
          $this->tpl['I18N_Towers'] = self::_($this->game->buildings[TOWER]);
          $this->tpl['I18N_Huts'] = self::_($this->game->buildings[HUT]);

          // Remaining tile counter
          $this->tpl['count_remain'] = $this->game->tiles->countCardInLocation('deck');

          // Get players & players number
          $players = $this->game->loadPlayersBasicInfos();
          $players_nbr = count($players);
      }
  }
