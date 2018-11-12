<?php

/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Taluva implementation : © 2018 quietmint & Morgalad
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * gameoptions.inc.php
 *
 * taluva game options description
 *
 * In this file, you can define your game options (= game variants).
 *
 * Note: If your game has no variant, you don't have to modify this file.
 *
 * Note²: All options defined in this file should have a corresponding "game state labels"
 *        with the same ID (see "initGameStateLabels" in taluva.game.php)
 *
 * !! It is not a good idea to modify this file when a game is running !!
 *
 */

$game_options = array(
    100 => array(
        'name' => totranslate('Tiles per player'),
        'values' => array(
            12 => array(
                'name' => '12'
            ),
            18 => array(
                'name' => '18',
                'tmdisplay' => totranslate('18 tiles per player')
            ),
            24 => array(
                'name' => '24',
                'tmdisplay' => totranslate('24 tiles per player')
            ),
        ),
        'startcondition' => array(
            12 => array(),
            18 => array(
                array(
                    'type' => 'maxplayers',
                    'value' => 2,
                    'message' => totranslate('Must use 12 tiles per player with more than 2 players.'),
                )
            ),
            24 => array(
                array(
                    'type' => 'maxplayers',
                    'value' => 2,
                    'message' => totranslate('Must use 12 tiles per player with more than 2 players.'),
                )
            ),
         ),
    ),
);
