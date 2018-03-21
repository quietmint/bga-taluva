<?php

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
        $rows = self::getObjectListFromDB('SELECT x, y, z, r, face, tile_id, subface, tile_player_id, bldg_player_id, bldg_type FROM board ORDER BY z, x, y');
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
            'topLeft' => $this->getSpaceOnTop($xmod + $space->x - 1, $space->y - 1),
            'topRight' => $this->getSpaceOnTop($xmod + $space->x, $space->y - 1),
            'right' => $this->getSpaceOnTop($space->x + 1, $space->y),
            'bottomRight' => $this->getSpaceOnTop($xmod + $space->x, $space->y + 1),
            'bottomLeft' => $this->getSpaceOnTop($xmod + $space->x - 1, $space->y + 1),
            'left' => $this->getSpaceOnTop($space->x - 1, $space->y),
        );
    }

    public function getSpaceRotations($space)
    {
        $adjacent = $this->getSpaceAdjacents($space);
        $rotations = array(
            0 => array($space, $adjacent['bottomLeft'], $adjacent['bottomRight']),
            60 => array($space, $adjacent['left'], $adjacent['bottomLeft']),
            120 => array($space, $adjacent['topLeft'], $adjacent['left']),
            180 => array($space, $adjacent['topRight'], $adjacent['topLeft']),
            240 => array($space, $adjacent['right'], $adjacent['topRight']),
            300 => array($space, $adjacent['bottomRight'], $adjacent['right']),
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
            if (!empty($spaces)) {
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
        }

        $log = '';
        foreach ($settlements as $player_id => $ps) {
            $log .= "\nPlayer $player_id has " . count($ps) . " settlements:";
            foreach ($ps as $settlement) {
                $log .= "\n-- A settlement of size " . count($settlement) . ": " . join('  ', $settlement);
            }
        }
        self::warn("Settlements: $log\n / ");
        return $settlements;
    }

    // If $another is a single space, answers whether $space is adjacent to it.
    // If $another is an array, answers whether $space is adjacent to any space in the array.
    public function isAdjacent($space, $another)
    {
        $adjacents = array_values($this->getSpaceAdjacents($space));
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
        self::warn("test isValidTilePlacement for $space0 and $space1 and $space2 /");

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

    public function getBuildingOptions($space, $player_id)
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
        if (array_key_exists($player_id, $settlements)) {
            $ownSettlements = $settlements[$player_id];
            foreach ($ownSettlements as $settlement) {
                if ($this->isAdjacent($space, $settlement)) {
                    $adjacentSettlements[] = $settlement;
                }
            }
        }

        if (!empty($adjacentSettlements)) {
            foreach ($adjacentSettlements as $settlement) {
                // OPTION C -- additional hut(s)
                // TODO: find settlement perimiter
                $options[HUT] = array($space);

                if (count($settlement) >= 3 && !$this->hasBuilding(TEMPLE, $settlement)) {
                    // OPTION B -- temple
                    $options[TEMPLE] = array($space);
                }
                if ($space->z >= 3 && !$this->hasBuilding(TOWER, $settlement)) {
                    // OPTION D -- tower
                    $options[TOWER] = array($space);
                }
            }
        } elseif ($space->z == 1) {
            // OPTION A -- new hut
            $options[HUT] = array($space);
        }

        // It's possible there are no valid options at this point
        // E.g., level 2+ not adjacent to your own settlement

        self::warn("Options for player $player_id, space $space (adjacentSettlements: " . count($adjacentSettlements) . "): " . json_encode($options) . " /");
        return $options;
    }
}
