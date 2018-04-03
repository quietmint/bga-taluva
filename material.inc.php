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
 * material.inc.php
 *
 * taluva game material description
 *
 * Here, you can describe the material of your game with PHP variables.
 *
 * This file is loaded in your game logic class constructor, ie these variables
 * are available everywhere in your game logic code.
 *
 */

$this->rotations = array( 0, 60, 120, 180, 240, 300 );

$this->terrain = array(
    VOLCANO => clienttranslate('volcano'),
    JUNGLE => clienttranslate('jungle'),
    GRASS => clienttranslate('clearing'),
    SAND => clienttranslate('sand'),
    ROCK => clienttranslate('rock'),
    LAKE => clienttranslate('lake'),
);

$this->buildings = array(
    HUT => array(
        'name' => clienttranslate('huts'),
        'tooltips' => array(
            array(
                'title' => clienttranslate('New Settlement'),
                'text' => clienttranslate('Build a hut on a first-level space not adjacent to your existing settlement.'),
            ),
            array(
                'title' => clienttranslate('Expand Settlement'),
                'text' => clienttranslate('Choose a terrain type. On all adjacent spaces of that type, build huts equal to the height (one hut on first-level spaces, two huts on second-level spaces, etc.). You must have enough huts to build on all eligible spaces.'),
            ),
        ),
    ),
    TEMPLE => array(
        'name' => clienttranslate('temples'),
        'tooltips' => array(
            array(
                'text' => clienttranslate('Build a temple adjacent to your settlement occupying three or more spaces that does not already contain a temple.'),
            ),
        ),
    ),
    TOWER => array(
        'name' => clienttranslate('towers'),
        'tooltips' => array(
            array(
                'text' => clienttranslate('Build a tower on a third-level space (or higher) adjacent to your settlement that does not already contain a tower.'),
            ),
        ),
    ),
);
