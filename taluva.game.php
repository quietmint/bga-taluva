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
  * taluva.game.php
  *
  * This is the main file for your game logic.
  *
  * In this PHP file, you are going to defines the rules of the game.
  *
  */

require_once(APP_GAMEMODULE_PATH.'module/table/table.game.php');
require_once('taluva.board.php');

// Tile constants
define('VOLCANO', 0);
define('JUNGLE', 1);
define('GRASS', 2);
define('SAND', 3);
define('ROCK', 4);
define('LAKE', 5);

// Building constants
define('HUT', 1);
define('TEMPLE', 2);
define('TOWER', 3);

// State constants
define('ST_GAME_BEGIN', 1);
define('ST_NEXT_PLAYER', 2);
define('ST_TILE', 3);
define('ST_BUILDING', 4);
define('ST_GAME_END', 99);

class taluva extends Table
{
    public function __construct()
    {
        // Your global variables labels:
        //  Here, you can assign labels to global variables you are using for this game.
        //  You can use any number of global variables with IDs between 10 and 99.
        //  If your game has options (variants), you also have to associate here a label to
        //  the corresponding ID in gameoptions.inc.php.
        // Note: afterwards, you can get/set the global variables with getGameStateValue/setGameStateInitialValue/setGameStateValue
        parent::__construct();

        self::initGameStateLabels(array(
            // IntlCodePointBreakIterator
        ));

        $this->tiles = self::getNew('module.common.deck');
        $this->tiles->init('tile');
    }

    protected function getGameName()
    {
        return 'taluva';
    }

    /*
        setupNewGame:

        This method is called only once, when a new game is launched.
        In this method, you must setup the game according to the game rules, so that
        the game is ready to be played.
    */
    protected function setupNewGame($players, $options = array())
    {
        // Create tiles
        // Distribution from https://boardgamegeek.com/image/155164/taluva
        $tiles = array();
        for ($left = JUNGLE; $left <= LAKE; $left++) {
            for ($right = JUNGLE; $right <= LAKE; $right++) {
                $type = "$left$right";
                $nbr = 1;
                switch ($type) {
                case JUNGLE.GRASS:
                    $nbr = 6;
                    break;

                case GRASS.JUNGLE:
                    $nbr = 5;
                    break;

                case JUNGLE.SAND:
                case SAND.JUNGLE:
                    $nbr = 4;
                    break;

                case JUNGLE.ROCK:
                case JUNGLE.LAKE:
                case GRASS.SAND:
                case GRASS.ROCK:
                case SAND.GRASS:
                case SAND.ROCK:
                case ROCK.JUNGLE:
                case ROCK.GRASS:
                    $nbr = 2;
                    break;
                }
                $tiles[] = array('type' => $type, 'type_arg' => 0, 'nbr' => $nbr);
            }
        }
        $this->tiles->createCards($tiles, 'deck');
        $this->tiles->shuffle('deck');

        // Create players
        self::DbQuery('DELETE FROM player');
        $gameinfos = self::getGameinfos();
        $default_colors = $gameinfos['player_colors'];
        $sql = 'INSERT INTO player (player_id, player_color, player_canal, player_name, player_avatar) VALUES ';
        $values = array();
        foreach ($players as $player_id => $player) {
            $color = array_shift($default_colors);
            $values[] = "('".$player_id."','$color','".$player['player_canal']."','".addslashes($player['player_name'])."','".addslashes($player['player_avatar'])."')";

            // Give each player a tile
            $tile = $this->tiles->pickCard('deck', $player_id);
            $tile['remain'] = $this->tiles->countCardInLocation('deck');
            self::notifyPlayer($player_id, 'draw', '', $tile);
        }
        self::DbQuery($sql . implode($values, ','));
        self::reattributeColorsBasedOnPreferences($players, $gameinfos['player_colors']);
        self::reloadPlayersBasicInfos();

        // Init global values with their initial values
        // TODO

        // Init game statistics
        // TODO
    }

