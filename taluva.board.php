<?php

// Adjacency constants
define('LEFT_TOP', 1);
define('RIGHT_TOP', 2);
define('RIGHT_MIDDLE', 3);
define('RIGHT_BOTTOM', 4);
define('LEFT_BOTTOM', 5);
define('LEFT_MIDDLE', 6);

class TaluvaSpace extends APP_GameClass
{
    public $x;
    public $y;
    public $z;
    public $r;
    public $face;
    public $tile_id;
    public $subface;
    public $tile_player_id;
    public $bldg_player_id;
    public $bldg_type;

    public function __construct($row)
    {
        $this->x = (int) $row['x'];
        $this->y = (int) $row['y'];
        $this->z = (int) $row['z'];
        $this->r = (int) $row['r'];
        $this->face = (int) @$row['face'];
        $this->tile_id = (int) @$row['tile_id'];
        $this->subface = (int) @$row['subface'];
        $this->tile_player_id = (int) @$row['tile_player_id'];
        $this->bldg_player_id = (int) @$row['bldg_player_id'];
        $this->bldg_type = (int) @$row['bldg_type'];
    }

    public function __toString()
    {
        return $this->toXYZ();
    }

    public function toXY()
    {
        return '['. $this->x . ',' . $this->y .']';
    }

    public function toXYZ()
    {
        return '[' . $this->x . ',' . $this->y . ',' . $this->z . ']';
    }

    // Does this space exist on the board?
    // False for imaginary (empty) and pending (not yet saved) spaces
    public function exists()
    {
        return !!$this->tile_player_id;
    }

    // Is this space avaialble for placing a new building?
    public function canBuild()
    {
        return $this->exists() && !$this->bldg_type && $this->face !== VOLCANO;
    }
}

class TaluvaBoard extends APP_GameClass implements JsonSerializable
{
    private $board = array();
    private $top = array();
    private $buildings = array();

    public function __construct()
    {
        $rows = self::getObjectListFromDB('SELECT x, y, z, r, face, tile_id, subface, tile_player_id, bldg_player_id, bldg_type FROM board ORDER BY x, y, z');
        foreach ($rows as $row) {
            $space = new TaluvaSpace($row);
            $x = $space->x;
            $y = $space->y;
            $z = $space->z;
            $this->board[$x][$y][$z] = $space;
            $this->top[$x][$y] = $z;
            if ($space->bldg_player_id) {
                $this->buildings[$space->bldg_player_id][] = $space;
            }
        }
    }

    public function jsonSerialize()
    {
        return $this->getSpaces();
    }

    public function empty()
    {
        return empty($this->board);
    }

    public function getSpaces()
    {
        $spaces = array();
        foreach ($this->board as $x => $xrow) {
            foreach ($xrow as $y => $yrow) {
                foreach ($yrow as $z => $space) {
                    $spaces[] = $space;
                }
            }
        }
        return $spaces;
    }

    public function getSpace($x, $y, $z)
    {
        if (array_key_exists($x, $this->board) && array_key_exists($y, $this->board[$x]) && array_key_exists($z, $this->board[$x][$y])) {
            return $this->board[$x][$y][$z];
        }

        // Return an imaginary (empty) space
        return new TaluvaSpace(array(
            'x' => $x,
            'y' => $y,
            'z' => $z,
            'r' => 0,
        ));
    }

    public function getSpaceOnTop($x, $y)
    {
        $z = 1;
        if (array_key_exists($x, $this->top) && array_key_exists($y, $this->top[$x])) {
            $z = $this->top[$x][$y];
        }
        return $this->getSpace($x, $y, $z);
    }

    public function getSpaceBelow($space)
    {
        return $this->getSpace($space->x, $space->y, $space->z - 1);
    }

    public function getSpaceAbove($space)
    {
        return $this->getSpace($space->x, $space->y, $space->z + 1);
    }

    public function getSpaceAdjacents($space)
    {
        $xmod = abs($space->y % 2);
        return array(
            LEFT_TOP => $this->getSpace($xmod + $space->x - 1, $space->y - 1, $space->z),
            RIGHT_TOP => $this->getSpace($xmod + $space->x, $space->y - 1, $space->z),
            RIGHT_MIDDLE => $this->getSpace($space->x + 1, $space->y, $space->z),
            RIGHT_BOTTOM => $this->getSpace($xmod + $space->x, $space->y + 1, $space->z),
            LEFT_BOTTOM => $this->getSpace($xmod + $space->x - 1, $space->y + 1, $space->z),
            LEFT_MIDDLE => $this->getSpace($space->x - 1, $space->y, $space->z),
        );
    }