    /*
        getAllDatas:

        Gather all informations about current game situation (visible by the current player).

        The method is called each time the game interface is displayed to a player, ie:
        _ when the game starts
        _ when a player refreshes the game page (F5)
    */
    protected function getAllDatas()
    {
        $player_id = self::getCurrentPlayerId();
        $result = array();
        $result['players'] = self::getCollectionFromDb('SELECT player_id id, player_score score, temples, towers, huts, player_color color FROM player');
        foreach ($result['players'] as $id => $player) {
            if ($id == $player_id || $id == self::getActivePlayerId()) {
                $result['players'][$id]['preview'] = $this->getTileInHand($id);
            }
        }
        $result['terrain'] = $this->terrain;
        $result['tiles'] = $this->getTiles();
        $result['remain'] = $this->tiles->countCardInLocation('deck');
        return $result;
    }

    /*
        getGameProgression:

        Compute and return the current game progression.
        The number returned must be an integer beween 0 (=the game just started) and
        100 (= the game is finished or almost finished).

        This method is called each time we are in a game state with the "updateGameProgression" property set to true
        (see states.inc.php)
    */
    public function getGameProgression()
    {
        $tileProgress = $this->tiles->countCardInLocation('board') / 48 * 100;
        return round($tileProgress);
    }


    //////////////////////////////////////////////////////////////////////////////
    //////////// Utility functions
    ////////////

    /*
        In this space, you can put any utility methods useful for your game logic
    */

    public function getBoard()
    {
        $board = array();
        $rows = self::getObjectListFromDB('SELECT x, y, z, r, face, tile_player_id, bldg_player_id, bldg_type FROM board ORDER BY z, x, y');
        return new TaluvaBoard($rows);
    }

    public function getTiles()
    {
        $tiles = self::getObjectListFromDB('SELECT card_id tile_id, card_type tile_type, x, y, z, r, tile_player_id, bldg_player_id, bldg_type FROM tile JOIN board ON (tile.card_location = "board" AND tile.card_location_arg = board.id) ORDER BY board.id');
        return $tiles;
    }

    public function getTileInHand($player_id)
    {
        $t = $this->tiles->getPlayerHand($player_id);
        $t = array_shift($t);
        $tile = array(
            'player_id' => $player_id,
            'tile_id' => (int) $t['id'],
            'tile_type' => $t['type'],
        );
        return $tile;
    }

    public function getPossibleTile()
    {
        $possible = array();
        $board = $this->getBoard();
        if ($board->isEmpty()) {
            // Center is only possible space at game start
            $possible[] = array('x' => 0, 'y' => 0, 'z' => 1, 'r' => $this->rotations);
        } else {
            $spaces = $board->getSpaces();
            foreach ($spaces as $space) {
                $adjacents = $board->getSpaceAdjacents($space);
                foreach ($adjacents as $as) {
                    if ($as->isEmpty() && !array_key_exists("$as", $possible)) {
                        $validRotations = array();
                        $rotations = $board->getSpaceRotations($as);
                        foreach ($rotations as $r => $rspaces) {
                            if ($board->isValidPlacement($rspaces)) {
                                $validRotations[] = $r;
                            }
                        }
                        $possible["$as"] = array('x' => $as->x, 'y' => $as->y, 'z' => $as->z, 'r' => $validRotations);
                    }

                    $bacons = $board->getSpaceAdjacents($as);
                    foreach ($bacons as $bs) {
                        if ($bs->isEmpty() && !array_key_exists("$bs", $possible)) {
                            $validRotations = array();
                            $rotations = $board->getSpaceRotations($bs);
                            foreach ($rotations as $r => $rspaces) {
                                if ($board->isValidPlacement($rspaces)) {
                                    $validRotations[] = $r;
                                }
                            }
                            $possible["$bs"] = array('x' => $bs->x, 'y' => $bs->y, 'z' => $bs->z, 'r' => $validRotations);
                        }
                    }
                }

                // Check for possible eruptions
                if ($space->face == VOLCANO) {
                    $above = $board->getSpaceAbove($space);
                    if ($above->isEmpty()) {
                        $validRotations = array();
                        $rotations = $board->getSpaceRotations($above);
                        foreach ($rotations as $r => $rspaces) {
                            $above->r = $r;
                            if ($board->isValidPlacement($rspaces)) {
                                $validRotations[] = $r;
                            }
                        }
                        $possible["$above"] = array('x' => $above->x, 'y' => $above->y, 'z' => $above->z, 'r' => $validRotations);
                    }
                }
            }
        }

        // Remove possible spaces with no valid rotations
        $possible = array_filter($possible, function ($item) {
            return !empty($item['r']);
        });

        return array_values($possible);
    }