    public function getAdjacentsOnTop($space)
    {
        $xmod = abs($space->y % 2);
        return array(
            LEFT_TOP => $this->getSpaceOnTop($xmod + $space->x - 1, $space->y - 1),
            RIGHT_TOP => $this->getSpaceOnTop($xmod + $space->x, $space->y - 1),
            RIGHT_MIDDLE => $this->getSpaceOnTop($space->x + 1, $space->y),
            RIGHT_BOTTOM => $this->getSpaceOnTop($xmod + $space->x, $space->y + 1),
            LEFT_BOTTOM => $this->getSpaceOnTop($xmod + $space->x - 1, $space->y + 1),
            LEFT_MIDDLE => $this->getSpaceOnTop($space->x - 1, $space->y),
        );
    }

    public function getSpaceRotations($space)
    {
        $adjacent = $this->getSpaceAdjacents($space);
        $rotations = array(
            0 => array($space, $adjacent[LEFT_BOTTOM], $adjacent[RIGHT_BOTTOM]),
            60 => array($space, $adjacent[LEFT_MIDDLE], $adjacent[LEFT_BOTTOM]),
            120 => array($space, $adjacent[LEFT_TOP], $adjacent[LEFT_MIDDLE]),
            180 => array($space, $adjacent[RIGHT_TOP], $adjacent[LEFT_TOP]),
            240 => array($space, $adjacent[RIGHT_MIDDLE], $adjacent[RIGHT_TOP]),
            300 => array($space, $adjacent[RIGHT_BOTTOM], $adjacent[RIGHT_MIDDLE]),
        );
        return $rotations;
    }

    // Return the 3 spaces that form this tile
    public function getSpacesForTile($x, $y, $z, $r, $tile_type)
    {
        list($space0, $space1, $space2) = $this->getSpaceRotations($this->getSpace($x, $y, $z))[$r];
        $space0->r = $r;
        $space0->face = VOLCANO;
        $space1->r = $r;
        $space1->face = (int) substr($tile_type, 0, 1);
        $space2->r = $r;
        $space2->face = (int) substr($tile_type, 1, 1);
        return array($space0, $space1, $space2);
    }

    public function getSettlements()
    {
        $settlements = array();
        foreach ($this->buildings as $player_id => $spaces) {
            $log = "\nBuildings for player $player_id (" . count($spaces) . "): ";
            foreach ($spaces as $space) {
                $log .= "\n-- type $space->bldg_type at $space ";
            }
            self::warn("$log\n / ");

            $first = array_shift($spaces);
            $settlements[$player_id][] = array($first);
            foreach ($spaces as $space) {
                $existing = false;
                foreach ($settlements[$player_id] as $key => $settlement) {
                    if ($this->isAdjacent($space, $settlement)) {
                        $settlements[$player_id][$key][] = $space;
                        $existing = true;
                        break;
                    }
                }
                if (!$existing) {
                    $settlements[$player_id][] = array($space);
                }
            }
        }

        foreach ($settlements as $player_id => $pSettlements) {
            $log = "\nSettlements for player $player_id (" . count($pSettlements) . "): ";
            foreach ($pSettlements as $settlement) {
                $log .= "\n-- settlement size " . count($settlement) . ": " . join('  ', $settlement);
            }
        }
        self::warn("$log\n / ");
        return $settlements;
    }

    // If $another is a single space, answers whether $space is adjacent to it.
    // If $another is an array, answers whether $space is adjacent to any space in the array.
    public function isAdjacent($space, $another)
    {
        $adjacents = array_values($this->getAdjacentsOnTop($space));
        if (!is_array($another)) {
            $another = array($another);
        }
        foreach ($another as $test) {
            foreach ($adjacents as $adj) {
                if ($adj->exists() && $adj->x == $test->x && $adj->y == $test->y) {
                    return true;
                }
            }
        }
        return false;
    }

    // Answers whether [x,y] coordinates for ALL settlement spaces are contained in this array
    public function containsAllXY($container, $settlement)
    {
        // The settlement cannot be contained if it is larger
        if (count($settlement) > count($container)) {
            return false;
        }

        // Build [x,y] coordinates for container and settlement
        $xy = function ($space) {
            return $space->toXY();
        };
        $containerXY = array_map($xy, $container);
        $settlementXY = array_map($xy, $settlement);

        // Compute the difference
        $ousideContainer = array_diff($settlementXY, $containerXY);
        return empty($ousideContainer);
    }

    public function hasBuilding($building, $spaces)
    {
        foreach ($spaces as $space) {
            if ($space->bldg_type == $building) {
                return true;
            }
        }
        return false;
    }

    public function isConnectedToBoard($space)
    {
        $adjacents = array_values($this->getSpaceAdjacents($space));
        foreach ($adjacents as $adj) {
            if ($adj->exists()) {
                return true;
            }
        }
        return false;
    }

    public function isValidTilePlacement($spaces)
    {
        list($space0, $space1, $space2) = $spaces;

        // First tile placement is always allowed
        if ($this->empty()) {
            return true;
        }

        // All spaces must be on the same level
        if ($space0->z != $space1->z || $space0->z != $space2->z) {
            return false;
        }

        // All spaces must be empty on the board
        if ($space0->exists() || $space1->exists() || $space2->exists()) {
            return false;
        }

        if ($space0->z > 1) {
            // Volcano must be above volcano of different rotation
            $below0 = $this->getSpaceBelow($space0);
            if ($below0->face !== VOLCANO || $below0->r === $space0->r) {
                return false;
            }

            // Other spaces must be supported
            $below1 = $this->getSpaceBelow($space1);
            $below2 = $this->getSpaceBelow($space2);
            if (!$below1->exists() || !$below2->exists()) {
                return false;
            }

            // Cannot destroy temple or tower
            if ($below1->bldg_type > HUT || $below2->bldg_type > HUT) {
                return false;
            }

            // Cannot destroy entire settlement
            $settlements = $this->getSettlements();
            $container = array($space1, $space2);
            foreach ($settlements as $player_id => $pSettlements) {
                foreach ($pSettlements as $settlement) {
                    if ($this->containsAllXY($container, $settlement)) {
                        return false;
                    }
                }
            }
        } else {
            // One space must be adjacent to rest of the board
            $connected0 = $this->isConnectedToBoard($space0);
            $connected1 = $this->isConnectedToBoard($space1);
            $connected2 = $this->isConnectedToBoard($space2);
            if (!$connected0 && !$connected1 && !$connected2) {
                return false;
            }
        }

        return true;
    }

    public function getBuildingOptions($space, $player)
    {
        /// THERE ARE 4 BUILDING OPTIONS
        //  A - Single hut on level 1 tiles not connected to existing settlement
        //  B - temple on Settlements with at least other 3 buildings and no other temple
        //  C - Extend a settlement to all spaces of the same terrain connected to a settlement
        //  D - Tower on level 3 tiles with no other tower in the settlement

        $options = array();

        // Nothing to do if we cannot build here :-)
        if (!$space->canBuild()) {
            return $options;
        }

        // Calculate this player's adjacent settlements
        $adjacentSettlements = array();
        $settlements = $this->getSettlements();
        if (array_key_exists($player['id'], $settlements)) {
            $ownSettlements = $settlements[$player['id']];
            foreach ($ownSettlements as $settlement) {
                if ($this->isAdjacent($space, $settlement)) {
                    $adjacentSettlements[] = $settlement;
                }
            }
        }

        if (!empty($adjacentSettlements)) {
            foreach ($adjacentSettlements as $settlement) {
                // OPTION C -- extend huts
                if ($player['huts'] > 0) {
                    $huts = array();
                    foreach ($settlement as $sSpace) {
                        $adjacents = $this->getAdjacentsOnTop($sSpace);
                        foreach ($adjacents as $adj) {
                            if ($adj->face == $space->face && !$adj->bldg_type) {
                                $huts["$adj"] = $adj;
                            }
                        }
                    }
                    $count = array_reduce($huts, function ($sum, $adj) {
                        return $sum + $adj->z;
                    });
                    if ($count > 0 && $player['huts'] > $count) {
                        $options[HUT] = $huts;
                    }
                }

                // OPTION B -- temple
                if ($player['temples'] > 0 && count($settlement) >= 3 && !$this->hasBuilding(TEMPLE, $settlement)) {
                    $options[TEMPLE] = array($space);
                }

                // OPTION D -- tower
                if ($player['towers'] > 0 && $space->z >= 3 && !$this->hasBuilding(TOWER, $settlement)) {
                    $options[TOWER] = array($space);
                }
            }
        } elseif ($player['huts'] > 0 && $space->z == 1) {
            // OPTION A -- new hut
            $options[HUT] = array($space);
        }

        // It's possible there are no valid options at this point
        // E.g., level 2+ not adjacent to your own settlement

        self::warn("Options for player {$player['id']} at $space with adjacentSettlements=" . count($adjacentSettlements) . " (" . count($options) . "): " . json_encode($options) . " /");
        return $options;
    }
}