    public function getPossibleBuilding()
    {
        $moves = array();
        return $moves;
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Player actions
    ////////////

    /*
        Each time a player is doing some game action, one of the methods below is called.
        (note: each method below must match an input method in taluva.action.php)
    */


    public function actionCommitTile($x, $y, $z, $r)
    {
        $player_id = self::getActivePlayerId();
        $tile = $this->getTileInHand($player_id);

        $board = $this->getBoard();
        $spaces = $board->getSpaceTile($x, $y, $z, $r, $tile['tile_type']);
        $valid = $board->isValidPlacement($spaces);
        if (!$valid) {
            die('Invalid placement!');
        }

        // Add volcano face at the clicked location
        self::DbQuery("INSERT INTO board (x, y, z, r, face, tile_player_id) VALUES ($x, $y, $z, $r, 0, $player_id)");
        $board_id = self::DbGetLastId();
        $this->tiles->moveCard($tile['tile_id'], 'board', $board_id);

        // Add secondary faces at adjacent locations
        $values = array(
            1 => "({$spaces[1]->x}, {$spaces[1]->y}, $z, $r, {$spaces[1]->face}, $player_id)",
            2 => "({$spaces[2]->x}, {$spaces[2]->y}, $z, $r, {$spaces[2]->face}, $player_id)",
        );
        self::DbQuery("INSERT INTO board (x, y, z, r, face, tile_player_id) VALUES " . implode($values, ','));

        $tile['x'] = $x;
        $tile['y'] = $y;
        $tile['z'] = $z;
        $tile['r'] = $r;
        self::notifyAllPlayers('commitTile', 'COMMIT A TILE', $tile);

        // Draw next tile
        $newTile = $this->tiles->pickCard('deck', $player_id);
        if ($newTile != null) {
            self::notifyPlayer($player_id, 'draw', '(private) Draw a tile', array(
                'player_id' => $player_id,
                'tile_id' => $newTile['id'],
                'tile_type' => $newTile['type'],
                'remain' => $this->tiles->countCardInLocation('deck'),
            ));
        }
        $this->gamestate->nextState('');
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Game state arguments
    ////////////

    /*
        Here, you can create methods defined as "game state arguments" (see "args" property in states.inc.php).
        These methods function is to return some additional information that is specific to the current
        game state.
    */

    public function argTile()
    {
        $player_id = self::getActivePlayerId();
        $tile = $this->getTileInHand($player_id);
        $result = $tile;
        $result['possible'] = $this->getPossibleTile();
        return $result;
    }

    public function argBuilding()
    {
        $result = array();
        $result['possible'] = $this->getPossibleBuilding();
        return $result;
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Game state actions
    ////////////

    /*
        Here, you can create methods defined as "game state actions" (see "action" property in states.inc.php).
        The action method of state X is called everytime the current game state is set to X.
    */

    public function stNextPlayer()
    {
        $this->activeNextPlayer();
        $player_id = self::getActivePlayerId();
        $tile = $this->getTileInHand($player_id);
        if ($tile != null) {
            $tile['remain'] = $this->tiles->countCardInLocation('deck');
            self::notifyAllPlayers('draw', 'Draw a tile', $tile);
            $this->gamestate->nextState('');
        }
    }

    //////////////////////////////////////////////////////////////////////////////
    //////////// Zombie
    ////////////

    /*
        zombieTurn:

        This method is called each time it is the turn of a player who has quit the game (= "zombie" player).
        You can do whatever you want in order to make sure the turn of this player ends appropriately
        (ex: pass).
    */

    public function zombieTurn($state, $active_player)
    {
        if (array_key_exists('zombiePass', $state['transitions'])) {
            $this->gamestate->nextState('zombiePass');
        } else {
            throw new BgaVisibleSystemException('Zombie player ' . $active_player . ' stuck in unexpected state ' . $state['name']);
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////:
    ////////// DB upgrade
    //////////

    /*
        upgradeTableDb:

        You don't have to care about this until your game has been published on BGA.
        Once your game is on BGA, this method is called everytime the system detects a game running with your old
        Database scheme.
        In this case, if you change your Database scheme, you just have to apply the needed changes in order to
        update the game database and allow the game to continue to run with your new version.

    */

    public function upgradeTableDb($from_version)
    {
        // $from_version is the current version of this game database, in numerical form.
        // For example, if the game was running with a release of your game named "140430-1345",
        // $from_version is equal to 1404301345
    }
}
